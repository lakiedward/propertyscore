---
paths:
  - 'worker/**'
  - 'supabase/migrations/**'
  - 'supabase/tests/scoring*.test.sql'
---

# Worker rules: SmartCheck scoring engine and document jobs

`worker/` is the trusted backend that runs outside Supabase (decision D20): the monthly SmartCheck snapshot builder and the online report generation today, the PDF job later. It is a pnpm workspace package (`@propertyscore/worker`) deployed to Railway from `worker/Dockerfile`. Everything in `CLAUDE.md` still applies (no comments, no secrets in the frontend, migrations only, tests only on request); the React, i18n and styling rules do not.

## Runtime and layout

- Node 24 runs the TypeScript directly (type stripping): no build step, imports end in `.ts`, only erasable syntax (`erasableSyntaxOnly`), no `enum`, no parameter properties, no namespaces.
- `src/main.ts` is the only entry; it reads `parseCommand` from `src/cli.ts` and dispatches. A new job is a new command there, never a second entry file.
- Configuration comes only from `readEnv()` in `src/config/env.ts` (Zod). A new variable goes into its schema, into the Railway service and into the PR description in the same change. Error messages name the variable, never its value.
- Logs are JSON lines through `createLogger` from `src/lib/logger.ts`, with ids and counts only: never addresses, emails, tokens or the database URL.
- Failures throw `WorkerError(code, message)`; the code (`snake_case`, at most 80 characters) is what reaches `score_snapshots.error_code`. Postgres functions raise codes with `errcode = 'P0001'`, which `errorCode()` passes through.

| Folder | Holds |
| --- | --- |
| `src/db/` | `createSql` (postgres.js, the only database client), `Sql` and `JsonObject` types |
| `src/snapshot/` | `buildSnapshot` (the orchestrator), `snapshot.db.ts` (one function per SQL call) and `residential.ts` (marks the residential cells) |
| `src/test/` | test helpers only: `hasOsmium`, `prepareSourcesDir` (turns an `.osm` fixture into a cached extract) |
| `src/scoring/` | `categories.ts` (the 9 keys), `components.ts` (`linearPoints`, `weightedScore`), `score-module.ts`, `registry.ts`, `write-category-scores.ts` |
| `src/scoring/<score>/` | one folder per score (`green`, `noise`, …): its module, its pure formula and their tests; a context indicator (`seismic`, `investment`) has the same folder with its report section (and, for `investment`, its formula and importer), but no `ScoreModule` |
| `src/routing/` | `valhalla.ts` (`createValhallaClient`: `matrix`, `isochrones`, `route`, `tilesetDate`) and `walk-access.ts` (`computeWalkAccess`, `legsFromOrigin`, `refreshCityCategoryStats`) |
| `src/lib/concurrency.ts` | `mapWithConcurrency`, the bounded parallel map for calls to outside services |
| `src/scoring/accessibility/` | the transit score: GTFS and OpenStreetMap transit import, the reference weekday, the r5py job wrapper (`routing.ts`) and the formula |
| `src/report/` | `generateReport` (the report job), `report.db.ts`, `report-section.ts` (the section contract) and `sections.ts` (the registry) |
| `src/geocoding/` | the offline address geocoder built from the OSM extract: `loadCityGeocoder` (addresses and named streets of one city), `createLazyGeocoder` (loads on the first lookup and counts the results by precision), `createAddressGeocoder` and `parseAddress`; no outside service and no key. Precision `house` (exact number), `nearby_house` (closest number on the same side, within 6), `street` (middle of a street at most 300 m long); an address found in two distant places is refused |
| `src/sources/` | shared source helpers: `downloadOnce`, the OSM extract (`downloadOsmExtract`, `osmExtractDate`, `cityBoundingBox`, `extractOsmFeatures`, `readOsmFeatures`, `osmSourceRef`), GDAL rasters (`readRaster`, `sampleBilinear`, `sampleRasterAtPoints`), CSV (`readCsvObjects`), ZIP members (`readZipMember`, through `unzip`) and XLSX sheets (`readXlsxRows`, first sheet as rows of strings; `streamXlsxRows`, the same rows streamed for large sheets) |

