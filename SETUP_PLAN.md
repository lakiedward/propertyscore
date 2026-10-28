# Setup plan: Property Score (React + Supabase)

This document sets the stack, structure and rules for the Property Score frontend. It is a decision record: each section says what we use, why, and what we decided against. When a rule here and a habit disagree, follow the rule or change this file in a PR.

- **Frontend**: single-page app, React + TypeScript, built with Vite.
- **Backend**: Supabase (Postgres, Auth, Storage, Edge Functions). There is no custom API server.
- **Security model**: the browser is untrusted. Postgres Row Level Security (RLS) enforces authorization; checks in the UI exist only for user experience.

> The repository currently holds an IntelliJ Java scaffold (`src/Main.java`, Java-oriented `.gitignore`). Delete both when the Vite project is created.

---

## 1. Decisions at a glance

| Area | Decision | Rejected alternatives (and why) |
|---|---|---|
| Runtime | Node 24 LTS, pinned in `.nvmrc` and `engines` | Odd-numbered Node releases (no LTS) |
| Package manager | pnpm, lockfile committed | npm/yarn work too; pnpm is faster and strict about phantom dependencies |
| Build tool | Vite 8 + `@vitejs/plugin-react` | Next.js / Remix: we need no SSR or server code because Supabase is the backend. CRA is dead |
| UI library | React 19.2 with React Compiler enabled | Hand-written `useMemo`/`useCallback` everywhere |
| Language | TypeScript (latest stable), `strict` plus extra flags (section 11) | JavaScript, loose TS |
| Routing | TanStack Router (file-based, type-safe) | React Router 7: good, but weaker typing of params and search params |
| Server state | TanStack Query 5 | Redux Toolkit Query, SWR, hand-written `useEffect` fetching |
| Client state | React state + context; Zustand only when a real need appears | Redux, global stores by default |
| Forms | React Hook Form 7 + Zod 4 via `@hookform/resolvers` | Formik (unmaintained), hand-written validation |
| Styling | Tailwind CSS 4 | CSS-in-JS (runtime cost), CSS Modules as the default |
| Components | shadcn/ui (Radix primitives, copied into the repo) + `lucide-react` icons | MUI/Ant (heavy, hard to theme), a homegrown design system |
| Toasts | `sonner` (the shadcn default) | — |
| Internationalisation | Romanian + English from day one: `i18next` + `react-i18next`, JSON files per namespace, type-checked keys, `Intl` for formatting | `react-intl`/FormatJS (heavier ICU tooling than two languages need), Lingui (extra compile step), hardcoded strings "to translate later" |
| Supabase client | `@supabase/supabase-js` 2, typed with generated `Database` types | Raw `fetch` to PostgREST, an ORM in the browser |
| Local backend | Supabase CLI (`supabase start`), migrations in git | Editing schema in the dashboard |
| Unit/component tests | Vitest + React Testing Library + `user-event` + MSW 2 | Jest (slower, extra ESM config) |
| E2E tests | Playwright against the local Supabase stack | Cypress |
| DB tests | pgTAP via `supabase test db` (RLS above all) | Testing RLS only through the UI |
| Lint / format | ESLint 9 flat config + typescript-eslint + Prettier 3 | TSLint, Biome (good, but its React/a11y rule coverage is smaller) |
| Monitoring | Sentry (`@sentry/react`) | Console logs only |
| CI | GitHub Actions: typecheck, lint, unit, DB, E2E, build | — |

Pin exact versions when the project is created (`pnpm add -E`). Upgrade on purpose, through Renovate or Dependabot PRs.

---

## 2. Project structure

Code is organised **by feature**. Technical folders (`components/`, `lib/`) hold only code that more than one feature uses.

```
property_score/
├─ supabase/                    # backend as code (owned by the Supabase CLI)
│  ├─ config.toml
│  ├─ migrations/               # timestamped SQL, the only way the schema changes
│  ├─ functions/                # Edge Functions (Deno)
│  │  ├─ _shared/               # code shared between functions (cors, clients)
│  │  └─ <function-name>/index.ts
│  ├─ tests/                    # pgTAP tests (RLS, functions, triggers)
│  └─ seed.sql                  # local/dev seed data, never production data
├─ e2e/                         # Playwright specs, fixtures, page objects
├─ public/
├─ src/
│  ├─ main.tsx                  # entry: mounts <App/>, inits Sentry
│  ├─ app/                      # composition root
│  │  ├─ app.tsx                # providers + RouterProvider
│  │  ├─ router.ts              # createRouter, router context type
│  │  └─ query-client.ts        # QueryClient defaults, global error hooks
│  ├─ routes/                   # TanStack Router file routes (kept thin)
│  │  ├─ __root.tsx
│  │  ├─ _public/login.tsx
│  │  └─ _authenticated/
│  │     ├─ route.tsx           # auth guard + app shell layout
│  │     └─ properties/
│  │        ├─ index.tsx
│  │        └─ $propertyId.tsx
│  ├─ features/
│  │  ├─ auth/
│  │  └─ properties/            # example feature
│  │     ├─ api/                # Supabase calls + query/mutation hooks
│  │     │  ├─ properties.api.ts
│  │     │  ├─ properties.queries.ts
│  │     │  └─ properties.api.test.ts
│  │     ├─ components/
│  │     │  ├─ property-card.tsx
│  │     │  └─ property-form.tsx
│  │     ├─ hooks/              # feature UI hooks (not data fetching)
│  │     ├─ property.schemas.ts # Zod schemas (forms, search params)
│  │     ├─ property.types.ts   # types derived from DB types
│  │     ├─ property.utils.ts   # pure functions (e.g. score maths)
│  │     └─ index.ts            # the feature's public API
│  ├─ components/
│  │  ├─ ui/                    # shadcn/ui primitives (button, dialog, …)
│  │  └─ layout/                # app shell, page header, empty states
│  ├─ lib/
│  │  ├─ supabase/
│  │  │  ├─ client.ts           # the only createClient() call
│  │  │  ├─ database.types.ts   # GENERATED, never edit by hand
│  │  │  └─ errors.ts           # map PostgREST/Auth errors → AppError
│  │  ├─ errors.ts              # AppError type + helpers
│  │  ├─ logger.ts
│  │  └─ utils.ts               # cn() and tiny generic helpers
│  ├─ config/
│  │  └─ env.ts                 # validated, typed environment
│  ├─ i18n/
│  │  ├─ i18n.ts                # i18next init, language detection, <html lang>
│  │  ├─ i18next.d.ts           # type-safe keys (resources from the ro files)
│  │  ├─ format.ts              # Intl helpers: dates, numbers, currency
│  │  └─ locales/
│  │     ├─ ro/                 # source language
│  │     │  ├─ common.json      # shared UI words, errors, validation
│  │     │  ├─ auth.json
│  │     │  └─ properties.json  # one namespace per feature
│  │     └─ en/                 # same files, same keys
│  ├─ styles/globals.css         # Tailwind import + theme tokens
│  └─ test/
│     ├─ setup.ts
│     ├─ render.tsx             # renderWithProviders()
│     ├─ msw/                   # handlers + server
│     └─ factories/             # test data builders
├─ .env.example
├─ eslint.config.js
├─ prettier.config.js
├─ playwright.config.ts
├─ tsconfig.json / tsconfig.app.json / tsconfig.node.json
├─ vite.config.ts
└─ vitest.config.ts             # or the `test` block inside vite.config.ts
```

