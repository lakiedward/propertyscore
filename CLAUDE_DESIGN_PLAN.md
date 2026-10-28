# PropertyScore: Claude Design plan

This file is the complete brief for designing every PropertyScore screen with Claude Design. It contains only what a designer needs: the product, the people, the design system, every screen with its content and states, and the order to design them in. Backend and database details live in `IMPLEMENTATION_PLAN.md` and are deliberately left out here.

**How to use it: design a batch, then implement its steps**

1. Start a Claude Design project and paste **Prompt 0 (master prompt)** once. It sets the context, the design system and the rules for every screen.
2. Paste **Prompt L (logo family)** once, right after Prompt 0, and approve the logos before any batch: every shell, report cover and email uses them.
3. Paste **one batch prompt** (A → H, in order) with the appendix parts it lists. Review the result until you are happy with it.
4. Export that batch's design (HTML/CSS: a file, a folder or a zip) and keep it **outside the repository**.
5. In Claude Code, implement the batch's steps **one at a time, in order**, passing the same export each time, for example `/implement S7 ~/Designs/batch-b.zip`, then `/implement S8 ~/Designs/batch-b.zip`. The skill takes only the screens of that step from the export. Steps without screens (S2) need no design. If you are not sure which step comes next, call `/implement ~/Designs/batch-b.zip` without a step: the skill lists every screen in the export, matches it to the plan, shows what is already built and what the design adds, and recommends the next step.
6. Go back to step 3 with the next batch. Later batches reuse components from earlier ones, so do not skip ahead.
7. When `/implement` adds a screen detail from the design to the plan (marked `[D]`), it also updates the same screen here, so the next prompt you paste is up to date.

| Order | Prompt                                                  | Screens                                                                                         | Paste appendix                 | Then implement                                                 |
| ----- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------ | -------------------------------------------------------------- |
| 0     | Master prompt                                           | context, design system, rules                                                                   | A1 demo data, A2 status labels | —                                                              |
| L     | Logo family and brand patterns                          | PropertyScore master logo, PropertyScore Physical, PropertyScore SmartCheck, brand board        | —                              | brand components and icons in S1                               |
| U     | Visual upgrade (only if earlier screens look too plain) | audit, two directions, redesign of existing screens, visual language board                      | —                              | re-run `/implement` on steps already built from the old design |
| U2    | Colour boost (only if the upgrade is still too neutral) | expressive accent palette, bolder use of brand colours, before/after                            | —                              | same as U                                                      |
| 1     | Batch A · Foundations                                   | components, shells, auth, address + map, checkout                                               | —                              | S1 → S2 (no design) → S3 → S4 → S5 → S6                        |
| 2     | Batch B · Public site and owner booking                 | home, pricing, how it works, info pages, inspection wizard (owner), confirmation, appointments  | —                              | S7 → S8                                                        |
| 3     | Batch C · Scheduling and buyer requests                 | admin users, admin calendar, inspection wizard (buyer), seller invitation, requests             | —                              | S9 → S10                                                       |
| 4     | Batch D · Inspector field app                           | agenda, consent, questionnaire                                                                  | A3 inspection questions        | S11 → S12                                                      |
| 5     | Batch E · Reports and back office                       | admin review, reports, book detail, feedback, settings, invoices, dashboards, payments, content | —                              | S13 → S14 → S15                                                |
| 6     | Batch F · Online report, consultations, products        | admin scoring, online report wizard, online report, consultation, products, analytics           | —                              | S16 → S17 → S18 → S19 → S20 → S21                              |
| 7     | Batch G · Listings portal                               | listing editor, moderation, listing page, search, map, favourites                               | —                              | S22 → S23 → S24 → S25 → S26                                    |
| 8     | Batch H · Partners and guides                           | partner landing, partner area, admin partners, guides                                           | —                              | S27 → S28 → S29 → S30                                          |

Some steps also touch screens from an earlier batch (S25 updates the home page from batch B, S28 the inspection checkout and the home partner block). Pass the current batch's export; the skill reuses what is already built and asks for the earlier export only if it needs it.

---

## Prompt 0 · Master prompt

Paste this once, together with Appendix A1 and A2.