## Walking routing

- Walking times come from a self-hosted Valhalla service (`VALHALLA_URL`), built from the same Geofabrik extract. It runs as its own Railway service from the official Valhalla image, never inside `worker/Dockerfile`; the worker only calls its HTTP API. Locally: `docker run -p 8002:8002 -v $PWD/valhalla:/custom_files -e tile_urls=https://download.geofabrik.de/europe/romania-latest.osm.pbf ghcr.io/valhalla/valhalla-scripted:<pinned tag>`, then `VALHALLA_URL=http://localhost:8002`.
- Modules receive the client as `context.router` (`null` when `VALHALLA_URL` is unset). A module that walks calls `computeWalkAccess` with its own targets (`key`, `poiCategories`, `searchRadiusM`, `maxCandidates`) instead of routing itself. A module whose targets are not points of `poi_features` (park outlines, Safety elements) lists its own candidates with a `private` function returning the same `cell_id, lng, lat, candidates` shape and routes them with `walkCellCandidates`; without a router it records `distance_method: 'straight_line'` and the straight line times `walk_detour_factor`.
- Walking speed is `params.<key>.walk_speed_kmh`, passed to Valhalla as the pedestrian `walking_speed`; car times use `costing: 'auto'` on the same client.
- Neighbour smoothing uses `smoothScores` and `listNeighbourPairs` from `src/scoring/smoothing.ts` (backed by `private.grid_cell_neighbours`); percentiles against the city use `private.cell_score_percentile`.

## Transit routing (Python)

- `worker/transit/route.py` is the only Python in the worker: an r5py (R5, Java 21) job the accessibility module runs as a subprocess, like `osmium`. It reads a `job.json` (OSM clip, GTFS archives or folders, reference date and window, origins, stops, destinations) and writes `walk_stops.csv`, `destinations.csv`, `itineraries.csv` and `matrix.bin` (big-endian `uint16` minutes, `65535` = not reachable). It never connects to the database; TypeScript reads its outputs and writes the rows.
- Its dependencies are pinned in `worker/transit/requirements.txt` and installed into the `/opt/transit` venv of the image, whose `bin` comes first on `PATH`, so the module calls `python3`. Java comes from the `eclipse-temurin:21.0.12_8-jre-noble` stage (an exact tag, bumped on purpose) of the `Dockerfile`; the R5 jar is downloaded and checksum-verified by r5py at build time into `XDG_CACHE_HOME`.
- The JVM is capped with r5py's `--max-memory 60%` (`R5_MAX_MEMORY` in `routing.ts`, passed as `r5py_arguments` in the job), leaving the rest of the container's RAM to Node and postgres.js. Size the Railway service from the largest city: the cell-to-cell matrix of București (~6,700 cells) is about 90 MB on top of the R5 network.
- Only pure helpers live outside `run()`, and they are tested with the standard library (`python3 -m unittest discover --start-directory worker/transit`), so CI needs no Java for them.

## Database access

- The worker connects with `DATABASE_URL` (the direct connection or the session pooler of the Supabase project, never the transaction pooler) as a role that can use the `private` schema. It is a secret: Railway variables only.
- SQL lives in `*.db.ts` files or in the score module, as tagged postgres.js queries with parameters; never string concatenation. JSON goes in with `sql.json(value)` and is unpacked with `jsonb_to_recordset` for bulk writes.
- Heavy geometry belongs in PostGIS functions in `private` (created by a migration, tested with pgTAP); TypeScript orchestrates and computes formulas that are easier to test in code.
- The engine schema is `private`, never exposed to PostgREST. Tables there still get RLS enabled, no client policies, and a pgTAP test proving `anon` and `authenticated` cannot read them.

## Data model the scores share

