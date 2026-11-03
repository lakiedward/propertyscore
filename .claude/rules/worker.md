---
paths:
  - 'worker/**'
  - 'supabase/migrations/**'
  - 'supabase/tests/scoring*.test.sql'
---

# Worker rules: SmartCheck scoring engine and document jobs

`worker/` is the trusted backend that runs outside Supabase (decision D20): the monthly SmartCheck snapshot builder today, the report generation and PDF jobs later. It is a pnpm workspace package (`@propertyscore/worker`) deployed to Railway from `worker/Dockerfile`. Everything in `CLAUDE.md` still applies (no comments, no secrets in the frontend, migrations only, tests only on request); the React, i18n and styling rules do not.

## Runtime and layout

- Node 24 runs the TypeScript directly (type stripping): no build step, imports end in `.ts`, only erasable syntax (`erasableSyntaxOnly`), no `enum`, no parameter properties, no namespaces.
- `src/main.ts` is the only entry; it reads `parseCommand` from `src/cli.ts` and dispatches. A new job is a new command there, never a second entry file.
- Configuration comes only from `readEnv()` in `src/config/env.ts` (Zod). A new variable goes into its schema, into the Railway service and into the PR description in the same change. Error messages name the variable, never its value.
- Logs are JSON lines through `createLogger` from `src/lib/logger.ts`, with ids and counts only: never addresses, emails, tokens or the database URL.
- Failures throw `WorkerError(code, message)`; the code (`snake_case`, at most 80 characters) is what reaches `score_snapshots.error_code`. Postgres functions raise codes with `errcode = 'P0001'`, which `errorCode()` passes through.

| Folder | Holds |
| --- | --- |
| `src/db/` | `createSql` (postgres.js, the only database client), `Sql` and `JsonObject` types |
| `src/snapshot/` | `buildSnapshot` (the orchestrator) and `snapshot.db.ts` (one function per SQL call) |
| `src/scoring/` | `categories.ts` (the 9 keys), `components.ts` (`linearPoints`, `weightedScore`), `score-module.ts`, `registry.ts`, `write-category-scores.ts` |
| `src/scoring/<score>/` | one folder per score (`green`, `noise`, …): its module, its pure formula and their tests |
| `src/scoring/accessibility/` | the transit score: GTFS and OpenStreetMap transit import, the reference weekday, the r5py job wrapper (`routing.ts`) and the formula |
| `src/sources/` | shared source helpers: `downloadOnce`, the OSM extract (`downloadOsmExtract`, `osmExtractDate`, `cityBoundingBox`, `extractOsmFeatures`, `readOsmFeatures`, `osmSourceRef`) |

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
| `private.poi_features` | points of interest frozen per snapshot, `category` in `snake_case`, `source_ref` such as `osm:node/123` |

The orchestrator computes `overall` (weighted mean of the categories that have data, `private.compute_overall_scores`) and `stats.cities.<slug>` (cells, residential cells, and per category `scored`, `no_data`, `avg` over residential cells, a 20-bin `histogram`) after every module ran. A score that needs extra city figures writes them under `stats.<key>` itself.

## Adding a score

1. Migration for the score's own tables in `private` (for example `private.green_areas`), each with `snapshot_id` when the data is frozen per snapshot, GiST indexes on geography columns, RLS enabled, and its pgTAP test. Add the score's parameters to `params.<key>` of the formula version in the same migration (or a new version if the current one is already used).
2. `src/scoring/<key>/<key>.formula.ts`: pure functions from measured values to component points (`linearPoints`) and the score (`weightedScore`), with a `*.test.ts` that reproduces the plan's worked example.
3. `src/scoring/<key>/<key>.module.ts`: exports a `ScoreModule` with `key` and `run(context)`. `run` parses `context.params` with a Zod schema (no thresholds hard-coded in TypeScript), imports its sources for `context.cities`, computes every cell of `context.snapshotId`, writes with `writeCategoryScores`, and returns `{ sourceDates }` (for example `{ osm: '2026-11-01', urban_atlas: '2021' }`). Cells without data get `score: null`, never a made-up value.
4. Register the module in `src/scoring/registry.ts`. Modules run in registry order; a module must not depend on another module's output except through tables the earlier module documents.
5. Run it for one city: `pnpm --filter @propertyscore/worker start build-snapshot --city timisoara --score <key>`.

