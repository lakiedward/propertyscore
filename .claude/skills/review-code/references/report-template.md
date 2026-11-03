# Report template

## 1. Finding format (reviewers return this)

One block per finding:

```
- id: <dimension letter><n>  (F frontend rules, D data/backend rules, T tests, C correctness/security, P performance, R duplication/simplification)
  severity: blocker | major | minor | nit
  category: rule | bug | security | performance | duplication | simplification | test-coverage
  file: <repo-relative path>:<line>[, <more locations>]
  rule: "<exact quote from CLAUDE.md or .claude/rules/<file>.md>" (<file> §<section>), or "-" for a quality finding
  evidence: <the offending line(s), quoted, at most 5 lines>
  problem: <one or two sentences: what is wrong and the concrete case where it fails or costs>
  fix: <the concrete change: code, file to move to, helper to reuse with its path>
  confidence: high | needs-check
```

## 2. Severity

| Severity | Meaning | Examples |
| --- | --- | --- |
| **blocker** | Must not merge: security, data loss, broken build or gate, a correctness bug users will hit, a hard rule from CLAUDE.md key rules | missing RLS or a policy open to every role, secret in a `VITE_` variable, Supabase imported in a component, hardcoded user-visible text, a key missing in one language, edited migration on `main`, hand-edited generated types, typecheck/lint/format/i18n/knip failure, a forbidden library |
| **major** | Should be fixed in this change: a rule violation with no exception, a bug in an edge case, a real performance cost, a test the rules require that is missing | `select('*')`, `useEffect` fetching, `error.message` shown, raw colour or palette class, comment in code, form not in the reference shape, missing index on a policy column, N+1 queries, waterfall loader, map not cleaned up, a rebuilt shared component |
| **minor** | Worth fixing now or soon: duplication, simplification, naming, small inefficiencies with measurable but low cost | two copies of the same JSX block, a helper that exists in `@/lib/utils`, a 300-line component, an unclear name |
| **nit** | Optional polish; never block on it | slightly better naming, ordering of props |

When unsure between two levels, choose the higher one only if the failure case is concrete.

## 3. Report in the conversation

```
## Review: <scope> (<n> files, <base>..<head>)

**Verdict:** Ready to merge | Fix blockers first | Needs work
<one sentence on the overall state>

| Blocker | Major | Minor | Nit |
| --- | --- | --- | --- |
| n | n | n | n |

**Gates:** typecheck ✓/✗ · lint ✓/✗ · format ✓/✗ · i18n ✓/✗ · knip ✓/✗ · db lint ✓/✗/skipped
**Reviewed for:** frontend rules, data and backend rules, tests, correctness and security, performance, duplication and simplification (name any skipped and why)

### Blockers
1. **<short title>** — [file.tsx:42](src/…/file.tsx:42)
   Rule: "<quote>" (`react.md` §Hooks and effects)
   <problem>
   Fix: <fix>

### Major
…

### Minor
…

### Nits
…

### Rule issues
<rules that look wrong or contradict each other, with the proposed change to the rule file and SETUP_PLAN.md>

### Existing debt (outside the change)
<problems found in untouched code, one line each with file:line; not counted in the verdict>

### What is good
<two or three specific things the change does well, so they stay that way>
```

Rules for the report:

- Every finding links its location as a markdown link with a repo-relative path and line, and is actionable alone.
- Group repeated patterns: one finding, all locations listed.
- No finding without a fix; no finding that was not verified in Phase 3.
- `needs-check` findings say exactly what to check.
- Leave out sections with nothing in them, except the verdict, the counts and the gates.
- Keep it short: no restating the code, no general advice, no praise beyond "What is good".