```text
You are designing PropertyScore, a Romanian web app (mobile first, comfortable on desktop) that helps people choose a home with real information. I will give you the screens in batches. Design each batch completely before I send the next one, and reuse the components you created earlier.

## The product

PropertyScore sells four things and runs a listings portal:

1. Online report, product name SmartCheck ("PropertyScore SmartCheck", in copy "Raport online SmartCheck", 30 lei). Anyone enters an address (or pastes a link to a listing from another site), confirms the pin on a map, optionally answers a few questions, sees a free preview, pays, and gets a report about the AREA: 6 category scores (Educație, Sănătate, Transport, Cumpărături & servicii, Spații verzi, Siguranță & liniște), neighbourhood rent and asking-price averages, price per m², nearby amenities and walking routes. It never says anything about the condition of the home itself. Score scale: 0–100, shown in BLUE.
2. Physical inspection, product name PropertyScore Physical ("Inspecție fizică", 500 lei). A PropertyScore inspector visits the home, answers about 44 questions in 11 categories with photos and videos, takes 10 presentation photos, a 360° panorama of every room and a 2D floor plan (Polycam). The result is a PDF "book" with a score from 0 to 10 (one decimal, Romanian comma: "8,6 / 10"), shown in GREEN. The book always includes the full online report. For the owner, PropertyScore also prepares a professional listing for free, which the owner can choose to publish.
3. Consultation ("Consultanță", price to be decided, e.g. 150 lei / 30 min). A video or phone session with an expert.
4. Digital products ("Produse digitale"). Downloadable PDFs: interior designs, house plans, buying guides, viewing checklists.
5. Listings portal. Owners publish sale or rental listings for free, with or without a PropertyScore report. Every listing carries a badge:
   - physical: green, "Verificat de PropertyScore", with the inspection date;
   - online: blue, with the 0–100 online score;
   - none: grey, "Fără raport PropertyScore" (never presented as a defect of the home);
   - physical but older than 12 months: green plus "reinspecție recomandată".
6. Partner programme. Real-estate agencies and agents earn 100 lei for each seller they bring who completes a paid inspection.

Online coverage: Timișoara, București, Cluj-Napoca, Iași, Constanța, Craiova, Sibiu, Oradea, Târgu Mureș. Inspections only in cities with a field team. Addresses outside coverage are told so BEFORE payment.

## The people (use these words consistently)

- Visitor: anyone on the public site.
- Buyer ("cumpărător"): wants to buy or rent.
- Owner / seller ("proprietar", "vânzător"): owns the home; the only one who can publish its listing.
- Inspector: PropertyScore staff who does the physical inspection with a phone app. In Romanian UI the inspector is called "agent PropertyScore" or "inspector". Never confuse with a real-estate agent.
- Partner: a real-estate agency, an agent inside an agency, or a solo agent in the commission programme.
- Expert: staff who runs consultations.
- Admin: the internal team (scheduling, reviews, moderation, payments).

## Areas of the app (each has its own shell)

- Public site: header + footer. Romanian at /…, English at /en/… with the same structure.
- Account (/account): any signed-in person. Tabs: Prezentare · Rapoarte · Programări · Cereri · Anunțuri · Favorite · Produse · Facturi · Setări.
- Partner (/partner): Panou · Client nou · Clienți · Comisioane · Materiale · Agenți (agencies only).
- Field app (/field): inspector, phone only, must work offline.
- Admin (/admin): sidebar with Panou · Programări · Inspecții · Anunțuri · Feedback · Utilizatori · Parteneri · Plăți · Scoring · Analytics · Produse · Conținut.

## Design direction and design system

This Claude Design project already contains the **PropertyScore Design System** (tokens, three density modes and 59 components in the groups actions, feedback, forms, inspection, map, media, navigation, property, report, trust, plus UI kits for the website, account, partner, admin review and inspector app). Always build with it. Reuse its components and tokens; never create a parallel component or a new colour. If a screen needs something the design system lacks, add it to the design system first, in the same style, and list it in your end-of-batch summary.

Thesis: "Un ghid clar și prietenos care te ajută să alegi informat o locuință." Tagline: "Știi mai multe. Alegi informat."

Brand family: one master brand, PropertyScore, and two product sub-brands that share its symbol and wordmark: PropertyScore Physical (the inspection; forest and lime) and PropertyScore SmartCheck (the online report; slate blue). The logos live in the design system as the Logo, BrandMark and ProductTag components (Prompt L). Always place them through these components; never retype the wordmark in a heading font, recolour it, or draw a new mark. Brand and product names are written the same in Romanian and English.

Colours (semantic roles from the design system):
- Cream #F6F5ED: page background. Mist #EAF0E8: alternating sections. White: cards.
- Forest #103F32: brand, primary buttons, selected states, physical verification (TrustBadge physical, ScorePanel physical head).
- Lime #DDED69: the single main call to action per screen (Button accent) and the physical-verification mark. Text on lime is forest.
- Slate blue #3F6478: online analysis (online scores, TrustBadge online), information, focus ring.
- Ink #172B22: text. Muted green #52685B: secondary text, missing data, "Fără PropertyScore" (dashed).
- Amber #7A5200: declared data and warnings. Teal #24704A: success. Red #A63A24: errors.
- Inspection tiers: Bine teal, Acceptabil amber, Problemă red, N/A muted; always with icon and text.

Densities: comfortable on the public site, compact in account / partner / admin, field in the inspector app.

Typography: the design system's type roles (display, h1–h4, lead, body, small, caption, meta, label, price, score), weights 400 / 600 / 700 / 800, tabular numbers for prices and scores. Base text at least 16 px (17 px in the field app). Short sentences, left aligned.

Illustrations: simple drawings of buildings, a map, a buyer and an inspector; rounded shapes, forest, lime and blue accents. Illustrations explain the service. Report photos document a real property and always have captions. Any example report is labelled "Date demonstrative".

## Art direction: the quality bar

The design system fixes the colours, type roles and components. It does not make screens look good on its own. Every screen must look like a premium, editorial product (think a well-designed property magazine crossed with a precise data tool), not a generic SaaS template. Spend your effort on composition, hierarchy, imagery and detail.

Personality: a calm, expert friend. Warm (cream), grounded (forest), precise (data, sources), with lime as the one spark of energy.

Composition
- Vary the section layouts: split screens, asymmetric 7/5 grids, bento grids of different-sized tiles, full-bleed forest bands, sticky side panels, horizontal scrollers. Never a page made only of centred headings above rows of three equal cards.
- Create rhythm with alternating bands: cream → mist → forest → cream. Use a full-bleed forest band for the one or two key moments of a page (the trust explanation, the inspection offer).
- Layer and overlap: a photo or report card overlapping the edge of a forest panel; a score badge floating over a photo; a map card breaking out of its section. Floating elements get the forest-tinted shadow, nothing heavier.
- Generous whitespace and a clear 12-column grid; spacing in the 8 / 16 / 24 / 32 / 48 / 64 / 96 rhythm.

Colour: more vibrant, not neutral
- The base palette (cream, forest, mist, slate blue, lime) is calm; use it boldly and at scale instead of as thin accents. Full-bleed forest sections with lime and white type; large lime fields for highlight panels and stat callouts (forest text on lime); slate-blue sections and blue-tinted panels for everything about the online report; mist and cream only as the quiet base between them.
- Add an expressive accent palette to the design system, harmonious with forest and cream (warm and fresh, not neon): six hues, one per report category, for example Educație sky blue, Sănătate coral/terracotta, Transport sunflower yellow, Cumpărături & servicii berry/plum, Spații verzi leaf green, Siguranță & liniște deep teal. Each hue gets 50 / 100 / 300 / 600 / 800 steps and passes WCAG AA for text on its tints.
- Use the accent palette for category icon tiles, POI pins and chips on maps, illustration fills, the "how it works" steps, marketing sections, empty states and charts that compare categories. Give each page a dominant accent so pages feel different but related.
- Meaning stays fixed: forest = brand and physical verification, slate blue = online score, lime = the one main action and the physical mark, red / amber / teal = status. Accent hues never replace these and never carry status alone.
- Target mix on public pages, roughly: 55% cream/white, 25% strong brand surfaces (forest, slate blue, mist), 12% accent hues, 8% lime. Account, partner and admin areas stay calmer: brand surfaces for headers and highlights, accents for categories and charts only.
- Photography adds warmth: favour bright interiors with natural colour, and frame photos with coloured panels rather than plain white.

Hierarchy and typography
- Strong contrast: big display headlines (tight tracking, balanced lines) against calm 16 px body text. Eyebrows above section titles.
- Numbers are heroes: prices, scores and walking minutes are set large and heavy, their labels small and muted.

Signature elements (use them consistently across the product)
1. The score: large ScoreValue rings and CategoryScores bars used as graphics in heroes and report headers, not only as data.
2. The trust badge as a recurring motif: on photos, pins, cards and the hero.
3. The map as illustration: stylised schematic maps with pins, walking-radius rings (isochrones) and route lines in heroes and section backgrounds.
4. A subtle hexagon-grid pattern (the online score is computed on ~300 m hex cells): very low contrast, in cream/mist or on forest, behind data sections and empty states.
5. Real-looking documents: report and book previews that look like actual pages (cover, sections, photos with captions), slightly rotated or stacked.

Imagery
- Interior and building photos with a consistent warm, natural-light treatment, rounded 17 px, always with a caption or label. Use realistic placeholders that convey the room (living, kitchen, façade), never grey boxes in final screens.
- Floor plans as clean forest line art on cream, rooms labelled, 360° hotspots as lime dots.
- Illustrations: flat, rounded geometry, forest / lime / slate blue / cream, stylised people (buyer, owner, inspector with a tablet), used for "how it works", empty states and onboarding. One consistent family.

Data visualisation
- Make data beautiful and readable: category bars with clear labels, proximity lists with category icons and walking-minute chips, mini maps next to each report category, comparison rows with check marks, sparkline-like trends for prices.
- Every value keeps its source and date (DataLabel) set small and quiet, so honesty never clutters.

Depth and surfaces
- White cards with hairline borders on cream; panels with 24 px radius for hero blocks; forest surfaces for emphasis. Tints and gradients are allowed only when built from design-system colours (for example forest 800 → forest 700, cream → mist), used sparingly.

Motion (describe it on each key screen, with the reduced-motion alternative)
- Listing cards lift slightly on hover; map pin → card transitions; scores count up on first view; stepper progress fills; floor plan → panorama zoom; skeletons shimmer.

Avoid
- The generic look: centred hero with a stock illustration and three icon cards; every section a white card; an all-beige, all-grey or all-neutral page; heavy shadows; random gradients or 3D blobs; emoji; walls of bordered boxes; lorem ipsum; grey placeholder rectangles in final screens.

Exploration
- For the key screens (home hero, listing page, online report, map, inspector questionnaire) first show two clearly different directions, for example "editorial" (big photography, magazine layout) and "data-forward" (score and map as the hero), each at desktop and mobile. Recommend one, then complete the batch in the chosen direction.

Self-review before presenting each batch
- Check every screen against this quality bar, find the three weakest points, fix them, and tell me what you changed. Then check the rules below.

If the design system lacks something this quality bar needs (a pattern, an illustration set, a gradient pair, a motion spec, a new component), add it to the design system, in its style, and list it in your end-of-batch summary so it can be added to the code.

## Implementation constraints (so the design can be built 1:1)

- The app is React with Tailwind CSS 4 and shadcn/ui (Radix primitives) and lucide icons. Prefer patterns that map to shadcn components: Button, Card, Dialog, Sheet/Drawer, Tabs, Accordion, Select, Popover, Calendar, Table, Badge, Alert, Skeleton, Toast (sonner), Dropdown menu, Tooltip.
- One icon set only: lucide.
- Every visible text exists in Romanian and English. Design in Romanian first (it is 20–30% longer); never give buttons, chips or table headers fixed widths.
- Light theme only for now, but use tokens so a dark theme can be added later.

## Rules for every screen

1. Mobile first: design at 375 px, then desktop at 1440 px. Show both.
2. One main call to action per screen. Prices are visible on CTAs ("Verifică proprietatea · 30 lei").
3. Touch targets at least 44 px (48 px in the inspector app). Visible focus states.
4. Status is never shown by colour alone: always text + icon.
5. Every data point in a report shows its source and date. Missing data is written explicitly ("fără date", "program necunoscut", "necunoscut"). Answers given by the buyer are labelled "declarat". Never label an area "periculos" or "sigur".
6. Animations respect reduced motion (use a cross-fade instead of zoom or slide).
7. For every screen, also design: loading (skeletons), empty, error, and any special state listed in the batch.
8. Use the demo data I give you (Appendix A1) so all screens tell the same story, and the exact status labels from Appendix A2.

At the end of each batch, give me: the direction you chose for key screens and why, the list of screens and states you designed, what your self-review changed, the new components, tokens, patterns or illustrations you added to the design system (name, variants, where used), and any question where the brief was ambiguous.
```

---

## Prompt L · Logo family and brand patterns

Paste this once, right after Prompt 0 and before Batch A. Approve the logos before any batch; the result goes into the design system so every later screen uses the same marks.

