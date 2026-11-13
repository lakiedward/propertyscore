# Listings map at scale: implementation plan

**Status:** planned, not started. **Scope:** the map on `/listings` (feature `listings`, `MapCanvas` in `components/map`) and the database behind it. **Target:** pins and bubbles on screen in under 0.6 s on a warm cache and under 1 s on a cold one, the same at 1,000, 100,000 or 500,000 approved listings, on phones as on desktop.

## 1. Why the map has to change

Today the page downloads every approved listing of the chosen transaction (`listMapPoints`, up to 2,000 rows), groups them in the browser with MapLibre's GeoJSON clustering and draws one React element per pin or bubble in view.

| Problem                                                                   | Effect                                                                                          |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| PostgREST returns at most `max_rows = 1000` rows (`supabase/config.toml`) | above 1,000 listings the map is silently wrong: listings are missing and the counts are too low |
| The whole country is downloaded on every visit                            | about 250 bytes per listing: 2.5 MB at 10,000, 25 MB at 100,000                                 |
| Grouping and county counts run in the browser                             | work grows with every listing; slow phones stall on load and on every filter change             |
| Every pin is a React element                                              | hundreds of DOM nodes when zoomed into a dense city; panning drops frames                       |
| Hover recomputes data derived from all listings                           | lag grows with the number of listings                                                           |

## 2. Chosen approach

1. **The database serves the map as vector tiles.** MapLibre asks for standard `z/x/y` tiles straight from a Postgres function exposed by PostgREST. Each tile is a few KB and already contains the bubbles or pins for that square, so what the browser downloads depends on the screen, never on the number of listings.
2. **Counts for zoomed-out views are kept up to date, not computed on request.** A table of grid cells per zoom level is updated by a trigger whenever a listing enters or leaves the site. Tiles up to zoom 13 read that table; from zoom 14 the few listings in a tile are grouped on the fly through a spatial index.
3. **The map draws pins and bubbles itself (WebGL).** Thousands of pins on screen stay smooth. The design is kept: the price uses Manrope through self-hosted glyph files, the pin shape, white ring, tail and shadow are baked into a stretchable image, and the hovered or selected pin is drawn as the existing `MapPin` page element on top, with the lime ring and scale from the Locuințe v2 design.
4. **Totals and county shading come from one small summary call** (about 1 KB) read from a counts table kept by the same trigger.
5. **Popup details load on demand** for one listing when a pin is hovered or opened.

### Alternatives considered

| Option                                                                           | Why not                                                                                                                                      |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Keep downloading all points, raise `max_rows`                                    | download and browser work still grow with every listing; unusable on phones at 100,000                                                       |
| Database tiles, but pins as page elements (`MapPin` per point)                   | fine while bubbles keep the count low, but a dense street at zoom 16+ still puts hundreds of DOM nodes on screen; WebGL removes that ceiling |
| Group everything on request, no counts table                                     | zoomed-out tiles cover the whole country and would group every listing on each request: 50–150 ms per tile at 100,000, growing linearly      |
| A separate tile server (Martin, pg_tileserv) or Supercluster in an Edge Function | another service to deploy and pay for; Postgres and PostgREST already do the job                                                             |
| Base64 tiles through an RPC and a MapLibre custom protocol                       | 33% larger, decoded on the main thread, no browser HTTP cache; kept only as the fallback if raw binary responses do not work (step 0)        |

## 3. Facts already checked

- PostGIS 3.3.7 is installed with `ST_AsMVT`, `ST_AsMVTGeom`, `ST_TileEnvelope` and `ST_SnapToGrid`; `ST_Transform` is immutable, so it can feed a stored generated column.
- Local PostgREST is v14, which serves a function returning a bytea domain named after a media type (`"application/vnd.mapbox-vector-tile"`) as raw bytes with that `Content-Type`.
- Anonymous visitors only read the `listings` columns granted to them one by one (`add_profile_names_and_restrict_listing_columns` and later migrations), so every new column the functions read needs its own grant.
- The price filter only offers fixed caps (`EXPLORER_PRICE_CAPS`: 100k / 150k / 200k € for sale, 400 / 600 / 800 € for rent), and it keeps only listings priced in euro. That makes the price filter cheap to pre-count.
- Only `/listings` uses the map's clustering, so `listMapPoints`, `MAP_POINTS_LIMIT` and the `mapPoints` query can go.
- MapLibre moves a protocol handler's `ArrayBuffer` into its worker instead of copying it; this only matters for the base64 fallback, which must hand MapLibre a copy.

