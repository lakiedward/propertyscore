# Property Score frontend — Claude Code instructions

## Project overview

React 19 single-page application for Property Score (TypeScript, Vite), with Supabase as the whole backend: Postgres, Auth, Storage and Edge Functions. There is no custom API server. Authenticated users manage and score properties on list, detail and form screens; mobile first, comfortable on desktop. The UI is **bilingual, Romanian (default) and English**: every visible string goes through i18next, and no feature merges with only one language.

`IMPLEMENTATION_PLAN.md` is the product specification for step-based work: routes, page contents, user flows, data model, state machines, business rules and delivery phases. Check it before building a feature with `/implement <step> <design>`. `/plan-from-design <design> <pages>` is the exception: it plans and builds a selection of pages with the design as the only product specification (data, schema and rules derived from the screens) and does not read or update `IMPLEMENTATION_PLAN.md`. Both skills live in `.claude/skills/`. This file and the rule files in `.claude/rules/` are the operative coding rules and workflow. `SETUP_PLAN.md` is the decision record that explains *why* each choice was made and which alternatives were rejected. When a skill, a design mock or existing code disagrees with the rules, the rules win; when a rule turns out to be wrong, fix the rule and the matching section of `SETUP_PLAN.md` in the same change.

## Key rules

- **The browser is untrusted. Row Level Security is the authorization layer.** Every table has RLS enabled in the migration that creates it, with tested policies. A check in the UI (hidden button, route guard) is UX only, never the protection.
- **Supabase stays out of the UI.** Only `src/lib/supabase/**` and `src/features/*/api/**` import `@supabase/supabase-js` or the client; components use the feature's query and mutation hooks. ESLint enforces this.
- **Never hardcode user-visible text.** Every string goes through `t()` with keys in both `src/i18n/locales/ro` and `src/i18n/locales/en`. The backend returns codes, the frontend translates them.
- **Never put a secret in the frontend.** Only the Supabase publishable key reaches the browser; the secret (service-role) key lives in Edge Functions and CI secrets, never in a `VITE_` variable.
- **The schema changes only through migrations** in `supabase/migrations/`, followed by `pnpm db:types`. Never edit a hosted project in the dashboard, never hand-edit `database.types.ts`.
- **Never write comments, in any file.** No explanatory comments, section headers, TODOs, commented-out code or JSDoc in TypeScript, TSX (`{/* */}`), CSS, SQL migrations and pgTAP tests, Edge Functions, scripts, JSON/JSONC, YAML, TOML, email templates or dotfiles such as `.gitignore`, `.env.example` and `.editorconfig`. Code and configuration must be self-documenting through names, types and small functions; explain in the conversation or the PR description instead. The only lines allowed in comment syntax are functional directives a tool reads (`/// <reference types="vite/client" />`, `// @ts-expect-error <reason>`, `// eslint-disable-next-line <rule> -- <reason>`, `// prettier-ignore`) and the headers of generated files (`src/routeTree.gen.ts`, `src/lib/supabase/database.types.ts`, shadcn files the CLI writes). SQL that needs a description for the database itself uses `comment on …`, which is data, not a comment.
- **Do NOT create summary or changelog files** (no `CHANGES.md`, `SUMMARY.md`, etc.). Explain changes in the conversation.
- **Do NOT run tests unless explicitly asked.** Never run `pnpm test`, `pnpm test:run`, `pnpm test:e2e`, `pnpm test:worker` or `pnpm db:test` without a user request. Approving an `/implement` proposal or a `/plan-from-design` plan counts as a request for `pnpm test:run` and `pnpm db:test` for the steps it covers; `pnpm test:e2e` still needs its own request.
- **Keep the workspace clean.** No temporary files unless required for the implementation.
- **Never guess or assume.** If you don't have enough information about an API, a value, a file location, a library behaviour or the user's intent, search the project first (grep, read more files, follow imports). For library questions read the current official docs (Supabase, TanStack, React, i18next, shadcn/ui); for the live database use the Supabase MCP server's read tools (`list_tables`, `get_advisors`, `search_docs`). If the answer is still unclear, ask the user. A confident-sounding guess is worse than admitting uncertainty.
- **Do not add libraries.** Add a dependency only when a feature needs it, and record it under Tech stack below. Deliberately not installed: Next.js or any SSR framework, Redux / RTK / MobX, SWR, Axios, Formik, `react-intl` / Lingui, MUI / Ant / Chakra or any second component library, CSS-in-JS, `moment` / `dayjs`, Jest, Cypress, Enzyme, a second icon set, a second toast library. Zustand, `recharts` and `@tanstack/react-table` are pre-approved but added only when the first feature needs them.