| Table | What a score does with it |
| --- | --- |
| `public.cities` | the 9 cities with `boundary` (the coverage area the grid covers); read only |
| `public.scoring_versions` | the active `online` formula: `weights` (the 9 category weights) and `params` (`cell_size_m` plus one object per score key, for example `params.green`); a version used by a snapshot is frozen, so a formula change is a new version |
| `public.score_snapshots` | one row per monthly build; `source_dates` and `stats` are written by the orchestrator |
| `private.grid_cells` | hexagons built with `ST_HexagonGrid` in EPSG:3844, key `size:i:j`, stable across snapshots; `private.grid_cell_neighbours(city_id, size_m)` returns each cell with its (up to 6) touching neighbours, for smoothing |
| `private.cell_scores` | one row per cell and snapshot; a score writes `categories.<key>` (0–100 or `null` for no data) and `inputs.<key>` (the audit trail) through `writeCategoryScores` |
| `private.poi_features` | points of interest frozen per snapshot, `category` in `snake_case`, `source_ref` such as `osm:node/123`; `area` holds the outline of points that are areas (parks), and walking targets use its point closest to the origin |
| `private.residential_areas` | OSM `landuse=residential` per snapshot; `private.mark_residential_cells` sets `cell_scores.is_residential` when at least `params.residential_min_share` of the cell is residential, and leaves it `null` (counted as residential) for a city without that data |
| `private.cell_walk_access` | per snapshot, cell and walking category: `t_nearest_s`, `d_nearest_m`, cumulative `n5`/`n10`/`n15`, `nearest_poi_id`, `distance_method`; written by `computeWalkAccess` |
| `private.city_category_stats` | per snapshot, city and walking category: `poi_count`, `is_covered` (enough points to score the category in that city), city average time and share of cells within 15 minutes |

The orchestrator computes `overall` (weighted mean of the categories that have data, `private.compute_overall_scores`) and `stats.cities.<slug>` (cells, residential cells, and per category `scored`, `no_data`, `avg` over residential cells, a 20-bin `histogram`) after every module ran. A score that needs extra city figures writes them under `stats.<key>` itself.

## Adding a score

1. Migration for the score's own tables in `private` (for example `private.green_areas`), each with `snapshot_id` when the data is frozen per snapshot, GiST indexes on geography columns, RLS enabled, and its pgTAP test. Add the score's parameters to `params.<key>` of the formula version in the same migration (or a new version if the current one is already used).
2. `src/scoring/<key>/<key>.formula.ts`: pure functions from measured values to component points (`linearPoints`) and the score (`weightedScore`), with a `*.test.ts` that reproduces the plan's worked example.
3. `src/scoring/<key>/<key>.module.ts`: exports a `ScoreModule` with `key` and `run(context)`. `run` parses `context.params` with a Zod schema (no thresholds hard-coded in TypeScript), imports its sources for `context.cities`, computes every cell of `context.snapshotId`, writes with `writeCategoryScores`, and returns `{ sourceDates }` (for example `{ osm: '2026-11-01', urban_atlas: '2021' }`). Cells without data get `score: null`, never a made-up value.
4. Register the module in `src/scoring/registry.ts`. Modules run in registry order; a module must not depend on another module's output except through tables the earlier module documents.
5. Run it for one city: `pnpm --filter @propertyscore/worker start build-snapshot --city timisoara --score <key>`.

Modules are idempotent: running a snapshot twice overwrites, never duplicates. Big source files (OSM extracts, GeoPackages) are cached under `SOURCES_DIR`, never stored in the database; only the derived rows are.

## Report sections

`generate-report --report <id>` turns a `pending` or `failed` row of `public.online_reports` into a `ready` one: `private.begin_online_report` checks the ready snapshot and finds the address's cell (codes `report_not_found`, `report_already_ready`, `no_ready_snapshot`, `outside_coverage`), the sections run, and `private.complete_online_report` freezes `result` (the sections plus `summarize_report_zone`: zone and per-category score, percentile among residential cells, city average, histogram, weights, source dates) with the snapshot and formula version. Any failure goes to `fail_online_report` with the error code, except `report_already_ready` and `report_in_progress` (a row another run has been generating for less than 15 minutes; after that it counts as stuck and can be started again).

