# Property Score frontend — Claude Code instructions

## Project overview

React 19 single-page application for Property Score (TypeScript, Vite), with Supabase as the whole backend: Postgres, Auth, Storage and Edge Functions. There is no custom API server. Authenticated users manage and score properties on list, detail and form screens; mobile first, comfortable on desktop. The UI is **bilingual, Romanian (default) and English**: every visible string goes through i18next, and no feature merges with only one language.

`IMPLEMENTATION_PLAN.md` is the product specification: routes, page contents, user flows, data model, state machines, business rules and delivery phases. Check it before building any product feature. Build steps are implemented with the `/implement <step> <design>` skill, a selection of pages from the design (possibly spanning several steps) is planned and then built with `/plan-from-design <design> <pages>`, and progress is checked with `/plan-sync`; all three live in `.claude/skills/`. This file and the rule files in `.claude/rules/` are the operative coding rules and workflow. `SETUP_PLAN.md` is the decision record that explains *why* each choice was made and which alternatives were rejected. When a skill, a design mock or existing code disagrees with the rules, the rules win; when a rule turns out to be wrong, fix the rule and the matching section of `SETUP_PLAN.md` in the same change.

## Key rules

- **The browser is untrusted. Row Level Security is the authorization layer.** Every table has RLS enabled in the migration that creates it, with tested policies. A check in the UI (hidden button, route guard) is UX only, never the protection.
- **Supabase stays out of the UI.** Only `src/lib/supabase/**` and `src/features/*/api/**` import `@supabase/supabase-js` or the client; components use the feature's query and mutation hooks. ESLint enforces this.
- **Never hardcode user-visible text.** Every string goes through `t()` with keys in both `src/i18n/locales/ro` and `src/i18n/locales/en`. The backend returns codes, the frontend translates them.
- **Never put a secret in the frontend.** Only the Supabase publishable key reaches the browser; the secret (service-role) key lives in Edge Functions and CI secrets, never in a `VITE_` variable.
- **The schema changes only through migrations** in `supabase/migrations/`, followed by `pnpm db:types`. Never edit a hosted project in the dashboard, never hand-edit `database.types.ts`.
- **Never write comments, in any file.** No explanatory comments, section headers, TODOs, commented-out code or JSDoc in TypeScript, TSX (`{/* */}`), CSS, SQL migrations and pgTAP tests, Edge Functions, scripts, JSON/JSONC, YAML, TOML, email templates or dotfiles such as `.gitignore`, `.env.example` and `.editorconfig`. Code and configuration must be self-documenting through names, types and small functions; explain in the conversation or the PR description instead. The only lines allowed in comment syntax are functional directives a tool reads (`/// <reference types="vite/client" />`, `// @ts-expect-error <reason>`, `// eslint-disable-next-line <rule> -- <reason>`, `// prettier-ignore`) and the headers of generated files (`src/routeTree.gen.ts`, `src/lib/supabase/database.types.ts`, shadcn files the CLI writes). SQL that needs a description for the database itself uses `comment on …`, which is data, not a comment.
- **Do NOT create summary or changelog files** (no `CHANGES.md`, `SUMMARY.md`, etc.). Explain changes in the conversation.
- **Do NOT run tests unless explicitly asked.** Never run `pnpm test`, `pnpm test:run`, `pnpm test:e2e` or `pnpm db:test` without a user request. Approving an `/implement` proposal or a `/plan-from-design` plan counts as a request for `pnpm test:run` and `pnpm db:test` for the steps it covers; `pnpm test:e2e` still needs its own request.
- **Keep the workspace clean.** No temporary files unless required for the implementation.
- **Never guess or assume.** If you don't have enough information about an API, a value, a file location, a library behaviour or the user's intent, search the project first (grep, read more files, follow imports). For library questions read the current official docs (Supabase, TanStack, React, i18next, shadcn/ui); for the live database use the Supabase MCP server's read tools (`list_tables`, `get_advisors`, `search_docs`). If the answer is still unclear, ask the user. A confident-sounding guess is worse than admitting uncertainty.
- **Do not add libraries.** Add a dependency only when a feature needs it, and record it under Tech stack below. Deliberately not installed: Next.js or any SSR framework, Redux / RTK / MobX, SWR, Axios, Formik, `react-intl` / Lingui, MUI / Ant / Chakra or any second component library, CSS-in-JS, `moment` / `dayjs`, Jest, Cypress, Enzyme, a second icon set, a second toast library. Zustand, `recharts` and `@tanstack/react-table` are pre-approved but added only when the first feature needs them.

