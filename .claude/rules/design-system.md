---
paths:
  - 'src/**/*.tsx'
  - 'src/**/*.css'
  - 'components.json'
---

# PropertyScore design system

The binding visual language of the app, translated from the Claude Design project "PropertyScore Design System" (export "PropertyScore Website.html", source hash in `.claude/design-cache/design-system/SOURCE_HASH`) into our stack: Tailwind CSS 4 tokens in `src/styles/globals.css`, shadcn/ui primitives, `lucide-react`. Every UI change follows it, whether or not it runs through `/implement`. `.claude/rules/styling.md` still governs how classes are written; this file decides which tokens and components exist and what they mean.

A local, git-ignored copy of the original export lives in `.claude/design-cache/design-system/` (`styles.css` with every component's CSS, `components.js` with the component source, `ui-kits/` with the sample screens, `icons/`). Use it to check exact paddings, states and markup of a component before building it. If it is missing on this machine, ask the user for the export rather than guessing.

## 1. Precedence

| Question | Wins |
| --- | --- |
| Token values, component looks and variants | This file |
| Screen layout, content and flow | The batch design passed to `/implement`, then `IMPLEMENTATION_PLAN.md` §5 |
| A batch design uses a colour, size or component that contradicts this file | This file. Report the difference; change the design system only with the user's approval, and then update this file, `globals.css` and the Claude Design project together |

## 2. Brand in one paragraph

Cream pages, forest-green brand and primary actions, a lime accent used sparingly for the single most important call to action and for the physical-verification mark, slate blue for online analysis, information and focus. Cards are white with a hairline green border and no shadow until hover. Status is always text + icon, never colour alone. Missing data is shown as missing, declared data as declared.

### 2.1 Brand family

One master brand and two product sub-brands that share its symbol and wordmark. The marks come from the Claude Design home export and live once in `src/components/brand/brand-marks.ts` (inline SVG paths, fills from tokens); the wordmark is text in `--font-brand` rendered only by `Logo` ("Property" 600 + boxed "Score" / "Fizic" 800, "Smart" 500 + boxed "Check" 800). `public/favicon.svg` is the one static copy of the core mark:

| Brand | Product | Colour world | Used for |
| --- | --- | --- | --- |
| **PropertyScore** (`core`) | the company and the listings portal | forest + one lime accent | site, account, partner, admin and field shells, footer, auth, invoices, consent PDFs, generic emails, favicon and app icons |
| **Property Fizic** (`physical`) | physical inspection, 500 lei, 0–10 score | forest + lime (`trust-physical*`) | inspection pages, booking wizard, PDF book cover and headers, inspection emails, `ProductTag` on inspection rows |
| **Smart Check** (`smartcheck`) | online report, 30 lei, 0–100 score | slate blue (`info`, `trust-online*`) | `/check` wizard, online report cover and header, online report emails, `ProductTag` on report rows |

The product names follow the Claude Design home export: "PropertyScore", "Property Fizic" and "Smart Check" (two words, capital S and C). They are never translated; their keys live in `common:brand.*` with identical values in `ro` and `en`, so accessible names still go through `t()`, and copy that names a product interpolates the key instead of retyping it. Romanian copy around them stays Romanian ("Raport online Smart Check").

## 3. Tokens

### 3.1 Primitives (`:root` in `globals.css`, prefix `--ps-`; never used directly in components)

| Family | Values |
| --- | --- |
| Cream | 50 `#FBFAF5` · 100 `#F6F5ED` · 200 `#EEECDF` · 300 `#E2DFCC` |
| Green | 50 `#F2F6F0` · 100 `#EAF0E8` · 200 `#CDDCCF` · 300 `#A9C2B0` · 400 `#7A9884` · 500 `#52685B` · 600 `#2E5646` · 700 `#1B4A3C` · 800 `#103F32` (forest) · 900 `#0B3026` |
| Ink | 900 `#172B22` |
| Lime | 100 `#F4F9CF` · 300 `#DDED69` · 500 `#C9DB45` · pressed `#B9CB34` |
| Blue | 50 `#EEF3F5` · 100 `#DDE7EC` · 300 `#9DB4C1` · 500 `#3F6478` · 700 `#2B4756` |
| Red | 50 `#FBEDE8` · 200 `#EDBDAF` · 600 `#A63A24` · 700 `#862C1A` |
| Amber | 50 `#FDF4DC` · 200 `#EED18A` · 400 `#E2AE3A` · 700 `#7A5200` |
| Teal | 50 `#E6F2EA` · 200 `#B4D6BF` · 600 `#24704A` |
| Grey | 100 `#ECEDE8` · 300 `#C9CEC6` · 500 `#7F8B83` |
| Other | white `#FFFFFF` · scrim `rgba(11,48,38,.5)` · on-inverse muted `#C6D6CB` · placeholder `#7D8E83` · green highlight `#E4F0D2` · green subtle `#E1E8DE` (`--ps-green-subtle`) · blue 800 `#223B49` |
| Home design tints (copied from the home export) | blue 600 `#2F5164` · green 350 `#9FB9A6` · green 650 `#3B5847` · green deep `#0B3428` · ink strong `#38513F` · ink soft `#425E4B` · ink faint `#6B7B6D` · on-inverse soft `#D8E6DC` · on-inverse faint `#B9CCC0` · on-inverse bright `#EAF2EC` · on-info soft `#E3ECF1` · leaf 75 `#EEF3E4` · leaf 90 `#E4EFD6` · green 250 `#B9CDBB` · cream scene `#F3F4ED` · cream chip `#F3F2EA` · aqua 75 `#D8EFEC` · aqua 650 `#0F6B61` · aqua 700 `#0F4D47` · amber 800 `#8A4B18` · safety soft `#7FD1B9` / `#F2A48E` · photo note `rgba(255,253,241,.875)` |
| Category hues (rule 15, approved with the home design) | sky 50 `#EDF6FC` · 100 `#D4EAF8` · 300 `#8CC6EC` · 600 `#1F6B9A` · 800 `#123F5E`; coral `#FDF1EC` · `#FADCCF` · `#F2A184` · `#9E4A22` · `#6E2A16`; sun `#FFF8DC` · `#FDEBA6` · `#F6C93E` · `#7E5F00` · `#4E3A00`; berry `#F9EFF5` · `#F0D7E7` · `#D69AC2` · `#8A356F` · `#561F45`; leaf `#F0F7E7` · `#DCEDC6` · `#A3D06F` · `#3F6E1B` · `#2B4A10`; aqua (the design's "teal", renamed to keep the status teal apart) `#E9F5F3` · `#CBE7E3` · `#7CC4BB` · `#1C6B67` · `#0F4341`; slate (publish page step hue, the accents file's own scale, close to blue) 50 `#EEF3F6` · 100 `#DCE6EC` · 300 `#9DB6C4` · 600 `#3F6478` · 700 `#2F5164` · 800 `#223B49` |
| Auth page tints | on photo `#E3EEE6` · on photo faint `#D5E8D9` · social: Google mark red `#EA4335` · blue `#4285F4` · yellow `#FBBC05` · green `#34A853` |
| Map tints (`--ps-map-*`, the vector map restyle) | land `#EDF0E9` · park `#CCE3BB` · block `#D9DED5` · block edge `#CBD2C8` · road edge `#D6DBD3` · tree `#BFD4AE` · label `#748273` · outside `#ECEBE4` (land outside Romania on `/listings`); water `#C9D8E1` (`--ps-water`) |
| Publish page tints | green hairline `#E4EAE3` · green ghost `#DCE7DE` · green mist `#C9D9CF` · green on lime `#2E5A48` · green declared `#B9C9BD` · slate mist `#DCE7EE` · slate chip `#E2EAF0` |

### 3.2 Semantic colours (CSS variables in `:root`, exposed to Tailwind in `@theme inline` as `--color-<name>`)

shadcn names keep their meaning so the primitives in `src/components/ui/` work unchanged:

| Token | Value | Use |
| --- | --- | --- |
| `background` | cream 100 | page |
| `foreground` | ink 900 | body text |
| `card`, `popover` / `-foreground` | white / ink 900 | cards, menus, dialogs |
| `primary` / `primary-foreground` | green 800 / white | primary buttons, selected states, brand |
| `secondary` / `secondary-foreground` | green 100 / green 800 | soft buttons, selected-soft |
| `muted` / `muted-foreground` | cream 200 / green 500 | sunken surfaces, secondary text |
| `accent` / `accent-foreground` | green 100 / green 800 | hover and highlighted rows in menus and lists |
| `destructive` | red 600 | errors, danger buttons |
| `border`, `input` | green 200 | default borders and inputs |
| `ring` | blue 500 | focus ring |
| `chart-1…5` | green 800 · blue 500 · lime 500 · amber 400 · green 400 | charts |
| `sidebar*` | forest surface (green 800), white 80% text, `sidebar-border` white 12% (right edge), `sidebar-primary` / `-primary-foreground` white / green 800 (active item), `sidebar-accent` white 8% hover, lime 300 ring; `sidebar-control` / `-control-hover` white 6% / 12% (collapse toggle), `sidebar-group` white 42% (group titles), `sidebar-icon-tile` / `sidebar-icon` white 8% / white 80% (item icon tiles), `sidebar-icon-tile-active` / `sidebar-icon-active` green 800 / lime 300 (active icon tile), `sidebar-band` white (active edge band); `sidebar-muted` white 72% ("Înapoi la site"), `sidebar-divider` white 10% (footer rule), `sidebar-count` / `-count-foreground` lime 300 / green 800 (nav counts) | account and admin sidebars (layout of variant 1b of the Sidebar Variante export on the forest surface, with a white active item, at the user's request) |

PropertyScore additions:

| Token (Tailwind name) | Value | Use |
| --- | --- | --- |
| `primary-hover`, `primary-pressed` | green 700, green 900 | button states |
| `cta`, `cta-hover`, `cta-pressed`, `cta-foreground` | lime 300, lime 500, `#B9CB34`, green 800 | the one accent call to action per screen ("Verifică proprietatea · 30 lei") |
| `brand` | green 800 | brand text, links, active nav |
| `link-hover` | green 600 | link hover |
| `surface-alt` | green 100 | alternating sections ("mist") |
| `surface-sunken` | cream 200 | wells, notes, empty slots |
| `surface-subtle` | cream 50 | panel footers |
| `surface-highlight` | green 50 | highlighted rows and soft selected fills |
| `surface-inverse` / `on-inverse` / `on-inverse-muted` | green 800 / white / `#C6D6CB` | forest sections, physical score panel head, footer |
| `border-strong`, `border-subtle` | green 400, green subtle | hover borders, inner dividers |
| `info`, `info-surface`, `info-border` | blue 500, blue 50, blue 100 | information, online analysis |
| `success`, `success-surface`, `success-border` | teal 600, teal 50, teal 200 | success |
| `warning`, `warning-surface`, `warning-border`, `warning-fill` | amber 700, amber 50, amber 200, amber 400 | warnings, attention |
| `error-surface`, `error-border` | red 50, red 200 | error backgrounds (text uses `destructive`) |
| `trust-physical`, `trust-physical-foreground`, `trust-physical-mark` | green 800, white, lime 300 | "Verificat de PropertyScore" |
| `trust-online`, `trust-online-foreground`, `trust-online-border`, `trust-online-score` | blue 50, blue 700, blue 300, blue 500 | online score |
| `trust-none-foreground`, `trust-none-border` | green 500, green 300 | "Fără raport PropertyScore" (dashed) |
| `data-declared`, `data-missing` | amber 700, green 500 | "declarat", "fără date" |
| `answer-good`, `answer-ok`, `answer-problem`, `answer-na` | teal 600, amber 700, red 600, green 500 | inspection tiers Bine / Acceptabil / Problemă / N/A |
| `disabled`, `disabled-border`, `disabled-foreground` | grey 100, grey 300, grey 500 | disabled controls |
| `scrim` | scrim | dialog and drawer overlay |
| `focus-inverse` | lime 300 | focus ring on forest surfaces |
| `brand-highlight` | `#E4F0D2` | the boxed "Score" in the PropertyScore wordmark |
| `surface-online-inverse` | blue 800 `#223B49` | dark online sections (SmartCheck map band) |
| `on-info-muted` | `#DCE6EC` | secondary text on `info` fills |
| `info-hover`, `info-foreground` | blue 700, white | filled SmartCheck buttons and surfaces |
| `map-safety-up`, `map-safety-down`, `map-water` | `#2E9C82`, `#D0583C`, `#C9D8E1` | safety factors and water on maps |
| `info-ink`, `info-ink-muted` | blue 800, blue 600 | SmartCheck text on light surfaces |
| `ink-strong`, `ink-soft`, `ink-faint` | the three ink tints above | Property Fizic body text, intros, small notes |
| `nav-link`, `border-control` | green 650, green 350 | header links; outlined controls and the menu button |
| `primary-deep`, `on-inverse-soft`, `on-inverse-faint`, `on-inverse-bright`, `on-info-soft` | as above | price-box footers and text on forest / blue |
| `surface-leaf`, `surface-physical-col`, `surface-scene`, `surface-subtle-warm`, `surface-aqua`, `faq-line` | as above | chips, comparison column, explorer scene, fact chips, consultation, FAQ rules |
| `aqua-ink`, `aqua-strong`, `status-attention`, `map-safety-*-soft`, `photo-note` | as above | consultation text, "De clarificat" status, safety factor circles, photo captions |
| `category-<key>`, `-surface`, `-fill` | 600 / 100 / 300 of the category hues | keys `education` (sky), `health` (coral), `transport` (sun), `shopping` (berry), `green` (leaf), `safety` (aqua), `city` (blue) |
| `category-health-strong`, `category-transport-strong` | coral 800, sun 800 | text on the health and transport category surfaces where the 600 step is too light |
| `map-land`, `map-park`, `map-block`, `map-block-edge`, `map-road-edge`, `map-tree`, `map-label` | the map tints above | the restyled vector map (read at runtime by `MapCanvas` through `getComputedStyle`) |
| `step-<hue>-soft`, `-surface`, `-solid`, `-ink` | 50 / 100 / 600 / 800 of `slate`, `coral`, `berry`, `sky`, `leaf`, `aqua` | the six steps of the publish page (icon tiles, active step, step panel), eyebrow chips and pin badges |
| `on-photo`, `on-photo-faint`, `google-red/blue/yellow/green` | as above | text on the auth photo panel; the Google mark on the sign-in button (never used outside it) |
| `on-inverse-mist`, `on-info-mist`, `on-cta-soft`, `zone-chip`, `border-declared` | green mist, slate mist, green on lime, slate chip, green declared | secondary text on forest, slate and lime cards; the zone score chip; the dashed "declared" chip on the publish page |
| `border-hairline`, `number-ghost`, `heading-accent` | green hairline, green ghost, green 600 | panel and step-card borders, the large ghost step numbers, the second line of two-line section titles on the publish page |
| `surface-selected`, `photo-overlay` | leaf 50, ink 900 62% | the selected row of the moderation queue; the "+N poze" overlay of `PhotoMosaic` |
| `map-outside`, `map-edge`, `map-count` | `#ECEBE4`, green 250, coral 600 | the land outside Romania on the listings map, the line under the map, the "N locuințe afișate" pill (the Locuințe v2 export) |

Contrast notes from the source: red 600 is 5.9:1, amber 700 6.2:1 and teal 600 5.4:1 on cream; keep text colours to these tokens.

### 3.3 Dark theme

The design system ships light only, and so does the app: `globals.css` has no `.dark` block and no `dark` custom variant, and components carry no `dark:` classes (the shadcn primitives had theirs removed). When a dark design is approved, every semantic token above gets its dark value in one change (decision D14).

### 3.4 Typography

- **Font family:** `--font-sans` Manrope Variable for body, UI and every heading (`--font-heading` points to the same family: the home design sets all titles in its body font), `--font-brand` Sora Variable (only inside the brand components), self-hosted with only the `latin` and `latin-ext` subsets (Manrope through two `@font-face` rules in `globals.css` pointing at the `@fontsource-variable/manrope` files; Sora ships only those two subsets). Bricolage Grotesque is not used. Mono: `Consolas, "SFMono-Regular", Menlo, monospace`, only for IDs and hashes.
- **Weights:** 400 regular, 600 semibold, 700 bold, 800 heavy (headings, prices, scores); design-export weights as tokens: `font-nav` 670 (header links), `font-control` 730 (auth buttons and controls), `font-title` 740 (section and card titles), `font-action` 750 (header account link), `font-display` 760 (hero and status titles).
- **Roles** (Tailwind `--text-<role>` with `--text-<role>--line-height`, and matching `--tracking-<role>`):

| Class | Size | Line height | Tracking | Weight |
| --- | --- | --- | --- | --- |
| `text-display` | `clamp(40px, 4.6vw, 68px)` | 1.04 | -0.047em | 760 (home hero) |
| `text-section` | `clamp(34px, 4vw, 58px)` | 1.12 | -0.035em | 740 (section titles on public pages) |
| `text-section-sm` | `clamp(35px, 3.5vw, 51px)` | 1.12 | -0.04em | 740 (Property Fizic section title) |
| `text-band` | `clamp(32px, 3.6vw, 50px)` | 1.02 | -0.04em | 800 (titles on dark bands) |
| `text-intro` | 21px | 1.55 | — | 400 (section intros) |
| `text-lead-sm` | 17px | 1.6 | — | 400 |
| `text-service` | 13.5px | 1.55 | — | 400 (service card copy) |
| `text-price-card`, `text-price-box` | 30px, 34px | 1 | -0.04em | 800 |
| `text-score-2xl` | 72px | 1 | -0.05em | 800 |
| `text-nav-sm` | 11px | — | — | small labels copied from the design |
| `text-status` | 12.5px | 1.55 | — | 700, `StatusPill` tag shape |
| `text-h1` | `clamp(34px, 4vw, 48px)` | 1.08 | -0.03em | 800 |
| `text-h2` | `clamp(28px, 3vw, 40px)` | 1.08 | -0.025em | 800 |
| `text-h3` | 24px | 1.2 | -0.015em | 700 |
| `text-h4` | 19px | 1.3 | — | 700 |
| `text-lead` | 19px | 1.55 | — | 400, `muted-foreground` |
| `text-body` | 16px | 1.55 | — | 400 |
| `text-small` | 14px | 1.5 | — | 400 |
| `text-caption` | 13px | 1.45 | — | 400, `muted-foreground` |
| `text-meta` | 12px | 1.4 | — | 400–600, `muted-foreground` |
| `text-label` | 15px | 1.35 | — | 600 |
| `text-price` | 28px (sm 20px, lg `clamp(28px, 4vw, 40px)`) | 1.1 | -0.02em | 800, tabular |
| `text-score` | 44px (sm 20, md 32, xl 64) | 1 | -0.03em | 800, tabular |
| `text-eyebrow` | 13px | 1.3 | 0.06em | 700, uppercase, `muted-foreground` |
| `text-micro` | 10px | — | — | photo captions, map notes, tiny chips copied from the designs |
| `text-body-sm` | 15px | — | — | 15px copy and controls whose line height and weight the design sets separately (`text-label` is 15px but carries 1.35 and 600) |
| `text-title-xs`, `text-title-sm`, `text-title-md`, `text-title-lg` | 21, 28, 32, 40px | — | — | card titles, figures and big prices copied from the designs; pair with `leading-*` / `tracking-*` |
| `text-logo-2xs/inline/xs/sm/md/card/bundle/lg/xl` | 12.5 / 14 / 15 / 19 / 22 / 24 / 26 / 30 / 34px | 1 | `tracking-brand` −0.04em | brand components only |

- **Line heights and tracking** (Tailwind `--leading-*`, `--tracking-*`): `leading-copy` 1.55, `leading-compact` 1.45, `leading-heading` 1.12 (publish section titles); `tracking-title` −0.04em, `tracking-section` −0.035em, `tracking-eyebrow` 0.06em (uppercase eyebrows), `tracking-label` 0.08em (small uppercase labels: area label, role label, consultation and publish chips), `tracking-brand` −0.04em (brand components only).
- The size-only tokens above (`text-micro`, `text-body-sm`, `text-title-*`) set no line height, so the surrounding or explicit `leading-*` applies. Every `--text-*` token is registered with the class merger in `src/lib/utils.ts` (`FONT_SIZES`, checked against this file's CSS by `utils.test.ts`), as are the custom weights, line heights, tracking and radii.

Numbers in prices, scores, tables and counters use `tabular-nums`. Body text never goes below 16px in the comfortable density.

### 3.5 Space, radius, shadow, motion, layers

- **Space:** 4px base, which is Tailwind's default scale (`1` = 4px … `12` = 48px, `16` = 64px, `20` = 80px, `24` = 96px, `32` = 128px).
- **Radius** (set explicitly in `@theme inline`, replacing shadcn's computed radii): `rounded-sm` 4px tags · `rounded-md` 8px controls and buttons · `rounded-lg` 11px cards, service cards, listboxes · `rounded-xl` 17px media, listing cards, maps · `rounded-2xl` 24px hero panels · `rounded-full` badges, chips, pills.
- **Shadow** (forest-tinted, restrained): `shadow-sm` `0 1px 2px rgba(16,63,50,.06)` · `shadow-md` `0 10px 28px -16px rgba(16,63,50,.28)` (card hover, popovers) · `shadow-lg` `0 24px 56px -24px rgba(16,63,50,.38)` (dialogs). The home design adds named shadows copied from it: `shadow-header`, `-service`, `-photo`, `-float`, `-info`, `-tile`, `-tile-sm`, `-explorer`, `-pin`, `-bundle`, `-plus`, `-shell`, `-tab`, `-sample`, `-calculator`, `-link-card`, `-listing-selected`, `-aqua`, `-price`; the Admin export adds `shadow-segment` `0 1px 3px rgba(16,63,50,.12)` (selected pill tab); the panel sidebar adds `shadow-sidebar` `8px 0 32px -12px rgba(16,63,50,.22)` (raised above the sticky header with `z-101` so the shadow falls on it too) and the panel header from `md` the same shadow downwards, `shadow-panel-header` `0 8px 32px -12px rgba(16,63,50,.22)`; the publish page adds `shadow-listing-hero`, `-progress`, `-published`, `-heart`, `-panel`, `-preview`, `-step`, `-step-active`, `-card-soft`, `-tier-photo`, `-tier-online`, `-tier-physical`, `-tier-chip` (values in `globals.css`); the Locuințe v2 export adds `shadow-map-bar`, `-map-control`, `-map-count`, `-map-toggle`, `-map-popup`, `-map-sheet`, `-cluster`, `-pin-tag`, `-pin-tag-active`, `-pin-tag-selected` and `-card-hover`.
- **Extra radii from the home design:** `rounded-note` 7px, `rounded-thumb` 10px (listing and checklist thumbnails), `rounded-icon` 12px, `rounded-float` 13px, `rounded-tile` 14px (listing rows, calculator and step tiles), `rounded-photo` 20px, `rounded-panel` 19px (explorer and zone panels); the auth design adds `rounded-status` 18px (status cards); the wordmark box uses `rounded-wordmark` `0.24em 0.24em 0.24em 0.06em`.
- **Brand and layout spacing:** `px-wordmark-x` 0.3em, `pt-wordmark-top` 0.15em, `pb-wordmark-bottom` 0.1em, `gap-wordmark-gap` 0.14em (the boxed wordmark part); `h-header` / `min-h-header` (`--header-height`), `min-h-touch` (`--touch-min`), `h-control` (`--control-height`) follow the density.
- **Utilities in `globals.css`:** `page-wrap` (§3.6), `marker-cta`, `marker-info`, `marker-under` (lime underline as an inset shadow), `marker-underline` (forest text with a real 0.18em lime underline, the publish steps title) and `marker-pill` (lime pill behind the words, radius 10px, the publish hero title) for heading highlights, `scrollbar-inverse` (thin translucent scrollbar on forest panels), `scrollbar-none` (hidden scrollbar on horizontally scrolling tab rows), and `touch-target` (§5 rule 8).
- **Motion:** durations `--duration-instant` 90ms, `--duration-fast` 160ms, `--duration-base` 240ms, `--duration-slow` 420ms, `--duration-scene` 640ms (used as `duration-(--duration-fast)`); easings `ease-standard` `cubic-bezier(.2,.7,.2,1)` and `ease-exit` `cubic-bezier(.4,0,1,1)`. Everything collapses to 1ms under `prefers-reduced-motion`.
- **Icons:** sizes 16, 20 (default), 24, 32 → `size-4`, `size-5`, `size-6`, `size-8`; 18px (`size-4.5`) where a Claude Design export draws it (panel sidebar and user menu, home, publish and report icons).
- **Layers:** base 0 · raised 10 · sticky header 100 · map overlay 200 · drawer 300 · dialog 400 · toast 500.

### 3.6 Layout

- Containers: `max-w-narrow` 760px (reports, forms), `max-w-default` 1180px, `max-w-wide` 1360px, with gutter `px-gutter` `clamp(20px, 4vw, 40px)`. Public pages use the design's `page-wrap` utility instead: `min(1360px, 100% - 64px)` wide, `min(100% - 36px, 650px)` at 820px and below, `100% - 30px` at 520px and below. Paragraphs copied from the design are capped at `max-w-copy` (68ch).
- Public-site breakpoints follow the home design, as max-width steps turned into Tailwind variants: `w480` 481, `w520` 521, `w560` 561, `w760` 761, `w767` 768, `w820` 821, `w860` 861, `w900` 901, `w920` 921, `w960` 961, `w1059` 1060, `w1080` 1081, `w1180` 1181 (`w767` and `w1059` are the publish page's `mobile` and `narrow` switches; `w920` is where the auth split screen stops stacking). The `short:` variant (`max-height: 640px` and `min-width: 921px`) tightens the auth column on low screens (each `wNNN:` applies above NNN px; `max-wNNN:` at NNN px and below). App shells keep `sm`/`md`/`lg`/`xl`.
- Section spacing on public pages: `py-section` `clamp(64px, 9vw, 112px)`.
- 12-column grid, 24px gap.
- Header height (`h-header`): 76px comfortable, 60px compact, 56px field. The public site header is full width (20px side padding), white, with a `border` bottom line and `shadow-header`; menu button, logo, the six section links (a second full-width row below 960px, a 4-column grid below 820px), then sign-in, "Publică anunț gratuit" (from 560px), Smart Check (from 560px) and Property Fizic buttons at 36px; no language switch in the bar (it lives in the menu drawer); while scrolling, the section link whose section top has passed 120px is shown active (forest, 800, 2px underline offset 6px; the last link at the page end), and a 2px forest bar on the header's bottom edge grows with the page scroll (`--page-progress`, off under reduced motion); app shells collapse below `md`; other source breakpoints (960, 860, 720, 640, 560, 420) map to the nearest Tailwind breakpoint (`lg`, `md`, `sm`), mobile first.

### 3.7 Density modes

Set `data-density` on the zone shell; components read the variables, so the same component adapts:

| Density | Where | Control height | Padding x | Control font | Card padding | Touch min | Body |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `comfortable` (default) | public site, wizards | 44px (sm 36, lg 52) | 18px | 16px | 24px | 44px | 16px |
| `compact` | `/account`, `/partner`, `/admin` | 40px | 14px | 15px | 18px | 44px | 15px (h3 20, h4 17) |
| `field` | `/field` (inspector PWA) | 56px | 20px | 17px | 18px | 48px | 17px |

Also per density: table row 52 / 44 / 52px, stack gap 16 / 12 / 14px. Variables: `--control-height`, `--control-padding-x`, `--control-font-size`, `--card-padding`, `--touch-min`, `--header-height`, `--table-row-height`, `--stack-gap`.

## 4. Component catalogue

Build each component the first time a step needs it, at the location below, with the listed variants. Check the original in `.claude/design-cache/design-system/` before building. Shared components (used by more than one feature) live in `src/components/<group>/`; components that only one feature uses live in that feature.

A row's notes, including the variants marked built, describe the component as specified; whether it exists is decided by the file system. Check the file before importing and build it from its row when a feature needs it.

| Design system component | Our implementation | Variants and notes |
| --- | --- | --- |
| **brand** | | |
| Logo | `components/brand/logo.tsx` | `product` `core` · `physical` · `smartcheck`; `tone` `color` · `inverse` (the `layout` and `mono-*` tones are not built yet); `surface` `default` · `accent` (Physical on a lime card: forest box with lime "Fizic"); `typeface` `brand` (Sora, default) · `body`; `hasMark`; sizes by wordmark font size with the mark beside it: `2xs` 12.5px (mark 18) · `inline` 14 (20) · `xs` 15 (20) · `sm` 19 (28) · `md` 22 (34, default) · `card` 24 (34) · `bundle` 26 (34) · `lg` 30 (44) · `xl` 34 (52); inline SVG paths with fills from tokens (`fill-brand`, `fill-trust-physical-mark`, `fill-info`, `fill-on-inverse`), never hex; accessible name from `t('common:brand.<product>')`, `aria-hidden` when a visible name repeats it; links to home only inside `SiteHeader` |
| BrandMark | `components/brand/brand-mark.tsx` | symbol only, same `product` and `tone` (`color`, `inverse`); sizes 16 · 18 · 20 · 22 · 24 · 28 · 32 (default) · 34 · 40 · 44 · 48 · 52 · 64 px; decorative by default; the `pulse` loading variant is not built yet |
| ProductTag | `components/brand/product-tag.tsx` on shadcn `badge` | `physical` (forest world, lime mark) · `smartcheck` (blue 50, blue 700 text, blue mark); with the product mark; for product names in cards, checkout lines, report and book headers, account and admin rows |
| GoogleMark | `components/brand/google-mark.tsx` | the official Google mark for the sign-in button, inline SVG with fills from the `google-*` tokens, always `aria-hidden`; the one approved exception to lucide-only icons; sign-in offers only Google (the Login design's Facebook button was dropped on the owner's request on 2026-11-04) |
| Static brand files | `public/brand/` | `favicon.svg`, `favicon.ico`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `og-core.png`, `og-physical.png`, `og-smartcheck.png`, `email-header-<product>.png`; exported names from Prompt L (`ps-<product>-<layout>-<tone>.svg`) become paths in the components above, not files under `public/` |
| **actions** | | |
| Button | `components/ui/button.tsx` (shadcn, extend its `cva`) | `default` (primary forest) · `cta` (lime) · `info` (filled blue, SmartCheck actions) · `outline` (white, forest border = DS secondary) · `ghost` · `destructive` (danger) · `inverse` (white on forest) · `inverseInfo` (white with blue text on blue cards) · `outlineInverse` (transparent, 1.5px white/50 border, white text on forest); `shape` `default` · `pill`; sizes `sm` 36, `md` 40 (700, 18px icons: the Admin export's panel buttons), `nav` 36 (header actions, with `touch-target`), `default` 44, `lg` 52, `xl` 54 (46 on short screens, 15px, weight 730: auth submit and social buttons), `icon`; optional price pill (`rounded-full`, 16% white on dark, 10% forest on light); `loading` shows a spinner and sets `aria-busy`; press moves 1px down |
| IconButton | `Button` with `size="icon"` | variants ghost, outline, default, `overlay` (white 94% + `shadow-sm`, on photos); `round` shape; pressed favourite turns `destructive` |
| TextLink | `components/navigation/text-link.tsx` on the router `Link` (`createLink`, takes every `Link` prop) | bold link, underline (offset 4px) on hover, 3px focus ring; `tone` `brand` (default, hover `link-hover`, `ring` focus) · `inverse` (white on forest, `focus-inverse` ring); `size` `sm` 14px (default) · `md` 16px · `inherit` |
| PillLink | `components/navigation/pill-link.tsx` on the router `Link` (`createLink`) | the rounded-full call-to-action link with a trailing round `ArrowRight` bubble; `tone` `forest` (forest pill, lime bubble; light surfaces) · `cta` (lime pill, forest bubble; forest surfaces) · `info` (blue pill, white bubble) · `inverse` (white pill, blue text, blue bubble; blue surfaces) · `inverseAccent` (white pill, blue text, lime bubble; blue surfaces); `size` `sm` (40px, bubble 28) · `md` (50px, bubble 36, default); 800 weight; 3px focus ring with 2px offset in the surface colour; `touch-target` |
| Icon | `lucide-react` directly | DS icon `i_tram_front` = `TramFront`; no wrapper, no second set |
| **feedback** | | |
| Dialog | shadcn `dialog` | width 520 default; becomes a bottom sheet on mobile (`sheet`) via shadcn `drawer`/`sheet` |
| Drawer | shadcn `sheet` | sides right (default, 420px), left, bottom |
| ConfirmDialog | `components/feedback/confirm-dialog.tsx` on shadcn `alert-dialog` | every "are you sure?" step (sign-out, account deletion, later deleting a listing or cancelling an appointment); the caller passes `title`, `description`, `confirmLabel`, optional `pendingLabel`, `cancelLabel` (default `common:actions.cancel`), `confirmIcon` and `trigger`; `tone` `default` · `destructive`; the confirm button either calls `onConfirm` or submits the form named by `formId` (a confirmation that needs input passes the form as `children`); while `isPending` the dialog cannot be closed and the button shows the pending label; no close button and no closing on an outside click; never build a confirmation from `Dialog` by hand |
| ExampleLabel | `components/feedback/example-label.tsx` | tones `light`, `dark`; marks example and illustrative content ("Exemplu", "Valori de exemplu", "Imagine ilustrativă") |
| EmptyState | `components/layout/empty-state.tsx` | kinds `empty`, `error`, `offline`, `pending`, `insufficient`; icon, title, text, actions; `variant` `default` (dashed, sunken, icon) · `card` (the Locuințe v2 export: white card, solid `border`, `rounded-xl`, padding 40/24, no icon, title 20/700, description 13px) |
| SettingsSection | `components/layout/settings-section.tsx` | one card of a settings or profile page: white card with a 1px `border` (`tone="danger"`: `error-border`), `rounded-lg`, `--card-padding`; `title` (an `h2` that names the section for screen readers, `text-title-xs` 740), `description` (`text-body` `muted-foreground`, capped at `max-w-copy`) and the section's form or actions as `children`; used by the phone, password and account deletion sections of `/account/settings` |
| Notice | `components/ui/alert.tsx` (shadcn, `tone` cva: `neutral` default · `info` · `success` · `warning` · `error`; `info` and `success` get `role="status"`, the others `alert`) with `AlertTitle` / `AlertDescription` | optional title, actions, dismiss; the auth screens wrap it in `AuthNotice` |
| Skeleton | shadcn `skeleton` | lines, radius |
| StatusPill | `components/feedback/status-pill.tsx` | tones `success`, `warning`, `error`, `info`, `neutral` built (`brand` not yet); `shape` `pill` (default, bordered, `text-meta`) · `tag` (the Admin export's PS Status: 24px, `rounded-sm`, padding 2/9, `text-status` 12.5/700, no border); optional `icon` replaces the tone icon (moderation statuses: inbox, circle-check, undo-2, ban); label = translated status from the state machines |
| InlineToast | `components/feedback/inline-toast.tsx` | the Admin export's inline toast inside a panel column: `bg-foreground` (ink 900), white 15px text, `rounded-lg`, padding 12/12/12/16, `shadow-lg`, 20px icon (`success` lime circle-check, `error` circle-x); `role="status"` / `"alert"`; floating notifications stay `sonner` |
| Toast | `sonner` through `components/ui/sonner.tsx` (`unstyled` toasts styled with tokens, one `<Toaster />` in `app.tsx`) | looks like the `Alert` notice: white card, 1px `border`, `rounded-lg`, `shadow-md`, 16px padding, title `text-label`, description `text-small` `muted-foreground`; tones `success`, `info`, `warning`, `error` take the matching `*-surface` and `*-border` with a 20px lucide icon in the tone colour (loading: spinning `Loader2` in `brand`); optional action (`Button` `sm`) and cancel (`outline` `sm`); bottom right, 24px from the edges (16px on mobile); region and close labels translated (`common:toasts.region`, `common:actions.close`); call only `toast.success` / `.error` / `.info` / `.warning`, never pass inline styles or classes |
| **forms** | | |
| TextField | shadcn `field` + `input` (+ input group for prefix/suffix/icon) | label (15/600), "opțional" tag, hint, error and success messages with icon; `lg` size 60px; textarea variant (`components/ui/textarea.tsx`: density control font and padding, `rounded-md`, `border-border`, min height 96px); 1.5px border, focus border forest + 3px blue 28% halo |
| Select | shadcn `select` (`components/ui/select.tsx`) | the one dropdown for choosing a value (never a native `<select>` or a hand-built list); trigger at the density control height and font, `rounded-md`, `border-border`, `bg-card`, chevron in brand colour; the list opens below the trigger (`position="popper"`, 4px gap, at least the trigger width, at most 320px tall) with the shared menu look |
| Menu look | `components/ui/menu-classes.ts`, used by `select.tsx` and `dropdown-menu.tsx` | one look for every dropdown (Select lists, `UserMenu`, `LanguageSwitcher` menu): white `popover` panel, 1px `border`, `rounded-lg`, padding 6, `shadow-md`, layer 400; items 44px, padding 0 12, `rounded-md`, 15px (`text-body-sm`) with 18px icons and 10px gap, `accent` highlight; the chosen option of a Select or radio menu is bold `text-brand` with an 18px brand check on the right; labels 12/600 `muted-foreground`, separators `border-subtle`; change the look only in `menu-classes.ts` |
| Checkbox | `components/ui/checkbox.tsx` (shadcn, added with the auth design) | 22px box, 5px radius, 1.5px `border-strong` border, forest when checked, optional description |
| RadioGroup | shadcn `radio-group` | `list` and `cards` (cards: 11px radius, checked = forest border + green 50 fill) |
| Switch | shadcn `switch` | 46×28 track, forest when on, optional state text |
| AddressAutocomplete | `components/forms/address-autocomplete.tsx` on shadcn `command` + `popover` | large 60px field, highlighted match in suggestions, footnote about pasting a listing link, out-of-coverage state |
| SlotPicker | `components/forms/slot-picker.tsx` | day tiles (dow / day / month) and time tiles, selected = forest fill, unavailable = dashed + line-through, empty-day text |
| **inspection** (feature `field-inspection`) | | |
| ConsentSection | `features/field-inspection/components/consent-section.tsx` | numbered, collapsible, version tag, required checkbox, checked state |
| InspectionProgress | `features/field-inspection/components/inspection-progress.tsx` | sticky; answered/total, photos, videos, tour x/10, missing media |
| QuestionCard | `features/field-inspection/components/question-card.tsx` | four answer buttons coloured by `answer-*`, photo/video requirement (`none`, `optional`, `required`), counts, note |
| SyncStatus | `features/field-inspection/components/sync-status.tsx` | `online`, `syncing`, `offline`, `error`, pending count, last sync |
| **map** | | |
| LazyMapCanvas | `components/map/lazy-map-canvas.tsx` | the only way features render a map: lazy-loads `MapCanvas`, mounts it only when its placeholder is within 400px of the viewport (immediately without `IntersectionObserver`), shows a `Skeleton` (`fallbackClassName`) until then and while the chunk loads, and renders `errorFallback` when the chunk fails (error boundary) or the map reports an error |
| MapCanvas, MapPin, MapCluster, MapLegend, MapPopup | `components/map/*` on `maplibre-gl` with OpenFreeMap tiles (`MapCanvas` is created once and relabels its controls on language change; overlays stay in sync with their data; `focus` is `{ position, requestId }` so the same place can be re-centred; optional `onPick(position)` reports the clicked point, used by the listing pin field; optional `onViewportChange({ bounds, zoom })` after every move and once when the style is ready; `boundsRequestId` refits `bounds` again when it changes ("Arată toate locuințele"); `hidesPointsOfInterest` hides the style's `poi*` icon layers; `isScrollZoomEnabled` for full-page maps (off by default so section maps do not catch the page scroll); `hasNavigationControl` (default on) hides MapLibre's zoom buttons when the page draws its own; `ref` gives a `MapCanvasController` (`zoomIn`, `zoomOut`, `fitBounds`); `focus.zoom` flies there in 800ms; `boundsPadding` (default 48); markers can be `isRaised` above the others (popups); `regions` `{ outline, areas, selectedId, onSelect }` (`use-map-regions.ts`) covers everything outside the outline in `map-outside` with the sea redrawn from the style's water layer, a 2.2px forest border, areas filled forest at `0.06 + 0.26 × weight` below zoom 8.5 with 0.9/0.5px lines, a 2px hover outline with a tooltip (the area label), a 2.6px outline for the selected area (the others unstroked) and `onSelect` on a click below zoom 8.5; `clusters` `{ points, renderPoint, renderCluster }` groups points with MapLibre's GeoJSON clustering (radius 64, up to zoom 15) and draws DOM markers only for what is in view: `renderPoint(id)` for single points, `renderCluster({ count, onExpand })` for groups, `onExpand` zooming to the group) | pins: `physical` (forest fill, white text), `online` (blue 500 fill, white text), `none` (white, green 300 border), `brand` (forest fill, white text and border, for maps without trust kinds such as `/listings`); `shape` `pill` (default, home board) · `tag` (the Locuințe v2 pin: padding 6/12, 14/800, a 3px white ring with `shadow-pin-tag`, a 12px tail, hover scale 1.08, highlighted from a card with a lime ring and scale 1.12, selected ink with a 2px white border, 15px and `shadow-pin-tag-selected`; the label is `formatPriceInThousands` for sale, the full price for rent); label is the price on listing maps; selected and highlight turn lime with a forest border and scale 1.1; `MapCluster` (`components/map/map-cluster.tsx`, built, the Locuințe v2 bubble): forest at 88%, 42px below 10, 50px below 40 and 60px from 40 points, the count 14px (16px at 60px) weight 760 white, `shadow-cluster` (5px forest 18% halo), a button named by the caller; a verified count is not built; legend with counts |
| **media** | | |
| Photo | `components/media/photo.tsx` | ratio (4/3 default), 17px radius, caption, label, `placeholder` and `missing` states |
| PhotoMosaic | `components/media/photo-mosaic.tsx` | one large photo and two small ones stacked on its right (padding 6, gap 6, `3fr` / `1fr` columns, the whole block `aspect-2/1`, `16/9` with a single photo), all `rounded-md`, `object-cover`; every photo is a button that opens `PhotoGallery` on it; the caller's `moreLabel` ("+3 poze") sits on the second small photo over `photo-overlay` (ink 900 62%, 16/800 white) and opens the gallery's grid of every photo; `emptyLabel` when there is no photo |
| PhotoGallery | `components/media/photo-gallery.tsx` on shadcn `dialog` | built: a full-screen dialog on forest at 85% (`surface-inverse/85` with a small backdrop blur, so the page shows through faintly) with two views: the library (every photo as a 4:3 `rounded-md` tile, 2 / 3 / 4 columns, the title "Fotografii (N)") and the large view (the photo `object-contain` up to 1152px between round `inverse` previous and next buttons, the counter "3 / 6" as the title, ←/→ keys step through, "Toate fotografiile (N)" back to the library); close button top right, Escape closes; props `photos` (`id`, `src`, `smallSrc`, `alt`), `startIndex` (`null` opens the library), `onClose`; labels from `common:photoGallery.*` |
| FloorPlan, FloorPlanTour, PanoramaViewer | `components/media/*` | plan with room hotspots, "Plan orientativ, nu cadastral", animated plan → panorama transition with a `reduced` cross-fade |
| MediaUpload | `components/media/media-upload.tsx` | built: the drop zone (a `label` around a visually hidden file input, so a click or Enter opens the picker and files can be dragged in): 1.5px dashed `border-strong`, `rounded-lg`, `bg-background`, padding 28/20, centred 28px brand upload icon, title 15/700 and hint 13px `muted-foreground` (the input's description); hover and `data-over` (files dragged over) turn the border forest and the fill `surface-highlight`; `data-invalid` uses `destructive` and `error-surface`; `isBusy` swaps the icon for a spinner, and busy or disabled ignore drops; props `label`, `hint`, `accept`, `onAdd(files)`, `isMultiple`; the caller filters types and counts; the file list (queued, error) and camera capture are not built yet |
| SignaturePad | `features/field-inspection/components/signature-pad.tsx` | empty, signed (with time), invalid |
| **navigation** | | |
| SiteFooter, SiteMenu | `components/layout/site-footer.tsx`, `site-menu.tsx` | footer on `surface-inverse` with brand block, two CTAs and link columns; menu drawer on `sheet` (left, forest) with home, listings for sale and for rent, services with prices, owners and the segmented RO/EN switch |
| SiteFooterCompact | `components/layout/site-footer-compact.tsx` | the Locuințe v2 footer for pages with `staticData.hasCompactFooter`: forest band, padding 26/0, `min(1480px, 100% - 48px)` wide, the inverse logo linking home and an 11px note (`common:site.footer.compactNote`) |
| AccountShell, AdminShell | `components/layout/account-shell.tsx`, `admin-shell.tsx` on `panel-shell.tsx` (navigation in `panel-navigation.ts`) | both areas follow the PropertyScore Admin and Cont Anunturi exports; `compact` density; from `md`: forest sidebar 272px with a white 12% right border and `shadow-sidebar` (the layout of variant 1b of the Sidebar Variante export on the forest surface; 76px collapsed, state in `localStorage` `ps-sb-closed`), padding 16/12 with 14px gaps, the 34px core `BrandMark` and the wordmark, both `inverse` (no area chip: the area shows only in the mobile top bar), collapse toggle 40px with `touch-target`, group titles 12/800 0.1em `sidebar-group` with 6px below, items 48px `rounded-icon` 16/600 (`text-body`) 4px apart with a 36px `rounded-thumb` icon tile (white 8%, 20px white 80% icon; the row turns white 8% on hover), larger than the export's 44px items, 30px tiles and 15px labels at the user's request, active item white with forest 800 text, a 4px white band on the sidebar's left edge and a forest icon tile with a lime icon, optional counts on the right (24×22 lime 300 pill, 12/800 forest) with a translated `sr-only` label, footer "Înapoi la site" (48px, 15/600, 20px arrow, `sidebar-muted`) above a `sidebar-divider` rule; white header 76px (lined up with the sidebar's logo row) with a bottom border and `shadow-panel-header`, 32px side padding, the current section name only, without an area eyebrow (21/800 `text-title-xs` `tracking-title`, plain text, not a heading: each page keeps its own `h1`), one `UserMenu` (`tone="panel"`) on the right; below `md`: forest top bar (mark with `touch-target`, uppercase lime area label 12/700 `tracking-label`, the same user menu), sticky at `z-100` and a horizontally scrolling row of 44px tabs (active lime); main padding 28/32/64 (account) or 24 (admin), 20/16/40 on mobile; the Anunțuri count in admin is the live number of listings waiting for review; the notification bell and admin search are not built |
| SkipLink, MainContent | `components/layout/skip-link.tsx`, `main-content.tsx` (target id in `main-content-id.ts`) | the "Sari la conținut" link and the focusable `<main>` it jumps to; used by the site, panel and auth layouts |
| UserMenu | `features/profile/components/user-menu.tsx` on shadcn `dropdown-menu` | `tone` `light` (forest avatar) · `inverse` (lime avatar, on forest) · `panel` (inverse below `md`, light from `md`, for the panel header); 34px initials avatar, name (hidden below `md`), optional role label (11/800 uppercase `text-brand`), chevron; menu 260px: name and email, an optional first item to the panel for the role (`panelPath`: "Contul meu" `/account` or "Panou admin" `/admin`, used in the public and report headers, labels from `PANEL_LINK_KEYS`), Setări, the other language, Ieși din cont (destructive); name and email truncate with a `title`; Profil returns when the profile section exists; `isNameHidden` keeps only the avatar and chevron (public header) |
| SiteHeader | `components/layout/site-header.tsx` (`account` slot: when someone is signed in, the site layout passes the `UserMenu` with initials only and the panel link, which replaces the sign-in link; the menu drawer's account link then points to that panel) | tones `cream` (default), `white`, `forest`; brand 22/800; nav links with active underline; RO/EN switcher (forest when pressed); mobile panel below `lg`; `scrolled` border |
| Breadcrumbs | `components/navigation/breadcrumbs.tsx` | truncates current item at 32ch |
| Tabs | shadcn `tabs` | `underline` (3px forest indicator) and `pill` (built: `TabsList variant="pill"`, `surface-alt` track, padding 4, gap 4, 40px triggers, `rounded-full`, 14/700, selected white with `shadow-segment`, scrolls sideways without a scrollbar); count bubble |
| SegmentedControl | shadcn `toggle-group` | forest selected, `sm` size, block |
| Stepper | `components/navigation/stepper.tsx` | built: `bars` (the Cont Anunturi wizard: equal columns, 6px `rounded-full` bars, `primary` up to the current step and `surface-alt` after, 13px labels, current 800 `foreground`, others 600 `muted-foreground` and hidden below `sm`); `aria-current="step"`; props `label`, `steps` (`id`, `label`), `current`; the compact progress bar is not built |
| Accordion | shadcn `accordion` | plus icon rotating 45°, 18/700 trigger; `compact` density |
| **property** | | |
| ListingCard | `components/property/listing-card.tsx` | built: `horizontal` row (the `badge` slot is optional; `/listings` shows no trust badge; `rounded-tile` 14px, 1.5px `border-subtle`, `rounded-thumb` 10px photo, selected = forest border + `shadow-listing-selected`); `vertical` (built for `/listings`, the Locuințe v2 card: white, 1px `border`, `rounded-xl`, 4:3 photo zooming to 1.03 on hover, body padding 14/16/16 with gap 2, price 22/800, title 16/700, address 13px muted, hover `border-control` + `shadow-card-hover`, selected forest border); `compact` (17px radius) not built yet; trust badge top-left, favourite top-right, photo count; title clamped to 2 lines; trust row with divider; `highlight` (forest ring, linked to a map pin) |
| SplitPrice | `components/property/split-price.tsx` | price with the amount and the currency in separate elements (currency in `<small>`, order from the locale), for price boxes and service cards; `className` and `currencyClassName` style each part |
| Price | `components/property/price.tsx` | currency from data, period ("/ lună"), previous price struck through, €/m², sizes sm/md/lg, "Preț la cerere" |
| PropertyFacts | `components/property/property-facts.tsx` | `grid` (hairline cells) and `inline` (icons + values); missing values italic |
| FilterChip | `components/property/filter-chip.tsx` | built: a toggle, selected forest with a check, optional count; `variant` `filter` (default) · `reason` (the Admin export's reason chips: 36px min, 1.5px `border`, padding 0 12, 13/700, no check, wraps long labels); removable not built yet |
| FactChip | `components/property/fact-chip.tsx` | a listing fact as a 32px `bg-background` pill, padding 0 12, 14px text with a 16px muted lucide icon (rooms, area, floor, year built) |
| ListingSummary | `components/property/listing-summary.tsx` | the public view of a listing: `PhotoMosaic`, property type and deal · city ("Casă de vânzare · Timișoara"), title and price (24/800), `FactChip`s, a "Detalii" list (two columns from `sm`, 12px muted label over 15/600 value, `border-subtle` under each) of the filled-in optional details, description; content from `useListingSummary` (`src/hooks/use-listing-summary.ts`: price with "/ lună" for rent, rooms, area, bathrooms, land area, floor (apartments) or floors above ground (houses) and year facts, the details list, photo alts, "+N poze"); used by the moderation review card; owners have no preview |
| ServiceCard | `components/property/service-card.tsx` | tones `white`, `forest` (lime icon tile), `online` (filled blue, approved with the home design), `mist`; eyebrow, price, features with check icons, actions, badge |
| PricingComparison | `components/property/pricing-comparison.tsx` | highlighted column (green 50), yes/no cells with icons, stacks into labelled rows on mobile |
| **report** | | |
| ReportSection | `components/report/report-section.tsx` | number, eyebrow, title, intro, sources line, aside |
| Finding | `components/report/finding.tsx` | severities `good`, `attention`, `problem`, `info`; media and meta |
| Recommendation | `components/report/recommendation.tsx` | priority `high`, `medium`, `low`; cost, timeframe, who |
| ProximityList | `components/report/proximity-list.tsx` | place, walking minutes, distance, icon per category |
| StatCard | `components/report/stat-card.tsx` | label, value, icon, delta (`up`, `down`, `flat`), hint |
| DataTable | `components/report/data-table.tsx` on shadcn `table` (+ `@tanstack/react-table` when sorting/selection is needed) | sortable, selectable, row click, empty text, compact density |
| DashboardPanel | `components/report/dashboard-panel.tsx` | title, subtitle, actions, flush body |
| **trust** | | |
| TrustBadge | `components/trust/trust-badge.tsx` | built kinds (`TrustKind`): `physical` (forest pill, Physical mark), `online` (filled blue pill, inverse SmartCheck mark, translucent score bubble), `none` (white, dashed `trust-none-border`); sizes `sm` 24px (mark 16, default) · `md` 32px (mark 20); accessible label from `useTrustLabel` (`@/hooks/use-trust-label`), which says „scor indisponibil” instead of a zero when an online score is missing; `pending` and `expired` not built yet |
| ScoreValue | `components/trust/score-value.tsx` | `variant` `disc` (default: conic ring with an inner disc; sizes `sm` 48 · `md` 80 · `xl` 144/176px; `surface` `light` · `dark`) and `stroke` (SVG stroke ring with the number centred; sizes `sm` (category tiles) · `lg` (overall score on blue)); one `hue` map (`online`, `onInverse`, and the seven `category-*` keys) sets the progress colour and the soft track; value clamped to 0…`max` (default 100); `role="img"` with the label; `physical` (max 10, one decimal) and the empty state not built yet |
| CategoryScores | `components/trust/category-scores.tsx` | bars (forest physical, blue online), `attention` below a threshold (amber), empty (dashed track, italic), 1 or 2 columns |
| ScorePanel | `components/trust/score-panel.tsx` | `physical` (forest head), `online` (blue 50 head), `none` (dashed, cream); verdict, categories, note well, footer with data labels, actions, missing list |
| DataLabel | `components/trust/data-label.tsx` | kinds `source`, `declared` (amber), `missing` (italic, dashed chip), `verified` (brand), `freshness` (`stale` turns warning); inline or chip |

The `ui_kits` in the export (Home, Booking, Listing, MapList, Report, Dashboard, Partner, Review, Agent) are reference screens: use them for composition, never copy their markup.

## 5. Usage rules

1. **Lime marks the main conversion.** In the app shells (account, partner, admin, field) and in forms and wizards, one `cta` (lime) button per screen; everything else is `default`, `outline` or `ghost`. Public marketing pages copied from a Claude Design export (home, publish) may repeat the lime action once per section where the export does, always for the same conversion or for the Property Fizic product; secondary actions stay forest, blue or white.
2. **Forest means brand and physical verification; blue means online analysis and information.** Physical scores are forest, online scores blue, everywhere (badges, panels, bars, pins).
3. **Trust is always explicit:** every property shows a `TrustBadge` (`physical`, `online` or `none`); "none" is a neutral dashed label, never styled as an error.
4. **Data honesty:** every report value carries a `DataLabel` (source and date); buyer answers use `declared`; missing values use `missing` ("fără date", "necunoscut"), never an empty cell or a zero.
5. **Status = text + icon**, through `StatusPill` with the plan's state labels; colour reinforces, never carries the meaning alone.
6. **Cards:** white, 1px `border`, `rounded-lg` (listing cards and media `rounded-xl`), no shadow at rest, `shadow-md` and `border-strong` on hover for interactive cards.
7. **Focus:** 3px `ring` (blue 500) with 2px offset; on `surface-inverse` use `focus-inverse` (lime). Never remove it.
8. **Touch targets:** at least `--touch-min` (44px, 48px in the field app). When a design draws a control smaller than that (36–40px header buttons, header section links, small pill links), keep the visual size and add the `touch-target` utility: it makes the element `position: relative` and adds an invisible `::after` hit area of at least `--touch-min` × `--touch-min` centred on it. Do not use it on elements that are already absolutely positioned or that clip their overflow.
9. **Text on forest** is white, secondary text `on-inverse-muted`; text on lime is forest.
10. **Selection colour** is lime 300 with forest text.
11. **Density** comes from the shell (`data-density`), never from per-component overrides.
12. **Highlights:** key words in public headings use the `marker-*` utilities from `globals.css` (`marker-cta`, `marker-info`, `marker-under`, `marker-underline`, `marker-pill`); never an inline gradient.
13. **Gradients, tints and patterns** are built only from design-system colours (for example `from-primary to-primary-hover`, cream → mist), used sparingly; the hexagon-grid pattern is an SVG in `currentColor` at low opacity. Additions approved from Claude Design's visual language board (patterns, illustration set, motion specs) are recorded in this file before use.
14. **Logos only through the brand components.** Every PropertyScore, Physical or SmartCheck logo, mark or product name badge is a `Logo`, `BrandMark` or `ProductTag`; never retype the wordmark in text, recolour it outside its tones, stretch, rotate or outline it, or place it on a photo without a solid panel. Physical lockups and tags use only the forest/lime world, SmartCheck only the blue world, matching rule 2. Use `inverse` on `surface-inverse`, `mono-*` in one-colour documents (invoices, consent PDFs). Keep the clear space and minimum sizes from the Prompt L construction sheet (recorded here when approved). One `Logo` per header; product lockups appear where the page is about that product, the master logo everywhere else.
15. **Expressive accent palette** (approved with the home design; values in §3.1, tokens `category-*` in §3.2): Claude Design adds six category hues (Educație, Sănătate, Transport, Cumpărături & servicii, Spații verzi, Siguranță & liniște), each with 50/100/300/600/800 steps. Once approved, record them here as `--ps-<hue>-<step>` primitives and `category-<key>` / `category-<key>-surface` semantic tokens. They are for category icon tiles, map POIs, illustrations, marketing sections and category charts only; they never replace forest (physical), slate blue (online), lime (main action) or the status colours, and never carry status alone. Use colour at scale on public pages (forest, lime and blue sections), calmer in account, partner and admin.

## 6. Changing the design system

**A Claude Design export wins over this file.** When a screen is copied from an export, its values are used one to one; anything this file does not have yet is added here and in `globals.css` in the same change (as was done for the home page). One-off values that appear once in a screen may stay as Tailwind arbitrary values in that screen.


Adding a token or a shared component, or changing a value, is a design-system change: update this file, `src/styles/globals.css`, and note it for the Claude Design project so later batch designs use the same values. A one-off visual need in a single screen is solved with existing tokens, not a new one.
