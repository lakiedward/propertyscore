---
name: review-code
description: Strict code review of PropertyScore changes against every rule in CLAUDE.md and .claude/rules/ (React, data access, Supabase and RLS, i18n, styling, design system, tests, e2e, the no-comments rule), plus correctness bugs, security, performance, code duplication, reuse of existing code and simplification. Runs the project's static gates, fans out parallel reviewers per dimension, verifies every finding against the code before reporting, ranks them by severity with file:line, the rule broken and the fix, and applies fixes only after explicit approval. Reviews the current branch against main by default, or staged changes, a PR, paths or the whole codebase. Use when the user asks to review, audit or check code, a branch, a PR or a feature, asks whether code follows the rules, or types /review-code.
argument-hint: [branch (default) | staged | pr <number> | <paths…> | all] [--fix]
---

# Strict code review

You review PropertyScore code the way a senior reviewer who wrote the rules would: every rule in `CLAUDE.md` and `.claude/rules/` is a requirement, not a suggestion, and beyond the rules you look for bugs, security holes, slow code, duplication and code that could be simpler. You report only findings you have verified in the code. You never change a file before the user approves the fixes.

Read these references when the phase that needs them starts:

| Reference | Phase |
| --- | --- |
| `references/rules-checklist.md` | 1 and 2 |
| `references/quality-checklist.md` | 2 |
| `references/report-template.md` | 3 and 4 |

## Inputs

- **Scope**, first argument:
  - none or `branch`: everything on the current branch that is not on `main`, plus uncommitted and untracked changes: `git diff $(git merge-base main HEAD)` and `git status --porcelain`.
  - `staged`: `git diff --cached`.
  - `pr <number>`: `gh pr diff <number>` and `gh pr view <number> --json title,body,files,headRefName`. Review the PR's files as they are on its head branch (`git fetch origin <headRefName>` and `git show origin/<headRefName>:<path>`); never check it out over the user's work.
  - one or more paths or globs: those files in full, not a diff.
  - `all`: the whole of `src/`, `supabase/`, `e2e/` and `scripts/`. Warn the user that this is a large review and run it feature by feature.
- **`--fix`**: after the report, propose applying the fixes straight away. Without it, still offer fixes at the end.

If the scope is empty (no changes against `main`), say so and ask which scope to review instead.

## Phase 0 · Scope

1. Build the file list for the scope. Drop generated and vendored files from review (`src/routeTree.gen.ts`, `src/lib/supabase/database.types.ts`, `pnpm-lock.yaml`, `dist/`, `node_modules/`), but flag a hand edit to a generated file (a diff in `database.types.ts` without a migration in the same scope, a diff in `routeTree.gen.ts` without a route change).
2. Classify every file by layer with the table in `references/rules-checklist.md` §1 and record which rule files apply. A shadcn file in `src/components/ui/` is reviewed only for the lines the project changed.
3. Read `CLAUDE.md` and every rule file that applies, in full. Read `.claude/rules/design-system.md` whenever a `.tsx` or `.css` file is in scope. These are the standard you review against; do not review from memory.
4. For a diff scope, note for each file whether it is new, modified or deleted, and its changed line ranges. Findings are about changed lines and about code the change makes wrong (a caller broken by a signature change, a duplicate of a helper the change adds). Pre-existing problems in untouched lines go into a separate "Existing debt" list, never mixed with the change's findings.

## Phase 1 · Static gates and rule scans