```text
Before the screens, design the PropertyScore logo family and add it to the design system as reusable components and patterns. Stop after step 2 for my choice, then complete the rest in the chosen concept.

## The brand architecture
- PropertyScore: the master brand. Used on the site, the account, partner, admin and field app shells, invoices, emails and anything that is not about one product.
- PropertyScore Physical: the physical inspection (500 lei, inspector visit, PDF book with a 0–10 score). Its colour world is forest #103F32 with the lime #DDED69 mark, the same as "Verificat de PropertyScore".
- PropertyScore SmartCheck: the online report (30 lei, area analysis, 0–100 score). "SmartCheck" is one word with a capital S and C. Its colour world is slate blue #3F6478 (blue 500) and #2B4756 (blue 700) on blue 50 #EEF3F5 or white.
- Physical and SmartCheck are sub-brands, not separate companies: they share the master symbol and wordmark and add a product descriptor and a product accent. Someone who sees either must recognise PropertyScore first.
- Names are never translated: "PropertyScore", "Physical" and "SmartCheck" stay the same in Romanian and English. Romanian copy around them stays Romanian ("Raport online SmartCheck", "Inspecție fizică PropertyScore Physical").

## Step 1 · The brief for the symbol
Personality: a calm, expert friend; precise, warm, trustworthy; a premium property magazine crossed with a precise data tool (same art direction as Prompt 0).
The symbol must say "a home" and "a measured, verified score" at once, and stay legible at 16 px. Ideas worth exploring (do not limit yourself to them):
- a roofline or house outline drawn from a single continuous stroke that ends in a check mark or a score tick;
- a house whose window or door is a hexagon cell (the online score is computed on ~300 m hex cells);
- a score ring (the ScoreValue conic ring) that forms or frames a roof;
- a map pin whose head is a house with a lime accent.
Avoid: magnifying glasses, keys, chimneys with smoke, generic real-estate clip art, gradients, 3D, drop shadows, thin hairlines that disappear at small sizes, and anything that reads as a bank or an insurer.

## Step 2 · Three concepts (wait for my choice)
Show three clearly different symbol concepts, each with the master wordmark, at 16, 32, 64 and 256 px, on cream, white and forest, plus a quick mock in the public header (desktop 1440 and mobile 375). For each concept, also show how it extends to Physical and SmartCheck. Recommend one and stop.

## Step 3 · The master logo (chosen concept)
- Wordmark "PropertyScore": one word, capital P and S, heavy weight (800) and tight tracking in the spirit of our display type, drawn as outlined vector (never live text), with optically corrected letter spacing and a distinctive detail that ties it to the symbol (for example the S or the o echoing the score ring).
- Colours: wordmark forest #103F32, symbol forest with one lime #DDED69 accent. On forest: wordmark white, symbol white with lime accent. Never lime text on cream or white.
- Layouts: horizontal (symbol left of wordmark, the default), stacked (symbol above wordmark), symbol only.
- Construction sheet: grid, proportions, clear space (state it as a fraction of the symbol height), minimum sizes (digital: symbol 16 px, horizontal logo 96 px wide; print: horizontal 25 mm wide), optical alignment with text baselines when placed in a header.

## Step 4 · The product variants
For PropertyScore Physical and PropertyScore SmartCheck, design:
- Lockup: master logo + product descriptor ("Physical" / "SmartCheck"), with the descriptor in the product colour, separated by a thin rule or a fixed gap. Horizontal and stacked.
- Product mark: the master symbol with a product signal that still works at 24 px. Physical: the lime check or verification seal. SmartCheck: a slate-blue hexagon cell or data signal.
- SmartCheck compact lockup for tight spaces where the product must lead (the online report header, a pricing card title): "SmartCheck" large with "by PropertyScore" as an endorsement line. Show it next to the standard lockup and say when each is used.
- Show the three logos (master, Physical, SmartCheck) side by side so the family resemblance is obvious, and side by side with the TrustBadge physical and online variants so the colour meanings match.

## Step 5 · Colour and tone versions (for every logo, lockup and mark)
- full colour on cream and on white;
- inverse on forest (white + lime), and SmartCheck inverse on slate blue (white + blue 100 or lime only if contrast passes);
- one colour forest, one colour white, one colour black (for invoices, fax-style prints and stamps);
- contrast check: every version at least 3:1 against its background for the symbol and 4.5:1 for the wordmark at small sizes; list the ratios.

## Step 6 · App icons and small sizes
Favicon 16 / 32 (simplified symbol), SVG favicon, apple-touch-icon 180, PWA icons 192 and 512 plus a maskable 512 with safe zone, the field app (inspector PWA) home-screen icon, social avatar (circle crop). Show them on a real browser tab, an iOS and an Android home screen.

## Step 7 · Reusable brand patterns (add these to the design system)
Components:
- Logo: props product (core, physical, smartcheck), layout (horizontal, stacked, compact for SmartCheck only), tone (color, inverse, mono-forest, mono-white, mono-black), size (sm 24 px high, md 32, lg 40, xl 56). Accessible name = the brand name; decorative when it repeats a visible name.
- BrandMark: symbol only, same product and tone props, sizes 16, 20, 24, 32, 48, 64.
- ProductTag: a small pill naming the product ("Physical", "SmartCheck") in its colour world, with the product mark, for product names inside cards, checkout lines, report and book headers, account rows ("Rapoarte" tab) and admin tables.
Placement patterns (show each one designed, desktop and mobile):
1. Public header (cream, white and forest tones; scrolled state) and footer (inverse).
2. Account, partner and admin shells (compact, master logo), field app top bar (symbol + title) and the field app splash.
3. Auth screens (stacked master logo above the card).
4. SmartCheck report: cover and page header (compact SmartCheck lockup, blue world), sticky report header on scroll.
5. Physical book (PDF): cover, running page header and footer, last page with the verification seal (Physical world).
6. Checkout summary product line, ServiceCard and pricing cards: product name with ProductTag or product lockup.
7. Email header and footer (600 px wide, works with images off: alt text, bgcolor fallback), for the master brand and for each product's emails.
8. Open Graph / social share image 1200×630, one template per product and one for listings (photo + trust badge + master logo).
9. Invoice and consent PDF header (one-colour version).
10. Loading state: the BrandMark as a quiet spinner or pulse, with a reduced-motion alternative (static mark + text).
Brand board: one page that combines the logos with the other branding elements already in the system (palette and its meanings, type roles, the hexagon-grid pattern, photo treatment, illustration family, score ring and trust badges, tone of voice with the tagline "Știi mai multe. Alegi informat."), so the identity reads as one system.
Misuse page: stretched, recoloured, outlined, rotated, on busy photos without a panel, wordmark retyped in another font, Physical colours used for SmartCheck or the reverse, the lime accent used as text on light backgrounds, the symbol inside a speech bubble or badge we did not design.

## Deliverables and file naming
- Every logo, lockup and mark as an outlined SVG with a tight viewBox, no embedded fonts, no raster, no transforms or hidden layers; each colour as a separate fill named after the design-system token it uses (brand, trust-physical-mark, info, on-inverse), so the code can colour it with tokens.
- File names: ps-<product>-<layout>-<tone>.svg, with product = core | physical | smartcheck, layout = horizontal | stacked | compact | mark, tone = color | inverse | mono-forest | mono-white | mono-black. Icons: favicon.svg, favicon.ico (16 + 32), apple-touch-icon.png, icon-192.png, icon-512.png, icon-maskable-512.png. Social: og-core.png, og-physical.png, og-smartcheck.png. Email: email-header-<product>.png at 2× (1200 px wide).
- At the end, list: the chosen concept and why; every component and variant added to the design system; every asset file; clear space and minimum sizes; contrast ratios; any token you had to add (ideally none: use the existing palette); and any question where the brief was ambiguous.
```

---

## Prompt U · Visual upgrade (for a project that already has screens)

Paste this into an existing Claude Design project when the screens already designed look too plain. It keeps the content, states and design-system tokens, and redesigns the look. It also tells Claude Design to apply the same art direction to every later batch.

```text
The screens we have so far are functionally right but visually too simple: they read like a generic template. Redesign them to a premium standard. Keep every screen's content, copy, states and flow, keep the PropertyScore Design System tokens (colours, type roles, radii, components), and change the composition, hierarchy, imagery and detail. From now on, apply this art direction to every batch I send.

## Step 1 · Audit (show me, briefly)
For each existing screen, list the three things that make it look plain (for example: centred heading + three equal cards, every section a white card, no imagery, weak hierarchy, numbers too small, no rhythm between sections).

## Step 2 · Two directions (wait for my choice)
Redesign the home page hero and one data screen (the online report or the listing page) in two clearly different directions, desktop 1440 and mobile 375:
- A · Editorial: big warm photography, magazine-like layout, large display type, overlapping photo and forest panels.
- B · Data-forward: the score ring, trust badge and a stylised map are the hero; data as graphics.
Recommend one and stop for my choice.

## Step 3 · Apply the chosen direction to every existing screen
Then show the redesigned screens with their states, and a visual language board.

## The art direction (the quality bar)
Personality: a calm, expert friend; a premium property magazine crossed with a precise data tool. Warm (cream), grounded (forest), precise (data, sources), with lime as the one spark of energy.

Composition
- Vary section layouts: split screens, asymmetric 7/5 grids, bento grids with tiles of different sizes, full-bleed forest bands, sticky side panels, horizontal scrollers. Never a page made only of centred headings above rows of three equal cards.
- Rhythm with alternating bands: cream → mist → forest → cream; a full-bleed forest band for the one or two key moments of a page.
- Layer and overlap: a photo or report card overlapping the edge of a forest panel, a score badge floating on a photo, a map card breaking out of its section. Floating elements get the forest-tinted shadow, nothing heavier.
- Generous whitespace, a clear 12-column grid, spacing in the 8 / 16 / 24 / 32 / 48 / 64 / 96 rhythm.

Colour: more vibrant, not neutral
- The base palette (cream, forest, mist, slate blue, lime) is calm; use it boldly and at scale instead of as thin accents. Full-bleed forest sections with lime and white type; large lime fields for highlight panels and stat callouts (forest text on lime); slate-blue sections and blue-tinted panels for everything about the online report; mist and cream only as the quiet base between them.
- Add an expressive accent palette to the design system, harmonious with forest and cream (warm and fresh, not neon): six hues, one per report category, for example Educație sky blue, Sănătate coral/terracotta, Transport sunflower yellow, Cumpărături & servicii berry/plum, Spații verzi leaf green, Siguranță & liniște deep teal. Each hue gets 50 / 100 / 300 / 600 / 800 steps and passes WCAG AA for text on its tints.
- Use the accent palette for category icon tiles, POI pins and chips on maps, illustration fills, the "how it works" steps, marketing sections, empty states and charts that compare categories. Give each page a dominant accent so pages feel different but related.
- Meaning stays fixed: forest = brand and physical verification, slate blue = online score, lime = the one main action and the physical mark, red / amber / teal = status. Accent hues never replace these and never carry status alone.
- Target mix on public pages, roughly: 55% cream/white, 25% strong brand surfaces (forest, slate blue, mist), 12% accent hues, 8% lime. Account, partner and admin areas stay calmer: brand surfaces for headers and highlights, accents for categories and charts only.
- Photography adds warmth: favour bright interiors with natural colour, and frame photos with coloured panels rather than plain white.

Hierarchy
- Big display headlines with tight tracking and balanced lines, calm 16 px body, eyebrows above section titles.
- Numbers are heroes: prices, scores and walking minutes large and heavy, labels small and muted.

Signature elements, used consistently
1. Large ScoreValue rings and CategoryScores bars as graphics in heroes and report headers.
2. The trust badge as a recurring motif: on photos, pins, cards and the hero.
3. Stylised schematic maps with pins, walking-radius rings and route lines as illustration.
4. A subtle hexagon-grid pattern (the online score is computed on ~300 m hex cells), very low contrast, behind data sections and empty states.
5. Report and book previews that look like real documents (cover, sections, photos with captions), slightly rotated or stacked.

Imagery
- Interior and building photos with a warm natural-light treatment, 17 px radius, always captioned; realistic placeholders that show the room, never grey boxes.
- Floor plans as forest line art on cream, rooms labelled, 360° hotspots as lime dots.
- One family of flat, rounded illustrations in forest / lime / slate blue / cream with stylised people (buyer, owner, inspector with a tablet) for "how it works", empty states and onboarding.

Data
- Category bars with clear labels, proximity lists with icons and walking-minute chips, mini maps next to report categories, comparison rows with check marks. Sources and dates stay small and quiet.

Depth and surfaces
- White cards with hairline borders on cream, 24 px panels for hero blocks, forest for emphasis. Tints and gradients only from design-system colours (forest 800 → 700, cream → mist), sparingly.

Motion (describe it on key screens, with a reduced-motion alternative)
- Cards lift on hover, map pin → card transitions, scores count up on first view, stepper progress fills, floor plan → panorama zoom, shimmering skeletons.

Avoid
- Centred hero with a stock illustration and three icon cards, every section a white card, all-beige or all-neutral pages, heavy shadows, random gradients or 3D blobs, emoji, walls of bordered boxes, lorem ipsum, grey placeholder rectangles.

## Rules that do not change
Mobile first (375 then 1440), Romanian first, one lime accent button per screen, prices on CTAs, touch targets 44 px (48 px in the inspector app), visible focus, status as text + icon, sources and dates on data, "declarat" and "fără date" labels, reduced motion respected, loading / empty / error states, the demo data and status labels I gave you.

## Before presenting
Review every redesigned screen against this quality bar, fix its three weakest points, and tell me what you changed.

## At the end
Give me: the chosen direction and why; the list of redesigned screens and states; everything you added to the design system (patterns, illustrations, gradient pairs, motion specs, new components or variants) with names and where they are used; and any open question.
```

