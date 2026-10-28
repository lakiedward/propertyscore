# Resolving the selection

The user names pages or parts in their own words. This turns them into a confirmed scope: screens, plan pages, build steps and what is deferred.

## 1. Words to screens to pages

| The user says | Resolve with |
| --- | --- |
| A URL or route (`/login`, `/check/result`) | `IMPLEMENTATION_PLAN.md` §3.7 route table, then the inventory screens mapped to it |
| A page name ("home page", "pagina de login") | The inventory screen titles and headings, then §3.7 |
| A flow ("booking an inspection", "the online report") | §4 flows: every page the flow passes through, in order |
| A design batch ("batch B") | §10.2 screen list for the batch |
| A component or section ("the header", "the score badge") | The inventory's shared components, then the design-system catalogue in `.claude/rules/design-system.md` §4 and the step that builds it (usually S1 or S3) |
| A feature ("favourites", "partners") | §10.3 step goals, then the pages of that step in §10.6 |

A part the inventory marks `unsure`, a word that matches several pages, or a screen that is `not in plan` is shown to the user with the candidates and confirmed before planning.

## 2. Pages to steps

1. For every page, take its step(s) from §10.6. A page split across steps (`/` is S7 + S25, `/account` is S8 and S15) is split into **parts**: the sections each step owns, read from the step's entry in §10.3 and the page's §5 spec.
2. Add components the selected screens use that a step owns but that do not exist yet (for example the site header from S3, `PropertyScoreBadge` from S1), found through the code report.
3. For every step, follow §10.3 "Depends on" recursively, and read each step's §10.7 status and baseline commit.

## 3. Prerequisites and deferred parts

Plan rule 10.1.2: a page is built in the same step as, or after, the migration and RPCs it reads. No page is built on mock data.

For each prerequisite step that is not `done`, and each selected page section owned by a later step, the user chooses:

| Option | When it fits | Effect on the plan |
| --- | --- | --- |
| **Include the prerequisite** (recommended when it is small or a foundation: S1, S2, S3) | The selected screen cannot work without it | Its pages, data and tests become plan steps before the selected ones |
| **Build only what the prerequisite does not block** | The dependency covers a separable section | The section is deferred: not rendered until its step lands, listed under "Deferred" with the step it waits for |
| **Narrow the selection** | The prerequisite chain is long (for example `/` listings carousel needs S22 to S25) | The selection drops that part; it is recorded for its step |

Never stub data, fake a table in the frontend or hard-code content that the plan says comes from the database. A deferred section is absent, not faked. Purely static content (marketing copy, legal pages) is not data and needs no table unless §7 or §5 says it is managed in `/admin/content`.

Pages already `implemented` in the code (for example `/login` and `/sign-up` from scaffolding) are in scope only as a **restyle or extension**: the plan lists the visual and structural changes the design asks for and keeps the existing behaviour, tests and translation keys.

## 4. Scope table

Shown to the user before asking about prerequisites:

```
| Part the user named | Design screen(s) | Plan page | Step | Step status | Code status | In scope as |
| login | Autentificare (mobile, desktop) | /login | done | done | implemented | restyle |
| home | Acasă | / hero, how it works, pricing teaser | S7 | not started | missing | build |
| home | Acasă · listings carousel | / listings section | S25 | not started | missing | ask: defer or include S22–S25 |

Prerequisites not done
| Step | Why it is needed | Size | Recommendation |
| S1 Design system | tokens and components every screen uses | medium | include |
| S3 Routing skeleton | {-$locale} site layout, header, footer | medium | include |

Open decisions the scope depends on
| D1 URL language | affects every public route | recommendation: English segments |
```

## 5. Result

The confirmed scope written at the top of the plan:

- screens in scope, each with its plan page, the step and part that builds it, and `build`, `restyle` or `extend`;
- prerequisite steps included, in §10.3 order;
- deferred sections and narrowed parts, each with the step that will build it;
- decisions made in this phase, with the user's answer.
