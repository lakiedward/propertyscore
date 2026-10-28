# Proposal template

Fill every section; write "none" rather than deleting one. Keep each section short: tables and bullets, no prose padding. Mark each item **Required** (needed to meet the step's "Done when") or **Optional** (an improvement the user may decline).

```markdown
# S8 · Owner books an inspection: implementation proposal

Design: <file name> · <hash short> · spec: .claude/design-cache/<hash>/spec.md
Baseline: <commit> · branch to use: feat/S8-owner-booking

## 1. Status and gaps
| Item | Kind | Status | Evidence | Action |
| … | page / component / table / policy / function / translation | implemented / partial / missing / extra / diverged | file:line | reuse / extend / create / ask |

## 2. Plan, design and code differences
### Plan updates from the design (UI-only, applied with this step)
- §5 /inspection/confirmation: add "Adaugă în calendar" [D]
### New functionality proposed by the design (needs your yes)
- … · backend impact: …
### Recorded for other steps (not implemented now)
- … → S25
### Conflicts (your decision)
- … · option A … · option B … · recommendation …
### Design-system deviations (built the design-system way unless you approve a change)
- …
### Design gaps (built from the plan, including derived mobile layouts: stacking order, what collapses)
- …
### Diverged code (your decision)
- …

## 3. Reuse, modify, create
| Element | Path | Reuse / Modify / Create | Why |
Built from the spec's markup mapping (`design-analysis.md` §8); nothing from the export's HTML, CSS or JavaScript is copied.

## 4. Database and Supabase
| Migration (`supabase migration new …`) | Tables / columns / constraints / indexes | RLS policies (operation, role, rule) | pgTAP tests |
Functions (RPC), Edge Functions, Storage buckets, cron jobs, secrets: …
Schema checkpoint: yes / no

## 5. Frontend
- Feature module(s) and files: api, queries, schemas, types, utils, hooks, components, routes
- Routes and guards, search params (Zod), loaders, pending and error components
- Translation namespaces and new keys (ro + en)
- Tokens added to globals.css
- New dependencies: none / <name@exact-version> with reason (needs approval and a Tech stack entry)

## 6. Decisions
| Decision | Chosen | Alternatives | Why |

## 7. Dependencies, risks, assumptions
- …

## 8. Open questions
1. …

## 9. Steps (execution order)
1. Migration … → db:reset → db:types → schema checkpoint
2. api + queries …
3. translations …
4. components …
5. routes …
6. tests …
7. plan and design-plan updates, §10.7 row

## 10. Validation
- Commands: typecheck, lint, format:check, i18n:check, knip, db:lint, test:run, db:test
- Browser check: pages, viewports 375 and 1440 (375 against the drawn or derived mobile layout), resized through 360, 768 and 1024, states to exercise
- "Done when" from §10.3, restated as checks
- End-to-end tests: only if you ask

## 11. Out of scope
- …
```