### Dependency rules (enforced by ESLint, section 16)

```
routes  ──►  features  ──►  components/ui, components/layout, lib, config
                │
                └── features/x may import features/y ONLY via features/y/index.ts
```

1. `routes/` wire URLs to feature components and preload data. No business logic and no Supabase calls.
2. Only `lib/supabase/**`, `features/*/api/**` and `supabase/functions/**` may import `@supabase/supabase-js` or `@/lib/supabase/client`.
3. `components/ui` and `components/layout` never import from `features/`.
4. `lib/` and `i18n/` never import from `features/`, `routes/` or `components/`.
5. A feature exposes what others may use through `index.ts`. Deep imports such as `@/features/properties/components/property-card` from outside that feature are forbidden.
6. Start a new feature folder only when the code has its own domain concept. A single screen does not need one.

---

## 3. Clean architecture, kept practical

We keep the *benefit* of clean architecture: the UI does not know about the backend. We skip the *ceremony*: no repository interfaces, DI containers, use-case classes or mapper layers.

There are three layers, and each one has a single job:

| Layer | Lives in | Knows about | Never does |
|---|---|---|---|
| **Data access** | `features/*/api/*.api.ts` | Supabase client, DB types, `AppError` | Import React, touch the UI, show toasts |
| **Server-state glue** | `features/*/api/*.queries.ts` | TanStack Query, the data-access functions | Call `supabase` directly, render anything |
| **UI** | `features/*/components`, `routes/` | Query hooks, Zod schemas, UI components | Import Supabase, build query keys inline |

Pure domain logic (scoring rules, formatting, calculations) goes in `*.utils.ts` as plain functions without React or Supabase imports. It is then trivial to unit test.

**Why this split?** Replacing Supabase, mocking it in tests, or moving a query into an Edge Function or RPC touches one file (`*.api.ts`), and no component changes.

---

## 4. React patterns and practices

- **Function components and hooks only.** The one exception is `react-error-boundary`, which wraps the class-based error boundary for us.
- **React Compiler is on** (`babel-plugin-react-compiler` through the Vite React plugin). Don't add `useMemo`, `useCallback` or `React.memo` by default. Add them only when profiling proves a need, and record the measurement in the PR description.
- **No `useEffect` for data fetching or derived state.** Fetch with TanStack Query. Compute derived values during render. Use effects only to synchronise with something outside React (subscriptions, DOM APIs, Supabase Realtime).
- **Smart edges, dumb leaves.** Route components and feature "screen" components call hooks and own state. Leaf components receive props and render. Leaves are then easy to test and reuse.
- **Colocate.** State lives in the lowest component that needs it, and files live next to the code that uses them. Lift state only when two siblings need it.
- **Composition over configuration.** Prefer `children` and small composable components to a single component with 15 boolean props.
- **Suspense for loading where it fits.** Route loaders call `queryClient.ensureQueryData(...)`, and components use `useSuspenseQuery`. The route's `pendingComponent` and `errorComponent` handle loading and error states, so components contain no `if (isLoading)` branches.
- **Keys are stable IDs**, never array indexes, for lists that change.
- **Accessibility is not optional.** Use semantic HTML, and give every input a label (the shadcn `Field` components do this). Dialogs and menus come from Radix, which handles focus management. `eslint-plugin-jsx-a11y` is on.
- **Use React 19 APIs where they simplify code**: `ref` as a prop (no `forwardRef` in new code) and `use()` for context. Don't use React 19 form Actions for data mutations; TanStack Query mutations are the single mutation path.

---

## 5. State management

Pick the first option that fits:

| Kind of state | Where it lives |
|---|---|
| Data from Supabase (lists, records, counts) | **TanStack Query cache.** Never copy it into `useState` or a store |
| URL-worthy state (filters, sort, page, selected tab, search) | **Route search params**, validated with Zod in the route definition |
| Form state | **React Hook Form** |
| Local UI state (open/closed, hover, step) | `useState` / `useReducer` in the component |
| Cross-cutting app state (session, theme) | **React context**, one small provider per concern |
| Complex client-only state shared across distant components | **Zustand** store in the owning feature, *only when* the above become awkward |

Rules:
- Search params are the default home for anything a user would want to bookmark, share, or keep after a refresh.
- No "global store" folder. If a Zustand store appears, it belongs to a feature (`features/x/x.store.ts`).
- Context values that change often (e.g. on every keystroke) don't go in context. Use a store or local state instead.

---

## 6. Data fetching and caching

### Data-access functions (`*.api.ts`)

`features/properties/api/properties.api.ts`:

```ts
import { supabase } from '@/lib/supabase/client';
import { toAppError } from '@/lib/supabase/errors';
import type { PropertyFilters, PropertyInsert } from '../property.types';

const PROPERTY_COLUMNS = 'id, title, address, score, created_at' as const;

export async function listProperties(filters: PropertyFilters) {
  let query = supabase
    .from('properties')
    .select(PROPERTY_COLUMNS, { count: 'exact' })
    .order(filters.sort, { ascending: filters.direction === 'asc' })
    .range(filters.offset, filters.offset + filters.limit - 1);

  if (filters.search) query = query.ilike('title', `%${filters.search}%`);

  const { data, count, error } = await query;
  if (error) throw toAppError(error);
  return { items: data, total: count ?? 0 };
}

export async function getProperty(id: string) {
  const { data, error } = await supabase
    .from('properties')
    .select(PROPERTY_COLUMNS)
    .eq('id', id)
    .single();
  if (error) throw toAppError(error);
  return data;
}

export async function createProperty(input: PropertyInsert) {
  const { data, error } = await supabase
    .from('properties')
    .insert(input)
    .select(PROPERTY_COLUMNS)
    .single();
  if (error) throw toAppError(error);
  return data;
}
```

Rules:
- **Always select explicit columns**, never `select('*')`. The return type then matches exactly what the UI uses, and no column is leaked by accident.
- **Throw on error.** Functions return data or throw an `AppError`; they never return `{ data, error }` to callers.
- **Always paginate lists** with `.range()`. Never load an unbounded table.
- Put multi-table writes and anything that must be atomic in a **Postgres function** (called through `supabase.rpc`), not in a chain of client calls.

### Query keys and hooks (`*.queries.ts`)

`features/properties/api/properties.queries.ts`:

```ts
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { createProperty, getProperty, listProperties } from './properties.api';
import type { PropertyFilters } from '../property.types';

export const propertyQueries = {
  all: () => ['properties'] as const,
  lists: () => [...propertyQueries.all(), 'list'] as const,
  list: (filters: PropertyFilters) =>
    queryOptions({
      queryKey: [...propertyQueries.lists(), filters],
      queryFn: () => listProperties(filters),
    }),
  detail: (id: string) =>
    queryOptions({
      queryKey: [...propertyQueries.all(), 'detail', id],
      queryFn: () => getProperty(id),
    }),
};

export function useCreateProperty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProperty,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: propertyQueries.lists() }),
  });
}
```