---

## Prompt U2 · Colour boost (add-on after Prompt U)

Paste this when the redesign still looks too neutral. Prompt 0 and Prompt U already contain the same colour guidance for new projects.

```text
The redesign is better but still too neutral and beige. Make it more colourful and alive, without breaking the meaning of our colours.

1. Use the base palette boldly and at scale: full-bleed forest sections with lime and white type; large lime fields for highlight panels and stat callouts (forest text on lime); slate-blue sections and blue-tinted panels for everything about the online report; cream and mist only as the quiet base between them.
2. Add an expressive accent palette to the design system, harmonious with forest and cream (warm and fresh, not neon): six hues, one per report category: Educație sky blue, Sănătate coral/terracotta, Transport sunflower yellow, Cumpărături & servicii berry/plum, Spații verzi leaf green, Siguranță & liniște deep teal. Give each hue 50 / 100 / 300 / 600 / 800 steps that pass WCAG AA for text on its tints. Show them on a palette board with usage examples.
3. Use the accent palette for category icon tiles, POI pins and chips on maps, illustration fills, the "how it works" steps, marketing sections, empty states and category comparison charts. Give each page a dominant accent so pages feel different but related.
4. Keep meanings fixed: forest = brand and physical verification, slate blue = online score, lime = the one main action and the physical mark, red / amber / teal = status. Accent hues never replace these and never carry status alone.
5. Target mix on public pages, roughly: 55% cream/white, 25% strong brand surfaces (forest, slate blue, mist), 12% accent hues, 8% lime. Account, partner and admin stay calmer: brand surfaces for headers and highlights, accents for categories and charts only.
6. Favour bright, naturally coloured interior photos and frame them with coloured panels rather than plain white.

Apply this to every screen designed so far and to every future batch. Show before/after for the home page, the online report and the listing page first, then the rest. At the end, list the new colour tokens (name, hex, steps, contrast ratios, where used) so they can be added to the code.
```

---

## Prompt A · Foundations

```text
Batch A of 8: foundations. Design these, in this order.

0. Visual language board (do this first and let me approve it before the rest)
   - Two directions for the home hero at desktop and mobile ("editorial" and "data-forward"), using the design system and the art direction. Recommend one.
   - For the chosen direction: section-band rhythm (cream, mist, forest), the hexagon-grid pattern, photo treatment with captions, floor-plan line art, three sample illustrations (buyer, owner, inspector), elevation and overlap examples, data-visualisation styles (category bars, proximity list with walking chips, mini map with isochrone rings), and the motion specs from the art direction.

1. Design system check (keep its tokens; you may refine component polish)
   - Show a board of the existing tokens and type roles with ș ț ă î â in every sample, and the three density modes side by side.
   - Confirm the brand components from Prompt L (Logo, BrandMark, ProductTag) are in the design system and use them in every shell below.
   - Confirm the existing components cover: Button (primary, accent with price "Verifică proprietatea · 30 lei", secondary "Programează inspecția · 500 lei", ghost, danger, inverse), TrustBadge (physical "✓ Verificat de PropertyScore · 14 aug 2026", online with score "91", none "Fără raport PropertyScore", pending, expired "reinspecție recomandată"), ScoreValue (online "91 / 100", physical "8,6 / 10"), CategoryScores, DataLabel ("Sursa: OpenStreetMap · actualizat 1 sept 2026", declarat, fără date), StatusPill, EmptyState, Notice, Toast, Skeleton, TextField, Select, RadioGroup (cards), SegmentedControl ("Da / Nu / Nu știu"), Checkbox, MediaUpload.

2. Missing pieces to add to the design system, in its style
   - StatusPill board: one pill per status in Appendix A2, grouped by state machine, icon + text.
   - StageTimeline: horizontal (desktop) and vertical (mobile) steps with done / current / upcoming / cancelled.
   - Number field with unit (m², lei, €) and textarea with counter, if TextField does not cover them.

3. Shells
   - Public header (desktop): Logo (master, horizontal) · Hartă · Anunțuri · "Verifică · 30 lei" (accent, lime) · "Inspecție · 500 lei" (secondary) · Consultanță · Produse · Cont / Intră · RO/EN switcher. Mobile: logo, primary CTA, burger menu opening a sheet.
   - Public footer: Cum funcționează · Prețuri · Parteneri · Ghiduri · Despre · Contact · FAQ · Termeni · Confidențialitate · Cookies, the 9 covered cities, language switcher.
   - Account shell: header with notification bell and user menu; section tabs (desktop: left vertical list; mobile: horizontal scrollable tabs). Tabs: Prezentare · Rapoarte · Programări · Cereri · Anunțuri · Favorite · Produse · Facturi · Setări, with count badges on Cereri and Rapoarte.
   - Partner shell: same structure, tabs Panou · Client nou · Clienți · Comisioane · Materiale · Agenți.
   - Field app shell (phone only): top bar with title, back, offline/sync indicator ("online", "offline · se sincronizează", "offline · 3 de sincronizat"), bottom navigation Agenda · Istoric.
   - Admin shell (desktop first, usable on tablet): collapsible sidebar with Panou · Programări · Inspecții · Anunțuri · Feedback · Utilizatori · Parteneri · Plăți · Scoring · Analytics · Produse · Conținut; top bar with search and user menu.
   - Notification bell dropdown: list of notifications (unread dot, time, link), "Marchează toate ca citite", empty state.
   - Not-found page and generic error page, in the public shell and in the account shell.

4. Auth screens (centered layout, public header)
   - /login: email, password, "Ai uitat parola?", link to sign up, language switcher. States: wrong credentials, email not confirmed.
   - /sign-up: email, password, terms checkbox. Success: "Verifică-ți emailul".
   - /reset-password: request form (email) and set-new-password form. Success states.

5. Address and map components
   - AddressAutocomplete: input "Unde este proprietatea?", suggestions list with street, number and city, "sau lipește linkul unui anunț" toggle for a URL field. States: typing, results, no results, outside coverage ("Încă nu acoperim această localitate. Raportul online funcționează în: …").
   - PinConfirmMap: map with a draggable pin, the question "Asta e proprietatea?", buttons "Da, continuă" and "Mută pinul", address line under the map.

6. Checkout summary (used by all four products)
   - Order summary card: product name, what is included (bulleted list), price, optional fields (discount code; for inspections also "Cod partener"), total.
   - Email step for people not signed in: email field → "Ți-am trimis un cod de 6 cifre" → code input → signed in. Copy: "Contul se creează automat pe acest email."
   - Payment methods: card, Apple Pay, Google Pay; terms checkbox; pay button with price.
   - States: processing, payment failed (retry), payment succeeded (redirect message).

Deliver desktop and mobile for every shell and screen, and a component board.
```

---

## Prompt B · Public site and owner booking

