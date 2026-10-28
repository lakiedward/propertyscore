# Plan template

Fill every section; write "none" rather than deleting one. Tables and bullets, no prose padding. Mark each item **Required** (needed for the scope to work and for the "Done when" of its steps) or **Optional** (an improvement the user may decline). Every item cites its source: design screen and section, rule file, or code evidence (`file:line`). `IMPLEMENTATION_PLAN.md` is not a source.

```markdown
# <Selection in plain words>: implementation plan

Design: <export name> · <hash short> · inventory and specs: .claude/design-cache/<hash>/
Baseline: <commit> · branch: feat/<slug> · plan file: .claude/plans/<slug>/plan.md

## 1. Summary
Three to five bullets: what will exist when this is done, the foundations and data it adds, how many migrations, how links out of the selection are handled, the decisions you must make.

## 2. Scope
### Screens
| Screen · sections | Route | Build, restyle or extend | Design screen(s) | Mobile source (drawn / responsive css / derived) |
### Needed by the selection
| Piece | Kind (foundation / layout / route / data) | Status | Why |
### Links out of the selection
| Element | Target in the design | Route exists | Handling |
### Decisions already made
| Decision | Answer | Asked in |

## 3. Architecture
- Route tree for the scope: file routes under `src/routes/`, layouts, guards, search params, loaders.
- Feature modules: `src/features/<feature>/` with api, queries, schemas, types, hooks, components, public `index.ts`.
- Data flow per screen: route loader → query factory → `*.api.ts` → table / RPC / Edge Function; mutations and the queries they invalidate.
- Shared components: from `src/components/<group>/` and the design-system catalogue.
- A short diagram when the flow crosses more than three layers or services.

## 4. Data requirements
The matrix from `requirements-analysis.md` §3.

## 5. Database (Supabase)
### Tables and columns
For each table: status (exists / extend / create), then
| Column | Type | Null | Default | Constraints / FK | Index | Source |
### Relationships
| From | To | Cardinality | On delete |
### Enums and lookup tables
### RLS policies
| Table | Policy (English sentence) | Operation | Role | using | with check | pgTAP cases |
### Column privileges and protective triggers
### Functions, triggers, views
| Name | Kind | security | Purpose | Error codes |
### Storage
| Bucket | Public | Size / MIME | Path | Policies |
### Seed data
### Migrations, in order
| `supabase migration new …` | Creates / changes |
Schema checkpoint after: <plan step>

## 6. Backend logic
The table from `requirements-analysis.md` §5. Scheduled jobs and state transitions included.

## 7. Auth and access
The table from `requirements-analysis.md` §6, plus sign-in methods, redirects, email templates and `config.toml` changes.

## 8. Integrations
The table from `requirements-analysis.md` §7. New secrets and where they are set locally.

## 9. Frontend
### Components
| Element in design | Component | Path | Reuse / modify / create | Variants and tokens |
Built from each screen's markup mapping (`design-analysis.md` §8); nothing from the export's HTML, CSS or JavaScript is copied.
### Design-system mapping
New tokens for `globals.css`; new catalogue entries for `design-system.md`.
### Routes and states
| Route | Guard | Search params | Loading | Empty | Error | Special states |
### Forms
| Form | Zod schema | Fields | Server errors mapped |
### Languages (Romanian and English, `requirements-analysis.md` §9)
- Source language: <the design's>; written in this plan: <the other>
- Language switch: <where, which variant>; persisted in `localStorage` and `profiles.locale` when signed in
| Namespace | New keys (ro + en) | Plurals |
| Formatted value | Formatter | RO example | EN example |
| Stored field shown untranslated | Why |
| Phrasing to review | RO | EN draft |
### New dependencies
none / <name@exact-version>, reason, Tech stack entry

## 10. Design, rules and code differences
### Design-system deviations (built the design-system way unless you approve)
### Rule requirements the design does not show (accessibility, translations, security)
### Design gaps (states and layouts the screens need but do not draw, including derived mobile layouts: stacking order, what collapses)
### Diverged code (your decision)

## 11. Decisions
| Decision | Chosen | Alternatives | Why |

## 12. Risks and assumptions
Each assumption with how it will be checked during execution.

## 13. Open questions
Numbered; each with options and a recommendation. All are answered before approval.

## 14. Implementation steps
One block per plan step, in order. Each block:

### P1 · <name>
- Slices: database → schema checkpoint → Edge Functions → data access → translations → tokens and shared components → feature components → routes → tests
- Files: created and changed, grouped by layer
- Done when: concrete checks for what this step builds (the screen renders its seeded data in RO and EN, a denied RLS case fails, …), plus the screen's design fidelity check

## 15. Validation
- Commands: typecheck, lint, format:check, i18n:check, knip, db:lint, advisors, test:run, db:test, build
- Browser: every screen at 375 and 1440 px (375 against the drawn or derived mobile layout), resized through 360, 768 and 1024 px, RO and EN, every state, keyboard path, side by side with the design
- End-to-end tests: only if you ask

## 16. Out of scope
```