- `begin_online_report` does not check payment: it accepts `pending_payment` rows so `create-report` works before the order flow exists. The order flow must move a report out of `pending_payment` only after the payment is confirmed and only then queue `generate-report`.

- A score that shows more than its number in the report adds a `ReportSection` (`key`, `build(context)`) in `src/scoring/<key>/<key>.report.ts`, returning a JSON object built from its own tables for the report's cell and snapshot (or `null` when there is nothing to show), and registers it with one line in `src/report/sections.ts`. The object lands in `result.<key>` and the frontend reads it from there.
- Every section starts with `schema_version: 1` and `status: 'scored' | 'no_data'`.
- A context indicator is a section without a score: its key is a `ContextKey` (`src/scoring/categories.ts`, today `seismic` and `investment`), never one of `CATEGORY_KEYS`, so it has no `ScoreModule`, writes nothing to `cell_scores` and never enters `overall`. Its `status` is `'context' | 'no_data'` (with a `reason` code when there is no data), and its data comes from its own `private` tables, read at the address when the report is generated. The context carries `reportId`, so a section can read the declared details of `online_reports` (`declared_area_m2`, `declared_rooms`).
- `readCellCategory` (`src/report/cell-category.ts`) returns the cell's score, `inputs.<key>` and city; `sectionParams(params, key)` picks `params.<key>` from the frozen formula. The context also carries `router` (the Valhalla client, `null` without `VALHALLA_URL`), so a section can route from the exact address.
- Sections registered today: `safety` (day and night of the cell, the waterfall at the address from `scoreAtPoint`, the nearest police, fire station, non-stop, embassy and station), `accessibility` (components, the cell's stops with their lines, the busiest lines at peak and the trips to `key_destinations` from `cell_transit`), `fifteen_minute` (`buildFifteenMinuteReport`: categories, groups, places, isochrones), `green`, `noise` (`assessNoiseAtAddress` plus the display bands and map radius), `air` (the 12 monthly means, limits, verdict and city average from `cell_air`), `industry` (`buildIndustryReport`), `education` (levels and the nearest institutions with walking distance from the address), `health` (the five layers with their nearest place) and the context sections `seismic` (the P100-1/2013 `ag` of the zone at the address and of each city's centre from `private.seismic_zones`, its hazard level from `params.seismic.levels`, `precision` `address` or `city`) and `investment` (asking price and rent around the address from `private.market_listings`, see below).
- Section output is frozen with the report: the frontend never queries the engine tables. Keep it small (the nearest features, a few measured values), never source geometries.
- `create-report --email <user> --lat <lat> --lon <lon> --address <text> [--locale ro|en]` inserts a pending report for a local user; it stands in for the order flow and is for local testing only.

## Health source imports

`import-health-sources [--dir <path>] [--city <slug> …] [--valid-from YYYY-MM-DD]` fills the two reference tables the Health score reads, from files in `--dir` (default `SOURCES_DIR/health`). It runs before `build-snapshot`, never inside it.

- `cnas/<city slug>/surse.csv` (`fisier,tip,data_listei,url_pagina,url_fisier,observatii`) lists the files of each CAS list as published; `tip` is `farmacii`, `medici-familie`, `ambulatoriu`, `spitale` or `dentist`. Each `.xlsx` or `.csv` file is read by `findTableColumns` (header row found by its provider name and address or locality columns) and `extractCnasProviders` (city rows only, by the locality column or the city name in the address, duplicates dropped), then `private.replace_cnas_providers` replaces that city, kind and list date with the rows of all its files together (a list with a file that cannot be read keeps its previous import). Addresses are geocoded later, by the snapshot. Other formats are logged and skipped.
- `upu-cpu.csv` (`oras,nume,nivel,pediatric,adresa,lat,lon,sursa_act,sursa_url`) is the list of hospitals with UPU or CPU. A row without coordinates is placed by the offline geocoder; one it cannot place is logged and left out. `private.sync_emergency_hospitals` keeps the open units that did not change (same name, level, pediatric flag, within 100 m), closes the others on `--valid-from` (default the first day of the current month) and opens the new ones then. A city with no row in the file keeps its units.