## 4. Server side

### 4.1 Columns on `listings`

- `location_3857 geometry(Point, 3857)`, stored generated from `longitude` and `latitude`, with a partial GiST index `where status = 'approved'`.
- `price_band smallint`, set by the trigger: the lowest price cap of the listing's transaction that the price fits under (1, 2 or 3), 4 above every cap, and 4 for a price not in euro, so a cap never shows it. Band 0 does not exist; "no cap" means bands 1–4.
- `county_id text`, set by the trigger from the point's position.
- `grant select (location_3857, price_band, county_id) on public.listings to anon, authenticated`.

### 4.2 Private tables

- `private.listing_price_caps (transaction, band, max_price_eur)`: the caps from `EXPLORER_PRICE_CAPS`. A cap change updates this table and the config in the same pull request; a unit test reads the migration's values against the config.
- `private.romania_counties (id, name, geom)`: the county outlines from `public/geo/romania-regions.json`, the same file the map draws, inserted by the migration, with a GiST index.
- `private.listing_map_cells (transaction, price_band, z, cx, cy, listing_count, sum_x, sum_y)`, primary key on all but the last three. One row per occupied grid cell for zooms 4 to 13. The grid has 8 × 8 cells per tile, so a bubble never crosses a tile edge and is never counted twice; at 512 px tiles a cell is 64 px, the bubble size of the design. `sum_x / listing_count` and `sum_y / listing_count` give the bubble's centre.
- `private.listing_map_counts (transaction, price_band, county_id, listing_count)`.

### 4.3 Trigger

`private.sync_listing_map_counts`, after insert, update of `status`, `transaction`, `latitude`, `longitude`, `price`, `currency`, or delete. For the old row if it was approved and the new row if it is approved: subtract and add 1 (and the coordinates) in each of the 10 zoom levels and in the county counts, with `insert … on conflict do update`, removing rows that reach 0. Ten small upserts per approval or rejection; listing writes are rare next to map reads.

### 4.4 Functions

- `public.listing_map_tile(z int, x int, y int, transaction listing_transaction, max_price_eur int default null)` returning the domain `"application/vnd.mapbox-vector-tile"` (bytea).
  - Validates: `z` 4–22, `x` and `y` inside `0 … 2^z − 1`, `max_price_eur` null or one of the caps of that transaction (`invalid_price_cap` otherwise).
  - `z ≤ 13`: reads `listing_map_cells` for the tile's 64 cells and the allowed bands, summing across bands, into a `bubbles` layer (`count`, centre). A cell with one listing becomes a pin: for those, the listing's id, price and currency come from a lookup through the GiST index inside that cell.
  - `z 14–15`: groups the tile's approved listings on the fly with `ST_SnapToGrid` on the same 8 × 8 grid.
  - `z ≥ 16`: returns single listings only.
  - Pins carry `id`, `price`, `currency`; bubbles carry `count`. No title, address or owner.
  - Sets `Cache-Control: public, max-age=60` through `set_config('response.headers', …)`.
  - `stable`, `security invoker`, `set search_path = ''`; reads only approved listings, so row security still applies. Execute granted to `anon` and `authenticated`.
- `public.listing_map_summary(transaction, max_price_eur default null)` returning `{ total, counties: [{ id, count }] }` from `listing_map_counts`. Same validation, same rights.
- `public.listing_map_card(id uuid)` returning title, address parts, price, currency and the photo path of one approved listing, for the popup.

### 4.5 Database tests (pgTAP, `listing_map_tiles.test.sql`)