## Rule files

The detailed rules live in `.claude/rules/` and load automatically when a matching file is opened. Read the matching rule file before writing or reviewing that kind of code, even when no file of that kind is open yet.

| Rule file                    | Covers                                                                                                         | Applies to                                                                                                      |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `.claude/rules/react.md`     | TypeScript, components, hooks, state, forms, routing, accessibility, feature boundaries                        | `src/**/*.ts`, `src/**/*.tsx`                                                                                   |
| `.claude/rules/data-api.md`  | data-access functions, TanStack Query, errors, auth and session, environment, logging and Sentry               | `src/features/*/api/**`, `src/features/auth/**`, `src/lib/**`, `src/app/**`, `src/config/**`, `src/routes/**`   |
| `.claude/rules/architecture.md` | what is integrated (Supabase, the Railway worker and services, Netlify, providers) and how to choose where each part of a feature runs | `supabase/**`, `worker/**`, `src/features/*/api/**`, `netlify.toml`, `.github/**` |
| `.claude/rules/supabase.md`  | migrations, RLS, Postgres functions, generated types, Storage, Edge Functions, auth email templates, pgTAP     | `supabase/**`, `src/lib/supabase/**`                                                                            |
| `.claude/rules/i18n.md`      | Romanian and English translations, keys, plurals, formatting, diacritics                                       | `src/i18n/**`, `src/**/*.tsx`, `supabase/templates/**`, `scripts/check-translations.ts`                         |
| `.claude/rules/styling.md`   | Tailwind 4, tokens, shadcn/ui, icons, fonts, responsive layout                                                 | `src/**/*.tsx`, `src/**/*.css`, `components.json`                                                               |
| `.claude/rules/design-system.md` | PropertyScore design system: token values, density modes, component catalogue and where each lives, usage rules | `src/**/*.tsx`, `src/**/*.css`, `components.json`                                                               |
| `.claude/rules/testing.md`   | Vitest, React Testing Library, MSW, factories                                                                  | `src/**/*.test.ts`, `src/**/*.test.tsx`, `src/test/**`, `vitest.config.ts`                                      |
| `.claude/rules/e2e.md`       | the Playwright suite against the local Supabase stack                                                          | `e2e/**`, `playwright.config.ts`                                                                                |
| `.claude/rules/worker.md`    | the SmartCheck scoring worker: runtime, database access, shared scoring tables, adding a score, Railway deploy | `worker/**`, `supabase/migrations/**`, `supabase/tests/scoring*.test.sql`                                       |

## Tech stack

Pin exact versions when installing (`pnpm add -E`) and record them here.