## Scores built so far

| Score | Tables (`private`) | Sources | Notes |
| --- | --- | --- | --- |
| `green` | `green_area_sources` (each OSM polygon), `green_areas` (merged public green, `shape` in EPSG:3844 for metric work) | OSM `leisure=park/garden/nature_reserve`, `landuse=forest/grass/recreation_ground/village_green`, `natural=wood`; playgrounds, dog parks and pitches go to `poi_features` as amenities | `merge_green_areas` dissolves the public sources and drops pieces under `min_polygon_ha`; `measure_green_cells` gives the green share per radius and the distance to the nearest area of at least `small_min_ha` and `large_min_ha`. With `context.router`, `green_park_walk_candidates` lists the nearest parks of each size within `small_zero_m` / `large_zero_m`, entered at their nearest edge, and the module walks to them on foot (Safety does the same for its walking types through `safety_walk_candidates`). Urban Atlas and the canopy component (`c5`) are not imported yet. Report section `green.report.ts`: the cell's shares and components plus `private.describe_green_surroundings` (the nearest parks, named or at least `small_min_ha`, and the polygons clipped to `wide_radius_m`) in `result.green`. |

## Investment context (market listings)

- Listings come only through `import-market-listings --source <code> --period YYYY-MM --file <csv> [--eur-ron <rate>]`, one CSV per source and month in a fixed contract (`MARKET_CSV_COLUMNS` in `src/scoring/investment/market-import.ts`): a provider's format is mapped to it before the import, never read directly. The worker never scrapes listing sites.
- An import is a `private.market_imports` row (unique per source and file SHA-256, so the same file is refused with `market_import_exists`) and its rows in `private.market_listings`, append-only. Rows are cleaned with `params.investment.plausible`, duplicate ids in the file are dropped, and rows more than `city_buffer_m` from every covered city are not stored; the counts land in `market_imports.rejected`. An interrupted import is started again from scratch with the same command.
- A report reads only the imports completed before its snapshot's `finished_at`, each listing as the latest of those imports saw it (`private.market_observations`), so a report generated again from the same snapshot gives the same figures. The formula (`investment.formula.ts`) dedupes listings across sources, drops Tukey outliers, widens the radius through `radii_m` until `sale_min_count` / `rent_min_count`, and falls back to the city summary.

## Working on several scores in parallel

Each score is built on its own branch on top of the foundation; these conventions keep the branches from colliding.