```text
Batch B of 8: public pages and the owner's inspection booking. Use the shells and components from Batch A. Design in this order.

1. Home "/"
   Sections, top to bottom:
   1. Hero on cream or mist, two columns (mobile: stacked in this order). Left: title "Află mai multe despre locuință, înainte să faci următorul pas.", subtitle "Descoperă zona și ce ai în apropiere. Adaugă câteva detalii, dacă le știi, și vezi ce informații sunt disponibile.", AddressAutocomplete, accent Button "Verifică proprietatea · 30 lei", hint "Poți începe doar cu adresa. Restul detaliilor sunt opționale.", secondary link "Vrei și o inspecție la fața locului? 500 lei". Under it, the 9 covered cities. Right: a demo report card labelled "Analiză online · Exemplu": "3 camere · etaj 3/8 · lift" marked "Informații declarate de cumpărător", "Transport în apropiere 3 min", "Parc 5 min", "Școală 8 min", "De întrebat la vizionare: Locul de parcare este inclus în preț?", footnote "Date demonstrative. Raportul real afișează sursa, data și informațiile lipsă."
   2. Listings search bar: locality, type, price, buttons "Caută anunțuri" and "Vezi pe hartă".
   3. Message for owners: they can publish their own listing for free, without buying a report; the professional listing prepared by PropertyScore is included in the 500 lei inspection.
   4. What the 500 lei inspection includes: inspection with book, full online report, presentation photos, a 360° photo of every room, 2D floor plan, free professional listing.
   5. Badge explainer: the same listing card shown three ways (physical, online, none).
   6. Carousel of listings with the green badge.
   7. "Cum funcționează" in 3 illustrated steps.
   8. Online vs physical comparison (short), link to /how-it-works.
   9. Trust numbers: inspections done, inspectors, cities covered.
   10. Partner block: "Ești agent? Câștigă 100 lei per proprietate" → /partners.
   11. Teasers for Consultanță and Produse digitale.

2. /pricing
   Price cards: Raport online 30 lei (self-service, anyone, any property); Inspecție fizică 500 lei (paid by the owner, or by a buyer with the owner's agreement; inclusions listed right next to the price); Consultanță (30 / 60 min, price shown as "de la 150 lei" placeholder); Produse digitale (price per product); Program parteneri (100 lei per converted client). Coverage block. Short refund policy block with link to terms. FAQ teaser.

3. /how-it-works
   Comparison table "Ce include fiecare": online (safety score, neighbourhood rent and asking-price averages, €/m², amenities, walking routes) vs physical (everything online + real condition, defects, measurements, photos, 360° per room, floor plan, verdict). "Ce nu poate ști raportul online" and why the inspection can. An anonymised book example (pages preview, labelled "Date demonstrative"). How an inspection goes: duration, what the inspector checks, when the book arrives. The free professional listing for owners. Two CTAs.

4. /faq, /about, /contact, /legal/terms (one shared long-text layout for legal pages with a table of contents)
   - FAQ: accordion grouped by topic (online vs physical, duration, who pays in the buyer flow, refunds, what if the book misses a defect).
   - About: team, inspectors, cities, numbers.
   - Contact: form (name, email, phone, message), phone, hours; success state.

5. /inspection: the inspection wizard, owner branch
   Use the Stepper (bars on desktop; compact progress "Pasul 2 din 5" on mobile).
   - Step 0 "Cine comandă inspecția?": two large radio cards "Sunt proprietar" and "Sunt cumpărător" (the buyer branch is designed in Batch C).
   - Step 1 Property: AddressAutocomplete + PinConfirmMap, type (Apartament / Casă), usable area (m²), construction year, floor and building floors. State: city without a field team → stop with a clear message before any payment.
   - Step 2 Slot: SlotPicker with a day strip (next 14 days) and a time grid; unavailable slots disabled; state "Ora aleasă tocmai a fost rezervată, alege alta"; state "Nu avem sloturi libere în următoarele 14 zile".
   - Step 3 Access: who opens the door (name), phone, notes for the inspector.
   - Step 4 Checkout: CheckoutSummary for "Inspecție fizică · 500 lei" with the full inclusions list (inspection and book, full online report, presentation photos, 360° photo of every room, Polycam floor plan, free professional listing for the owner, no extra fee) and the optional "Cod partener" field with live validation (valid: "Cod valid · Ioana R., Agenția Casa Bună"; invalid).

6. /inspection/confirmation/[id]
   Success message, summary (date, time slot, address, who opens), "Ce urmează" timeline (inspector assigned → inspection, about 1–2 hours → book ready in X days), "Cum te pregătești" checklist (also sent by email), buttons "Vezi programarea" and "Adaugă în calendar".

7. /account/appointments
   List of appointments (inspections now; consultations will be added in Batch F). Each row/card: type, date and time, address, StatusPill (programat, agent alocat, efectuat, book gata, anulat), inspector name when assigned. Detail sheet: all details, access data, StageTimeline, actions "Reprogramează" and "Anulează" (with refund policy text in the confirm dialog; allowed only before "efectuat"), link to the report when "book gata". Empty state with CTAs.

8. /account (minimal version): greeting, upcoming appointments, shortcuts "Verifică o proprietate", "Programează inspecție", "Adaugă anunț". (The full version comes in Batch E.)
```

---

## Prompt C · Scheduling and buyer requests

```text
Batch C of 8: the admin tools that make inspections happen, and the buyer → seller invitation flow.

1. /admin/users
   Table: name, email, phone, roles (chips: utilizator, partener, inspector, expert, admin), created, status (active / blocked). Filters by role, search. Row action sheet: grant or remove roles, block or unblock with a reason. Empty and search-no-results states.

2. /admin (minimal): cards for today's appointments, unassigned inspections, invitations about to expire.

3. /admin/appointments: the scheduling calendar (desktop first)
   - Toolbar: Day / Week toggle, date navigation, filter by inspector, filter by city.
   - Day view: one column per inspector, time rows; appointment blocks show time, address, StatusPill. Week view: days as columns, appointments stacked.
   - "Neasignate" queue on the side; drag an appointment onto an inspector column to assign (show the drag state, a drop-target highlight and a conflict warning when the inspector is busy).
   - Availability editor: per inspector, weekly recurring hours plus exceptions (days off); shows how it feeds the booking wizard.
   - Appointment detail drawer: customer, seller, buyer (if any), address, access, payment status, history, actions: assign / change inspector, reschedule, cancel with refund option.
   - Tablet layout: single inspector at a time with a selector.

4. /inspection, buyer branch (continuation of the wizard from Batch B)
   - Step 1 Property: either "Alege un anunț de pe PropertyScore" (search field with listing cards) or type an address.
   - Step 2 Account: inline email code if not signed in.
   - Step 3 Invite the seller: explanation "Vânzătorul alege ziua și ora, pentru că el deschide ușa. Tu plătești abia după ce rezervă."; seller email and/or phone; send by email, by SMS, or "Copiază linkul" (for WhatsApp); preview of the message the seller receives.
   - Done screen: "Am trimis invitația. Te anunțăm când vânzătorul rezervă." with link to /account/requests.

5. /inspection/invitation/[token]: the page the seller opens (public, with its own RO/EN switcher)
   Content: who asks ("Mihai I. îți propune o inspecție PropertyScore"), for which property, what the inspection involves and how long it takes, "Nu te costă nimic", what the owner gets (book + free professional listing). Steps: create account (email, phone, password) or sign in → pick day and hour (SlotPicker) → access details → confirmation "Am anunțat cumpărătorul să plătească. Primești confirmarea pe email." Also a "Refuz" link with a short message to the buyer.
   States (design each): valid; already reserved (shows the booking, awaiting payment); paid and confirmed; expired ("Invitația a expirat. Cere-i cumpărătorului să o retrimită."); cancelled; declined.

6. /account/requests
   Two tabs: "Trimise" (buyer) and "Primite" (seller).
   - Buyer card: property, seller contact, StatusPill (link trimis, cont creat, rezervat · așteaptă plata, plătită, expirată, anulată, refuzată), StageTimeline, actions: "Plătește · 500 lei" with the reserved day and hour and a countdown to the payment deadline; "Retrimite linkul" when expired; "Anulează cererea".
   - Seller card: who asked, property, booking, payment status.
   - Notification examples (in-app and email layouts): "Vânzătorul a rezervat pentru joi, 14 aug, ora 09:30. Plătește ca să confirmi."
```

---

## Prompt D · Inspector field app

```text
Batch D of 8: the inspector's phone app. Phone only (375 px and 414 px). It is used inside buildings and basements, often offline, sometimes with one hand. Controls at least 48 px, progress always visible, white background, blue for navigation. Paste Appendix A3 (the questions) with this prompt.

1. /field: today's agenda
   - Date header, "Azi" / "Mâine" switch.
   - Card per inspection: time, address, apartment, seller name and phone (tap to call), access notes, status (de început, consimțământ semnat, în lucru x/44, trimis), button "Navighează" (opens maps) and "Începe".
   - Empty day, offline banner, items waiting to sync.

2. /field/inspections/[id]/consent: the first screen of every inspection
   The inspector hands the phone to the seller. Everything else is locked until signed.
   - Header: "Înainte de inspecție · consimțământ", inspection number and address, RO/EN switch ("Se semnează varianta afișată").
   - "Cine semnează": seller name, phone, owner or proxy ("proprietar / împuternicit"), the home, the inspector with ID number, date and time.
   - Three sections opened one at a time, each with its own mandatory checkbox, no "accept all":
     1. "Prelucrarea datelor personale" (operator, purpose, retention, rights, contact gdpr@…)
     2. "Poze și video în locuință" (photos and clips in all rooms, a 360° panorama per room, a Polycam scan for a floor plan; materials go into a listing only if the owner decides; people, documents and personal items avoided)
     3. "Termenii inspecției și răspunderea" (visual inspection with simple tools, no dismantling; describes what could be seen on the day; does not guarantee absence of hidden defects; score calculated automatically; liability limited to the price)
     Each shows "text orientativ · versiunea 1.0".
   - Signature pad ("semnează aici, cu degetul"), clear button, signer name under it.
   - Button "Semnează și începe inspecția", disabled with the hint "lipsesc: 3 bife + semnătură" (update the count live).
   - Signed state: "✓ Semnat · 09:38", "PDF-ul semnat a plecat pe emailul vânzătorului", file line (consimtamant-1042.pdf · v1.0 · date · GPS · sha256 short), button "Continuă la chestionar".
   - Refusal: "Vânzătorul refuză să semneze" → reason field → confirmation that the inspection does not start and the office is notified.
   - Offline state: "Semnătura e salvată pe telefon și se trimite când ai semnal."

3. /field/inspections/[id]: the questionnaire
   - Sticky header: inspection number, address; facts line "3 camere · 84 mp · et. 2/4 · 1962 · proprietar: D. Popescu · consimțământ semnat 09:38 ✓"; counters "12/44 răspunse · 18 foto · 1 video · tur foto 4/10"; sync state.
   - Category accordions (11), each header: name, weight, live category score ("Structură · 15% · 9,2"), completion ("3/4").
   - Question card: number and text; four large answer buttons "Bine", "Acceptabil", "Problemă", "N/A"; "📷 Foto" and "🎥 Video" buttons (mark the required one, show the count and thumbnails after capture, upload progress in the background); "Notă liberă…" field; measurement field where relevant (e.g. humidity %). States: unanswered, answered, required media missing (warning), uploading, upload failed (retry).
   - Section "Tur foto pentru anunț" (no score): 10 shot tiles T1–T10 (Fațadă / intrarea în bloc, Hol și intrare, Living, Bucătărie, Baie, Dormitor 1, Dormitor 2 / birou, Balcon sau terasă, Vedere de la fereastră, Parcare / curte / părți comune), each with a framing tip ("orizontal, lumină naturală, fără persoane, ordine în cadru"), capture, retake, thumbnail.
   - Section "Camere, 360° și plan": list of rooms (editable names, add room), per room: capture or upload the 360° panorama, status "ok / lipsește / neutilizabilă"; upload the Polycam plan; place a hotspot for each room on the plan (tap on the plan image).
   - Footer: provisional score "8,3 / 10" and an expandable "Cum iese nota" panel (category, weight, score; "media ponderată a categoriilor cu răspunsuri"). Button "Trimite la review", disabled with a checklist of what is missing (unanswered questions, required media, tour photos, rooms, plan). Final step: "Proprietarul confirmă finalizarea" (name + tap to confirm).
   - States: offline with queue count, sync conflict resolved, submitted ("Trimis la review · 11:42").

4. /field/history
   List of past inspections with book status (trimis, cerere de completare, book gata). Detail: admin's change requests per question with a reply box and "add photo", and clarification requests coming from client feedback, with reply and attachments.
```

