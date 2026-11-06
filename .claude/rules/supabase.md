---
paths:
  - 'supabase/**'
  - 'src/lib/supabase/**'
---

# Supabase rules: database, RLS, types, Storage, Edge Functions

## Migrations

- The schema changes only through `supabase migration new <verb>_<object>`, written as SQL, applied with `pnpm db:reset`, reviewed in the PR. Never edit a hosted project in the dashboard; if it happened, capture it with `supabase db diff` as a migration.
- Never edit a migration that has reached `main`; write a new one.
- After a migration: `pnpm db:reset`, `pnpm db:types`, commit both. CI fails when the generated types drift.
- Never run `supabase db push`, `apply_migration` or `execute_sql` that writes against a hosted project; migrations reach production only through `deploy.yml` on a version tag, which publishes the site right after them. There is no hosted dev project; the `supabase-local` MCP server in `.mcp.json` targets the local stack. Read-only MCP tools (`list_tables`, `get_advisors`, `search_docs`) are fine.

## Tables and columns

- Every table: `id uuid primary key default gen_random_uuid()`, `created_at` and `updated_at timestamptz not null default now()`, an `updated_at` trigger, and an owner column (`owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade`) when rows belong to a user.
- Constraints in the database (`not null`, `check`, `unique`, foreign keys) are the real validation; keep the Zod schemas aligned with them.
- Indexes on every foreign key, every column a policy filters on, and every column the UI filters or sorts on.
- Money is `numeric(12, 2)` plus a `currency text not null check (currency in ('RON', 'EUR'))`; never `float`, never a currency inferred from the language.
- Fixed lists are Postgres enums or lookup tables with English codes (`apartment`, `house`); their labels are translation keys in the frontend, never stored in the database.
- User text is stored as typed, never translated. Text the UI searches goes through `unaccent` (an RPC or a generated column with a trigram index), so `brasov` matches `Brașov`. Columns sorted by name use the `"ro-x-icu"` collation.
- `profiles.locale text not null default 'ro' check (locale in ('ro', 'en'))`, filled from the sign-up metadata by the profile trigger.

## Row Level Security

```sql
alter table public.properties enable row level security;
create index properties_owner_id_idx on public.properties (owner_id);

create policy "Owners can read their properties"
  on public.properties for select to authenticated
  using ((select auth.uid()) = owner_id);

create policy "Owners can update their properties"
  on public.properties for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
```

- RLS is enabled in the same migration that creates the table. No table, view or storage bucket is exposed without policies; `supabase db lint` and `supabase db advisors --local` (level `warn`) must report nothing. At level `info` two findings are accepted: `rls_enabled_no_policy` on a server-only table (no client policy on purpose, `anon` and `authenticated` grants revoked, a pgTAP test proving both get `42501`), and `unused_index` on the local database, whose indexes see no real traffic.
- One policy per operation, named as an English sentence, with an explicit role (`to authenticated` or `to anon`); never a policy open to every role.
- `insert` and `update` policies have `with check`.
- Auth functions are wrapped in a sub-select: `(select auth.uid())`, `(select auth.jwt())`.
- Complex checks (membership, roles) live in a `security definer` function in the `private` schema with `set search_path = ''`, called from the policy.
- Roles are read from the `user_roles` claim (an array of `app_role` values) set by the Custom Access Token Hook from `public.user_roles`; never from `user_metadata`. In a policy, check it inline (`coalesce(((select auth.jwt()) -> 'user_roles') ? 'admin', false)`); `security definer` functions use `private.has_role(role)`. A new role is a new `app_role` value, never a new claim.
- Columns the client must not write (computed scores, ownership) are protected with column privileges (`revoke update (score) on public.properties from authenticated`) or a trigger; a policy alone does not protect a column.
- Every policy has pgTAP tests for both outcomes: the owner can, another user and `anon` cannot.

## Functions, views, schemas

