# Rules checklist

The rule files are the source; this checklist is the index a reviewer works through so nothing is skipped. When this file and a rule file disagree, the rule file wins and this file is fixed.

## 1. Layers and the rules that apply

| Files | Rule files |
| --- | --- |
| `src/**/*.ts`, `src/**/*.tsx` | `react.md`, plus the rows below |
| `src/**/*.tsx`, `src/**/*.css`, `components.json` | `styling.md`, `design-system.md`, `i18n.md` (`.tsx`) |
| `src/features/*/api/**`, `src/features/auth/**`, `src/lib/**`, `src/app/**`, `src/config/**`, `src/routes/**`, `.env.example` | `data-api.md` |
| `supabase/**`, `src/lib/supabase/**` | `supabase.md` |
| `supabase/**`, `worker/**`, `src/features/*/api/**`, `netlify.toml`, `.github/**` | `architecture.md` |
| `src/i18n/**`, `supabase/templates/**`, `scripts/check-translations.ts` | `i18n.md` |
| `src/**/*.test.ts(x)`, `src/test/**`, `vitest.config.ts` | `testing.md` |
| `e2e/**`, `playwright.config.ts` | `e2e.md` |
| every file | `CLAUDE.md` key rules, project structure, naming, tech stack, git |

## 2. Checks per rule file

### 2.1 CLAUDE.md key rules

- RLS enabled with tested policies on every table a migration creates; no UI check presented as protection.
- `@supabase/supabase-js` or the client imported only in `src/lib/supabase/**` and `src/features/*/api/**` (type-only imports allowed).
- No user-visible literal: JSX text, `aria-label`, `title`, `placeholder`, `alt`, toast text, `head` titles, Zod messages, `throw new Error('…')` that reaches the UI.
- No secret in the frontend: no service-role or secret key, no non-publishable key in a `VITE_` variable, `.env.example` holds placeholders only.
- Schema changed only through a new file in `supabase/migrations/`; `database.types.ts` changes only with a migration; a migration already on `main` is never edited (`git log main -- <migration>`).
- **No comments in any file**, including TSX `{/* */}`, CSS, SQL (`--`, `/* */`), YAML/TOML/dotfiles (`#`), JSON/JSONC, HTML templates (`<!-- -->`). Allowed only: `/// <reference …>`, `// @ts-expect-error <reason>`, `// eslint-disable-next-line <rule> -- <reason>`, `// prettier-ignore`, generated-file headers, shadcn files as the CLI wrote them, and SQL `comment on …`. A bare `eslint-disable` without a rule and reason, or `@ts-ignore`, is a finding.
- No summary or changelog files added (`CHANGES.md`, `SUMMARY.md`, `NOTES.md`…), no stray temporary files.
- No new dependency unless a feature needs it, pinned exactly (no `^`/`~` in `package.json`) and recorded in the CLAUDE.md tech stack. Any library from the "deliberately not installed" list is a blocker.
- CLAUDE.md "Implementation status" updated when the change lands a new piece.

### 2.2 Project structure and naming (CLAUDE.md)

- Code by feature; `src/components/` and `src/lib/` hold only what more than one feature uses, and something used by more than one feature does not stay inside one feature.
- `@/` for imports outside the current feature, relative only inside it, no `../../` across features, no deep import into another feature (only its `index.ts`), no barrel file other than a feature's `index.ts`.
- Dependency direction: `routes` → `features` → `components`, `lib`, `config`, `i18n`; `components/ui` and `components/layout` never import `features`; `lib` and `i18n` never import `features`, `routes` or `components`.
- File and identifier names per the naming table: kebab-case files, `PascalCase` component named like its file, `use-` hooks, `<feature>.api.ts` / `.queries.ts` / `.storage.ts`, `<entity>.schemas.ts` with `<name>Schema` → `<Name>Values`, no `I`/`T` type prefixes, booleans `is/has/can/should`, props `onX` with `handleX`, `SCREAMING_SNAKE_CASE` only for module constants, routes in English kebab-case, translation keys nested camelCase, DB snake_case with plural tables, policies as English sentences, Edge Functions kebab-case.

### 2.3 react.md