---

## Prompt E · Reports and back office

```text
Batch E of 8: review and delivery of the book, the customer's reports, feedback, and the rest of the account and admin.

1. /admin/inspections (list)
   Table: number, address, inspector, date, StatusPill (efectuat, cerere de completare, book gata), waiting time, filters (status, inspector, city, date).

2. /admin/inspections/[id] (review, desktop)
   Layout: left navigation by category; centre: each question with answer, note, measurement, photos and videos (lightbox), and a "comentariu pentru inspector" action; right: score panel (category scores, weights, final score, calculation) and a checklist (consent PDF present, all answers, media, 10 tour photos, plan, rooms).
   Tabs: Răspunsuri · Tur foto · Plan și 360° (plan with room hotspots, each linked to its panorama; mark "fără punct activ" for rooms without a usable panorama) · Consimțământ (PDF viewer) · Raport online (included) · Istoric.
   Actions: "Trimite înapoi la inspector" (notes per question), "Aprobă" with a verdict field (RO and EN), then "Generează și publică book-ul". For re-inspections show the previous book side by side.

3. /account/reports
   Tabs: Rapoarte online · Book-uri inspecție · Documente (signed consent PDFs). Row/card: address, type, date, score (blue or green), StatusPill, version ("v2 · revizuit"), actions: Deschide, Descarcă PDF, Partajează. "reinspecție recomandată" note after 12 months. Empty states per tab.

4. /account/reports/[id]: book detail
   - Header: address, inspection date, inspector, green badge, score "8,6 / 10", buttons Descarcă PDF, Partajează.
   - Category breakdown (11 bars), verdict, key findings (good / attention / problem with icons), photos with captions.
   - Included online report section (link to the full view).
   - Versions: list with date and "ce s-a schimbat"; older versions downloadable.
   - Share: create a link with expiry (7 / 30 days), list of active links, revoke.
   - "Spune-ne cum a fost" block with two independent actions:
     a. "Evaluează inspectorul": first "Ai fost prezent la inspecție?", then 1–5 stars and an optional comment (punctuality, communication, how the visit went). One rating per person; after sending, show it read-only.
     b. "Semnalează o problemă sau o sugestie": type (Date incorecte / Informații lipsă / Sugestie de îmbunătățire), section or finding (picker), description, optional photo or source link. Confirmation "Am primit observația ta · PS-000123 · Trimis".
   - "Observațiile mele": list with StatusPill (trimis, în analiză, rezolvat, închis cu explicație) and the team's answer; when resolved with a correction, link to the new version.
   - Buttons "Discută book-ul cu un expert" and "Refă inspecția" (re-inspection after renovation).

5. /admin/feedback and /admin/feedback/[id]
   Tabs: Evaluări inspectori · Observații rapoarte. Filters: type, report, inspector, assignee, status. Detail: client, report and version, section, description, evidence; conversation with "răspuns către client", "cere clarificări inspectorului", internal notes; actions "În analiză", "Rezolvă cu versiune nouă", "Închide cu explicație".

6. /account/settings: profile (name, phone), password change, notification channels (email / SMS for requests and appointment status), account language RO / EN.

7. /account/invoices: payments table (date, product, amount, status: plătită, rambursată, rambursată parțial) and invoice PDF download.

8. /account (full): recent reports, upcoming appointments, requests waiting for me, new answers to my feedback, shortcuts.

9. /admin (full dashboard): today's appointments, inspections waiting for review (with waiting time), invitations expiring soon, today's payments, open feedback, status of the latest data update.

10. /admin/payments: transactions table (filters by product and status), refund dialog (full or partial, reason), coupons (list, create: code, percent or fixed, validity, limit, products).

11. /admin/content: versioned editors for (a) consent texts in RO and EN (sections, checkbox labels, "publică versiunea nouă" with note that old signatures keep their version) and (b) inspection forms (categories with weights, questions with RO/EN text, required media, draft vs published).
```

---

## Prompt F · Online report, consultations, products

```text
Batch F of 8: the 30 lei online report, consultations and digital products.

1. /admin/scoring (desktop)
   - Versions: list (v1, v2, v3 active), "Creează versiune nouă" from the active one; a version used by issued reports is read-only.
   - Editor: weights per category (Educație, Sănătate, Transport, Cumpărături & servicii, Spații verzi, Siguranță & liniște), search radii, score thresholds; for Siguranță & liniște: four layer weights (bază oraș 20, prezență 25, factori din jur 30, sesizări 25), points per place type, distance thresholds, cell size.
   - Data updates log: month, status (în lucru, gata, eșuat), sources and their dates, per city the number of cells "fără date" per layer; button "Reconstruiește".
   - City baselines table (city, year, crime coefficient, class, source link) and police zones import status per city.

2. /check: the online report wizard (public)
   - Step 1 Address: AddressAutocomplete or "lipește linkul anunțului" (imobiliare.ro, OLX, Storia). Outside coverage → stop.
   - Step 2 Confirm: PinConfirmMap.
   - Step 3 Details (optional, skippable): intro "Completează ce știi din anunț sau din discuția cu vânzătorul. Poți continua și fără aceste detalii." and the note "Localizarea este singura informație obligatorie." Questions, each with "Nu știu": rooms and approximate m² (two independent fields); floor and building floors ("3 din 8"); lift (Da / Nu / Nu știu); parking (Loc inclus / Loc disponibil separat / Doar pe stradă / Fără parcare / Nu știu); construction year or period; heating (Centrală proprie / A blocului / Termoficare / Altceva / Nu știu). When fields were prefilled from a listing link, show them as "preluat din anunț · confirmă".
   - Step 4 Preview (free): overall score and 1–2 categories visible, the other categories blurred with a lock and "Deblochează raportul complet · 30 lei"; line "calculat pe datele din 1 sept 2026, formula v3".
   - Step 5 Checkout: CheckoutSummary "Raport online · 30 lei".

3. /check/result/[id]: the online report (the richest content page; design it carefully for reading)
   1. Header: address, date, "calculat pe datele din 1 sept 2026, formula v3", Descarcă PDF, Partajează.
   2. Overall score 91 / 100 and six category cards with scores.
   3. Each category opens a section with the concrete places, real walking time and distance, and a small map. "Cumpărături & servicii" includes non-stop shops with "program necunoscut" when hours are missing.
   4. Siguranță & liniște: "74 / 100", four layer lines (e.g. "Secția 1 Poliție la 650 m, Poliția Locală la 1,1 km", "Iluminat mapat pe 88% din străzile din raza de 300 m", "2 baruri de noapte și 1 casă de pariuri pe stradă; școală și parc la sub 400 m", "14 sesizări la Poliția Locală în zona Centru în 12 luni; media pe zone: 11", "Timișoara: coeficient de criminalitate 2025 în categoria «ridicat»"), each with source and date on hover; a missing layer shows "fără date · cerere în curs"; disclaimer "Indicator de proximitate și percepție, nu statistică de criminalitate la adresă. În România nu există date oficiale la nivel de stradă."
   5. Market block: neighbourhood average rent, average asking price for apartments, €/m², each with source, period and area used.
   6. Map of amenities and walking routes.
   7. Building block: construction year with where it came from ("declarat de cumpărător" or a source), "necunoscut" allowed, what still needs to be checked at a viewing. No safe/unsafe verdict.
   8. "Ce ai declarat": the buyer's answers labelled "declarat".
   9. "Orașul în cifre" panel: city-level pollution, traffic, health, cost of living, price per m² centre vs outside, rank among the 9 cities, "Sursa: Numbeo, sondaje cu utilizatorii" and a note that it describes the city, not the address.
   10. "Cum am calculat": sources and weights.
   11. "Ce nu poate ști acest raport" + upsell (mandatory): "Vrei să știi și în ce stare e efectiv? Inspecție fizică, 500 lei."
   12. "Semnalează o problemă sau o sugestie" (same dialog as Batch E, without the inspector rating).
   States: generating (progress, auto-refresh), failed, revised version available.

4. /consultation
   Steps: topic (Interpretarea book-ului / Ce să verifici la vizionare / Negociere / Comparație de zone) → duration (30 or 60 min, with prices) → slot (experts' calendar) → optional context (which property or book, preselected when coming from a book; notes) → checkout. Confirmation with meeting link and "Adaugă în calendar". Then: consultation cards inside /account/appointments (meeting link, reschedule, cancel, written summary after the session) and the expert's view inside /admin/appointments ("Marchează efectuată", write summary).

5. /admin/products (first, so the catalogue has content): list with status (ciornă, publicat, retras), sales and downloads; editor: titles and descriptions RO/EN, category, language (RO / EN / ambele), price, format, licence, files with versions, preview images, publish/retire.

6. /products: catalogue with category tabs (Designuri de amenajare, Proiecte de case, Ghiduri de cumpărare, Checklist-uri de vizionare), filters (price, language), product cards (preview, title, price, format, "ce primești").

7. /products/[slug]: preview gallery (PDF pages, renders), description, contents, format, licence, buy box with price, similar products, upsell to the online report or a consultation.

8. /account/products: purchased files with download, "versiune nouă disponibilă", licence link.

9. /admin/analytics: KPI cards and charts: preview → payment conversion (online report), online → physical conversion, revenue by product and by source, average time from booking to book; date range picker.
```