## Rule files

The detailed rules live in `.claude/rules/` and load automatically when a matching file is opened. Read the matching rule file before writing or reviewing that kind of code, even when no file of that kind is open yet.

| Rule file                    | Covers                                                                                                         | Applies to                                                                                                      |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `.claude/rules/react.md`     | TypeScript, components, hooks, state, forms, routing, accessibility, feature boundaries                        | `src/**/*.ts`, `src/**/*.tsx`                                                                                   |
| `.claude/rules/data-api.md`  | data-access functions, TanStack Query, errors, auth and session, environment, logging and Sentry               | `src/features/*/api/**`, `src/features/auth/**`, `src/lib/**`, `src/app/**`, `src/config/**`, `src/routes/**`   |
| `.claude/rules/supabase.md`  | migrations, RLS, Postgres functions, generated types, Storage, Edge Functions, auth email templates, pgTAP     | `supabase/**`, `src/lib/supabase/**`                                                                            |
| `.claude/rules/i18n.md`      | Romanian and English translations, keys, plurals, formatting, diacritics                                       | `src/i18n/**`, `src/**/*.tsx`, `supabase/templates/**`, `scripts/check-translations.ts`                         |
| `.claude/rules/styling.md`   | Tailwind 4, tokens, shadcn/ui, icons, fonts, responsive layout                                                 | `src/**/*.tsx`, `src/**/*.css`, `components.json`                                                               |
| `.claude/rules/design-system.md` | PropertyScore design system: token values, density modes, component catalogue and where each lives, usage rules | `src/**/*.tsx`, `src/**/*.css`, `components.json`                                                               |
| `.claude/rules/testing.md`   | Vitest, React Testing Library, MSW, factories                                                                  | `src/**/*.test.ts`, `src/**/*.test.tsx`, `src/test/**`, `vitest.config.ts`                                      |
| `.claude/rules/e2e.md`       | the Playwright suite against the local Supabase stack                                                          | `e2e/**`, `playwright.config.ts`                                                                                |

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
- **UI:** Tailwind CSS 4 (`@tailwindcss/vite`), shadcn/ui on Radix primitives (`radix-ui`), `class-variance-authority`, `cn` (shadcn's drop-in for `clsx` + `tailwind-merge`, re-exported from `@/lib/utils`), `tw-animate-css`, `lucide-react`, `sonner`, self-hosted fonts through `@fontsource-variable/geist` (with `latin-ext`); visual language from the PropertyScore design system (`.claude/rules/design-system.md`)
- **i18n:** `i18next` + `react-i18next`, `date-fns` locales only for the date picker
- **Monitoring:** `@sentry/react` + `@sentry/vite-plugin`
- **Unit and component tests:** Vitest, React Testing Library, `@testing-library/user-event`, `@testing-library/jest-dom`, MSW 2
- **End-to-end:** Playwright
- **Database tests:** pgTAP through `supabase test db`
- **Quality:** ESLint 9 flat config (`typescript-eslint` strict type-checked, `react-hooks`, `react-refresh`, `jsx-a11y`, TanStack Query and Router plugins, `eslint-plugin-i18next`, `testing-library`, `playwright`), Prettier 3 + `prettier-plugin-tailwindcss`, EditorConfig, Knip, lefthook
- **Delivery:** GitHub Actions (`ci.yml` on pull requests, `deploy-db.yml` for migrations), static hosting with SPA fallback

## Implementation status

Scaffolding from `SETUP_PLAN.md` section 25 is done through step 9:

- Vite + React + TypeScript project, Node 24 (`.nvmrc`), all core packages from the Tech stack.
- shadcn primitives in `src/components/ui/` (`alert`, `button`, `card`, `dialog`, `dropdown-menu`, `field`, `input`, `label`, `separator`, `skeleton`, `sonner`) and the layout components in `src/components/layout/`.
- Supabase: first migration `create_profiles` (with `locale`, the sign-up trigger, `unaccent`, RLS), pgTAP tests, `seed.sql` with the three test users, generated `database.types.ts`, bilingual auth email templates for `confirmation`, `recovery` and `email_change`.
- App wiring: `config/env.ts`, the Supabase client and error mapping, `AppError`, `logger`, Sentry, the query client, the router with `_public` (login, sign-up) and `_authenticated` (guard + app shell) route groups.
- Features: `auth` (sign-in, sign-up, sign-out, `useAuth`) and `profile` (locale sync, language switcher).
- i18n: `common` and `auth` namespaces in `ro` and `en`, typed keys, `format.ts`, translated Zod messages.
- Tooling: ESLint, Prettier, EditorConfig, Vitest + RTL + MSW, Playwright, Knip, lefthook, `scripts/check-translations.ts`, and the `ci.yml` / `deploy-db.yml` workflows.

Not built yet: step 10 (hosting, SPA fallback, security headers) waits on the hosting decision in section 26; the password-reset and auth-callback pages; every product feature (properties, scoring). Anything the rules describe that is not in the file system does not exist yet: check before importing, and create it following the rules when a feature needs it. Update this section as pieces land.

## Project structure

- Code is organised **by feature** under `src/features/<feature>/`; `src/components/` and `src/lib/` hold only what more than one feature uses.
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
src/
├── main.tsx                     mounts <App/>, initialises Sentry and i18n
├── app/{app.tsx, router.ts, query-client.ts}
├── routes/                      TanStack Router file routes, thin
│   ├── __root.tsx
│   ├── _public/                 login, sign-up, password reset, auth callback
│   └── _authenticated/route.tsx guard + app shell; feature routes below it
├── features/<feature>/
│   ├── api/{<feature>.api.ts, <feature>.queries.ts, <feature>.storage.ts}
│   ├── components/<name>.tsx + <name>.test.tsx
│   ├── hooks/use-<name>.ts
│   ├── <entity>.schemas.ts  <entity>.types.ts  <entity>.utils.ts
│   └── index.ts
├── components/{ui/, layout/}    shadcn primitives; app shell, page header, empty states
├── components/<group>/          shared design-system components used by more than one feature (brand, trust, property, report, map, media, forms, feedback, navigation)
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
```

- Check `node -v` (24 LTS) and that Docker is running before Supabase CLI commands.
- After every migration: `pnpm db:reset`, then `pnpm db:types`, and commit the migration and the regenerated types together.
- For the in-app browser preview use the `property-score-dev` configuration in `.claude/launch.json`.
- CI on every pull request: typecheck → lint → format check → `i18n:check` → unit and component tests → `supabase start` → `db reset` → pgTAP → generated-types drift check → Playwright → build. Lefthook only formats and lints staged files; CI is the gate.

## Git

- `main` plus pull-request branches named `<type>/<ticket>-<short-desc>` (`feat/PS-42-score-filter`); commits in Conventional Commits style (`feat(properties): add score filter`).
- Development uses only the local Supabase stack; there is no hosted dev project. Migrations reach production (`property-score`, ref `zksoblghnnirkjvewrsv`) only on a `vX.Y.Z` tag through `deploy-db.yml`, never from a laptop.
- Never commit `.env.local`, `supabase/functions/.env`, `supabase/.temp`, `e2e/.auth`, Playwright reports, coverage, or anything under `.claude/` except `.claude/rules/` and `.claude/skills/` (the `.gitignore` written at scaffolding time covers these).