- TypeScript: no `any`, no `as unknown as`, `as` only where justified, no `!` on values that can be missing, `type` not `interface` (except augmentation), no `enum`, types derived not duplicated, `import type`, `satisfies` for config, discriminated unions for variant state, validation only at boundaries, named exports only.
- Feature boundaries: routes thin (no business logic, no Supabase, no inline query keys), pure domain logic in `<entity>.utils.ts`, no needless new feature folder.
- Components: one exported component per file named like the file, `<Component>Props` type above it and destructured, `ref` as a prop (no `forwardRef`), composition over boolean props, stable keys (no index keys on changing lists), no components defined inside components, leaves never fetch.
- Hooks and effects: no `useMemo` / `useCallback` / `React.memo` without a measured need, no `useEffect` for fetching or derived state, effects only for external sync and always cleaned up, hooks named `use…` in `hooks/`, objects returned for more than two values, no disabled `react-hooks` rules.
- State: server data only in the Query cache (never copied into `useState` or a store), bookmarkable state in Zod-validated search params, forms in React Hook Form, local state lowest possible, context only for slow-changing cross-cutting state, Zustand only when justified.
- Loading and errors: loaders `queryClient.query({ ...options, staleTime: 'static' })` + `useSuspenseQuery` (no deprecated `ensureQueryData` / `fetchQuery` / `prefetchQuery`), no `if (isLoading)` branches in suspense screens, skeletons shaped like content, spinners only in buttons.
- Forms: the reference shape exactly: schema in `<entity>.schemas.ts` with translation-key messages, `Controller` + `Field` parts, `FieldLabel htmlFor` with `useId`, `aria-invalid` and `data-invalid`, `FieldSet`/`FieldLegend` for groups, submit through a mutation, button disabled only while pending, `applyServerErrors`, `meta: { silent: true }` when the form shows the error, `parseLocaleNumber` for numbers, `to<Entity>Insert` next to the schema, no `FormData`, no form Actions, no shadcn `Form`.
- Routing: `_site` / `_public` / `_authenticated` placement, guard in `beforeLoad`, router context for `queryClient` and `auth`, `loader` + `pendingComponent` + `errorComponent` on fetching routes, `notFound()` for missing rows, Zod `validateSearch`, navigation with `Link` / `useNavigate` (no URL strings), translated `head` title, no language prefix.
- Accessibility: semantic elements (`button` vs `Link`), heading order, landmarks, Radix primitives for dialogs and menus, translated `aria-label` on icon-only buttons, decorative icons `aria-hidden`, visible focus, keyboard reachable, WCAG AA contrast.

### 2.4 styling.md and design-system.md

- Tailwind utilities only; no `@apply`, CSS Modules, CSS-in-JS, inline `style` except runtime values.
- Colours only through semantic tokens: no hex, `rgb()`, `hsl()`, `oklch()` or Tailwind palette classes (`gray-500`, `blue-600`, `white`/`black` where a token exists) in components; `--ps-*` primitives never used directly in components.
- No arbitrary values for magic numbers except CSS-variable references, grid templates and one-off values copied from a design export; a value repeated is a token.
- `cn()` from `@/lib/utils` (never from `cn` directly, never template-string class concatenation); variants with `cva`, not ternary chains.
- Existing primitive and design-system component used before new markup (check the catalogue in `design-system.md` §4 and `src/components/`); feature looks wrap primitives, never fork them; primitives' hidden English strings translated.
- Usage rules in `design-system.md` §5: one `cta` button per screen; forest = physical, blue = online; `TrustBadge` on every property; `DataLabel` on report values with `missing` instead of empty or zero; `StatusPill` with text and icon; card styling; focus ring; touch targets ≥ `--touch-min`; text on forest and lime; density from the shell only; `marker-*` highlights; gradients only from system colours; logos only through brand components; category hues only for categories.
- A new token or shared component updates `design-system.md` and `globals.css` together, both themes.
- Layout: mobile first, only the standard and the design's breakpoints, no `max-*` beyond a single undo, no horizontal scroll at 360px, no fixed widths on text, `truncate` + `Tooltip`.
- Icons only `lucide-react` (Google/Facebook marks excepted), `size-4` / `size-5`; no emoji, inline SVG copies or second icon set. Fonts self-hosted with `latin-ext`. No `outline-none` without replacement.

### 2.5 i18n.md

- Every visible string through `t()`; key added to both `ro` and `en` in the same change, Romanian written properly (not copied English), no key left out.
- Keys semantic nested camelCase grouped by screen then element, feature namespace plus `common:`, shared words in `common`, enum labels keyed by DB code, dynamic keys built only from typed unions, no cast to silence the key check.
- Whole sentences with interpolation (no concatenated fragments), `<Trans>` for embedded links, plurals with `count` and `_one`/`_few`/`_other` in Romanian, no plural chosen with `if`.
- `ș`/`ț` with comma below, never cedilla `ş`/`ţ`; Romanian quotes „…”.
- Formatting only through `@/i18n/format`; no `toLocaleString`, display `toFixed`, `new Intl.*` in components, currency from the record, `Intl.Collator` for sorting.
- Email templates: both language branches changed together.

### 2.6 data-api.md