Rules:
- **One `queryOptions` factory per feature.** Components, loaders and tests all use it, so a key is never typed by hand twice.
- Route loaders prefetch with `queryClient.ensureQueryData(propertyQueries.detail(id))`.
- **Invalidate rather than hand-edit the cache** after mutations. Use optimistic updates only where the UX clearly benefits (toggles, reordering), and always roll back in `onError`.
- **`QueryClient` defaults** (`app/query-client.ts`): `staleTime: 30_000`, `retry` disabled for 4xx-class `AppError`s (permission, not found, validation) and at most 2 retries otherwise. `refetchOnWindowFocus` stays on.
- **Clear the whole cache on sign-out** (`queryClient.clear()`) so one user's data never shows for the next.
- **Realtime (only when a feature needs live updates)**: subscribe in a feature hook with `useEffect`, and on each event invalidate the matching query keys. Don't write payloads into the cache by hand. Always remove the channel on cleanup.

---

## 7. Forms and validation

- **React Hook Form + Zod**: each form has one schema in `*.schemas.ts`, and the schema gives us the form type with `z.infer`.
- Use React Hook Form's `Controller` with the shadcn `Field` components (`Field`, `FieldLabel`, `FieldError`, `FieldGroup`, `FieldSet`) for consistent labels, errors and ARIA. This is the pattern shadcn's current form guide uses; the older `Form` wrapper (`FormField`, `FormItem`, `FormMessage`) hides the wiring behind context and was not installed, so every form shows its label, `aria-invalid` and error explicitly.
- Submitting calls a mutation hook: `mutateAsync` when server errors map back to fields (`useCreateProperty().mutateAsync`), `mutate` when the only server error is form-level (sign-in). The form's submit button reads `isPending` from the mutation (or `formState.isSubmitting`).
- **Server errors are mapped back to fields** when they can be. A unique-violation `AppError` becomes `setError('title', …)`; anything else shows in a form-level alert.
- **Client validation is for UX only.** The database enforces the real constraints (`not null`, `check`, `unique`, foreign keys, RLS `with check`). Keep both in sync. When they disagree, the database wins.
- Schemas describe *form input*. If the insert payload has a different shape, convert it in a small, explicit function next to the schema, not inside the component.
- **Validation messages are translation keys, not text.** Schemas are plain module-level values that don't know the current language, so each message is a key from the `validation` section of `common.json`. `FieldError` shows it through the `useValidationMessage` helper in `i18n/validation.ts`, which passes it to `t()`. Changing the language then re-translates errors that are already on screen.
- **Numbers and decimals accept both formats.** Romanian users type `1.250,50` and English users type `1,250.50`. Number fields parse input with the current locale's separators (a `parseLocaleNumber` helper in `i18n/format.ts`), not with a bare `z.coerce.number()`.

`features/properties/property.schemas.ts`:

```ts
import { z } from 'zod';

export const propertyFormSchema = z.object({
  title: z.string().trim().min(3, 'validation.minLength').max(120, 'validation.maxLength'),
  address: z.string().trim().min(5, 'validation.minLength'),
  price: z.number({ error: 'validation.number' }).int().positive('validation.positive'),
});
export type PropertyFormValues = z.infer<typeof propertyFormSchema>;
```

Messages that need values (such as "at least 3 characters") read them from the Zod issue (`minimum`, `maximum`) and pass them to `t()` as interpolation values, in one shared helper (`i18n/validation.ts`) used inside every `FieldError`.

---

## 8. Routing

- **TanStack Router with file-based routes**, generated by `@tanstack/router-plugin/vite`. The generated `routeTree.gen.ts` is committed, and ESLint and Prettier skip it.
- **Route groups** (folders with a `_` prefix) split the app by access level:
  - `_public/` holds login, sign-up, password reset and the auth callback. Authenticated users who land here are redirected into the app.
  - `_authenticated/` holds everything behind login. Its `route.tsx` holds the guard and the app shell.
- **Router context** carries `queryClient` and `auth`, so loaders and guards can use them without imports.
- **Search params are validated** with a Zod schema in each route's `validateSearch`. Components read them through `Route.useSearch()`, which is fully typed.
- **Every route that fetches data** defines a `loader` (prefetch), a `pendingComponent`, and either an `errorComponent` or the root default.
- Code splitting is automatic (`autoCodeSplitting: true` in the plugin config).
- `notFoundComponent` lives on the root route. Loaders throw `notFound()` when a record does not exist or is not visible under RLS.
- **URLs carry no language prefix** (`/properties`, not `/ro/properties`). Pages behind login are not indexed by search engines, so a prefix would only add routing complexity. If public, indexable pages are added later, they get `/ro/…` and `/en/…` prefixes and `hreflang` links (section 18). URL path segments stay in English for both languages.

---

## 9. Authentication and authorization

### Authentication (Supabase Auth)

- **Methods**: email + password and magic link to start. Add OAuth providers (Google etc.) only when product asks for them. Supabase handles PKCE and redirects.
- **`AuthProvider`** (`features/auth`) owns the session:
  - It reads the initial session with `supabase.auth.getSession()`.
  - It subscribes with `supabase.auth.onAuthStateChange`, updates context, and calls `router.invalidate()` so guards re-run.
  - On `SIGNED_OUT` it calls `queryClient.clear()`.
  - It renders nothing until the initial session is known, so guards never see a "maybe logged in" state.
- **`useAuth()`** returns `{ session, user, signIn, signOut, … }`. Components never call `supabase.auth.*` directly; they go through `features/auth/api`.
- **Route guard**:

`routes/_authenticated/route.tsx`:

```ts
export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ context, location }) => {
    if (!context.auth.session) {
      throw redirect({ to: '/login', search: { redirect: location.href } });
    }
  },
  component: AppShell,
});
```

- Configure the email templates and redirect URLs (Site URL, additional redirect URLs per environment) in `supabase/config.toml` for local and in the dashboard for hosted projects. Document every change in the PR.
- **Auth emails are bilingual.** Supabase keeps one template per email type, so each template branches on the user's language: `{{ if eq .Data.locale "en" }}…{{ else }}…{{ end }}`, with Romanian as the default. Sign-up and magic-link calls pass the current language in `options.data.locale`. That is user metadata, which is acceptable because language is a preference, not a permission. Keep the template sources in `supabase/templates/` and reference them from `config.toml`.
- **Auth error messages are translated.** `toAppError()` maps Supabase Auth error codes (`invalid_credentials`, `email_not_confirmed`, `weak_password`, …) to translation keys. The English `message` text from Supabase is never shown.

### Authorization

- **RLS is the authorization layer.** If a policy doesn't allow it, no client code can do it. UI checks (hiding a button, guarding a route) are UX only.
- **Roles, when we need them**: a `public.user_roles` table, plus a **Custom Access Token Hook** that adds a `user_role` claim to the JWT. Policies and the UI read that claim.
  - **Never** use `user_metadata` for authorization, because users can edit it. `app_metadata` and the hook claim are server-controlled.