Modules are idempotent: running a snapshot twice overwrites, never duplicates. Big source files (OSM extracts, GeoPackages) are cached under `SOURCES_DIR`, never stored in the database; only the derived rows are.

## Working on several scores in parallel

Each score is built on its own branch on top of the foundation; these conventions keep the branches from colliding.

- **Shared files you may touch:** one line in `src/scoring/registry.ts` (modules listed in the order of `CATEGORY_KEYS`), new `apt-get` packages appended to the single install line of `worker/Dockerfile`, new variables in `src/config/env.ts`. Changing `ScoreContext`, `ScoreModule`, `writeCategoryScores`, the orchestrator or the foundation tables goes through the foundation owner (the Green thread) in its own PR.
- **Migrations:** `supabase migration new <verb>_<object>` at the time you write it; the timestamp order between scores does not matter because no score migration depends on another. Add parameters only to your own key: `update public.scoring_versions set params = params || jsonb_build_object('<key>', …) where kind = 'online' and label = 'v1'`. That works only while `v1` is unused; once a snapshot used it, the freeze trigger refuses and the change becomes a new version.
- **Schema:** score tables, enums and functions go in `private`, so `database.types.ts` does not change and the branches do not conflict on it. pgTAP files are named `supabase/tests/scoring_<key>.test.sql`.
- **`is_residential`** belongs to the foundation: the orchestrator sets it from OSM land use before the modules run. Modules never write it.
- **`poi_features`** is shared: insert with `on conflict (snapshot_id, source_ref, category) do nothing`, use your own `category` codes and never delete rows of another category. The 15-minute thread owns the common categories (shops, schools, clinics, transit stops).
- **Walking distance:** the 15-minute thread owns the pedestrian routing (Valhalla, exposed as `context.router`, `null` when `VALHALLA_URL` is unset). When the router is `null`, use the straight-line distance times `params.<key>.walk_detour_factor` and record `distance_method: 'straight_line'` in `inputs.<key>`, so the report shows an approximate value.
- **Source dates:** `sourceDates.osm` is `osmExtractDate(extractPath, context.period)`, the replication date of the extract; other sources use their edition (`urban_atlas: '2021'`).
- **No data:** a cell without usable source data gets `score: null` and `inputs.<key>.reason` (a `snake_case` code such as `no_source_data`), never a guessed value.
- **City figures** beyond the shared ones go under `score_snapshots.stats.<key>.<city slug>`, written with `stats = stats || jsonb_build_object('<key>', …)`.

## Commands and tests

```
pnpm --filter @propertyscore/worker start build-snapshot [--period YYYY-MM] [--city <slug> …] [--score <key> …]
pnpm test:worker          # worker Vitest suite; the database tests run when DATABASE_URL is set
```

- Unit tests sit next to the source (`*.test.ts`) and import from `vitest` explicitly.
- Tests that need the database use `describe.skipIf(!process.env.DATABASE_URL)`, run against the local stack only, and remove the rows they created (snapshots, and the grid cells of a city when it had none before). Test files run one at a time (`fileParallelism: false`) because only one snapshot can be building. CI runs them after `pnpm db:test` with the local stack's URL.
- Tests that need `osmium` use `describe.skipIf` on its presence; CI installs `osmium-tool`.

## Deploy (Railway)

- One Railway service per long-running role, all from this folder's `Dockerfile`, built from the **repository root** (the lockfile lives there): Root Directory empty, `RAILWAY_DOCKERFILE_PATH=worker/Dockerfile`, Watch Paths `worker/**`, `supabase/migrations/**`, `pnpm-lock.yaml`.
- The snapshot builder is a cron service whose start command is the image default (`node src/main.ts build-snapshot`), scheduled monthly. Later document jobs get their own command and service.
- System tools the worker shells out to (`osmium-tool`, `unzip`, `python3`, later `gdal-bin` and Chromium) are installed in the `Dockerfile`, pinned by the base image's Debian release.
- The transit routing stack is also in the image: Java 21 copied from `eclipse-temurin:21.0.12_8-jre-noble`, the `/opt/transit` venv with `r5py` 1.1.7 from `worker/transit/requirements.txt`, and the R5 jar r5py downloads and checksum-verifies during the build (cached under `XDG_CACHE_HOME=/opt/cache`). The Temurin JRE runs on the bookworm base (glibc 2.36); the first Railway build is the check that the jar download works.
- Migrations reach production only through `deploy-db.yml`; deploy the worker after the migrations it needs are live.