- Layers respected: `*.api.ts` has no React, toasts or UI text; `*.queries.ts` never calls `supabase`; UI never uses the client or inline query keys; no wrapper around supabase-js or TanStack Query, no hook that only forwards to `useQuery`.
- Data-access functions: module-level `<ENTITY>_COLUMNS`, never `select('*')`, return data or throw `toAppError(error)`, lists paginated with `.range()` returning `{ items, total }`, `count: 'exact'` only when a total is shown, multi-table writes in an RPC, Edge Functions through `functions.invoke` with shared types and a Zod-parsed response, Storage in `<feature>.storage.ts`, signed URLs inside a query, snake_case kept.
- Query factory per feature, no query key written twice, mutations invalidate (optimistic only with rollback), no `new QueryClient()` outside `app/` and tests, sign-out clears the cache, Realtime cleaned up.
- Errors: only `toAppError()` maps backend errors; UI shows translated codes, never `error.message`; Sentry only through `logger.error` and never for `validation` / `not_found`.
- Auth: only `features/auth` calls `supabase.auth.*`; roles from the JWT claim, never `user_metadata`; no token handling by hand; sign-up passes `locale` and `emailRedirectTo` from `env`.
- Env only through `env` from `@/config/env`; a new variable added to the schema, `.env.example`, hosting and CI together; one `createClient` call.
- Logging through `logger`, no `console.*`, no tokens, passwords, emails or personal data in logs.

### 2.7 supabase.md

- Migrations created with `supabase migration new <verb>_<object>`, SQL only, types regenerated and committed in the same change.
- Tables: `id uuid default gen_random_uuid()`, `created_at`/`updated_at timestamptz not null default now()`, `updated_at` trigger, owner column with `default auth.uid()` and `on delete cascade` when user-owned; constraints in the database aligned with the Zod schema; indexes on every foreign key, policy column and filtered/sorted column; money `numeric(12, 2)` plus `currency` check; enums with English codes; `unaccent` search and `"ro-x-icu"` collation where text is searched or sorted.
- RLS: enabled in the creating migration; one policy per operation with an explicit role and an English-sentence name; `with check` on insert and update; `(select auth.uid())`; complex checks in a `private` `security definer` function with `set search_path = ''`; roles from the `user_role` claim; protected columns revoked or guarded by a trigger; pgTAP for both outcomes (owner can, other user and `anon` cannot).
- Functions `security invoker` by default, `security definer` only with `set search_path = ''` and qualified names; errors raised with codes, not sentences; views `security_invoker = true`; internals in `private`.
- Storage: private unless truly public, size limit and MIME types set in the migration, `<owner_id>/<entity_id>/<filename>` paths, `storage.objects` policies with tests.
- Edge Functions only for secrets, webhooks or secret-key work; Zod-validated body; JWT verified (or webhook signature); client with the caller's `Authorization`; `{ "error": "<code>" }` responses; JSON logs with a request id and no personal data.
- Seed: fake data with Romanian diacritics and the known test users; pgTAP files set role and claims and end with `finish()` and `rollback`.
- Nothing writes to the hosted project (`property-score`, ref `zksoblghnnirkjvewrsv`): no `db push`, no `apply_migration`, no writing `execute_sql` against it.

### 2.8 testing.md and e2e.md

- Every new util, schema, data-access function, hook with logic, form and screen with conditional logic has a test in the same change (presentational components and route files excepted); every policy and Postgres function has pgTAP.
- Tests next to the source, one top-level `describe` named after the unit, `renderWithProviders`, role-based queries with names read from the `ro` JSON, `userEvent.setup()` awaited, `findBy*` / `waitFor` instead of sleeps.
- Network mocked with MSW handlers per feature, never `vi.mock` of supabase-js or the client, `vi.mock` of an `api` module only where MSW cannot express the case, data from `src/test/factories/`, fake timers restored.
- Assertions on visible output and outgoing calls; forms test required/range errors, payload shape, `conflict` mapping and the pending button; screens test skeleton, empty, error and success.
- E2E only for the critical journeys, against the local stack, users from the seed, `storageState` setup, page objects, role-based locators from the translation JSON, run-unique data cleaned up, web-first assertions, no `waitForTimeout`.

### 2.9 Git and delivery

- Branch `<type>/<ticket>-<short-desc>`, Conventional Commits.
- Nothing ignored is committed: `.env.local`, `supabase/functions/.env`, `supabase/.temp`, `e2e/.auth`, reports, coverage, `.claude/` outside `rules/` and `skills/`.
- `netlify.toml` and the workflows keep previews off the production database and keep the security headers.

### 2.10 architecture.md