---

## Prompt G · Listings portal

```text
Batch G of 8: the listings portal. The listing page is the most important page of the public site: it shows the difference between a verified listing and an ordinary one.

1. /account/listings/new: create a listing (owner, no report required)
   Steps or long form: Vânzare / Închiriere → photos (upload, reorder by drag and by keyboard, choose cover) → title and description → features (price total or monthly rent with currency, usable area, rooms, floor / building floors, construction year, type) → address with pin (show that the public sees only an approximate location) → contact phone → save draft / "Trimite spre publicare".

2. /account/listings
   Cards: cover, title, price, StatusPill (ciornă, previzualizare privată, în așteptare, publicat, respins + motiv, retras), stats (vizualizări, favorite, contacte), actions: Editează, Retrage / Republică, "Comandă PropertyScore pentru acest anunț", badge toggle "Afișează badge-ul și scorul public" (only when a report exists). A highlighted card for the free professional listing prepared after an inspection: "Anunțul tău profesional e gata. Verifică-l și publică-l."

3. /account/listings/[id]: editor with 1:1 preview
   - Top bar: "Schiță · generată automat după inspecția din 14 aug 2026", buttons "Editează pozele", "Editează descrierea", "Publică anunțul".
   - The preview is identical to the public listing page (item 5 below).
   - Editable: photos (order, cover, hide, add own; inspector photos tagged "tur foto agent"), description (edit or "Regenerează"; label "generată din inspecție" or "editată de proprietar"), price, title, contact phone, which rooms and panoramas are published (toggle per room on the plan).
   - Locked PropertyScore block: clicking shows "Datele PropertyScore vin din inspecție și nu se pot edita".
   - Side panel "Ce poți edita" (✓ photos, description, price, title, phone; ✕ score, categories, verdict, inspection date, inspector, online score and map) and "Așa te vor contacta cumpărătorii".
   - After "Publică": "Anunțul intră la verificare și apare pe site cu badge-ul verde. Îl poți retrage oricând."

4. /admin/listings: moderation queue with preview, checks (for inspected listings: the public plan and selected panoramas contain no people, documents or personal items), actions approve / reject with reason / edit; tab for reported listings.

5. /listings/[id]: the public listing page
   1. Gallery (mobile: swipe; desktop: large + grid), video tour if any.
   2. Header: "De vânzare" or "De închiriat", price (or rent / lună), m², rooms, floor, approximate address and area, favourite and share.
   3. Floor plan + 360° tour (inspected listings): 2D plan with clickable rooms; tapping a room or its point plays an animated transition into that room's 360° panorama; inside: drag to look around, room name, "Înapoi la plan", next / previous room. Rooms without a panorama appear on the plan without a point. Reduced motion: cross-fade. Design the plan view, the transition (3 frames) and the panorama view.
   4. PropertyScore block, four variants (design all four):
      - Physical: "✓ Verificat de PropertyScore", "8,6 / 10 · nota inspecției", "Inspecție 14 aug 2026 · inspector Ana M. · valabil 12 luni", 11 category scores, verdict, publishable findings, then the online report (91, six categories, safety, rent and price averages, €/m², map).
      - Physical expired: same + "reinspecție recomandată".
      - Online only: blue score with breakdown + "Scorul online nu poate vedea starea reală a locuinței. Cere o inspecție fizică." + CTA.
      - None: grey "Fără raport PropertyScore" + "Cere PropertyScore pentru această proprietate" and "Verifică zona · 30 lei".
   5. Description (with its label) and features.
   6. Map and neighbourhood: places, walking times, transport lines.
   7. Contact card: seller name, "Arată telefonul" (reveals on click), message form; success state.
   8. Mortgage calculator: down payment %, years, rate (IRCC / Euribor) → monthly payment (e.g. "~1.020 € / lună").
   9. Similar listings; price history when the price changed.
   10. For visitors: "Cere PropertyScore pentru această proprietate".
   States: withdrawn ("Anunțul nu mai este disponibil" + similar listings), not found.

6. /listings: search
   Desktop: list and map side by side, synchronised (hovering a card highlights its pin). Mobile: list with a floating "Hartă" toggle.
   Filters: Cumpărare / Închiriere, price, area, rooms, floor, construction year, type, city / area; the star filter "Doar cu PropertyScore verificat" visible in the main bar; derived filters "la max. 500 m de școală", "aproape de linie de tramvai", "scor online peste X"; sort (relevanță, preț, cele mai noi, scor PropertyScore); "Salvează căutarea" with alert frequency. Listing card: photo, price, m² / rooms, area, badge + online score. Empty results, loading, pagination.

7. /map: all listings on a full-screen map
   Top bar: Cumpărare / Închiriere, quick filter chips "Toate · Verificate fizic · Cu scor online · Fără PropertyScore", counter "20 locuințe afișate · 5 verificate fizic · 7 cu scor online · 8 fără", filter drawer, switch to list, legend. Pins: green (physical), blue with the score number, grey (none); hover shows the price; clusters at low zoom showing how many are verified. Pin click opens a card (photo, price, m², rooms, PropertyScore block small; "Vezi anunțul"; for grey and blue also "Cere PropertyScore" and "Verifică zona · 30 lei"). Mobile: bottom sheet card.

8. /account/favorites: saved listings grid; saved searches with filter summary, alert frequency (instant, zilnic, săptămânal, oprit) and delete.

9. Update the home page (Batch B) with the listing search bar wired to /listings and the carousel of verified listings using the final ListingCard.
```

---

## Prompt H · Partners and guides

```text
Batch H of 8: the partner programme for real-estate agencies and agents, and the guides section.

1. /partners: public landing
   Explanation: "Aduci un vânzător care face PropertyScore → primești 100 lei din cei 500." Calculator: slider "proprietăți pe lună" → earnings ("5 proprietăți pe lună = 500 lei"). Rules: a conversion counts after the inspection is done and paid; when and how payouts happen; an agency chooses who collects (the agency or its agents). What a partner sees (client stages and the full book). Registration with three variants (radio cards):
   - Agenție: company name, CUI, registration number, billing address, IBAN, who collects commissions (agenția / agenții), contact person.
   - Agent în agenție: personal details + "Codul agenției" (validated live, shows the agency name).
   - Agent solo: personal details or PFA, billing, IBAN.
   After submit: "Cererea ta e în analiză" (agency and solo: approved by PropertyScore; agent in agency: approved by the agency).

2. /admin/partners: approval queue (agencies and solo agents), structure view (agencies with their agents, solo agents, codes), commissions to pay grouped by who collects, payouts history (mark paid, attach invoice), block a code.

3. /partner: dashboard
   First thing on screen: the commission code, large, with "Copiază" and the referral link. Account type. Recent clients with StageTimeline. Totals: de încasat, plătit, conversii luna aceasta. Agency extras: agents list with conversions, filter by agent, agents awaiting approval. Chart: clients brought vs converted per month. Status screens for pending, rejected, disabled accounts.

4. /partner/agents (agency only): agency code to share with agents, pending agents (approve / reject), active agents (code, clients, conversions, amount generated), deactivate.

5. /partner/new-lead: seller name, email, phone, property address, checkbox "Vânzătorul a fost de acord să fie contactat", preview of the invitation the seller receives with the partner code already filled in, success state.

6. /partner/clients: one row per client: property, date, stage (cod folosit → programat → agent alocat → efectuat → book gata → comision plătit); when the book is ready: score, verdict summary and "Descarcă book-ul". Agency: all agents' clients with the agent's name and a filter. Section "Clienți pierduți" (cancelled or unpaid).

7. /partner/commissions: conversions, amount to collect, amount paid, invoices. Agency: breakdown per agent and the setting "cine încasează" (agenția / agenții) with a warning if there are unpaid conversions. Agent in agency: own commissions; shown as "încasată de agenție" when the agency collects. Solo: direct, own invoices.

8. /partner/materials: referral link and code ready to send, banners, message templates (WhatsApp, email), book presentation PDF, campaign links per channel (Instagram, TikTok, Facebook), each in RO and EN, with copy and download.

9. /guides and /guides/[slug]: index with filters (city, topic) and article cards; article page with reading layout, table of contents, tables for city comparisons (with source attribution), and a closing CTA to "Verifică o proprietate · 30 lei" or "Programează inspecția · 500 lei". Variant: neighbourhood guide with a mini area summary.

Finish by updating the home partner block to link to /partners, and list every component introduced across all batches.
```

---

## Appendix

### A1 · Demo data (paste with Prompt 0)

Use these values everywhere so all screens tell one story. Mark example content "Date demonstrative" on public pages.

