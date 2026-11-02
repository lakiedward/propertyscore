# Quality checklist

Beyond the rules: what a strict reviewer catches that no linter does. Every finding here states the mechanism, the concrete case where it fails or costs, and the fix. Stack facts to keep in mind: React 19 with the React Compiler, TanStack Router with `autoCodeSplitting`, TanStack Query 5 with `staleTime: 30_000`, Supabase Postgres with RLS, Vite 8, Netlify static hosting.

## 1. Correctness

- **Logic**: wrong conditions, inverted booleans, off-by-one in `.range(from, to)` (inclusive on both ends), wrong comparison of dates or money, `||` where `??` is meant (a `0` price or score becomes the fallback), truthiness checks on numbers.
- **Missing states**: empty list, one item, very long text, missing optional fields, `null` from a left join, a deleted or RLS-hidden row, a signed-out user on a public page, slow network, a mutation that fails half way.
- **Async**: unawaited promises (`void` without handling), state set after unmount, races between two navigations or two mutations, double submit, stale closures in event handlers, `mutateAsync` without `try/catch` where the error should go to the form.
- **Cache**: a mutation that does not invalidate every list and detail it changes; invalidating too broadly (`all()` when `lists()` suffices); query keys that do not include every input the `queryFn` uses (filters, page, locale, user id), so two different requests share a cache entry.
- **Routing**: search params read without `validateSearch` defaults, `redirect` loops between `_public` and `_authenticated`, a `redirect` param that allows an external URL (open redirect), loaders that throw something other than `notFound()` / `redirect()` for expected cases.
- **Forms**: default values that do not match the schema type, fields missing from `defaultValues` (uncontrolled-to-controlled warnings), schema and database constraints out of step (a length the DB rejects that Zod accepts), payload conversion losing data.
- **i18n behaviour**: text that does not change when the language switches (read once at module level, outside `t`), formatting called with a fixed locale, plural keys missing the `_few` form.
- **Broken callers**: a changed export, prop, column, enum value or translation key still used elsewhere with the old shape: search the whole repository, not just the diff.
- **SQL**: triggers that fire for the wrong operation, functions missing `returns` nullability handling, `on delete` behaviour that orphans or wrongly cascades rows, enum changes that break existing rows, migrations that are not re-runnable from a clean `db reset`.

## 2. Security

- Any table, view, function or bucket reachable without a matching policy; a policy wider than the feature needs (`using (true)` on non-public data, `to public`); an `update` policy without `with check` that lets a user move a row to another owner.
- Columns the client must not set (owner, score, status, verification flags) writable through `insert` / `update` because no column privilege or trigger guards them.
- `security definer` functions that trust their arguments for authorization, lack `set search_path = ''`, or are exposed in `public` when they should be in `private`.
- Authorization taken from the client: role or ownership from `user_metadata`, from a route param or from a hidden form field; a UI-only guard presented as protection.
- Secrets or personal data in the bundle, in logs, in Sentry context, in URLs or query strings, in `localStorage`.
- XSS: `dangerouslySetInnerHTML`, `href` built from user input without a scheme check (`javascript:`), unescaped user text in email templates or map popups (`setHTML` in MapLibre).
- Storage paths built from user input without the `<owner_id>/` prefix; public buckets holding private files; signed URLs with long expiry.
- Edge Functions: missing JWT or signature verification, unvalidated body, the secret-key client used for more than the one operation that needs it, error responses that leak internals.

## 3. Performance

Report only issues with a real cost; name when it bites and roughly how much.

### 3.1 Rendering

- The React Compiler cannot optimise a component that breaks the Rules of React (mutating props or state, reading refs during render, side effects in render); such code is both a bug and a lost optimisation.
- Context values that change identity every render, or a context that holds fast-changing state, re-render every consumer; split the context or move the state down.
- State lifted higher than needed so a keystroke re-renders a whole page; derived state stored in `useState` and synced with an effect (extra render, stale values).
- Large lists (more than about 100 rows, map markers, photo grids) rendered all at once; paginate first, virtualise only when pagination does not fit.
- Expensive work in render that the compiler cannot cache (sorting or filtering thousands of rows with a new comparator each render, building `Intl` objects): move to `*.utils.ts` with stable inputs or to the query `select`.
- Layout thrash: reading layout (`getBoundingClientRect`) in loops, animating `width`/`top` instead of `transform`/`opacity`.

### 3.2 Data fetching

- Waterfalls: a loader awaiting one query before starting an independent one (use `Promise.all` of `queryClient.query(…)`), a child component that starts a fetch only after its parent's query resolves, a detail page fetching relations in separate requests that one `select` with embedded relations could return.
- N+1: a query per list item (photos, scores, owners) instead of one embedded select or an RPC.
- Over-fetching: more columns than the screen shows, unpaginated lists, `count: 'exact'` when no total is shown (it is a second scan), signed URLs requested per render instead of cached in a query.
- Under-caching: `staleTime: 0` overrides without reason, keys that change on every render (objects with new dates or unstable arrays), `refetchInterval` where invalidation would do.
- Prefetching missing where it is cheap and obvious: `Link` `preload="intent"` to a detail page, loader `queryClient.query(…)` for the first screen.
- Mutations that refetch whole lists when the server response already contains the new row and `setQueryData` on the detail is safe.

