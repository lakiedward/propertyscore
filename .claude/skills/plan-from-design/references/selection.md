# Resolving the selection

The user names pages or parts in their own words. This turns them into a confirmed scope: the screens and sections to build, the shared pieces they need, and how links out of the selection are handled. The design is the specification; `IMPLEMENTATION_PLAN.md` is not consulted.

## 1. Words to screens and sections

| The user says | Resolve with |
| --- | --- |
| A page name ("home page", "pagina de login") | The inventory screen titles and headings |
| A URL or route (`/login`, `/check`) | The URL the export shows for the screen, then the route tree in `src/routes/` |
| A section or component ("the header", "the pricing section", "the score badge") | The inventory sections and shared components, then the catalogue in `.claude/rules/design-system.md` §4 |
| A flow ("booking an inspection") | The screens the export links in sequence for that flow, confirmed with the user |
| "X, ignore the pages it links to" | Only the named screens; every link out becomes a row of §3 |

A word that matches several screens, or a screen the inventory could not identify with certainty, is shown to the user with the candidates and confirmed before planning.

## 2. What the selection needs

For every selected screen, list what it needs that does not exist yet, from the inventory and the code indexes (`gap-analysis.md` §3):

- **Foundations**: the design-system tokens and fonts in `globals.css` (`design-system.md` §3) when they are not applied yet, and the catalogue components the screens render (`design-system.md` §4), built at the catalogue's location.
- **Layouts**: the frame the screen sits in (site header, footer, mobile menu, language switch, account or admin shell), as drawn in the export. A layout is built only as far as the selected screens use it.
- **Routes**: the file routes for the selected screens, and the layout routes above them.
- **Languages**: Romanian and English for every selected screen, plus the language switch where the screen has a header or menu, even when the design draws one language (`requirements-analysis.md` §9).
- **Data**: for every section that shows records the product stores, the backend that serves it (`requirements-analysis.md`). Nothing is deferred because another page will need it too; the data is built here, scoped to what the selected screens show and do.

Content and data are told apart per section:

| The section shows | Treat as | Example |
| --- | --- | --- |
| Marketing copy, explanations, steps, FAQ | copy: translation keys | "Trei pași. Raportul e gata în câteva minute." |
| Content the design labels as an example or illustration of the product ("exemplu", "valori fictive", "imagine ilustrativă") | copy: translated static content, keeping the label | sample report scores 82/100 |
| Records that vary per user, property or time (listings, stats, cities, prices of listed properties, a user's orders) | data: tables, queries, seed rows | the listings map and list |
| Product prices and offers shown as fixed text | copy, unless the screen shows they are managed somewhere; ask when unclear | "Smart Check 30 lei" |

When it is unclear which row a section belongs to, ask before planning; never fake data with hard-coded records.

## 3. Links out of the selection

Every link and CTA on the selected screens whose target screen is not in the selection gets one row:

| Element | Target in the design | Route exists | Handling |
| --- | --- | --- | --- |
| "Intră în cont" | Login | yes (`/login`) | `Link` to the existing route |
| "Verifică o adresă" | Verifica v2 | no | one of the options below, chosen by the user |

Options for a target with no route, presented in the plan as an open question with a recommendation:

| Option | Effect |
| --- | --- |
| **In-page target** | Points to the section on the selected screen that explains the same thing (for example the pricing section), until the target screen is built |
| **Hidden** | The element is not rendered until its screen exists |
| **Minimal route** | A thin route with a translated "coming soon" state, so typed `Link`s work; listed as a route in the plan |

Never a hand-built URL string or an `<a href>` to a route that does not exist. In-page anchors to sections of the same screen are fine.

## 4. Scope table

Shown to the user before planning:

```
| Part the user named | Design screen · sections | Route | Code status | In scope as |
| home | Home · hero, SmartCheck, inspection, package, listings, partners, pricing, FAQ | / | missing | build |
| home | Home · header, menu drawer, footer | site layout | missing | build (layout) |
| login | Login | /login | implemented | restyle |

Needed by the selection
| Piece | Kind | Status | Why |
| design-system tokens and fonts | foundation | missing | every section |
| TrustBadge, ScoreValue, Stepper | catalogue components | missing | listings legend, score tiles, steps |
| listings, listing_photos, cities | data | missing | listings map and list |

Links out of the selection
| Element | Target | Route exists | Recommendation |
| "Verifică o adresă" | Verifica v2 | no | in-page target #preturi |
```

Screens already `implemented` in the code are in scope only as a **restyle or extension**: the plan lists the visual and structural changes the design asks for and keeps the existing behaviour, tests and translation keys.

## 5. Result

The confirmed scope written at the top of the plan:

- screens and sections in scope, each with its route and `build`, `restyle` or `extend`;
- the foundations, layouts and data the selection needs;
- links out of the selection and their handling;
- decisions made in this phase, with the user's answer.