Run, in one Bash call each, and capture the output:

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm format:check`
4. `pnpm i18n:check`
5. `pnpm knip`
6. `pnpm db:lint`, only when `supabase/` is in scope and the local stack is running (`supabase status` succeeds). If it is not running, say the check was skipped.

These are not tests and need no permission. **Never run `pnpm test`, `pnpm test:run`, `pnpm test:e2e` or `pnpm db:test`** unless the user asks; when tests matter for a finding, read them instead.

Then run the grep scans from `references/rules-checklist.md` §3 over the files in scope. A scan hit is a candidate, not a finding: Phase 3 confirms it. Every gate failure that touches a file in scope is a finding with severity `blocker`; failures only in untouched files go to "Existing debt".

## Phase 2 · Review (parallel)

Launch the reviewers below as `general-purpose` subagents **in one message** so they run concurrently. Each gets: the scope description, the file list with changed line ranges, the diff (or the paths for a full-file scope), the Phase 1 output relevant to it, and the section of the references named below. Each reads the files it needs itself, and must also read code **outside** the scope where its dimension needs it (callers, existing helpers, sibling features). Each returns only findings in the format of `references/report-template.md` §1, with no file dumps. Skip a reviewer whose layers are not in scope and say so in the report.

| Reviewer | Covers | Reference |
| --- | --- | --- |
| **Frontend rules** | `react.md`, `styling.md`, `design-system.md`, `i18n.md`, accessibility, routing, forms, feature boundaries, naming, the no-comments rule in `src/` | `rules-checklist.md` §2.1–2.5, §2.9 |
| **Data and backend rules** | `data-api.md`, `supabase.md`: data-access shape, query factories, errors, auth, env, logging, migrations, RLS, Storage, Edge Functions, email templates, secrets | `rules-checklist.md` §2.6–2.7, §2.9 |
| **Tests** | `testing.md`, `e2e.md`: missing tests the rules require, test quality, mocking rules, pgTAP coverage of every policy | `rules-checklist.md` §2.8 |
| **Correctness and security** | logic bugs, edge cases, race conditions, error paths, broken callers, authorization gaps, data leaks | `quality-checklist.md` §1–2 |
| **Performance** | rendering, data fetching, bundle size, images and maps, database queries, indexes and RLS cost | `quality-checklist.md` §3 |
| **Duplication and simplification** | copies of existing code, missed reuse of shared components and helpers, misplaced code, dead code, over-engineering | `quality-checklist.md` §4–5 |

Brief each reviewer to be strict and specific: every finding names the rule or principle it breaks, quotes the offending line, and states a concrete fix. "Could be cleaner" without a fix is not a finding. A reviewer that finds nothing in its dimension says so.

For `all` or a scope over about 40 files, split the frontend-rules and duplication reviewers per feature folder; keep the total under ten subagents.

## Phase 3 · Verify

A finding reaches the user only after it survives verification:

1. **Re-read the code** at every reported `file:line` yourself. Drop the finding if the line does not say what the reviewer claims, if a rule's own exception covers it (the allowed directives under the no-comments rule, generated-file headers, arbitrary values copied once from a design export, `as` casts the type system cannot express), or if another part of the code already handles it.
2. **Check the rule text.** Every rule finding must quote the rule it cites from `CLAUDE.md` or `.claude/rules/`. If no rule says it, it is a quality finding, not a rule finding.
3. **Prove performance and duplication claims.** A performance finding states the mechanism and when it bites (which render, which query, how many rows or kilobytes); a duplication finding names both locations. Speculative micro-optimisations are dropped. Measure where it is cheap: `pnpm build` output sizes for a bundle claim, `explain` through the `supabase-local` MCP `execute_sql` (read-only, local stack only) for a query claim.
4. **Deduplicate**: the same problem reported by two reviewers becomes one finding; the same pattern in many places becomes one finding with every location listed.
5. **Assign severity** with `references/report-template.md` §2. When you are unsure whether something is a bug, say so in the finding and mark it `needs-check` rather than dropping or inflating it.
6. **A rule that looks wrong** (it contradicts another rule, the stack or the official docs) is reported as a rule issue with a proposed fix to the rule file and the matching section of `SETUP_PLAN.md`, never silently ignored or silently enforced.

## Phase 4 · Report

Present the report in the conversation with `references/report-template.md` §3. Do not write it to a file. Lead with the verdict and the counts, then findings from most to least severe. Every finding is actionable without reading anything else.

## Phase 5 · Fix (only after approval)

1. Ask with `AskUserQuestion` which findings to fix: all blockers and majors (recommended), everything, a list the user gives, or none.
2. Apply only the approved fixes, following the rules you reviewed against (no comments, both languages for every new string, tokens only). A fix that needs a migration, a new dependency, a design-system change or a product decision is not applied: explain it and ask.
3. Re-run the Phase 1 gates and confirm they pass. Offer to run `pnpm test:run` (and `pnpm db:test` when `supabase/` changed); run them only on a yes.
4. Report what changed per finding (fixed, skipped and why). Do not commit or push unless the user asks; when they do, use Conventional Commits on the current branch.