```text
Property #1042
- Str. Gheorghe Lazăr 12, ap. 7, zona Centru, Timișoara
- Apartament, 3 camere, 84 mp utili, etaj 2 din 4, construit 1962, cărămidă, decomandat, 2 balcoane, centrală proprie 2019, termopan, fără loc de parcare
- Listing price: 189.000 € (rent example for other listings: 650 € / lună)
- Owner / seller: D. Popescu, 07xx xxx xxx
- Buyer: Mihai I.
- Inspection: 14 aug 2026, 09:30, inspector Ana M. (legitimație 014), consent signed 09:38
- Inspection score: 8,6 / 10
  Structură 9,2 · Umezeală 9,0 · Electrice 9,5 · Apă & canal 8,8 · Încălzire 9,0 · Tâmplărie 6,7 · Izolație 7,5 · Finisaje 8,3 · Părți comune 8,0 · Acte 9,5 · Siguranță & vecinătate 8,0
- Verdict: "Stare bună, instalații schimbate în 2021, fără umezeală. Tâmplărie de înlocuit la 2 ferestre."
- Online score: 91 / 100
  Educație 96 · Sănătate 92 · Transport 88 · Cumpărături & servicii 94 · Spații verzi 84 · Siguranță & liniște 74
- Nearby: Școala Gen. 30 · 6 min pe jos; Tramvai 1, 2 · 4 min; Parcul Central · 7 min; Spitalul Județean · 12 min; Piața Unirii · 6 min
- Data date: "calculat pe datele din 1 sept 2026, formula v3"
- Generated description: "Apartament cu 3 camere, 84 mp utili, la etajul 2 din 4, într-un imobil din cărămidă construit în 1962, în zona Centru. Inspectat de PropertyScore pe 14 august 2026, cu nota 8,6: instalațiile electrice și sanitare au fost schimbate în 2021, nu s-au găsit urme de umezeală, iar structura este în stare bună. De reținut: tâmplăria de la două ferestre este de înlocuit. La 6 minute de mers pe jos de Piața Unirii, cu școală și grădiniță la sub 500 m și tramvaiul la 4 minute."
- Mortgage example: avans 15%, 30 ani, IRCC 5,9% → ~1.020 € / lună

Partner
- Agenția Casa Bună (agency, collects for its agents), agent Ioana R., commission code IOANA-7K2

Map demo set (Timișoara): 20 listings · 5 verified physically · 7 with online score · 8 without
```

### A2 · Status labels (paste with Prompt 0)

| Group                                | Status (RO)                                                                     | EN                                                                                    | Meaning                                     |
| ------------------------------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------- |
| Appointment                          | programat                                                                       | scheduled                                                                             | booked and paid                             |
|                                      | agent alocat                                                                    | inspector assigned                                                                    |                                             |
|                                      | efectuat                                                                        | completed                                                                             | inspection done, under review               |
|                                      | book gata                                                                       | book ready                                                                            | delivered                                   |
|                                      | anulat                                                                          | cancelled                                                                             |                                             |
| Invitation (buyer → seller)          | link trimis                                                                     | link sent                                                                             |                                             |
|                                      | cont creat                                                                      | account created                                                                       | seller opened the link                      |
|                                      | rezervat · așteaptă plata                                                       | reserved · awaiting payment                                                           | seller chose day and hour                   |
|                                      | plătită                                                                         | paid                                                                                  | becomes "programat" for both                |
|                                      | expirată                                                                        | expired                                                                               | no reservation within the deadline          |
|                                      | anulată                                                                         | cancelled                                                                             | not paid in time, slot released             |
|                                      | refuzată                                                                        | declined                                                                              | seller declined                             |
| Inspection review (admin, inspector) | trimis la review                                                                | submitted                                                                             |                                             |
|                                      | cerere de completare                                                            | changes requested                                                                     |                                             |
|                                      | aprobat                                                                         | approved                                                                              |                                             |
| Online report                        | se generează                                                                    | generating                                                                            |                                             |
|                                      | gata                                                                            | ready                                                                                 |                                             |
|                                      | eșuat                                                                           | failed                                                                                |                                             |
| Listing                              | ciornă                                                                          | draft                                                                                 |                                             |
|                                      | previzualizare privată                                                          | private preview                                                                       | prepared after an inspection, not published |
|                                      | în așteptare                                                                    | pending review                                                                        |                                             |
|                                      | publicat                                                                        | published                                                                             |                                             |
|                                      | respins                                                                         | rejected                                                                              | with reason                                 |
|                                      | retras                                                                          | withdrawn                                                                             |                                             |
| Payment                              | în așteptare                                                                    | pending                                                                               |                                             |
|                                      | plătită                                                                         | paid                                                                                  |                                             |
|                                      | eșuată                                                                          | failed                                                                                |                                             |
|                                      | rambursată / rambursată parțial                                                 | refunded / partially refunded                                                         |                                             |
| Feedback                             | trimis                                                                          | submitted                                                                             |                                             |
|                                      | în analiză                                                                      | in review                                                                             |                                             |
|                                      | rezolvat                                                                        | resolved                                                                              |                                             |
|                                      | închis cu explicație                                                            | closed with explanation                                                               |                                             |
| Partner account                      | în analiză                                                                      | pending                                                                               |                                             |
|                                      | activ                                                                           | active                                                                                |                                             |
|                                      | respins                                                                         | rejected                                                                              |                                             |
|                                      | dezactivat                                                                      | disabled                                                                              |                                             |
| Partner client stage                 | cod folosit → programat → agent alocat → efectuat → book gata → comision plătit | code used → scheduled → inspector assigned → completed → book ready → commission paid |                                             |
| Commission                           | în așteptare                                                                    | pending                                                                               |                                             |
|                                      | câștigat                                                                        | earned                                                                                | inspection done and paid                    |
|                                      | plătit                                                                          | paid                                                                                  |                                             |
|                                      | anulat                                                                          | void                                                                                  |                                             |
| Consultation                         | programată                                                                      | scheduled                                                                             |                                             |
|                                      | efectuată                                                                       | done                                                                                  |                                             |
|                                      | anulată                                                                         | cancelled                                                                             |                                             |
| Product                              | ciornă / publicat / retras                                                      | draft / published / retired                                                           |                                             |

### A3 · Inspection questions (paste with Prompt D)

Draft set (to be validated): 44 questions in 11 categories. Answer on every question: Bine / Acceptabil / Problemă / N/A. In brackets: the required media.

```text
Structură · 15%
01 Fisuri vizibile în pereți portanți, grinzi sau tavane? (foto)
02 Planșee și pardoseli: denivelări, tasări, scârțâit la mers? (video)
03 Balcon / terasă: placa, balustrada, urme de infiltrații? (foto)
04 Tipul și anul structurii corespund cu anunțul (cadre beton, zidărie, panouri)? (foto)

Umezeală · 15%
05 Pete, mucegai sau igrasie pe pereți și tavane? (foto)
06 Umiditate măsurată pe peretele cel mai expus (%, cu aparatul în cadru) (foto + măsurătoare)
07 Miros de umezeală sau mucegai în baie / bucătărie? (răspuns)
08 Urme de infiltrații de la vecini sau acoperiș (tavan, colțuri)? (foto)

Instalații electrice · 12%
09 Tablou electric: siguranțe automate, diferențial, stare generală? (foto)
10 Prize cu împământare, funcționale în toate încăperile (test)? (răspuns)
11 Cabluri vizibile, improvizații, doze deschise? (foto)
12 Contor și branșament: individual, accesibil, în stare bună? (foto)

Apă & canalizare · 10%
13 Presiune și debit la robinete (baie, bucătărie)? (video)
14 Scurgeri sub chiuvete, la WC, la cadă / duș? (foto)
15 Țevi: material (fier / cupru / PPR), coroziune, vechime vizibilă? (foto)
16 Apometre individuale, accesibile, cu sigilii intacte? (foto)

Încălzire & apă caldă · 12%
17 Sursa: centrală proprie / termoficare / sobă; anul centralei de pe plăcuță (foto)
18 Centrala pornește, arde curat, presiunea e în plaja normală? (video)
19 Caloriferele se încălzesc uniform, robineții funcționează? (foto)
20 Verificare ISCIR / revizie centrală în termen? (foto)

Tâmplărie & uși · 8%
21 Ferestre: material, geam termopan, închid etanș? (video)
22 Garnituri, feronerie, condens între foile de geam? (foto)
23 Ușa de intrare: material, încuietori, blindată? (foto)
24 Uși interioare: se închid, praguri, deteriorări? (răspuns)

Izolație & confort · 7%
25 Blocul / casa e reabilitat(ă) termic la exterior? (foto)
26 Zgomot din stradă sau de la vecini cu ferestrele închise? (video)
27 Curent de aer la ferestre / ușă (test cu mâna)? (răspuns)
28 Orientare și lumină naturală în camerele principale? (foto)

Finisaje · 6%
29 Pardoseli: tip, stare, zone deteriorate? (foto)
30 Pereți și tavane: zugrăveală, fisuri superficiale? (foto)
31 Baie: gresie / faianță, obiecte sanitare, ventilație? (foto)
32 Bucătărie: mobilier, electrocasnice incluse, hotă / ventilație? (foto)

Părți comune & exterior · 5%
33 Scară, lift, interfon: stare și funcționare? (video)
34 Acoperiș / terasa blocului, jgheaburi, fațadă (ce se vede)? (foto)
35 Subsol: uscat, fără mirosuri, instalații comune în stare bună? (foto)
36 Parcare, curte, acces, iluminat exterior? (foto)

Acte & context · 5%
37 Suprafața măsurată corespunde cu anunțul (±3%)? (foto)
38 Există certificat energetic; ce clasă? (foto)
39 Restanțe la asociație / utilități, declarate de proprietar? (răspuns)
40 Modificări neautorizate (pereți demolați, balcon închis, spațiu comun ocupat)? (foto)

Siguranță & vecinătate · 5%
41 Ușa de intrare în bloc / poarta: se închide, interfon funcțional, acces controlat? (foto)
42 Iluminat la intrare, pe scară și pe stradă în fața imobilului? (foto)
43 Semne de vandalism, graffiti, geamuri sparte, clădiri abandonate pe stradă? (foto)
44 Asociația / vecinii: incidente în ultimele 12 luni (spargeri, furturi, scandaluri)? (răspuns)

Scoring shown in the app: Bine = 3, Acceptabil = 2, Problemă = 1, N/A excluded. Category score = average × 10 / 3. Final score = weighted average of the categories that have answers.

Presentation photo tour (no score, all 10 required):
T1 Fațadă / intrarea în bloc · T2 Hol și intrare · T3 Living · T4 Bucătărie · T5 Baie · T6 Dormitor 1 · T7 Dormitor 2 / birou · T8 Balcon sau terasă · T9 Vedere de la fereastră · T10 Parcare / curte / părți comune
```
