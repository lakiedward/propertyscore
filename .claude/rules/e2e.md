---
paths:
  - 'e2e/**'
  - 'playwright.config.ts'
---

# End-to-end rules (Playwright)

The suite does not exist yet; create it following these rules when the first critical path is built.

- E2E covers a short list of critical journeys only: sign up and sign in, create → score → view a property, permission denial between two users, and the language smoke test (the `ro` and the `en` test users each see their language, and the choice survives a reload). Everything else belongs in component tests.
- Tests run against the local stack: `pnpm db:start`, `pnpm db:reset` (migrations + `seed.sql`), then `pnpm test:e2e`, which starts the Vite dev server through Playwright's `webServer`. Never against a hosted Supabase project.
- Test users come from `supabase/seed.sql`; their credentials are in `e2e/env.ts` (git-ignored), copied from the committed `e2e/env.example.ts`.
- `e2e/auth.setup.ts` signs in each test user once through the UI and saves `storageState` to `e2e/.auth/<user>.json`; specs choose a user with `test.use({ storageState })`. Never log in through the UI inside a spec, except the sign-in spec itself.
- Page objects in `e2e/pages/<name>.page.ts` own locators and actions; specs read like user stories and contain no raw locators.
- Locators are role and label based (`page.getByRole('button', { name: … })`), with names taken from the translation JSON for the user's language. `data-testid` only where no accessible locator exists.
- Data a spec creates carries a run-unique prefix (`E2E-<id>`) and is deleted in `afterAll` through the page objects or a seeded admin helper.
- Web-first assertions only (`await expect(locator).toBeVisible()`); never `waitForTimeout`.
- Never commit `e2e/env.ts`, `e2e/.auth/`, `playwright-report/` or `test-results/`.