- `useAuth()` exposes `hasRole(role)` / `can(permission)` helpers that read the claims. Route guards for role-restricted areas use them in `beforeLoad`.
- **Never use the service-role / secret key in the frontend**, and never put it in a `VITE_` variable. It belongs only in Edge Functions and CI secrets.

---

## 10. Error handling

One error type crosses layer boundaries:

`lib/errors.ts`:

```ts
export type AppErrorCode =
  | 'unauthenticated' | 'forbidden' | 'not_found' | 'conflict'
  | 'validation' | 'network' | 'unknown';

export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    message: string,
    public readonly cause?: unknown,
    public readonly field?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
```

- `lib/supabase/errors.ts → toAppError()` maps PostgREST, Auth and Storage errors to an `AppError` code. Examples: `PGRST116` → `not_found`, `23505` → `conflict`, `42501` → `forbidden`, JWT expiry → `unauthenticated`. Only data-access code calls it.
- **Error handling per level:**
  - **Rendering errors**: route `errorComponent` per route, plus a root `ErrorBoundary` (`react-error-boundary`) as the last resort, with a "Try again" button that resets queries.
  - **Query errors**: thrown into the nearest route error boundary when using `useSuspenseQuery`. Non-suspense queries render an inline error state.
  - **Mutation errors**: a global `MutationCache.onError` shows a `sonner` toast with a user-friendly message, unless the mutation sets `meta: { silent: true }` because the form handles the error itself.
  - **`unauthenticated` anywhere**: sign out and redirect to `/login`.
- **Show users friendly, translated messages.** Each `AppErrorCode` has a key in `common.json` (`errors.forbidden`, `errors.conflict`, …), and the UI shows `t(`errors.${error.code}`)`. The `message` on `AppError` is English developer text for logs and Sentry; it never reaches the screen. Never show raw Postgres error text in the UI.
- **Edge Functions and Postgres functions return error codes, not sentences** (`{ "error": "address_not_found" }`, or `raise exception using errcode = 'P0001', message = 'address_not_found'`). The frontend translates the code. The backend never needs to know the user's language.
- Report unexpected errors (`unknown`, rendering errors) to Sentry. Don't report expected errors (`validation`, `not_found`).

---

## 11. TypeScript conventions

`tsconfig.app.json` (beyond the Vite template defaults):

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "verbatimModuleSyntax": true,
    "paths": { "@/*": ["./src/*"] }
  }
}
```

Conventions:
- **No `any`.** Use `unknown` and narrow it. `as` casts are allowed only when the code guarantees something the type system cannot express; the reason goes in the PR description. Never use `as unknown as`.
- **Use `type` by default.** Use `interface` only when extending or declaration merging is needed (e.g. augmenting a library's types).
- **No `enum`.** Use string-literal unions or `as const` objects. DB enums come from the generated types (`Enums<'property_status'>`).
- **Derive types; don't duplicate them.** Get DB types from `database.types.ts`, form types from `z.infer`, and query results from the function return type (`Awaited<ReturnType<typeof getProperty>>`).
- **Use `satisfies`** to check config objects without widening them.
- **Use `import type`** for type-only imports (enforced by `verbatimModuleSyntax`).
- **Exported functions in `api/` and `utils` have explicit return types** when the inferred type is unclear. Components don't need them.
- **Discriminated unions** for state with variants (`{ status: 'idle' } | { status: 'error'; error: AppError }`).
- **Validate data at the boundaries**: env vars, URL search params, form input, and any JSON from Edge Functions or third parties. Data from typed Supabase queries does not need runtime validation.

---

## 12. Supabase-generated types

- **Generate types** from the local database after every migration:

```bash
pnpm db:types   # supabase gen types typescript --local > src/lib/supabase/database.types.ts
```

- **Commit** `database.types.ts`. CI regenerates it and fails if the diff is non-empty, so the types never drift from the migrations.
- **Use the helper types** that come with the generated file:

`features/properties/property.types.ts`:

```ts
import type { Tables, TablesInsert, TablesUpdate, Enums } from '@/lib/supabase/database.types';