- Business rules, multi-table writes and score recomputation are Postgres functions called through `supabase.rpc()`. `security invoker` by default; `security definer` only when required, always with `set search_path = ''` and fully qualified names.
- Functions raise errors with codes, not sentences: `raise exception using errcode = 'P0001', message = 'address_not_found'`. The frontend translates the code.
- A function that must keep a row when it refuses (a failed attempt counted for rate limiting) returns the outcome code instead of raising, because a raise rolls the row back: `delete_own_account` returns `deleted`, `invalid_password` or `email_mismatch`, and the `api/` function turns any outcome other than success into an `AppError` through `toAppError({ code: 'P0001', message: outcome, details: null })`. Rules that can be refused without a trace still raise.
- Checks that must not race (the last admin) take a transaction lock first (`pg_advisory_xact_lock`), so a concurrent caller sees the committed result.
- Views are created `with (security_invoker = true)`.
- Internal tables and helpers live in the `private` schema, which PostgREST does not expose.
- Triggers maintain `updated_at` and audit columns; client code never sets them.

## Generated types

- `src/lib/supabase/database.types.ts` comes only from `pnpm db:types`; never edit it.
- JSON column shapes are typed in `src/lib/supabase/database.overrides.ts` with the `MergeDeep` pattern from the Supabase docs. The exception is a versioned payload the backend freezes (the online report's `result`): the feature's `api/` function parses it with its Zod schema and the type comes from `z.infer`, so a payload that does not match fails loudly instead of being trusted by a cast.
- Features alias the helpers in `<entity>.types.ts`: `Tables<'properties'>`, `TablesInsert<'properties'>`, `TablesUpdate<'properties'>`, `Enums<'property_status'>`.

## Storage

- Buckets are private unless their content is truly public; size limit and allowed MIME types are set on the bucket in a migration.
- Object paths are `<owner_id>/<entity_id>/<filename>`; `storage.objects` policies check `(storage.foldername(name))[1] = (select auth.uid())::text`, live in migrations and have pgTAP tests.
- A server-only bucket (source files only the worker reads with a secret key, such as `source-extracts`) is private and has no `storage.objects` policies at all; its pgTAP test proves that `anon` and `authenticated` see no object in it, get `42501` on upload and change or delete nothing.

## Edge Functions

- Only for short third-party API calls that need secrets, webhooks, and work that needs the secret key (placement in `.claude/rules/architecture.md`). Plain CRUD and logic that fits in SQL do not belong here; long or heavy jobs go to the worker.
- One folder per function (`supabase/functions/<kebab-name>/index.ts`), shared code and the request/response types in `_shared/`.
- Validate the body with Zod. Verify the caller's JWT (the default) unless the function is a webhook, which verifies the sender's signature instead.
- Create the Supabase client with the caller's `Authorization` header so RLS applies; use the secret key only for the one operation that needs it.
- Return `{ "error": "<code>" }` with a matching HTTP status; never a translated sentence.
- Log JSON lines with a request id; never log secrets or personal data.
- Secrets: `supabase/functions/.env` locally (git-ignored), `supabase secrets set` for hosted projects.

## Auth configuration and email templates

- Auth settings, redirect URLs and email templates are configured in `supabase/config.toml` for local; hosted changes are mirrored by hand and listed in the PR. Email confirmation is on locally as in production. Email links use `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=<type>&next={{ .RedirectTo }}` (any device); OAuth alone uses the PKCE `/auth/callback`. `[auth.captcha]` is switched off for now (`enabled = false`); when it is turned back on it uses Turnstile with Cloudflare's always-pass test secret locally, and the real secret is set only in the hosted dashboard.
- Password changes need no emailed code (`secure_password_change = false`, mirrored in the hosted dashboard), and the hosted project has "Require current password when changing password" on; the local CLI cannot set that one, so the settings form always sends `current_password`.
- Templates live in `supabase/templates/` and branch on the user's language, Romanian by default: `{{ if eq .Data.locale "en" }}…{{ else }}…{{ end }}`. Both branches change together.

## Seed and tests

- `supabase/seed.sql` holds fake but realistic data with Romanian diacritics (ă, â, î, ș, ț) and one known test user per language (`ro`, `en`) plus a second `ro` user for permission tests. Never production data.
- pgTAP tests live in `supabase/tests/<table-or-function>.test.sql`; each test file sets the role and JWT claims explicitly (`set local role authenticated; set local request.jwt.claims = '…'`) and ends with `select * from finish(); rollback;`.
