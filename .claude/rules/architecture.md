---
paths:
  - 'supabase/**'
  - 'worker/**'
  - 'src/features/*/api/**'
  - 'netlify.toml'
  - '.github/**'
---

# Architecture: where each part of a feature runs

Every feature is built on what the project already runs. Before a proposal or plan names a table, an RPC, an Edge Function, a worker command or a new service, it inventories what is integrated, weighs the options for each behaviour and picks the one that fits best. Something new is proposed only when nothing integrated fits well, and the user decides.

## 1. What is integrated

The table is a starting point, not the truth. Confirm it before relying on it: the Tech stack and Implementation status in `CLAUDE.md`, `netlify.toml`, `supabase/migrations/` (extensions, `private` functions), `supabase/functions/`, the commands in `worker/src/cli.ts`, `.claude/rules/worker.md` (Railway services) and `.github/workflows/`. Update this table when a piece lands or goes away.

| Piece | Runs | Used today for | Fits | Does not fit |
| --- | --- | --- | --- | --- |
| Postgres (Supabase) with PostGIS and `unaccent` | Supabase | every table, RLS, the scoring grid, zone scores, report freezing (`private.*`) | data, rules, state transitions, geographic queries, search | long loops, files, calls to other services |
| RPC (Postgres functions) | Supabase | share links, snapshot lifecycle, report begin/complete/fail | business rules, multi-table and atomic writes, anything the browser must not bypass | work over seconds, side effects outside the database |
| Supabase Auth | Supabase | email and password, Google and Facebook OAuth (PKCE, `/auth/callback`), password reset, the custom access token hook (`user_roles` claim), bilingual email templates | identity, sessions, auth emails, roles in the token | role assignment itself (rows in `user_roles`, never `user_metadata`) |
| Supabase Storage | Supabase | `listing-photos` bucket | files with RLS, signed URLs | image transformation (paid feature, not used) |
| Edge Functions | Supabase | none yet | short calls with a secret, webhooks, secret-key work finishing in seconds | rendering, binaries, heavy loops, waiting for other jobs |
| `pg_cron` | Supabase | not enabled yet | small periodic SQL: expiries, timeouts, enqueueing | the work itself when it is heavy |
| Worker `@propertyscore/worker` | Railway, one service per long-running role from `worker/Dockerfile` | `build-snapshot`, `generate-report`, `create-report`; Node 24, postgres.js, osmium, GDAL, Python r5py on Java 21 | long, CPU- or memory-heavy jobs, system binaries, imports, document rendering, retries | anything a user waits on synchronously, rules that belong in an RPC |
| Valhalla | Railway, its own service | walking times for the scores | routing on the OSM network | anything else |
| Frontend SPA | Netlify, static with SPA fallback and security headers | every screen | UI, UX checks | secrets, authorization, server code (no Netlify Functions) |
| MapLibre with OpenFreeMap tiles | browser | listings map, report map | maps without a key | server-side map rendering |
| Sentry | browser | errors and monitoring | errors | logs with personal data |
| Cloudflare Turnstile | browser widget + Supabase Auth check | CAPTCHA on sign-up, sign-in, password reset and resend | stopping scripted sign-ups and email floods | anything that is not an auth form |
| GitHub Actions | GitHub | CI, `deploy-db.yml` | checks, migrations on a tag | jobs the product runs |

## 2. How to choose

For each behaviour of the feature (a read, a write, a rule, a scheduled task, a document, a call to a provider):

1. **List the candidates** among the integrated pieces, and the existing code each would reuse (a `private` function, a worker helper, a query factory, a report section).
2. **Weigh them** against:
   - **Security:** a rule that protects data runs in the database (RLS or an RPC), whatever else also checks it.
   - **Who waits:** a user waiting for the answer needs seconds or less; anything longer is handed off and followed through a status.
   - **Duration and resources:** time, CPU, memory, file size, number of rows.
   - **Runtime needs:** a system binary, Chromium, Python or Java, large datasets on disk.
   - **Data locality:** heavy reads stay next to Postgres (SQL or the worker), not in the browser.
   - **Secrets:** only in Edge Functions, the worker's Railway variables or CI secrets.
   - **Reuse and consistency:** extending an integrated piece the way it is already used beats a new pattern.
   - **Operations and cost:** each new service is one more thing to deploy, monitor, pay for and keep running locally.
   - **Local development and tests:** it runs against the local Supabase stack and in CI.
3. **Prefer, in this order:** an integrated piece used as it is; an integrated piece extended (a new table, RPC, worker command, worker Railway service from the same Dockerfile, package in the worker image); a new provider or service, only when the integrated options clearly fit worse, with the reason.
4. **Record the choice** in the proposal or plan: the options considered, the one chosen and why.

## 3. Default placement

These defaults come out of §2 for the common cases; follow them unless the weighing says otherwise, and say why when it does.

| Work | Runs in | Examples |
| --- | --- | --- |
| Reads and writes a user may do, guarded by RLS | table through `features/*/api` | own listings, favourites |
| Business rules, state transitions, multi-table or atomic writes | RPC | `submit_inspection`, `publish_book`, `create_report_share_link` |
| Small periodic SQL: expiries, timeouts, reminders that only enqueue | `pg_cron` | expire invitations, release held slots |
| Short request/response work that needs a secret, a webhook, or the secret key | Edge Function | `create-checkout`, `payment-webhook`, `geocode-address`, `signed-download` |
| Long or heavy work: rendering documents with images, imports, system binaries, Python or Java, large files, retries | a command of the existing worker | PDFs of books, online reports and consent documents, the snapshot builder, data imports |
| A different response-time profile from the worker's other jobs (seconds after a payment versus a monthly batch) | a separate Railway service from the same `worker/Dockerfile` | PDF rendering beside the snapshot builder |
| A long-running server with its own API that the worker calls | its own Railway service, never inside the worker image | Valhalla |

- Work leaves Edge Functions as soon as it can approach their wall-clock, CPU or memory limits (check the current Supabase docs), needs Chromium or another binary, renders documents with images, processes files larger than a few megabytes or loops over many rows, or must be retried without the caller waiting.
- New heavy jobs go into the existing `worker/` package as commands, following `.claude/rules/worker.md`; never a second worker codebase.
- **Hand-off:** the RPC that accepts the request records it in the same transaction (a status such as `generating`, or a job row); the worker picks it up with `DATABASE_URL`, does the work and writes the result through a `private` function that checks the transition; the frontend follows the status through its query. An Edge Function never waits for a worker job. The pickup mechanism (a job table claimed with `for update skip locked`, a trigger, a scheduled command) is a decision of the first feature that needs it, then reused.

## 4. New technology

- Anything outside the §1 table (a hosted service, a provider, a runtime, a system binary, a library) is a decision with the alternatives (including the integrated ones), cost, where its secrets live, how it runs locally and in CI, and what happens when it is down. The user approves it; it is then recorded in the `CLAUDE.md` Tech stack and in §1.
- When `IMPLEMENTATION_PLAN.md` places work where this file does not (for example the Edge Function `generate-inspection-book`, which §3 places in the worker), this file wins: build it where §3 says and list the difference as a plan update.