export type Property = Tables<'properties'>;
export type PropertyInsert = TablesInsert<'properties'>;
export type PropertyUpdate = TablesUpdate<'properties'>;
export type PropertyStatus = Enums<'property_status'>;
```

- **Keep DB field names (`snake_case`) in TypeScript.** No camelCase mapping layer: it doubles the type surface and adds bugs for little gain. Write a mapping only when the UI needs a genuinely different *shape* (e.g. nesting joined rows), and keep it in the feature's `api/` folder.
- For JSON columns, override the type in a small `database.overrides.ts` with the `MergeDeep` pattern from the Supabase docs. Never hand-edit the generated file.

---

## 13. Database access patterns

- **Schema changes go only through migrations**: `supabase migration new <descriptive_name>`, edited as SQL, applied locally with `supabase db reset`, and reviewed in the PR.
  - Never change a hosted project's schema in the dashboard. If someone does by accident, capture it with `supabase db diff` and commit it as a migration.
- **The client talks to `public` tables and views through PostgREST.** Put anything with business rules (multi-row writes, score recomputation, cross-table invariants) in **Postgres functions** called via `supabase.rpc()`.
  - Functions default to `security invoker`. Use `security definer` only when needed, with `set search_path = ''` and fully qualified names.
- **Use views** for read models that join several tables. Create them `with (security_invoker = true)` so RLS still applies.
- **Use a `private` schema** for helper functions and internal tables that PostgREST must not expose.
- **Use triggers** for `updated_at` and audit columns, not client code.
- **Indexes**: on every foreign key, every column used in RLS policies, and every column the UI filters or sorts on.
- **Language and the database** (details in section 18):
  - **Fixed lists** (property types, statuses) are Postgres enums or lookup tables with English codes (`apartment`, `house`). The labels shown to users are translation keys in the frontend (`properties:type.apartment`). The database stores no UI labels.
  - **Text users type** (titles, descriptions) is stored once, in whatever language they wrote it, and is never translated.
  - **Searching text** goes through the `unaccent` extension (`unaccent(title) ilike unaccent('%' || q || '%')`, wrapped in an RPC or a generated column with a trigram index), so `brasov` finds `Brașov`.
  - **The user's language preference** lives in `profiles.locale` (`text not null default 'ro' check (locale in ('ro', 'en'))`).
- **Seed data** in `supabase/seed.sql`: realistic but fake data, with a few known test users for E2E tests. Include Romanian diacritics (ă, â, î, ș, ț) in seed text so encoding, sorting and search problems show up early, and include one test user per language.
- **Environments**: development runs only against the local Supabase stack (`supabase start`); there is no hosted dev or staging project. Production is one hosted project, `property-score` (ref `zksoblghnnirkjvewrsv`, `eu-central-1`). Migrations reach it through CI (`supabase db push` on a version tag), never from a laptop. Hosted auth settings (site URL, redirect URLs, email templates) are mirrored from `config.toml` by hand.

---

## 14. Row Level Security (RLS)

Rules that apply to every table:

1. **Enable RLS when the table is created**, in the same migration. CI runs the Supabase database advisors (`supabase db lint`) and fails on any table without RLS.
2. **One policy per operation** (`select`, `insert`, `update`, `delete`), named in plain English. Use `to authenticated` (or `anon`) explicitly; never leave the role open.
3. `insert` and `update` policies have a **`with check`** clause, so users can't write rows they could not read.
4. **Wrap auth functions in a sub-select** (`(select auth.uid())`) so Postgres evaluates them once per query, not once per row.
5. **Index the columns policies filter on** (`owner_id`, `organization_id`).
6. Complex checks (membership, roles) go in a `security definer` helper in the `private` schema, called from the policy.
7. **Every policy has pgTAP tests** for both outcomes: the owner can, and another user and `anon` cannot.

```sql
create table public.properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 120),
  address text not null,
  score numeric(5, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.properties enable row level security;
create index properties_owner_id_idx on public.properties (owner_id);

create policy "Owners can read their properties"
  on public.properties for select to authenticated
  using ((select auth.uid()) = owner_id);

create policy "Owners can create properties"
  on public.properties for insert to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "Owners can update their properties"
  on public.properties for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Owners can delete their properties"
  on public.properties for delete to authenticated
  using ((select auth.uid()) = owner_id);
```

Columns the client must never set (e.g. a computed `score`) are protected with column privileges (`revoke update (score) on public.properties from authenticated`) or a trigger. A policy alone does not protect them.

---

## 15. Storage and Edge Functions

### Storage (when we store files, such as property photos or documents)

- **Buckets are private by default.** A bucket is public only if its contents really are public (e.g. marketing images).
- **Path convention**: `<bucket>/<owner_id>/<entity_id>/<filename>`. This lets RLS on `storage.objects` check `(storage.foldername(name))[1] = (select auth.uid())::text`.
- **Storage policies live in migrations and have pgTAP tests**, like table policies.
- Private files are displayed through **signed URLs** (`createSignedUrl`, short expiry) fetched by a query hook, so they are cached.
- Set the size limit and allowed MIME types on the bucket. The client also validates them, for UX.
- Upload and download code lives in `features/*/api/*.storage.ts`, behind the same "throw `AppError`" contract.

### Edge Functions (only when the database can't do the job)

Use an Edge Function for:
- calls to third-party APIs that need secrets (geocoding, valuation data, email providers);
- webhooks from external services;
- work that needs the secret key or must not run with the user's privileges.

Don't use one for plain CRUD or for logic that fits in a Postgres function; RLS and RPC cover that.

Rules:
- One folder per function (`supabase/functions/<kebab-name>/index.ts`), with shared code in `_shared/`.
- **Validate the request body with Zod** inside the function. Verify the caller's JWT (the default) unless it is a webhook, which checks a signature instead.
- Create the Supabase client inside the function **with the caller's `Authorization` header** so RLS still applies. Use the secret key only for the specific operation that needs it.
- Secrets live in `supabase/functions/.env` locally (git-ignored) and are set with `supabase secrets set` for hosted projects.
- The frontend calls functions only from `features/*/api` via `supabase.functions.invoke('<name>', { body })`. The request and response types live in `supabase/functions/_shared/types.ts`, which the frontend imports through a path alias, so there is one source of truth.

---

## 16. Keeping Supabase out of the UI

This is enforced, not left as a convention:

`eslint.config.js` (excerpt):

```js
{
  files: ['src/**/*.{ts,tsx}'],
  ignores: ['src/lib/supabase/**', 'src/features/*/api/**', 'src/test/**'],
  rules: {
    'no-restricted-imports': ['error', {
      paths: [{ name: '@supabase/supabase-js', message: 'Use a feature api/ module.' }],
      patterns: [
        { group: ['@/lib/supabase/client'], message: 'Only api/ modules may use the Supabase client.' },
        { group: ['@/features/*/*', '!@/features/*/index'], message: 'Import features through their index.ts.' },
      ],
    }],
  },
}
```

What this gives us:
- Components depend on hooks (`useSuspenseQuery(propertyQueries.detail(id))`, `useCreateProperty()`), never on `supabase`.
- Component tests mock at the network level (MSW) or the `api` module, never by stubbing a Supabase client deep in the tree.
- Moving a query to an RPC, view or Edge Function changes one `*.api.ts` file.

---

## 17. Styling and UI components

- **Tailwind CSS 4** via `@tailwindcss/vite`. Configuration is CSS-first, in `src/styles/globals.css` (`@import "tailwindcss"` plus `@theme` tokens). No `tailwind.config.js` unless a plugin requires one.
- **Design tokens** (colours, radius, fonts) are CSS variables in `globals.css`, using the shadcn token names (`--background`, `--primary`, …) plus the PropertyScore additions. Their values, the density modes and the component catalogue come from the PropertyScore design system, recorded in `.claude/rules/design-system.md`. Components use semantic classes (`bg-primary`), never raw hex values.
- **shadcn/ui**: components are added with the CLI into `src/components/ui/` and are ours to edit. Edit them only for design-system-wide changes. Feature-specific variants go in feature components that wrap the primitive.
- **`cn()`** merges classes. It comes from shadcn's `cn` package (a drop-in for `clsx` + `tailwind-merge`) and is re-exported from `lib/utils.ts`, which `components.json` points to. **`class-variance-authority`** handles component variants, as shadcn does.
- **Icons**: `lucide-react` only.
- **Responsive**: mobile-first with Tailwind's default breakpoints (`sm` 640, `md` 768, `lg` 1024, `xl` 1280). No custom breakpoint ladder.
- **Dark mode**: tokens are defined for both themes from day one (shadcn does this), and the `dark` class goes on `<html>`. Whether we ship a theme toggle is a product decision.
- **Self-host fonts** with `@fontsource/*`, including the `latin-ext` subset for Romanian ș/ț/ă/â/î; no Google Fonts requests at runtime.
- **Charts** (score visualisations): add `recharts`, through shadcn's chart wrapper, only when the first chart is built.
- `prettier-plugin-tailwindcss` sorts class names. Long class lists are fine. When the same set of classes repeats, extract a component, not an `@apply` class.

---

## 18. Internationalisation (Romanian and English)

The app ships in **Romanian (`ro`)** and **English (`en`)** from the first screen. Every string a user can see is translated, and no feature merges with only one language.

### Languages and how one is chosen

- **Romanian is the default and the source language**: keys are written in the `ro` files first, and `ro` is i18next's `fallbackLng`.
- **The starting language is chosen in this order**, and the first match wins:
  1. `profiles.locale` of the signed-in user, so the choice follows them across devices;
  2. the `locale` value in `localStorage`, for visitors who aren't signed in yet;
  3. the browser language: `ro*` → `ro`, `en*` → `en`;
  4. otherwise `ro`.
- **The language switcher** sits in the app header and on the login screen. Each option is labelled in its own language ("Română", "English") with a matching `lang` attribute. Switching:
  - calls `i18n.changeLanguage()`;
  - writes `localStorage`;
  - updates `profiles.locale` through a mutation when the user is signed in;
  - sets `<html lang>`, which screen readers and hyphenation rely on;
  - tags Sentry with `locale`.
- Switching needs no reload: `react-i18next` re-renders every component that uses `t`.

### Setup

- **Libraries**: `i18next` + `react-i18next`. Nothing else is needed for two languages: no ICU message format, no backend plugin, no language-detector plugin (the four-step detection above is ~15 lines in `i18n.ts`).
- **One namespace per feature** (`properties.json`, `auth.json`), plus `common.json` for shared words, `errors.*` and `validation.*`. Components load their namespace with `useTranslation('properties')`.
- **Both languages are bundled** while the JSON is small. When the translations pass ~50 KB, switch to loading namespaces on demand with `i18next-resources-to-backend` and dynamic imports. That change touches only `i18n.ts`.

`i18n/i18n.ts` (shape):

```ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import roCommon from './locales/ro/common.json';
import roProperties from './locales/ro/properties.json';
import enCommon from './locales/en/common.json';
import enProperties from './locales/en/properties.json';

export const SUPPORTED_LOCALES = ['ro', 'en'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const resources = {
  ro: { common: roCommon, properties: roProperties },
  en: { common: enCommon, properties: enProperties },
} as const;

void i18n.use(initReactI18next).init({
  resources,
  lng: detectInitialLocale(),
  fallbackLng: 'ro',
  defaultNS: 'common',
  interpolation: { escapeValue: false },
});

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
});
```

`i18n/i18next.d.ts`, which makes `t('properties:form.title.label')` type-checked, so a typo in a key fails the build:

```ts
import 'i18next';
import type { resources } from './i18n';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: (typeof resources)['ro'];
  }
}
```

### Writing translations

- **Keys are semantic and nested**, not English sentences: `properties:form.title.label`, `properties:list.empty`, `common:actions.save`.
- **Use whole sentences with interpolation; never concatenate.** Romanian word order, gender agreement and cases differ from English, so `t('properties:deleteConfirm', { title })` is correct and `t('delete') + ' ' + title + '?'` is not. For text with links or bold parts inside, use `<Trans>`.
- **Plurals use i18next's suffixes, and Romanian has three forms** where English has two:

  `ro/properties.json`:

  ```json
  { "count_one": "{{count}} proprietate", "count_few": "{{count}} proprietăți", "count_other": "{{count}} de proprietăți" }
  ```

  `en/properties.json`:

  ```json
  { "count_one": "{{count}} property", "count_other": "{{count}} properties" }
  ```

  `few` covers 0, 2–19 and numbers ending in 01–19 (e.g. 102), and `other` covers 20 and up ("20 de proprietăți"). Always pass `count`; never pick a form with an `if`.
- **The same PR adds both languages.** The developer writes Romanian and English together. If a translation is uncertain, mark it in the PR description rather than leaving a key out.
- **Don't translate**: user-entered content, log and Sentry messages (English, for developers), URL paths, and enum codes stored in the database.
- **Strings inside third-party components count too.** shadcn/Radix components contain hidden English text (for example the screen-reader "Close" label in `Dialog`). Replace it with `t()` when a component is added with the shadcn CLI.
- **Page titles are translated** in each route's `head`, so the browser tab and history follow the language.
- If people who don't code need to edit translations, add a translation-management tool (Tolgee, Locize) then. The JSON layout above imports into both.

### Formatting dates, numbers and money

- **`i18n/format.ts`** wraps `Intl` with the current locale: `formatDate`, `formatDateTime`, `formatRelative`, `formatNumber`, `formatPercent`, `formatCurrency`, plus `parseLocaleNumber` for inputs (section 7). Components never call `toLocaleString()` or build their own `Intl` objects.
- **Locale tags for formatting**: `ro` → `ro-RO`; `en` → `en-GB`, so English users also get day/month/year dates, 24-hour times and Monday-first weeks, as Romanian users do. Use `en-US` instead only if the English audience is mainly American.
- **The currency comes from the data, not the language.** A price stored in EUR shows as EUR in both languages. Only the number format changes: `1.250,50 €` in Romanian and `€1,250.50` in English. Store money as an amount plus an ISO currency code (`RON`, `EUR`).
- **Dates** are stored as `timestamptz` (UTC) and shown in the browser's time zone. The date picker (shadcn `Calendar`, built on `react-day-picker`) gets the matching `date-fns` locale (`ro` / `enGB`), which also translates month and weekday names.
- **Sorting text in the browser** uses `Intl.Collator(locale)`, so `ș` sorts after `s` instead of after `z`. For sorting in the database, columns that are sorted by name use the ICU collation `"ro-x-icu"`.

### Romanian-specific details

- **Diacritics**: the correct letters are **ș and ț with a comma below** (U+0219, U+021B), not ş/ţ with a cedilla. The self-hosted font must include the `latin-ext` subset, or these letters fall back to a different font. Search treats all variants as equal through `unaccent` (section 13).
- **Text length**: Romanian UI text runs roughly 20–30% longer than English. Buttons, table headers and badges must allow text to wrap or truncate with a tooltip, never a fixed width. Check new screens in Romanian first, because it is the longer language.

### Backend

The database and Edge Functions don't translate anything. They store English codes and return error codes, and the frontend turns those into text (sections 10 and 13). The only server-side text is in the auth emails, which branch on the user's language (section 9).

### Public pages (only if added later)

If logged-out pages that search engines should index are added (for example shareable property scores), they move under `/ro/…` and `/en/…` prefixes. Each page then gets `hreflang` alternate links and a translated `<title>` and meta description. Pages behind login keep URLs without a prefix.

---

## 19. Environment configuration

- Vite exposes only variables prefixed `VITE_`, and **everything in them is public**: it ends up in the JS bundle.
- **Validate with Zod at startup.** The app fails fast with a clear message:

`config/env.ts`:

```ts
import { z } from 'zod';

const envSchema = z.object({
  VITE_APP_ENV: z.enum(['local', 'production']),
  VITE_SUPABASE_URL: z.url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  VITE_SENTRY_DSN: z.string().optional(),
});

export const env = envSchema.parse(import.meta.env);
```

- **Code reads `env.X`, never `import.meta.env.X`** (ESLint rule outside `config/`).
- **Files:**
  - `.env.example` (committed) lists every variable with safe placeholder values.
  - `.env.local` (git-ignored) holds local values; after `supabase start`, use the local URL and publishable key it prints.
  - Production values are set in the hosting provider and CI, never committed.
- **Use the Supabase publishable key** (`sb_publishable_…`) in the browser. The secret key (`sb_secret_…`, formerly service role) never goes in a `VITE_` variable.
- **No environment-specific code branches** beyond what `VITE_APP_ENV` drives (Sentry on/off, log level, debug tools such as TanStack Query Devtools, which only load when the environment is `local`).

---

## 20. Logging and monitoring

- **Sentry** (`@sentry/react`), initialised in `main.tsx` when `VITE_SENTRY_DSN` is set:
  - the TanStack Router browser-tracing integration for performance, at a low traces sample rate in production;
  - error capture from the root error boundary and the global query/mutation error hooks;
  - `Sentry.setUser({ id })` on sign-in, with **the user ID only and no email or other PII**, and a `locale` tag so errors can be filtered by language;
  - source maps uploaded in CI with `@sentry/vite-plugin`, and not served publicly.
  - Session Replay is off until there is a privacy review, because it records user screens.
- **`lib/logger.ts`** is a ~20-line wrapper with `debug | info | warn | error`.
  - In local, it logs to the console.
  - In production, `warn` and `error` become Sentry breadcrumbs or events, and `debug` and `info` are dropped.
  - App code never calls `console.*` directly (ESLint `no-console`).
- **Never log** tokens, passwords, full sessions or personal data.
- **Backend observability**: Supabase dashboard logs (API, Postgres, Auth, Edge Functions), plus the **Security and Performance Advisors**, reviewed before every release. Edge Functions log JSON lines with a request ID.
- **Web Vitals**: Sentry collects them through the browser-tracing integration; no separate tool.

---

## 21. Testing strategy

| Level | Tool | What it covers | Where |
|---|---|---|---|
| Unit | Vitest | Pure functions: scoring, formatting, schema rules, `toAppError` mapping | next to the source, `*.test.ts` |
| Component / integration | Vitest + React Testing Library + `user-event` + MSW | A feature component with real providers, query hooks and router; Supabase HTTP mocked by MSW | next to the component, `*.test.tsx` |
| Database | pgTAP (`supabase test db`) | RLS policies, Postgres functions, triggers, constraints | `supabase/tests/*.test.sql` |
| End-to-end | Playwright | Critical user journeys against the real local Supabase stack with seed data | `e2e/` |

Rules:
- **Test behaviour, not implementation.** Query by role, label and text (`getByRole('button', { name: 'Salvează' })`). Use `data-testid` only when no accessible query works.
- `src/test/render.tsx` provides `renderWithProviders()`, which sets up a fresh `QueryClient` (with retries off), a memory router, the auth context and i18n with the real translation files. No test shares a cache with another.
- **Component tests run in Romanian**, the source language and the one with the longest text. `renderWithProviders({ locale: 'en' })` switches language for tests that are about language itself.
- **Translation tests**:
  - unit tests for `i18n/format.ts` (dates, numbers, currency, `parseLocaleNumber`) in both locales, and for Romanian plural forms (1, 2, 19, 20, 101, 102);
  - one component test that switches language and checks that text, validation errors and `<html lang>` all update;
  - an E2E smoke test per language: sign in as the `ro` test user and as the `en` test user, and check that each sees their language and that the choice survives a reload.
- **MSW handlers** mock the PostgREST endpoints (`*/rest/v1/properties*`) in `src/test/msw/handlers/<feature>.ts`, with data from `src/test/factories`. `onUnhandledRequest: 'error'` catches unmocked calls.
- **Unit tests are required** for every Postgres function and RLS policy (pgTAP) and every pure util.
- **Component tests are required** for forms (validation plus server-error mapping) and for screens with conditional logic. Simple presentational components don't need them.
- **E2E tests are a short list of critical paths**, kept fast: sign up / sign in, create → score → view a property, permission denial between two users. Log in by saving Playwright `storageState` per test user, not through the UI in every test.
- **Coverage**: report it, but don't gate on a percentage. Reviews check that new logic comes with tests.
- **CI runs** typecheck → lint → translation check → unit/component → `supabase start` → `supabase db reset` → pgTAP → Playwright → build.

---

## 22. Code quality tooling

| Tool | Configuration |
|---|---|
| **ESLint 9** (flat config) | `@eslint/js` recommended, `typescript-eslint` `strictTypeChecked` + `stylisticTypeChecked`, `eslint-plugin-react-hooks` (recommended, including the React Compiler rules), `eslint-plugin-react-refresh`, `eslint-plugin-jsx-a11y`, `@tanstack/eslint-plugin-query`, `@tanstack/eslint-plugin-router`, `eslint-plugin-testing-library` (tests only), `eslint-plugin-playwright` (e2e only), the `no-restricted-imports` boundaries from section 16, `no-console`, and `eslint-plugin-i18next` (`no-literal-string` in JSX for `features/`, `routes/` and `components/`, so untranslated text fails lint) |
| **Translation check** | `scripts/check-translations.ts` (~60 lines, run with Node). It fails CI when `ro` and `en` differ in files or keys, when a value is empty, or when interpolation variables (`{{title}}`) differ between languages. Plural keys are compared by base key, because Romanian has `_few` and English doesn't. It also flags `ș`/`ț` written with a cedilla (`ş`/`ţ`) in the `ro` files |
| **Prettier 3** | `printWidth: 100`, `singleQuote: true`, `trailingComma: 'all'`, plus `prettier-plugin-tailwindcss`. `eslint-config-prettier` turns off ESLint rules that conflict with it |
| **EditorConfig** | 2 spaces, LF, final newline, UTF-8 |
| **TypeScript** | `tsc -b --noEmit` as its own CI step (Vite does not type-check) |
| **Knip** | Finds unused files, exports and dependencies. Runs in CI as a warning, then as an error once the codebase settles |
| **Git hooks** | `lefthook` runs Prettier and ESLint on staged files (fast). CI is the real gate |
| **Dependency updates** | Renovate, with minor/patch updates grouped weekly and major versions in separate PRs |
| **SQL** | `supabase db lint` in CI; SQL formatting is reviewed by hand |

`package.json` scripts:

```jsonc
{
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "typecheck": "tsc -b --noEmit",
  "lint": "eslint .",
  "format": "prettier --write .",
  "format:check": "prettier --check .",
  "test": "vitest",
  "test:run": "vitest run",
  "test:e2e": "playwright test",
  "db:start": "supabase start",
  "db:reset": "supabase db reset",
  "db:test": "supabase test db",
  "db:types": "supabase gen types typescript --local > src/lib/supabase/database.types.ts",
  "i18n:check": "node scripts/check-translations.ts",
  "knip": "knip"
}
```

---

## 23. Naming conventions and code organisation

| Thing | Convention | Example |
|---|---|---|
| Files and folders | `kebab-case` | `property-card.tsx`, `use-score-filters.ts` |
| Role suffixes | `.api.ts`, `.queries.ts`, `.schemas.ts`, `.types.ts`, `.utils.ts`, `.storage.ts`, `.store.ts`, `.test.ts(x)` | `properties.api.ts` |
| Components | `PascalCase`, named export, one exported component per file | `export function PropertyCard()` |
| Hooks | `useX`; query hooks are named after the data, mutation hooks after the action | `useCreateProperty`, `useDeleteProperty` |
| Query factories | `<entity>Queries` with `list`, `detail`, … | `propertyQueries.detail(id)` |
| Data-access functions | verb + noun | `listProperties`, `getProperty`, `createProperty` |
| Zod schemas | `camelCase` + `Schema`; inferred type without the suffix | `propertyFormSchema` → `PropertyFormValues` |
| Types | `PascalCase`, no `I`/`T` prefixes | `Property`, `PropertyFilters` |
| Booleans | `is`/`has`/`can`/`should` prefix | `isPending`, `canEdit` |
| Event props / handlers | `onX` for props, `handleX` for implementations | `onSubmit={handleSubmit}` |
| Constants | `SCREAMING_SNAKE_CASE` only for true module-level constants | `PROPERTY_COLUMNS` |
| DB tables | `snake_case`, plural | `properties`, `property_scores` |
| DB columns | `snake_case`; FKs `<entity>_id`; timestamps `*_at` | `owner_id`, `created_at` |
| DB functions | `snake_case` verb phrase | `recalculate_property_score` |
| Migrations | `supabase migration new <verb>_<object>` | `create_properties`, `add_score_to_properties` |
| RLS policies | English sentence | `"Owners can update their properties"` |
| Edge Functions | `kebab-case` | `geocode-address` |
| Translation files | `src/i18n/locales/<lang>/<namespace>.json`; namespace = feature name, or `common` | `ro/properties.json` |
| Translation keys | `camelCase` segments, nested by screen/component then element; plural suffixes `_one`/`_few`/`_other` | `properties:form.title.label`, `common:actions.save`, `common:errors.forbidden` |
| Env vars | `VITE_` + `SCREAMING_SNAKE_CASE` | `VITE_SUPABASE_URL` |
| Routes / URLs | `kebab-case` segments, `$param` in file names | `properties/$propertyId.tsx` → `/properties/123` |
| Branches / commits | `<type>/<ticket>-<short-desc>`; commits in Conventional Commits style | `feat/PS-42-score-filter`, `feat(properties): add score filter` |

Other organisation rules:
- **Named exports only.** The exception is a framework that requires a default export; TanStack Router does not.
- **No barrel files** except each feature's `index.ts`. They hide dependencies and slow down tests and HMR.
- **Import order** (enforced by Prettier or an ESLint plugin): external packages → `@/` aliases → relative imports.
- **No comments, in any file.** No explanatory comments, section headers, TODOs, commented-out code or JSDoc, in code, SQL, CSS or configuration. Names, types and small functions carry the meaning; explanations go in the PR description. Only functional tool directives (`@ts-expect-error`, `eslint-disable-next-line`, `prettier-ignore`, `/// <reference>`) and the headers of generated files are allowed. Unfinished work is a ticket, not a `TODO`.
- **A file over ~250 lines** is a signal to split it; it is not a hard rule.

---

## 24. Avoiding unnecessary abstraction

The architecture above is deliberately thin. Keep it that way:

- **No wrappers around libraries for their own sake.** No `useApi`, no `BaseService`, no `HttpClient` around supabase-js, and no custom query hook that just forwards to `useQuery`. Use the library directly in the layer allowed to use it.
- **Apply the rule of three.** Write it inline the first time, copy it the second time, and extract a shared abstraction the third time, once you know what actually varies.
- **No speculative generality.** Don't add a config option, prop, or layer for a requirement that doesn't exist yet.
- **No mapping layers by default.** Use generated DB types as they are (section 12).
- **One way to do each thing.** One mutation path (TanStack Query), one form library, one toast library, one icon set, one i18n library and one formatting module. A second way needs a written reason in this file.
- **Prefer the platform and the database.** Use a Postgres constraint before a client validator, an RLS policy before an `if` in a component, and a native `<dialog>` or Radix primitive before a custom modal.
- **Delete freely.** Knip flags dead code, and removing unused code is always a valid PR.
- **Raise disagreements with this plan by changing the plan**, not by quietly drifting from it in code.

---

## 25. Setup steps (initial scaffolding)

1. Remove the Java scaffold (`src/Main.java`), then run `pnpm create vite@latest . --template react-ts`.
2. Add `.nvmrc` (Node 24) and an `engines` entry. Replace `.gitignore` with a Node/Vite one that also covers `.env*.local`, `supabase/.temp`, `supabase/functions/.env`, `playwright-report/`, `test-results/` and `coverage/`.
3. Install the core packages: TanStack Router (with its Vite plugin), TanStack Query (+ devtools), supabase-js, Zod, React Hook Form + resolvers, `i18next` + `react-i18next`, Tailwind 4 (`@tailwindcss/vite`), and the React Compiler Babel plugin.
4. Run `pnpm dlx shadcn@latest init`, then add `button`, `input`, `form`, `label`, `dialog`, `dropdown-menu`, `sonner`, `card` and `skeleton`.
5. Run `supabase init`, then `supabase start`. Write the first migration: `profiles`, including `locale`, plus a trigger that creates a profile on sign-up and copies `locale` from the sign-up metadata. Enable the `unaccent` extension, add RLS and pgTAP tests, then run `pnpm db:types`.
6. Create `config/env.ts`, `lib/supabase/client.ts`, `lib/errors.ts`, `lib/supabase/errors.ts`, `app/query-client.ts`, `app/router.ts` and `features/auth`, plus the `_public` and `_authenticated` route groups.
7. Create `src/i18n/` (init, typed keys, `format.ts`, `common` and `auth` namespaces in `ro` and `en`) and the language switcher. Translate the hidden strings in the shadcn components added in step 4. Write the bilingual auth email templates in `supabase/templates/`.
8. Set up the tooling: ESLint (with `eslint-plugin-i18next`), Prettier, EditorConfig, Vitest + RTL + MSW, Playwright, Knip, lefthook and the translation check script.
9. Add the GitHub Actions workflows:
   - `ci.yml` on every PR: typecheck, lint, format check, translation check, unit tests, DB tests, E2E and build, plus the check that generated types match the migrations.
   - `deploy-db.yml`: `supabase db push` to production on a `vX.Y.Z` tag. There is no hosted dev environment; merges to `main` only run CI.
   - Frontend deploys go through the hosting provider's Git integration.
10. Hosting: any static host (Vercel, Netlify or Cloudflare Pages) with an SPA fallback to `index.html`, and with security headers set (CSP allowing the Supabase and Sentry domains, HSTS, `X-Content-Type-Options`).

---

## 26. Open decisions

These are product or business choices that change parts of this plan. Decide them before the related work starts:

| Question | Affects |
|---|---|
| Is there a public (logged-out) part of the app, such as shareable property score pages? | Routing groups, `anon` RLS policies, SEO (a public SEO surface could justify SSR later) |
| Single user per account, or teams/organisations sharing properties? | Data model (`organization_id` on every table), RLS helper functions, roles |
| Which sign-in methods: email only, or also Google, Microsoft, etc.? | Auth configuration, redirect URLs |
| Is Romanian the right default for visitors whose browser is in neither language? Is the English audience mainly British/European (`en-GB` formats) or American (`en-US`)? | Language detection and date/number formats (section 18) |
| Which currencies are prices in: RON, EUR or both? | Money columns, `formatCurrency`, score inputs |
| Where does the score come from: client formula, Postgres function, or an external data API? | Whether scoring lives in `*.utils.ts`, an RPC, or an Edge Function |
| Hosting provider and domain | Env management, deploy workflow, CSP |
