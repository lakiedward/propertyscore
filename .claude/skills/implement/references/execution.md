# Execution, verification and reporting

Only after explicit approval of the proposal. `/plan-from-design` uses §1 to §5 for its approved plan, without slice 10, the §10.3 "Done when" walk-through (its plan has its own) and §6 recording.

## 1. Git

- Start from an up-to-date `main` with a clean working tree. If the tree is dirty, stop and ask.
- Create a local branch `feat/<step>-<short-desc>` (Conventional branch naming from `CLAUDE.md`).
- Commit locally after each slice with Conventional Commits (`feat(inspections): add owner booking wizard`), ending with the attribution lines the session requires.
- **Never push, never open a pull request, never merge.** The user decides when anything leaves the machine.

## 2. Slice order

1. **Database.** `supabase migration new <verb>_<object>` per migration; SQL follows `.claude/rules/supabase.md` (RLS in the same migration, one policy per operation, `with check`, indexes on foreign keys and policy columns, column privileges for computed columns, no comments). Then `pnpm db:reset` and `pnpm db:types`. pgTAP tests in `supabase/tests/` for every policy: allowed and denied cases.
2. **Schema checkpoint** (steps with migrations). Show the user the final tables, policies and functions in a short table and wait for an "ok" before building on them. Cheap to fix now, expensive after the UI exists.
3. **Edge Functions** if any, under `supabase/functions/<kebab-name>/`, Zod-validated, shared types in `_shared/`.
4. **Data access.** `features/<feature>/api/*.api.ts` (throws `AppError`), `*.queries.ts` (query factory + mutation hooks), Zod schemas and types; `index.ts` exports only the public API.
5. **Translations.** Keys in `src/i18n/locales/ro` and `en` together, plural forms for Romanian, no concatenation.
6. **Tokens and shared components.** New tokens in `globals.css`; shadcn primitives via the CLI; shared components only if more than one feature needs them.
7. **Feature components and hooks**, following `.claude/rules/react.md` and `styling.md`.
8. **Routes.** Thin file routes, guards in `beforeLoad`, `validateSearch` with Zod, loaders, pending and error components, translated titles.
9. **Tests.** Component tests with RTL + MSW next to the source; factories in `src/test/factories`.
10. **Plan updates.** Apply the approved §5 `[D]` updates in `IMPLEMENTATION_PLAN.md`, mirror them in `CLAUDE_DESIGN_PLAN.md`, and update the Implementation status in `CLAUDE.md` when a major piece lands. If a rule turned out wrong, fix the rule and the matching `SETUP_PLAN.md` section together.

Keep changes focused: no unrelated refactors, no renames outside the step, no new dependency that the proposal did not list.

## 3. Scope control during execution

Stop and ask when:
- an approved assumption turns out false;
- the design needs data or behaviour the proposal did not include;
- a dependency step is incomplete in a way discovery missed;
- a migration would alter or drop existing data.

Unrelated problems found on the way: tell the user and suggest a separate task; do not fix them in this step.

## 4. Guardrails

- Never edit `database.types.ts` or `routeTree.gen.ts` by hand.
- Never write to a hosted Supabase project; the `supabase-local` MCP and CLI only.
- Never put a secret in a `VITE_` variable or in frontend code.
- Never write comments in any file (only the tool directives listed in `CLAUDE.md`).
- Never copy the design export's HTML, CSS, class names, inline styles, SVG icons or JavaScript into the repository; build from the spec's markup mapping (`design-analysis.md` §8).
- Keep the workspace clean: temporary files go in the session scratchpad.

## 5. Verification list

Run and fix until all pass:

| Check | Command |
| --- | --- |
| Types | `pnpm typecheck` |
| Lint | `pnpm lint` |
| Format | `pnpm format:check` (fix with `pnpm format` on changed files) |
| Translations | `pnpm i18n:check` |
| Unused code and dependencies | `pnpm knip` |
| Database lint and advisors | `pnpm db:lint`; `supabase-local` MCP `get_advisors` (security and performance) |
| Unit and component tests | `pnpm test:run` (covered by the approval) |
| Database tests | `pnpm db:test` (covered by the approval) |
| End-to-end | `pnpm test:e2e` only if the user asked |
| Build | `pnpm build` |

Browser check with the in-app preview (`preview_start` with `property-score-dev`):
- each page of the step at 375 px and 1440 px, compared with the design spec (layout, tokens, copy) and its markup mapping; at 375 px against the drawn mobile frame, or against the approved derived layout when the mobile source is `derived` (`design-analysis.md` §8.5);
- each page resized through 360, 768 and 1024 px: no horizontal scroll, nothing overlapping or cut off, touch targets at `--touch-min`;
- every state the spec and plan list (loading, empty, error, special states);
- RO and EN;
- keyboard navigation and visible focus on the main path;
- no console errors or failed requests.
Take screenshots of the main screens for the report.

Then walk through the step's "Done when" from §10.3 and state for each check how it was verified.

## 6. Recording

Update the step's row in `IMPLEMENTATION_PLAN.md` §10.7:

| Step | Status | Commit | Deviations and decisions | Extra beyond plan |
| S8 | done | <short sha of the last slice commit> | slot hold 15 min (D6 pending) | "Adaugă în calendar" [D] |

Status values: `not started`, `in progress`, `done`, `done with gaps` (list them). Commit the plan update with the last slice.

## 7. Final report to the user

1. What was built (by slice), with the screenshots.
2. Files changed, grouped by layer (`git diff --stat main...HEAD`).
3. Plan and design-plan updates made.
4. Deviations from the approved proposal and why.
5. Verification results (each command, each "Done when" check).
6. Outstanding issues, open decisions, suggested follow-up tasks.
7. Reminder: everything is committed locally on `<branch>`; nothing has been pushed.