- Each behaviour runs where `architecture.md` places it: no long or heavy job (PDF rendering, imports, system binaries, loops over many rows) in an Edge Function, no business rule only in the worker or an Edge Function when it belongs in an RPC, hand-off to the worker through a status or job row the frontend follows, no Edge Function waiting for a worker job.
- Integrated pieces reused before new ones: heavy jobs are commands of the existing `worker/` package, not a second worker; no service, provider, runtime or binary outside `architecture.md` §1 without an approved decision recorded in the Tech stack and §1.
- `architecture.md` §1 updated when the change adds or removes an integrated piece (the first Edge Function, `pg_cron`, a worker command or Railway service).

## 3. Grep scans

Run these over the files in scope with `git grep -nIP '<pattern>' -- <paths> ':!src/routeTree.gen.ts' ':!src/lib/supabase/database.types.ts'` (`-I` skips images, `-P` is needed for the lookaheads; macOS `grep` has no `-P`, so add `--untracked` for new files instead of falling back to it). Every hit is a candidate to confirm in Phase 3: string literals such as `'//evil.test'` or `'https://…'` match the comment scan and are not comments.

| Rule | Pattern | Paths |
| --- | --- | --- |
| No comments (TS/TSX/JS/CSS) | `(^|[^:])//(?!/ <reference)|/\*|\{/\*`, then drop the allowed directives | `src/`, `e2e/`, `scripts/`, `supabase/functions/`, config `.ts`/`.js` |
| No comments (SQL) | `^\s*--|/\*` | `supabase/migrations/`, `supabase/tests/`, `supabase/seed.sql` |
| No comments (YAML/TOML/dotfiles) | `^\s*#` | `*.yml`, `*.yaml`, `*.toml`, `.gitignore`, `.env.example`, `.editorconfig`, `lefthook.yml` |
| No comments (HTML) | `<!--` | `index.html`, `supabase/templates/` |
| Bare suppressions | `eslint-disable(?!-next-line \S+ -- )|@ts-ignore|@ts-nocheck|@ts-expect-error\s*$` | `src/`, `e2e/` |
| No `any` / double cast | `:\s*any\b|<any>|as any\b|as unknown as` | `src/`, `e2e/` |
| Non-null assertion | `\w[\])]?!\.|\w!\)` | `src/` |
| No default export | `export default` | `src/` (config files at the root are exempt) |
| No `forwardRef` / memo hooks | `forwardRef|useMemo|useCallback|React\.memo|\bmemo\(` | `src/` minus `components/ui/` |
| Effects | `useEffect` (read each one) | `src/` |
| No `select('*')` | `select\(\s*['"]\*` | `src/` |
| Error text shown | `error\.message|\.message\}` | `src/**/*.tsx` |
| Raw env | `import\.meta\.env` | `src/` minus `config/env.ts` |
| Console | `console\.` | `src/` minus `lib/logger.ts` |
| Raw colours | `#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|oklch\(|\b(text|bg|border|ring|fill|stroke|from|to|via)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d` | `src/**/*.tsx` |
| Primitives in components | `--ps-` | `src/**/*.tsx` |
| Arbitrary values | `-\[[0-9.]+(px|rem|em|%)\]` (check against the design export) | `src/**/*.tsx` |
| Class concatenation | `className=\{`[^`]*\$\{` | `src/**/*.tsx` |
| `cn` import | `from 'cn'` | `src/`, including `components/ui/` |
| Inline style | `style=\{\{` | `src/**/*.tsx` |
| Formatting | `toLocaleString|toLocaleDateString|\.toFixed\(|new Intl\.` | `src/` minus `i18n/format.ts` |
| Cedilla | `(*UTF8)[şţŞŢ]` (without `(*UTF8)` the class matches bytes of `â` and `î`) | `src/i18n/locales/ro/`, `supabase/` |
| Number parsing | `Number\(|parseFloat\(|z\.coerce\.number` | `src/features/**` |
| Index keys | `key=\{(i|idx|index)\}` | `src/**/*.tsx` |
| URL strings | `navigate\(\s*['"`/]|href=\{?['"`]/` | `src/**/*.tsx` |
| Auth from metadata | `user_metadata` | `src/`, `supabase/` |
| Secrets | `service_role|SERVICE_ROLE|sb_secret_|SUPABASE_SECRET` | everything except `supabase/functions/` and `.github/` |
| Loose policies | `create policy` without `to (authenticated|anon)` (read each) | `supabase/migrations/` |
| RLS uid wrap | `auth\.uid\(\)` not preceded by `select ` | `supabase/migrations/` |
| Definer functions | `security definer` without `search_path = ''` | `supabase/migrations/` |
| Sleeps | `setTimeout|waitForTimeout` | `src/**/*.test.*`, `e2e/` |
| Supabase mocked | `vi\.mock\(['"](@supabase|@/lib/supabase)` | `src/` |
| Unpinned deps | `"[\^~]` | `package.json` |