- **Shared files you may touch:** one line in `src/scoring/registry.ts` (modules listed in the order of `CATEGORY_KEYS`), one line in `src/report/sections.ts` for the score's report section, new `apt-get` packages appended to the single install line of `worker/Dockerfile`, new variables in `src/config/env.ts`. Changing `ScoreContext`, `ScoreModule`, `writeCategoryScores`, the orchestrator or the foundation tables goes through the foundation owner (the Green thread) in its own PR.
- **Migrations:** `supabase migration new <verb>_<object>` at the time you write it; the timestamp order between scores does not matter because no score migration depends on another. Add parameters only to your own key: `update public.scoring_versions set params = params || jsonb_build_object('<key>', …) where kind = 'online' and label = 'v1'`. That works only while `v1` is unused; once a snapshot used it, the freeze trigger refuses and the change becomes a new version.
- **Schema:** score tables, enums and functions go in `private`, so `database.types.ts` does not change and the branches do not conflict on it. pgTAP files are named `supabase/tests/scoring_<key>.test.sql`.
- **`is_residential`** belongs to the foundation: the orchestrator sets it from OSM land use (`src/snapshot/residential.ts`) before the modules run. Modules never write it.
- **`poi_features`** is shared: insert with `on conflict (snapshot_id, source_ref, category) do nothing`, use your own `category` codes and never delete rows of another category. The 15-minute thread owns the common categories (shops, schools, clinics, transit stops).
- **Walking distance:** the 15-minute thread owns the pedestrian routing (Valhalla, exposed as `context.router`, `null` when `VALHALLA_URL` is unset). When the router is `null`, use the straight-line distance times `params.<key>.walk_detour_factor` and record `distance_method: 'straight_line'` in `inputs.<key>`, so the report shows an approximate value.
- **Source dates:** `sourceDates.osm` is `osmExtractDate(extractPath, context.period)`, the replication date of the extract; other sources use their edition (`urban_atlas: '2021'`).
- **No data:** a cell without usable source data gets `score: null` and `inputs.<key>.reason` (a `snake_case` code such as `no_source_data`), never a guessed value.
- **City figures** beyond the shared ones go under `score_snapshots.stats.<key>.<city slug>`, written with `stats = stats || jsonb_build_object('<key>', …)`.

## Commands and tests

```
pnpm --filter @propertyscore/worker start build-snapshot [--period YYYY-MM] [--city <slug> …] [--score <key> …]
pnpm --filter @propertyscore/worker start generate-report --report <uuid>
pnpm --filter @propertyscore/worker start create-report --email <user> --lat <lat> --lon <lon> --address <text> [--locale ro|en]
pnpm --filter @propertyscore/worker start import-health-sources [--dir <path>] [--city <slug> …] [--valid-from YYYY-MM-DD]
pnpm --filter @propertyscore/worker start import-market-listings --source <code> --period YYYY-MM --file <csv> [--eur-ron <rate>]
pnpm test:worker          # worker Vitest suite; the database tests run when DATABASE_URL is set
```

- Unit tests sit next to the source (`*.test.ts`) and import from `vitest` explicitly.
- Tests that need the database use `describe.skipIf(!process.env.DATABASE_URL)`, run against the local stack only, and remove the rows they created (snapshots, and the grid cells of a city when it had none before). Test files run one at a time (`fileParallelism: false`) because only one snapshot can be building. CI runs them after `pnpm db:test` with the local stack's URL.
- A test that builds a snapshot gets its OSM data from a small `.osm` fixture in `src/sources/fixtures/` through `prepareSourcesDir`, never from the network.
- Tests that need `osmium` or GDAL use `describe.skipIf` on their presence; CI installs `osmium-tool` and `gdal-bin`.

## Deploy (Railway)

- One Railway service per long-running role, all from this folder's `Dockerfile`, built from the **repository root** (the lockfile lives there): Root Directory empty, `RAILWAY_DOCKERFILE_PATH=worker/Dockerfile`, Watch Paths `worker/**`, `supabase/migrations/**`, `pnpm-lock.yaml`.
- The snapshot builder is a cron service whose start command is the image default (`node src/main.ts build-snapshot`), scheduled monthly. Later document jobs get their own command and service.
- System tools the worker shells out to (`osmium-tool`, `unzip`, `python3`, `gdal-bin`, later Chromium) are installed in the `Dockerfile`, pinned by the base image's Debian release.
- The transit routing stack is also in the image: Java 21 copied from `eclipse-temurin:21.0.12_8-jre-noble`, the `/opt/transit` venv with `r5py` 1.1.7 from `worker/transit/requirements.txt`, and the R5 jar r5py downloads and checksum-verifies during the build (cached under `XDG_CACHE_HOME=/opt/cache`). The Temurin JRE runs on the bookworm base (glibc 2.36); the first Railway build is the check that the jar download works.
- Migrations reach production only through `deploy-db.yml`; deploy the worker after the migrations it needs are live.
