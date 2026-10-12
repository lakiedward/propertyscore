---
paths:
  - 'src/**/*.test.ts'
  - 'src/**/*.test.tsx'
  - 'src/test/**'
  - 'vitest.config.ts'
---

# Unit and component test rules

- Vitest in jsdom with globals (`describe`, `it`, `expect`, `vi`); `src/test/setup.ts` loads `@testing-library/jest-dom/vitest`, starts the MSW server with `onUnhandledRequest: 'error'`, resets handlers after each test and initialises i18n with the real translation files.
- Tests sit next to the code: `property-card.tsx` → `property-card.test.tsx`. One top-level `describe` per file, named after the unit.
- **Every new util, schema, data-access function, hook with logic, form and screen with conditional logic ships with its test in the same change.** Purely presentational components and route files are the accepted exceptions. RLS policies and Postgres functions are tested in pgTAP (`.claude/rules/supabase.md`), not here.

## Rendering and querying

- Render through `renderWithProviders(ui, { route?, locale?, auth? })` from `@/test/render`: a fresh `QueryClient` with retries off, a memory-history router, the auth context and i18n. Never share a `QueryClient` between tests; never render bare providers by hand.
- **Query the way a user does:** `getByRole` with an accessible name first, then `getByLabelText`, `getByText`. `data-testid` only when no accessible query works, and never as a styling hook.
- Interact with `userEvent.setup()` and `await` every action; never `fireEvent` for user input.
- Component tests run in Romanian (the default). Text in queries comes from the translation files, not retyped: `screen.getByRole('button', { name: ro.common.actions.save })` with `ro` imported from the locale JSON, so renaming a translation does not break tests silently.
- Use `findBy*` / `waitFor` for async UI; never arbitrary `setTimeout` sleeps.

## Mocking

- **Mock the network, not the code.** Supabase calls are answered by MSW handlers on the PostgREST, Auth, Storage and Functions endpoints (`*/rest/v1/properties*`), kept per feature in `src/test/msw/handlers/<feature>.ts`. Override per test with `server.use(...)`.
- Never `vi.mock('@supabase/supabase-js')` or the client module. `vi.mock` of a feature's `api` module is allowed only in tests of hooks where MSW cannot express the case.
- Test data only from builders in `src/test/factories/` (`buildProperty({ score: 80 })`), typed from the generated DB types; never inline literals copied across tests.
- Timers with `vi.useFakeTimers()`, restored in `afterEach`.

## What to assert

- Forms: required and range errors appear after submit, values are submitted in the expected shape, a server `conflict` maps to the field, the button is disabled while pending.
- Screens: loading skeleton, empty state, error state, and the main success path.
- `i18n/format.ts` in both locales, Romanian plurals for 1, 2, 19, 20, 101, 102, and one test that switches language and checks text, validation messages and `<html lang>`.
- `toAppError()` for every mapped code.
- Assert on visible output and calls that leave the component (navigation, mutation payloads); never on internal state or hook internals.