- **Runtime:** Node 24 LTS (`.nvmrc`, `engines`), pnpm with a committed lockfile
- **Build:** Vite 8 with `@vitejs/plugin-react` and the React Compiler (`babel-plugin-react-compiler`)
- **Framework:** React 19.3, function components and hooks only; `react-error-boundary` for the root error boundary
- **Language:** TypeScript 6, `strict` plus `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`; path alias `@/*` → `src/*`
- **Routing:** TanStack Router 1 (file-based, `@tanstack/router-plugin/vite`, `autoCodeSplitting`)
- **Server state:** TanStack Query 5 (+ devtools in local only)
- **Forms:** React Hook Form 7 + Zod 4 + `@hookform/resolvers`
- **Backend client:** `@supabase/supabase-js` 2 typed with the generated `Database`; Supabase CLI for the local stack, migrations, type generation and pgTAP
- **UI:** Tailwind CSS 4 (`@tailwindcss/vite`), shadcn/ui on Radix primitives (`radix-ui`), `class-variance-authority`, `cn` (shadcn's drop-in for `clsx` + `tailwind-merge`, re-exported from `@/lib/utils`), `tw-animate-css`, `lucide-react`, `sonner`, self-hosted fonts through `@fontsource-variable/manrope` 5.3.0 (body and headings) and `@fontsource-variable/sora` 5.3.0 (brand wordmarks), each with `latin-ext`; visual language from the PropertyScore design system (`.claude/rules/design-system.md`)
- **Maps:** `maplibre-gl` 6.14.0 with OpenFreeMap vector tiles (`tiles.openfreemap.org`, no key), loaded lazily through `components/map/map-canvas.tsx`, worker set with `setWorkerUrl` and Vite's `?worker&url`
- **i18n:** `i18next` + `react-i18next`, `date-fns` locales only for the date picker
- **Monitoring:** `@sentry/react` + `@sentry/vite-plugin`
- **Bot protection:** Cloudflare Turnstile for sign-up, sign-in, password reset and resend, **switched off for now** (2026-11-04): `VITE_TURNSTILE_SITE_KEY` is empty and `[auth.captcha] enabled = false`, so the widget is not rendered and no token is asked for. The code stays (script loaded on demand by `features/auth/components/captcha.tsx`, no npm package); turning it back on means a site key in `VITE_TURNSTILE_SITE_KEY` and `enabled = true` with the secret in `[auth.captcha]` (Cloudflare's always-pass test keys locally, the real secret only in the hosted dashboard)
- **Unit and component tests:** Vitest, React Testing Library, `@testing-library/user-event`, `@testing-library/jest-dom`, MSW 2
- **End-to-end:** Playwright
- **Database tests:** pgTAP through `supabase test db`
- **Worker** (`worker/`, pnpm workspace package `@propertyscore/worker`, `.claude/rules/worker.md`): Node 24 running TypeScript directly, `postgres` 3.4.9 (postgres.js) as its only database client, Zod 4, Vitest, `hyparquet` 1.32.0 (reads the EEA air quality station files, published only as Parquet); PostGIS (`extensions.postgis`) for the scoring grid; `osmium-tool` and `unzip` in its Docker image for OpenStreetMap extracts, GTFS archives and XLSX workbooks (read by `worker/src/sources/xlsx.ts`, no spreadsheet library), `gdal-bin` for the CAMS (GRIB) and EEA (GeoTIFF) air rasters, `catdoc` (`xls2csv`) and `poppler-utils` (`pdftotext`) for the CAS provider lists published as XLS or PDF; transit routing in `worker/transit/` with Python 3 and `r5py` 1.1.7 (R5 jar fetched and checksum-verified by r5py at image build) on Java 21 from `eclipse-temurin:21.0.12_8-jre-noble`; deployed to Railway from `worker/Dockerfile`
- **Quality:** ESLint 9 flat config (`typescript-eslint` strict type-checked, `react-hooks`, `react-refresh`, `jsx-a11y`, TanStack Query and Router plugins, `eslint-plugin-i18next`, `testing-library`, `playwright`), Prettier 3 + `prettier-plugin-tailwindcss`, EditorConfig, Knip, lefthook
- **Delivery:** GitHub Actions (`ci.yml` on pull requests; `deploy.yml` on a `vX.Y.Z` tag: `supabase db push`, then the site built and published to Netlify with `netlify-cli` 27.16.2 run through `pnpm dlx`, so the database and the site change together), Netlify (`netlify.toml`: build, SPA fallback, security headers; `ignore = "exit 0"` skips Git-triggered builds, so the site changes only on a tag)

## Implementation status

Scaffolding from `SETUP_PLAN.md` section 25 is done through step 10:

- Vite + React + TypeScript project, Node 24 (`.nvmrc`), all core packages from the Tech stack.
- shadcn primitives in `src/components/ui/` (`accordion`, `alert`, `badge`, `button` with the design-system variants, `card`, `collapsible`, `dialog`, `dropdown-menu`, `field`, `input`, `label`, `separator`, `sheet`, `skeleton`, `slider`, `sonner`, `table`, `tabs`, `toggle`, `toggle-group`), the design-system tokens and fonts in `globals.css`, the brand components in `src/components/brand/`, the design-system components the online report uses (`feedback/status-pill`, `map/` with MapLibre, `trust/score-value`) and the layout components in `src/components/layout/`.
- Supabase: first migration `create_profiles` (with `locale`, the sign-up trigger, `unaccent`, RLS), pgTAP tests, `seed.sql` with the three test users, generated `database.types.ts`, bilingual auth email templates for `confirmation`, `recovery` and `email_change`.
- App wiring: `config/env.ts`, the Supabase client and error mapping, `AppError`, `logger`, Sentry, the query client, the router with `_site` (public home in the site layout), `_public` (login, sign-up), `_authenticated` (sign-in guard; `/account/*` in the user panel and `/admin/*` in the admin panel, guarded by the `admin` role) and `_report` (the online report) route groups.
- Features: `auth` (split-screen auth layout from the Login design: sign-in, sign-up with name, phone, terms and a `redirect` like login (the phone is required, accepted as a Romanian or `+` international number and stored in E.164 in `profiles.phone` by the sign-up trigger through `private.normalize_phone`, migration `add_phone_to_profiles`; not verified by SMS, and Google accounts start without one), Google sign-in through Supabase OAuth (a translated notice while the provider is turned off; no Apple or Facebook), `/auth/callback` for OAuth (PKCE), `/auth/confirm` for the email links (confirmation, recovery, email change) verified by token hash so they work on any device, email confirmation required (on locally too, emails in Mailpit) with a "Verifică-ți emailul" screen, resend with a 60 s countdown on that screen, on sign-in and on the reset screen, "Există deja un cont" for a registered email, passwords of 8+ characters with a letter and a digit, Turnstile CAPTCHA support (switched off for now), other sessions signed out after a password reset, password reset at `/password-reset` and `/password-reset/new` with an "Ai uitat parola?" link on login, sign-out from the user menu, `/account/settings` for users and admins (change the password with the current one and no email code, `secure_password_change = false`; an account created through Google sets a first password; delete the account through the `delete_own_account` RPC after re-entering the password, or the email for an account without one, refused for the last admin; migration `create_account_self_service` with `account_has_password`, pgTAP in `account_self_service.test.sql`), `useAuth` with `roles` and `hasRole`, role-based landing: a safe `redirect` first, otherwise `/admin` for admins and `/account` for users), `profile` (locale sync, language switcher with menu and segmented variants), `home` (the public home page at `/`, built with `/plan-from-design`), `listings` (published listings on a map and list), `publish` (the owners' publish-listing landing page at `/publish`, built with `/plan-from-design`; the active step is the `?step=` search param; its CTAs point to the steps section until the listing form exists) and `online-reports` (below). Feature namespaces `home`, `listings`, `publish` and `onlineReports` load lazily per language (`loadFeatureNamespaces` in the route's `beforeLoad`); `common` and `auth` are bundled.
- Roles: migrations `create_user_roles` (`app_role` enum, `user_roles` readable by its owner and by admins, no client writes, `private.has_role`), `add_access_token_hook` (the `user_roles` claim in every token, enabled in `config.toml`), `read_oauth_names_in_new_user`, `add_user_app_role` and `assign_user_role_to_new_accounts` (`app_role` is `user` and `admin`; the sign-up trigger gives every new account a `user` row, existing accounts were backfilled), pgTAP in `user_roles.test.sql`; seed admin `admin.ro@example.test`. An admin is made by changing that row to `admin` with SQL run as the service role (no admin screen yet), and the change reaches the browser with the user's next token; inspector, expert and partner come later as new `app_role` values.
- Panels: `AccountShell` and `AdminShell` (`components/layout/`, from `PS AppShell` and `PS AdminShell`) with the forest collapsible sidebar, the mobile top bar with tabs and the `UserMenu` (`features/profile`); every sidebar item has an empty route (only a hidden page heading) until its page is built; no notification bell, counts or admin search yet.
- Supabase: migration `create_listings` (enums, `listings` with public-read RLS, public `listing-photos` bucket), 12 seeded listings with a `cover.webp` and a 240×192 `thumb.webp` each in `supabase/seed-storage/` (no Supabase image transformation: it is a paid feature), pgTAP tests. Migration `add_profile_names_and_restrict_listing_columns` (`profiles.full_name` from the sign-up metadata, anon reads every listing column except `owner_id`, feed index with an `id` tie-breaker).
- i18n: `common`, `auth`, `listings`, `home`, `publish` and `onlineReports` namespaces in `ro` and `en`, typed keys, `format.ts` (with `formatPrice`), translated Zod messages.
- Tooling: ESLint, Prettier, EditorConfig, Vitest + RTL + MSW, Playwright, Knip, lefthook, `scripts/check-translations.ts`, and the `ci.yml` / `deploy.yml` workflows.
- SmartCheck engine foundation (S16, partial): migrations `create_cities` (PostGIS, the 9 cities with a circular coverage area each), `create_scoring_versions_and_snapshots` (formula `v1` with the design's weights, snapshot lifecycle functions) and `create_scoring_grid` (`private.grid_cells`, `cell_scores`, `poi_features`, grid, zone score and stats functions), with pgTAP tests; migration `create_residential_areas` (residential cells from OSM land use, set by the orchestrator); the `worker/` package with the `build-snapshot` command, the score-module contract and the shared OSM extract helpers. Score modules registered: `green` (migration `create_green_areas`, OSM only; with `context.router` the walk to the nearest park of at least 0.5 ha and 5 ha is routed on foot from `private.green_park_walk_candidates`, otherwise the straight line times `walk_detour_factor`; Safety routes its Police and Fire stations the same way through `private.safety_walk_candidates`; their report sections walk from the exact address the same way). Air score engine: migration `create_air_quality_layers` (`private.air_stations`, `air_station_months`, `air_city_calibration`, `cell_air`, `upsert_air_stations`, `params.air` on `v1`) and the `air` module (CAMS analysis from the ADS API, calibrated with the EEA/ANPM stations, refined with an optional EEA 1 km map); the report tab is not built yet. No admin policies on these tables yet. Migration `create_source_extracts_bucket` (private Storage bucket `source-extracts`, no policies, with `source_extracts.test.sql`): the snapshot service on Railway downloads the monthly OSM extract from it with `OSM_EXTRACT_API_KEY`, because Geofabrik refuses Railway's IPs, and with `SOURCE_MIRROR_URL` set also the SIIIR register and schooling plan (`education/`), because data.gov.ro refuses them too.
- SmartCheck health sources: migration `create_health_source_imports` (`private.replace_cnas_providers`, `private.sync_emergency_hospitals`) with `scoring_health_import.test.sql`, and the worker command `import-health-sources` that loads the CAS provider lists (`.xlsx`/`.csv`) and the UPU/CPU hospital list from `SOURCES_DIR/health` into `private.cnas_providers` and `private.emergency_hospitals`. The real lists are not imported yet.
- SmartCheck noise score (engine only, no UI): migration `create_noise_layers` (`private.noise_datasets`, `noise_contours`, `noise_snapshot_datasets`, `noise_sources`, `noise_buildings`, the sampling, nearest-source and map-layer functions, `params.noise` on `v1`) with `scoring_noise.test.sql`; `worker/src/scoring/noise/` (OSM proxy calibrated by parameters, strategic-map bands when a dataset is imported, cell = median of 7 points, `assessNoiseAtAddress` for the frozen report block). No importer for the strategic-map files yet.
- SmartCheck transit sources: migration `add_transit_feed_sources` fills `private.transit_feed_sources` with one GTFS feed for 8 cities (București with Metrorex; Sibiu through the Mobility Database mirror because `tursib.ro` blocks automated downloads); Târgu Mureș has no current feed and is scored from OpenStreetMap only. No operator publishes a licence, so `license` stays null. `private.key_destinations` is still empty.
- SmartCheck education score (engine only, no UI): migrations `create_education_level_enum`, `create_education_institutions` (`private.education_institutions`, the register upsert, POI copy and candidate functions, `params.education` on `v1`) `add_education_register_source` (the SIIIR edition URL and the SIRUTA codes of each city) and `add_education_schooling_plan_source` (`plan_url`, null until a stable link is known: the SIIIR schooling plan is then read from `SOURCES_DIR/education/siiir-plan-<school year>.xlsx` when present) with `scoring_education.test.sql`; `worker/src/scoring/education/` (levels and teaching languages from the SIIIR schooling plan, read in a stream, with the unit name as fallback, special, post-secondary and military schools kept as `excluded`, SIIIR ↔ OSM matching by name, walking times per level, neighbour smoothing). Register units without an OSM match are placed by the offline OSM geocoder (`worker/src/geocoding/`, `location_precision = 'geocoded'`); those it cannot place stay unplaced and outside the score, counted in `stats.education.<city>.unplaced`.
- SmartCheck accessibility score (engine only, report section without UI): `worker/transit/route.py` (r5py) routes the cells to the stops and to `private.key_destinations` (66 seeded places, a centre, station, university, emergency hospital, mall and airport per city); the snapshot keeps its OSM clip and GTFS archives in `private.transit_routing_bundles`, and the report reruns the routing from the address on that network for the walk, wait, ride and line of each trip.
- SmartCheck seismic context (engine only, no UI, never in the zone score): migration `create_seismic_zones` (`private.seismic_zones`, the P100-1/2013 `ag` zones digitized by CCERS UTCB and clipped to the 9 coverage areas, `seismic_hazard_at`, `seismic_city_hazards`, `params.seismic` on `v1`) with `scoring_seismic.test.sql`; the report section `worker/src/scoring/seismic/` writes `result.seismic` (value at the address or for the city, hazard level, the 9 cities for comparison). Building risk lists and the code period from the construction year are not built yet.
- SmartCheck investment context (engine only, no UI, never in the zone score): migration `create_market_listings` (`private.market_imports`, `market_listings`, the insert, observation, comparables and city summary functions, `params.investment` on `v1`) with `scoring_investment.test.sql`; `worker/src/scoring/investment/` (the `import-market-listings` command for a provider's CSV in our contract, the formula: median asking €/m² within 800 m and its P25–P75 interval, the estimate for the declared area, the median rent, the gross yield against the city, a 200 €/m² histogram, the change over a year and the days listed) writes `result.investment`. No market data source is licensed yet, so every report shows `no_data` until a first import.
- SmartCheck online report (S16, partial): migration `create_online_reports` (`online_reports` readable only by its owner, `private.begin_online_report` / `complete_online_report` / `fail_online_report` and `summarize_report_zone`, which freezes the zone score, percentiles, city averages and histograms from the ready snapshot), with pgTAP tests; the worker commands `generate-report` and `create-report` (a local stand-in for the order flow) and the `REPORT_SECTIONS` registry; the feature `online-reports` with the report page at `/check/result/$reportId` in the `_report` layout (the app shell header, hidden when printing; signed-in owner, or anyone with a share link, chapter tabs in `?tab=`, summary, one chapter per score, city distribution, map, method and sources). The Green chapter is interactive (radius switch, waffle and share bars, parks list with filters linked to the map, score breakdown) from `result.green`. Migration `create_report_share_links`: the owner shares a ready report with "Partajează" (one active link, permanent or 7/30 days, only the token's SHA-256 stored, `create_report_share_link` / `revoke_report_share_link`), and `?share=<token>` opens it read-only without an account through `resolve_report_share_link`. "Descarcă PDF" calls `window.print()`: on `beforeprint` (`usePrintMode`) the page lays out every chapter one after another, hides the navigation, and the map canvas keeps its drawing buffer (`MapCanvas isPrintable`) so it prints as an image; the browser saves the PDF. The order flow and a server-rendered PDF are not built yet.

Hosting (step 10) is configured for Netlify in `netlify.toml`: build, SPA fallback and security headers; the site `propertyscore-app` (https://propertyscore-app.netlify.app) is published only by `deploy.yml` on a version tag, after the migrations (the GitHub `production` environment holds `NETLIFY_AUTH_TOKEN` and the variable `NETLIFY_SITE_ID`); deploy previews and branch deploys fail on purpose because there is no non-production Supabase project. `VITE_SITE_URL` (optional, falls back to the page origin) builds the sign-up confirmation redirect and must be set in Netlify once the production domain is known. Google OAuth: the app exists (Google Cloud project `propertyscore`, Testing mode, test users only) and is enabled on the hosted project; locally it stays `enabled = false` in `config.toml` until `supabase/.env` has its keys (see `supabase/.env.example`). Not built yet: every panel page and dashboard except the password and account deletion sections of `/account/settings` (its profile, phone and notification parts are still missing); every product feature (properties, the inspection score, the listing form and "Anunțurile mele", ordering and paying for a report and its server-rendered PDF). Anything the rules describe that is not in the file system does not exist yet: check before importing, and create it following the rules when a feature needs it. Update this section as pieces land.

## Project structure

- Code is organised **by feature** under `src/features/<feature>/`; `src/components/` and `src/lib/` hold only what more than one feature uses. The one exception is the design-system catalogue (`.claude/rules/design-system.md` §4): a catalogue component lives at its catalogue path in `src/components/<group>/` from its first use, even while only one feature uses it.
- Imports use the `@/` alias for anything outside the current feature; relative imports only inside a feature. No `../../` across features.
- A feature exposes its public API through `index.ts`; nothing outside the feature deep-imports its internals. That is the only barrel file allowed.
- `src/lib/supabase/database.types.ts` and `src/routeTree.gen.ts` are generated and committed; never edit them; ESLint and Prettier skip them.

```
supabase/
├── config.toml  seed.sql
├── migrations/                  timestamped SQL, the only way the schema changes
├── functions/{_shared/, <function-name>/index.ts}
├── templates/                   bilingual auth email templates
└── tests/                       pgTAP (*.test.sql)
e2e/                             Playwright specs, fixtures, page objects
scripts/check-translations.ts
worker/                          SmartCheck scoring and document jobs (Railway), see .claude/rules/worker.md
├── Dockerfile  package.json  tsconfig.json  vitest.config.ts
└── src/{main.ts, cli.ts, config/, db/, lib/, snapshot/, scoring/<score>/, sources/}
src/
├── main.tsx                     mounts <App/>, initialises Sentry and i18n
├── app/{app.tsx, router.ts, query-client.ts}
├── routes/                      TanStack Router file routes, thin
│   ├── __root.tsx
│   ├── _site/                   public pages for everyone (home, marketing) in the site layout
│   ├── _public/                 login, sign-up, password reset, auth callback
│   └── _authenticated/route.tsx guard + app shell; feature routes below it
├── features/<feature>/
│   ├── api/{<feature>.api.ts, <feature>.queries.ts, <feature>.storage.ts}
│   ├── components/<name>.tsx + <name>.test.tsx
│   ├── hooks/use-<name>.ts
│   ├── <entity>.schemas.ts  <entity>.types.ts  <entity>.utils.ts
│   └── index.ts
├── components/{ui/, layout/}    shadcn primitives; app shell, page header, empty states
├── components/<group>/          design-system catalogue components and other components used by more than one feature (brand, trust, property, report, map, media, forms, feedback, navigation)
├── hooks/use-<name>.ts          hooks used by more than one feature or by shared components
├── lib/{supabase/{client.ts, database.types.ts, errors.ts}, errors.ts, logger.ts, utils.ts}
├── config/env.ts
├── i18n/{i18n.ts, i18next.d.ts, format.ts, locales/{ro,en}/<namespace>.json}
├── styles/globals.css
└── test/{setup.ts, render.tsx, msw/, factories/}
```

Dependency direction: `routes` → `features` → `components`, `lib`, `config`, `i18n`. `components/ui` and `components/layout` never import from `features`; `lib` and `i18n` never import from `features`, `routes` or `components`.

## Naming

| Kind                  | File                                                     | Identifier                                                     |
| --------------------- | -------------------------------------------------------- | -------------------------------------------------------------- |
| Component             | `property-card.tsx`                                      | `PropertyCard`, named export, one exported component per file  |
| Hook                  | `use-score-filters.ts`                                   | `useScoreFilters`                                              |
| Data-access functions | `properties.api.ts`                                      | `listProperties`, `getProperty`, `createProperty`              |
| Query factory, hooks  | `properties.queries.ts`                                  | `propertyQueries.detail(id)`, `useCreateProperty`              |
| Storage functions     | `properties.storage.ts`                                  | `uploadPropertyPhoto`, `getPropertyPhotoUrl`                   |
| Zod schemas           | `property.schemas.ts`                                    | `propertyFormSchema` → type `PropertyFormValues`               |
| Types                 | `property.types.ts`                                      | `Property`, `PropertyInsert`, `PropertyFilters`; no `I`/`T`    |
| Utils                 | `property.utils.ts`                                      | exported pure functions                                        |
| Zustand store         | `<feature>.store.ts`                                     | `use<Feature>Store`                                            |
| Tests                 | next to the source, `.test.ts` / `.test.tsx`             | `describe('<Unit>')`                                           |
| Routes                | `routes/_authenticated/properties/$propertyId.tsx`       | URL `/properties/123`, kebab-case segments in English          |
| Translation files     | `src/i18n/locales/<lang>/<namespace>.json`               | namespace = feature name or `common`                           |
| Translation keys      | nested `camelCase`                                       | `properties:form.title.label`, `common:errors.forbidden`       |
| DB tables / columns   | `snake_case`, tables plural                              | `properties`, `owner_id`, `created_at`                         |
| DB functions          | `snake_case` verb phrase                                 | `recalculate_property_score`                                   |
| Migrations            | `supabase migration new <verb>_<object>`                 | `create_properties`, `add_score_to_properties`                 |
| RLS policies          | English sentence                                         | `"Owners can update their properties"`                         |
| Edge Functions        | `kebab-case` folder                                      | `geocode-address`                                              |
| Env vars              | `VITE_` + `SCREAMING_SNAKE_CASE`                         | `VITE_SUPABASE_URL`                                            |

Booleans start with `is` / `has` / `can` / `should`; event props are `onX`, their implementations `handleX`; `SCREAMING_SNAKE_CASE` only for true module-level constants (`PROPERTY_COLUMNS`). Components and shadcn primitives are added with their CLIs (`pnpm dlx shadcn@latest add <name>`), migrations with `supabase migration new`.

## Build commands

```
pnpm dev                  # Vite dev server on :5173
pnpm build                # tsc -b && vite build
pnpm typecheck            # tsc -b --noEmit
pnpm lint                 # ESLint
pnpm format               # Prettier write (format:check only reports)
pnpm i18n:check           # ro and en files have the same keys, placeholders and plural sets
pnpm knip                 # unused files, exports and dependencies
pnpm test / test:run      # Vitest watch / once; only when the user asks
pnpm test:e2e             # Playwright against the local stack; only when the user asks
pnpm db:start             # supabase start (Docker)
pnpm db:reset             # re-apply migrations and seed.sql locally
pnpm db:test              # pgTAP; only when the user asks
pnpm db:types             # regenerate src/lib/supabase/database.types.ts from the local database
pnpm db:lint              # plpgsql_check on the public and private schemas
pnpm test:worker          # worker Vitest suite (database tests need DATABASE_URL); only when the user asks
```

- Check `node -v` (24 LTS) and that Docker is running before Supabase CLI commands.
- The dev server listens on `127.0.0.1:5173` (`server.host` in `vite.config.ts`), the `site_url` the local email links point to. `pnpm db:reset` deletes every local account except the seed users; keep personal test accounts in a git-ignored `supabase/seed.local*.sql`.
- After every migration: `pnpm db:reset`, then `pnpm db:types`, and commit the migration and the regenerated types together.
- For the in-app browser preview use the `property-score-dev` configuration in `.claude/launch.json`.
- CI on every pull request: typecheck → lint → format check → `i18n:check` → unit and component tests → `supabase start` → `db reset` → pgTAP → worker tests against the local database → generated-types drift check → Playwright → build. Lefthook only formats and lints staged files; CI is the gate.

## Git

- `main` plus pull-request branches named `<type>/<ticket>-<short-desc>` (`feat/PS-42-score-filter`); commits in Conventional Commits style (`feat(properties): add score filter`).
- Development uses only the local Supabase stack; there is no hosted dev project. Migrations and the site reach production (`property-score`, ref `zksoblghnnirkjvewrsv`; Netlify `propertyscore-app`) only on a `vX.Y.Z` tag through `deploy.yml`, never from a laptop: release by merging to `main`, then pushing the next tag.
- Never commit `.env.local`, `supabase/functions/.env`, `supabase/.temp`, `e2e/.auth`, Playwright reports, coverage, or anything under `.claude/` except `.claude/rules/` and `.claude/skills/` (the `.gitignore` written at scaffolding time covers these).
