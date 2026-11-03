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
| `src/scoring/<score>/` | one folder per score (`green`, `noise`, …): its module, its pure formula and their tests |
| `src/report/` | `generateReport` (the report job), `report.db.ts`, `report-section.ts` (the section contract) and `sections.ts` (the registry) |
| `src/sources/` | shared source helpers: `downloadOnce`, the OSM extract (`downloadOsmExtract`, `osmExtractDate`, `cityBoundingBox`, `extractOsmFeatures`, `readOsmFeatures`, `osmSourceRef`) |

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
| `private.poi_features` | points of interest frozen per snapshot, `category` in `snake_case`, `source_ref` such as `osm:node/123` |
| `private.residential_areas` | OSM `landuse=residential` per snapshot; `private.mark_residential_cells` sets `cell_scores.is_residential` when at least `params.residential_min_share` of the cell is residential, and leaves it `null` (counted as residential) for a city without that data |

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
- Section output is frozen with the report: the frontend never queries the engine tables. Keep it small (the nearest features, a few measured values), never source geometries.
- `create-report --email <user> --lat <lat> --lon <lon> --address <text> [--locale ro|en]` inserts a pending report for a local user; it stands in for the order flow and is for local testing only.

## Scores built so far

| Score | Tables (`private`) | Sources | Notes |
| --- | --- | --- | --- |
| `green` | `green_area_sources` (each OSM polygon), `green_areas` (merged public green, `shape` in EPSG:3844 for metric work) | OSM `leisure=park/garden/nature_reserve`, `landuse=forest/grass/recreation_ground/village_green`, `natural=wood`; playgrounds, dog parks and pitches go to `poi_features` as amenities | `merge_green_areas` dissolves the public sources and drops pieces under `min_polygon_ha`; `measure_green_cells` gives the green share per radius and the distance to the nearest area of at least `small_min_ha` and `large_min_ha`. Urban Atlas and the canopy component (`c5`) are not imported yet. |

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
pnpm test:worker          # worker Vitest suite; the database tests run when DATABASE_URL is set
```

- Unit tests sit next to the source (`*.test.ts`) and import from `vitest` explicitly.
- Tests that need the database use `describe.skipIf(!process.env.DATABASE_URL)`, run against the local stack only, and remove the rows they created (snapshots, and the grid cells of a city when it had none before). Test files run one at a time (`fileParallelism: false`) because only one snapshot can be building. CI runs them after `pnpm db:test` with the local stack's URL.
- A test that builds a snapshot gets its OSM data from a small `.osm` fixture in `src/sources/fixtures/` through `prepareSourcesDir`, never from the network.
- Tests that need `osmium` use `describe.skipIf` on its presence; CI installs `osmium-tool`.

## Deploy (Railway)

- One Railway service per long-running role, all from this folder's `Dockerfile`, built from the **repository root** (the lockfile lives there): Root Directory empty, `RAILWAY_DOCKERFILE_PATH=worker/Dockerfile`, Watch Paths `worker/**`, `supabase/migrations/**`, `pnpm-lock.yaml`.
- The snapshot builder is a cron service whose start command is the image default (`node src/main.ts build-snapshot`), scheduled monthly. Later document jobs get their own command and service.
- System tools the worker shells out to (`osmium-tool`, later `gdal-bin` and Chromium) are installed in the `Dockerfile`, pinned by the base image's Debian release.
- Migrations reach production only through `deploy-db.yml`; deploy the worker after the migrations it needs are live.