- Only approved listings appear in tiles, cells and counts; a rejected or blocked listing disappears, an approved revision updates them.
- Approval, rejection, a price change across a cap and a move across a cell or county keep every table equal to a recount from `listings`.
- Bubble counts in a tile add up to the summary total for that area; a listing near a tile edge is in exactly one tile.
- Price caps: each cap shows exactly the euro listings at or under it; a listing in lei never shows with a cap.
- Anonymous visitors can call all three functions; the tile carries no title, owner or address.
- Bad input is refused: zoom out of range, `x` or `y` outside the tile range, a cap that is not in the list.

## 5. Client side

### 5.1 Fonts and pin image

- Manrope is licensed under the SIL Open Font License, so its glyphs may be redistributed. Generate MapLibre glyph files once from the static Manrope ExtraBold TTF (MapLibre's font-maker or `fontnik`, run with `pnpm dlx`, nothing installed) for the ranges `0-255`, `256-511`, `512-767` (ș, ț) and `8192-8447` (€), and commit them in `public/map-fonts/Manrope ExtraBold/`.
- `MapCanvas` gets a `transformRequest` that sends glyph requests for the `Manrope ExtraBold` font stack to those files and leaves the base map's Noto glyphs on OpenFreeMap.
- Pin images are drawn on a canvas at device pixel ratio and added with `map.addImage`, with `stretchX`, `stretchY` and `content` so `icon-text-fit` sizes them to the label: the forest tag, 3 px white ring, 12 px tail and the `shadow-pin-tag` shadow baked in. Colours come from the CSS tokens read at runtime, so the design system stays the source.

### 5.2 `MapCanvas`

New `listingTiles` prop: `{ tilesUrl, onPick(id), onHover(id), highlightedId, renderHighlight }`. It replaces `clusters`, and the GeoJSON clustering path is removed.

- **Source:** a vector source with the tile URL, `promoteId: { listings: 'id' }`, `minzoom` 4 and `maxzoom` 16, so deeper zooms reuse zoom-16 tiles. A filter change calls `source.setTiles(...)`, with no source or layer rebuilt.
- **Bubbles:** a circle layer (forest at 88%, radius 21 / 25 / 30 px by count, a 5 px forest 18% halo stroke) and a symbol layer with the count in Manrope ExtraBold, white.
- **Pins:** a symbol layer with `icon-text-fit`, the price text and `icon-allow-overlap` / `text-allow-overlap` on, so a listing is never hidden.
- **Price text:** the map formats the text itself with `number-format` expressions built by a pure function, `pinLabelExpression(locale, transaction)` in `listing.utils.ts`, with unit tests checking it against `formatPriceInThousands` (sale) and `formatPrice` (rent) in both languages. The expression is replaced on language change.
- **Hover and select:** the hovered or selected listing gets feature state `hidden`, its symbol fades to 0 through `icon-opacity` and `text-opacity`, and `renderHighlight` draws the existing `MapPin` as a page element on top. So the lime ring, the scale and the ink selected style stay exactly as in the design, for one element at a time.
- **Clicks:** clicking a bubble eases to its centre at zoom + 2; clicking a pin calls `onPick(id)`; hovering a pin calls `onHover(id)`.
- **Labels:** the canvas keeps its translated `aria-label`.
- **Accessibility:** the pins become drawn graphics, not buttons, so the card list below the map stays the keyboard and screen-reader path. Every card already has "Arată pe hartă" and opens the same popup. Note this in `design-system.md`.

### 5.3 Data layer (`features/listings/api`)

- `listings.tiles.ts`: `listingTileUrl({ transaction, maxPrice })` builds the PostgREST URL with `{z}/{x}/{y}` placeholders (`/rest/v1/rpc/listing_map_tile?z={z}&x={x}&y={y}&transaction=…`), plus the `apikey` header through `transformRequest` (the publishable key only).
- `listingQueries.mapSummary({ transaction, maxPrice })` and `listingQueries.mapCard(id)`, through `supabase.rpc`.
- Removed: `listMapPoints`, `MAP_POINTS_LIMIT`, `listingQueries.mapPoints`, `countPointsByRegion` and their tests.

### 5.4 `/listings` page

- The "N locuințe afișate" pill and the county shading read `mapSummary`.
- Hovering a card or a pin only changes `highlightedId`, with no derived lists.
- The popup and the phone bottom sheet read `mapCard(id)`, prefetched on hover, with a skeleton until it arrives.
- The card grid below keeps its query. Its exact total count becomes a cost around 100,000 listings; switching it to `count: 'planned'` above a threshold is a one-line change for later.

### 5.5 Route loader

Everything starts together with the route:

- the map module (`preloadMapCanvas()`, as today);
- `mapSummary`;
- the first page of cards (as today);
- the county outlines (as today);
- the tiles of the first screen. The loader works out the zoom that `fitBounds(ROMANIA_BOUNDS)` will use for the window's size (about 5 on a phone, 6–7 on a desktop) and fetches those 2–6 tile URLs with the same headers, so MapLibre's own requests hit the browser's HTTP cache.

## 6. Steps

| #   | Step                                                                                                                                                                                                                                                          | Done when                                                                                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0   | Spike on the local stack: a throwaway function returning the tile domain, called with `curl` and by MapLibre                                                                                                                                                  | raw bytes arrive with `Content-Type: application/vnd.mapbox-vector-tile` and `Cache-Control: public, max-age=60`. If not, switch to the base64 fallback from §2 before going on |
| 1   | Test data and baseline: git-ignored `supabase/seed.local.listings.sql` with 10,000 and 100,000 synthetic approved listings across the 10 cities; measure today's page on a production build (`vite preview`)                                                  | numbers recorded for the comparison in step 8                                                                                                                                   |
| 2   | Migration `create_listing_map_tiles` (§4), then `pnpm db:reset` and `pnpm db:types`; pgTAP from §4.5; `EXPLAIN ANALYZE` on the 100,000 seed                                                                                                                   | pgTAP passes; every tile under 30 ms, the summary under 5 ms                                                                                                                    |
| 3   | Glyph files and pin images (§5.1)                                                                                                                                                                                                                             | Manrope prices render in the map with ș, ț and €                                                                                                                                |
| 4   | `MapCanvas` `listingTiles` (§5.2), with tests on the fake map (source, layers, `setTiles` on filter change, highlight, clicks) and the shared map stub updated                                                                                                | component tests pass                                                                                                                                                            |
| 5   | Data layer and page (§5.3, §5.4), page tests updated to the stub                                                                                                                                                                                              | page tests pass; filters, county clicks, popup, bottom sheet and full screen work as before                                                                                     |
| 6   | Route loader (§5.5)                                                                                                                                                                                                                                           | first-screen tiles are served from the HTTP cache when the map asks for them                                                                                                    |
| 7   | Cleanup and docs: remove the GeoJSON clustering path and the dead code from §5.3; update `design-system.md` (`MapCanvas`, `MapPin`, `MapCluster` rows), `CLAUDE.md` (listings, Supabase) and `SETUP_PLAN.md` (the map decision and its rejected alternatives) | Knip, lint and typecheck pass                                                                                                                                                   |
| 8   | Verify: `pnpm test:run`, `pnpm db:test`, then the production build at 10,000 and 100,000 listings, on a phone-sized window too                                                                                                                                | the targets at the top are met; no frame drops while panning a dense city at zoom 16                                                                                            |

## 7. Expected result

|                                | Now                                 | After                                                           |
| ------------------------------ | ----------------------------------- | --------------------------------------------------------------- |
| Map data on first load         | every listing, capped at 1,000 rows | 2–6 tiles of a few KB plus a 1 KB summary, at any count         |
| Correct above 1,000 listings   | no                                  | yes                                                             |
| Database work per tile         | not applicable                      | constant up to zoom 13, a few hundred rows at most from zoom 14 |
| Browser work on load and hover | grows with every listing            | constant                                                        |
| Page elements for pins         | one per pin or bubble in view       | one (the highlighted pin)                                       |
| Repeat visits within a minute  | download everything again           | tiles from the HTTP cache                                       |

## 8. Later, only if needed

- **Heavy traffic:** put a cache in front of the tile URL (a Netlify Edge Function with `Cache-Control` and the filters in the key) so popular tiles are served without reaching the database.
- **More filters on the map** (rooms, area, property type): pre-counting stops scaling past a few small filters. The tile function then groups on the fly at every zoom, behind a per-filter cache, or the low-zoom tables gain the new dimension if it has only a few values.