### 3.3 Bundle and assets

- Heavy modules imported statically on routes that do not need them (`maplibre-gl`, chart libraries, date-fns locales, large JSON); `maplibre-gl` must go through the lazy `components/map/map-canvas.tsx`.
- Imports that defeat tree-shaking: `import * as Icons from 'lucide-react'`, whole `date-fns` imports, barrel re-exports pulling a feature's whole tree into a shared chunk.
- A new dependency that duplicates something already installed, or is large for what it does (check its size before accepting it).
- Images without `width`/`height` or `aspect-ratio` (layout shift), without `loading="lazy"` below the fold, without `decoding="async"`, served at full resolution into small cards (use Supabase image transformation or sized variants), hero images not prioritised (`fetchpriority="high"`).
- Fonts: extra weights or subsets beyond `latin` + `latin-ext`, or a font loaded on routes that do not use it.
- Map: the map instance or its event listeners not removed on unmount, a new map created on every render, all listings sent as DOM markers instead of a GeoJSON source and layer.
- Effects and subscriptions not cleaned up (Realtime channels, `ResizeObserver`, `matchMedia`, timers): memory leaks across navigations.

When a bundle claim matters, run `pnpm build` and compare the chunk sizes Vite prints for the affected route.

### 3.4 Database

- Missing indexes on foreign keys, on columns used by RLS policies, and on columns the UI filters, sorts or searches (trigram index for `unaccent` search).
- RLS policies calling `auth.uid()` without the sub-select (evaluated per row), or calling a function that queries another table per row without `security definer` caching.
- Functions marked `volatile` that are `stable` or `immutable`; `select *` inside functions or views.
- Sorting or filtering on an expression that cannot use an index (`lower(col)` without an expression index, `unaccent(col)` without a generated column).
- Large `offset` pagination on big tables where keyset pagination fits.
- Triggers doing per-row work that one statement-level update could do.

Check a suspicious query with `explain` through the `supabase-local` MCP `execute_sql` on the local stack, and the `get_advisors` performance advisor when migrations are in scope.

## 4. Duplication and reuse

Search the whole repository, not just the diff (`git grep`, the component catalogue in `design-system.md` §4, `src/components/*/`, `src/lib/`, `src/i18n/format.ts`, every feature's `index.ts`).

- **Reimplemented helpers**: formatting, date maths, price display, slug or path building, error mapping, class merging, number parsing, debounce: when `@/i18n/format`, `@/lib/utils`, `toAppError`, `applyServerErrors`, `useValidationMessage`, or another feature's util already does it.
- **Rebuilt components**: markup that matches an existing shared component (`components/brand`, `feedback`, `layout`, `map`, `media`, `property`, `report`, `trust`) or a shadcn primitive; a second empty state, skeleton, page header, price tag or badge style.
- **Copy-paste across features**: the same JSX block, query, schema field set or class list in two or more places. Two copies: flag and suggest extracting when they must change together. Three or more: extract (a component in the feature, or in `src/components/<group>/` when more than one feature uses it).
- **Repeated class strings**: the same long `className` set on three or more elements is a component (styling rule), not a copy.
- **Duplicated types**: hand-written types that mirror a DB row, a Zod schema or a function's return type instead of deriving them.
- **Duplicated query keys or column lists**: a key or `select` string written in more than one place instead of the query factory or `<ENTITY>_COLUMNS`.
- **Duplicated translations**: the same text under several feature keys when it is a shared word (`common:actions.*`), or the same key meaning two different things.
- **Duplicated validation**: Zod rules that restate a database constraint differently; both must agree, and one shared schema should serve create and edit forms.
- **Misplaced code**: something in `src/components/` used by only one feature (move into the feature), or something inside a feature imported by another (move to `src/components/` or `src/lib/`).

## 5. Simplification and maintainability

- **Dead code**: unused exports, props, variants, translation keys, files, dependencies (cross-check with the Knip output), branches that can never run, feature flags with one value.
- **Over-engineering**: abstractions with one caller, generic components configured by many boolean props (prefer composition), wrapper hooks that only forward, layers the rules forbid (services, repositories), premature configuration.
- **Under-structuring**: components over about 200 lines or with several responsibilities, deeply nested ternaries in JSX (extract a small component or an early return), business logic in components that belongs in `*.utils.ts`.
- **Clarity**: names that do not say what a thing is (`data`, `item`, `handle`, `temp`), booleans without `is/has/can/should`, magic numbers and strings that should be named constants or union types, functions with more than three positional parameters (use an object), since the no-comments rule means names carry the explanation.
- **Type precision**: `string` where a union of known values fits, optional props that are always passed, `Partial` hiding required data, unions without a discriminant.
- **Consistency**: the same problem solved differently in two features; the newer code should follow the established pattern unless the pattern is the problem, in which case say so.
