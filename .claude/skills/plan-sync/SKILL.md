---
name: plan-sync
description: Read-only drift check between IMPLEMENTATION_PLAN.md and the actual PropertyScore codebase and local Supabase schema, across every build step or a range of steps. Reports what is implemented, partial, missing, extra or diverged, and proposes updates to the progress table in §10.7. Use when the user asks for project status, plan drift, what is left to build, or types /plan-sync.
argument-hint: [step range, e.g. S1-S10]
---

# Plan sync

A read-only health check of the plan against reality. It changes nothing until the user approves the proposed §10.7 updates.

1. Read `.claude/skills/implement/references/gap-analysis.md`. Its precedence, labels, cheap indexes and report format apply here unchanged.
2. Read `IMPLEMENTATION_PLAN.md` §10.3 (step list), §10.6 (page → step) and §10.7 (progress). Limit the run to the requested range, or all steps.
3. Use §10.7 commits as baselines: for steps already `done`, only examine `git diff --stat <commit>..HEAD` for changes touching their items.
4. Split the steps into groups of about five and give each group to a read-only `Explore` subagent in one parallel message. Each returns the gap-analysis report for its steps.
5. Merge the reports into one summary:
   - a table: step, recorded status, observed status, items missing / partial / extra / diverged;
   - the `extra` items that should be added to the plan;
   - the `diverged` items that need a user decision;
   - steps whose dependencies are now satisfied and could start next, in §10.3 order.
6. Propose the exact §10.7 row changes and plan additions. Apply them only after the user approves, and do not commit unless the user asks.

Never edit application code, migrations or the database, and never run tests in this skill.
