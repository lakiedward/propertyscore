# Gap analysis

Used by `/implement` (one step). `/plan-from-design` uses only §3 and §5, with its own precedence and labels measured against the design, not `IMPLEMENTATION_PLAN.md`. The goal is to know what exists, cheaply and correctly, before anything is proposed.

## 1. Which source wins

| Question | Source that wins |
| --- | --- |
| How code is written | `CLAUDE.md` and `.claude/rules/` |
| Tokens, component looks, variants, density | `.claude/rules/design-system.md` |
| Decisions the user already made | `IMPLEMENTATION_PLAN.md` §10.7 (deviations and decisions column) and §11 |
| How a screen looks, and UI-only additions | The design supplied with the call |
| Behaviour, data, permissions, business rules | `IMPLEMENTATION_PLAN.md`, unless the user approves a change |
| What exists today | The code and the local database schema |

When two sources disagree on something the table does not settle, ask the user.

## 2. Labels

Every item of a step (page, section, component, table, column, policy, function, Edge Function, translation namespace, state, rule) gets exactly one label:

| Label | Meaning | What happens next |
| --- | --- | --- |
| `implemented` | Exists and matches the plan | Reuse; do not rewrite |
| `partial` | Exists but incomplete | Extend in place |
| `missing` | Does not exist | Create |
| `extra` | Exists in code but not in the plan | Keep. Never remove it. Propose adding it to the plan so the plan stays true |
| `diverged` | Exists but differs from the plan | Ask the user: update the plan to match the code, or change the code. Never decide alone |

Intentional changes are recognised through §10.7 and commit messages. Anything that looks deliberate is treated as `diverged`, not as a bug.

## 3. Cheap indexes, read first

| To learn | Read |
| --- | --- |
| Progress and past decisions | `IMPLEMENTATION_PLAN.md` §10.7 |
| Changes since the last recorded step | `git log --oneline <commit>..HEAD` and `git diff --stat <commit>..HEAD` |
| Database schema | `src/lib/supabase/database.types.ts`; `supabase/migrations/` file names; the `supabase-local` MCP `list_tables` when the stack is running |
| RLS policies, functions, buckets | `grep -n "create policy\|create function\|create or replace function\|storage.buckets" supabase/migrations/*.sql` |
| Database tests | `supabase/tests/` file names |
| Routes | `src/routeTree.gen.ts` (route ids and paths) and the `src/routes/` tree |
| Features and their public API | `src/features/*/index.ts` |
| Data access and queries | `src/features/*/api/*.queries.ts` exports |
| Shared UI | file names in `src/components/` (all groups), checked against the catalogue in `.claude/rules/design-system.md` §4 |
| Design tokens | the `:root` and `@theme` blocks of `src/styles/globals.css` |
| Translations | key trees of `src/i18n/locales/ro/*.json` |
| Dependencies | `package.json` and the Tech stack in `CLAUDE.md` |
| Edge Functions | `supabase/functions/` folder names |

Open a source file in full only when the indexes leave a real doubt or the file will be changed.

## 4. Report format (returned by the discovery subagent)

```
Step: S8 · Owner books an inspection
Baseline: <commit from §10.7 or "none">

Items
| Item | Kind | Label | Evidence | Note |
| /inspection branch A | route | missing | — | |
| inspections | table | partial | supabase/migrations/2026…_create_inspections.sql:12 | no slot_held_until |
| PrimaryCta | component | implemented | src/components/ui/primary-cta.tsx:1 | reuse |

Reusable
- <component / hook / query / table / namespace> · path · how to use it here

Extra (in code, not in plan)
- …

Diverged (needs a user decision)
- … · plan says … · code does … · evidence

Risks and doubts
- …
```

## 5. Rules for discovery

- Read-only. No edits, no migrations, no installs.
- Stay inside the step's scope; note but do not analyse other steps' items.
- Every claim has a `file:line` or a command output behind it. "Probably exists" is not a label.
- Prefer existing shared components and patterns; flag near-duplicates (two components doing the same job) as a risk.

## 6. Screen-level status (triage)

Used when `/implement` is called with a design and no step. For each candidate plan page, report only:

| Plan page | Route in `routeTree.gen.ts` | Feature module | Data (tables, queries) | Status |
| --- | --- | --- | --- | --- |
| /inspection | no | `inspections` missing | `inspections` table missing | missing |

`implemented` means the route renders the page with real data; `partial` means the route or feature exists but sections, states or data from §5 are missing; `missing` means no route. Do not open component files at this level unless the indexes contradict each other. A page that exists in code but not in the plan is `extra`.
