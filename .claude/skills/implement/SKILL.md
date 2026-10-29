---
name: implement
description: Implement one build step (S1–S30) of IMPLEMENTATION_PLAN.md from a UI design given as a file path, folder, zip or attachment. Called with only a design, it first works out which plan pages and steps the design covers, what is already implemented and what the design adds beyond the plan, and recommends the step to build. Analyses the codebase, schema and design, reconciles them with the plan, writes an implementation proposal, waits for explicit approval, then builds, verifies and records the step. Use when the user asks to implement a step, a page or a feature of PropertyScore, or types /implement.
argument-hint: [step id, e.g. S8] <design path | attached design>
---

# Implement a build step

You implement exactly one build step from `IMPLEMENTATION_PLAN.md` §10.3, using the plan as the functional source and the supplied design as the visual source. You never change application code, migrations, the database or external services before the user has explicitly approved your proposal.

Read these references when the phase that needs them starts, not before:

| Reference | Phase |
| --- | --- |
| `references/gap-analysis.md` | 1 and 2 |
| `references/design-analysis.md` | 1 and 2 |
| `references/proposal-template.md` | 3 |
| `references/execution.md` | 5, 6 and 7 |

The rules in `CLAUDE.md` and `.claude/rules/` apply to everything you write. Read the rule files that match the layers the step touches before writing the proposal. For every step with UI, read `.claude/rules/design-system.md` in Phase 0: it is the binding source for tokens, components, variants and density, and its catalogue says where each component lives.

## Inputs

- **Step id** (`S1`–`S30`), optional. If the user names a page or feature instead, map it with the page → step table in `IMPLEMENTATION_PLAN.md` §10.6 and confirm the step with the user. If only a design is given, start with Triage below.
- **Design**, in one of these forms: a file path, a folder path, a zip path, attached HTML/CSS, or attached screenshots. Design files stay outside the repository.
  - The expected design batch for the step is in `IMPLEMENTATION_PLAN.md` §10.2 ("Needed for") and `CLAUDE_DESIGN_PLAN.md` ("Then implement"). One batch export serves all of its steps, so the user usually passes the same export several times.
  - Steps with no screens in §10.6 and no components in §10.2 (S2) need no design; do not ask for one.
  - If no design is supplied for a step that has screens, ask whether to wait for the batch export or build from the plan's page specs (§5) alone.
  - If the supplied design does not contain the step's screens (for example a batch B export for S9), say which batch the step needs and ask before continuing.

## Triage · design without a step id

Runs only when the user supplies a design and no step. It is read-only and ends with the user choosing a step.

1. Normalise the design input (`references/design-analysis.md` §1).
2. Launch two read-only subagents in one message:
   - **Design inventory subagent**, following `references/design-analysis.md` §7: lists every screen and shared component in the export and maps each one to a plan page (`IMPLEMENTATION_PLAN.md` §3.7 and §10.6) and its step, or marks it `not in plan`.
   - **Code status subagent**, following `references/gap-analysis.md` §6: for every plan page the design could cover, reports whether its route, feature module and data exist (`implemented`, `partial`, `missing`), using only the cheap indexes.
3. Merge them into the triage table (format in `references/design-analysis.md` §7) and add:
   - the steps the design covers, with their §10.7 status;
   - the recommended step: the first step in §10.3 order that is not `done`, whose dependencies are `done` and whose screens are in the design;
   - screens and elements the design adds beyond the plan, each with the step it would belong to;
   - plan screens of those steps that the design does not show.
4. Ask with `AskUserQuestion` which step to implement (recommended first). Additions beyond the plan are not written to the plan yet: those for the chosen step go into its proposal; those for other steps are listed in the proposal under "Recorded for other steps" and written only after approval.
5. Continue with Phase 0 for the chosen step. The design inventory is cached, so Phase 1 reuses it instead of reading the design again.

## Phase 0 · Resolve

1. Read only the parts of `IMPLEMENTATION_PLAN.md` the step needs: its entry in §10.3, its row(s) in §10.6, its progress row in §10.7, the §5 specs of its pages, the §7 tables it names, the §8 state machines and §9 rules those tables use, and the §11 decisions it depends on. Use `grep -n` to find line ranges; never read the whole plan.
2. Check the step's dependencies in §10.3 against §10.7. If a dependency is not `done`, or a blocking decision in §11 is unresolved, stop and tell the user what is missing and what you recommend.
3. Check the environment the step needs: `node -v` is 24, Docker is running and the local Supabase stack is up when the step has migrations.

## Phase 1 · Discover (read-only, parallel)

Launch two read-only subagents (`Explore`) in the same message. Each returns a compact report with `file:line` references, never file dumps.

- **Code and schema subagent.** Follow `references/gap-analysis.md` §3 and §4: it reads the cheap indexes first, then only the files that matter for this step, and returns every item of the step labelled `implemented`, `partial`, `missing`, `extra` or `diverged`, plus reusable components, hooks, query factories, translation namespaces and existing tables.
- **Design subagent.** Follow `references/design-analysis.md`: it normalises the design input, reuses the cached spec when the hash matches, otherwise builds a design spec for this step's screens only, mapping every colour and element to the design system (`.claude/rules/design-system.md`) and every block of the export's HTML, CSS and JavaScript to the project stack (`references/design-analysis.md` §8), and returns the spec path plus the mapping and any design-system deviations.

If §10.7 records a commit for this step or its dependencies, tell the code subagent to start from `git diff --stat <commit>..HEAD` and examine only what changed since.

## Phase 2 · Reconcile

Combine the two reports with the plan, using the source precedence in `references/gap-analysis.md` §1:

1. The gap table for the step (plan vs code and schema).
2. The design vs plan comparison, classified with the five cases in `references/design-analysis.md` §6, and the design vs design-system deviations from §5.
3. The reuse list: existing components, hooks, queries, tables and translation keys to use as they are or extend.
4. Conflicts and open questions. A `diverged` item or a design contradiction is always a question for the user, never a silent fix.

Read source files yourself only where the reports leave a real doubt.

## Phase 3 · Propose

Write the proposal with `references/proposal-template.md`. Save it to `.claude/implement/<step>/proposal.md` (git-ignored) and present it in the conversation. Keep it decision-focused: the user must be able to approve it in one read.

## Phase 4 · Approve

Ask for approval with `AskUserQuestion` (options: approve, approve with the changes I describe, revise). Treat only an explicit approval as approval. If the user requests changes, update the proposal and ask again. Approval covers exactly what the proposal lists, including running the step's unit and database tests; end-to-end tests run only if the user also asks for them.

## Phase 5 · Execute

Follow `references/execution.md`: work on a local branch, build in slices in the documented order, pause at the schema checkpoint when the step has migrations, apply the approved plan updates in the same change, and commit locally per slice. Never push, never open a pull request, never touch a hosted Supabase project.

If something forces a change to the approved scope (a missing dependency, a wrong assumption, a design detail that needs new data), stop, explain it, and ask before continuing. Unrelated problems you notice go to the user as separate task suggestions, not into this step.

## Phase 6 · Verify

Run the verification list in `references/execution.md` §5, including the in-app browser check against the design at 375 px and 1440 px. Fix what fails and re-run. Then offer the user a fresh-eyes review with `/code-review`.

## Phase 7 · Record and report

Update the step's row in `IMPLEMENTATION_PLAN.md` §10.7 and report to the user with the format in `references/execution.md` §7: what was built, files changed, plan and design updates, deviations from the proposal, test results, and anything outstanding.
