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

One master brand and two product sub-brands that share its symbol and wordmark. The marks come from the Claude Design home export and live once in `src/components/brand/brand-marks.ts` (inline SVG paths, fills from tokens); the wordmark is text in `--font-brand` rendered only by `Logo` ("Property" 600 + boxed "Score" / "Physical" 800, "Smart" 500 + boxed "Check" 800). `public/favicon.svg` is the one static copy of the core mark:

| Brand | Product | Colour world | Used for |
| --- | --- | --- | --- |
| **PropertyScore** (`core`) | the company and the listings portal | forest + one lime accent | site, account, partner, admin and field shells, footer, auth, invoices, consent PDFs, generic emails, favicon and app icons |
| **PropertyScore Physical** (`physical`) | physical inspection, 500 lei, 0–10 score | forest + lime (`trust-physical*`) | inspection pages, booking wizard, PDF book cover and headers, inspection emails, `ProductTag` on inspection rows |
| **PropertyScore SmartCheck** (`smartcheck`) | online report, 30 lei, 0–100 score | slate blue (`info`, `trust-online*`) | `/check` wizard, online report cover and header, online report emails, `ProductTag` on report rows |

"PropertyScore", "Physical" and "SmartCheck" (one word, capital S and C) are never translated; their keys live in `common:brand.*` with identical values in `ro` and `en` so accessible names still go through `t()`. Romanian copy around them stays Romanian ("Raport online SmartCheck").

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
| Other | white `#FFFFFF` · scrim `rgba(11,48,38,.5)` · on-inverse muted `#C6D6CB` · placeholder `#7D8E83` · green highlight `#E4F0D2` · blue 800 `#223B49` |
| Home design tints (copied from the home export) | blue 600 `#2F5164` · green 350 `#9FB9A6` · green 650 `#3B5847` · green deep `#0B3428` · ink strong `#38513F` · ink soft `#425E4B` · ink faint `#6B7B6D` · on-inverse soft `#D8E6DC` · on-inverse faint `#B9CCC0` · on-inverse bright `#EAF2EC` · on-info soft `#E3ECF1` · leaf 75 `#EEF3E4` · leaf 90 `#E4EFD6` · green 250 `#B9CDBB` · cream scene `#F3F4ED` · cream chip `#F3F2EA` · aqua 75 `#D8EFEC` · aqua 650 `#0F6B61` · aqua 700 `#0F4D47` · amber 800 `#8A4B18` · safety soft `#7FD1B9` / `#F2A48E` · photo note `rgba(255,253,241,.875)` |
| Category hues (rule 14, approved with the home design) | sky 50 `#EDF6FC` · 100 `#D4EAF8` · 300 `#8CC6EC` · 600 `#1F6B9A` · 800 `#123F5E`; coral `#FDF1EC` · `#FADCCF` · `#F2A184` · `#9E4A22` · `#6E2A16`; sun `#FFF8DC` · `#FDEBA6` · `#F6C93E` · `#7E5F00` · `#4E3A00`; berry `#F9EFF5` · `#F0D7E7` · `#D69AC2` · `#8A356F` · `#561F45`; leaf `#F0F7E7` · `#DCEDC6` · `#A3D06F` · `#3F6E1B` · `#2B4A10`; aqua (the design's "teal", renamed to keep the status teal apart) `#E9F5F3` · `#CBE7E3` · `#7CC4BB` · `#1C6B67` · `#0F4341`; slate (publish page step hue, the accents file's own scale, close to blue) 50 `#EEF3F6` · 100 `#DCE6EC` · 300 `#9DB6C4` · 600 `#3F6478` · 700 `#2F5164` · 800 `#223B49` |
| Publish page tints | green hairline `#E4EAE3` · green ghost `#DCE7DE` · green mist `#C9D9CF` · green on lime `#2E5A48` · green declared `#B9C9BD` · slate mist `#DCE7EE` · slate chip `#E2EAF0` · schematic map land `#EDEBDD`, park `#D3E2CF`, water `#C9D9DF`, path `#F8F7F0` |

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
| `sidebar*` | white surface, green 800 primary, green 100 accent, green 200 border, blue 500 ring | admin sidebar |

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
| `surface-inverse` / `on-inverse` / `on-inverse-muted` | green 800 / white / `#C6D6CB` | forest sections, physical score panel head, footer |
| `border-strong`, `border-subtle` | green 400, `#E1E8DE` | hover borders, inner dividers |
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
| `step-<hue>-soft`, `-surface`, `-solid`, `-ink` | 50 / 100 / 600 / 800 of `slate`, `coral`, `berry`, `sky`, `leaf`, `aqua` | the six steps of the publish page (icon tiles, active step, step panel), eyebrow chips and pin badges |
| `on-inverse-mist`, `on-info-mist`, `on-cta-soft`, `zone-chip`, `border-declared` | green mist, slate mist, green on lime, slate chip, green declared | secondary text on forest, slate and lime cards; the zone score chip; the dashed "declared" chip on the publish page |
| `border-hairline`, `number-ghost`, `heading-accent` | green hairline, green ghost, green 600 | panel and step-card borders, the large ghost step numbers, the second line of two-line section titles on the publish page |

Contrast notes from the source: red 600 is 5.9:1, amber 700 6.2:1 and teal 600 5.4:1 on cream; keep text colours to these tokens.

### 3.3 Dark theme

The design system ships light only. `styling.md` requires dark tokens from day one: define a `.dark` block with every token above, derived from the same families (forest/ink surfaces, cream text, lime and blue accents), and present the values for approval in the step that first adds them (decision D14). Until approved, the app runs in light mode only.

### 3.4 Typography

- **Font family:** `--font-sans` Manrope Variable for body, UI and every heading (`--font-heading` points to the same family: the home design sets all titles in its body font), `--font-brand` Sora Variable (only inside the brand components), self-hosted with `latin-ext`. Bricolage Grotesque is not used. Mono: `Consolas, "SFMono-Regular", Menlo, monospace`, only for IDs and hashes.
- **Weights:** 400 regular, 600 semibold, 700 bold, 800 heavy (headings, prices, scores).
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
| `text-logo-2xs/inline/xs/sm/md/card/bundle/lg/xl` | 12.5 / 14 / 15 / 19 / 22 / 24 / 26 / 30 / 34px | 1 | `tracking-brand` −0.04em | brand components only |

Numbers in prices, scores, tables and counters use `tabular-nums`. Body text never goes below 16px in the comfortable density.

### 3.5 Space, radius, shadow, motion, layers

- **Space:** 4px base, which is Tailwind's default scale (`1` = 4px … `12` = 48px, `16` = 64px, `20` = 80px, `24` = 96px, `32` = 128px).
- **Radius** (set explicitly in `@theme inline`, replacing shadcn's computed radii): `rounded-sm` 4px tags · `rounded-md` 8px controls and buttons · `rounded-lg` 11px cards, service cards, listboxes · `rounded-xl` 17px media, listing cards, maps · `rounded-2xl` 24px hero panels · `rounded-full` badges, chips, pills.
- **Shadow** (forest-tinted, restrained): `shadow-sm` `0 1px 2px rgba(16,63,50,.06)` · `shadow-md` `0 10px 28px -16px rgba(16,63,50,.28)` (card hover, popovers) · `shadow-lg` `0 24px 56px -24px rgba(16,63,50,.38)` (dialogs). The home design adds named shadows copied from it: `shadow-header`, `-service`, `-photo`, `-float`, `-info`, `-tile`, `-tile-sm`, `-explorer`, `-pin`, `-bundle`, `-plus`, `-shell`, `-tab`, `-sample`, `-calculator`, `-link-card`, `-listing-selected`, `-aqua`, `-price`; the publish page adds `shadow-listing-hero`, `-progress`, `-published`, `-heart`, `-panel`, `-preview`, `-step`, `-step-active`, `-card-soft`, `-tier-photo`, `-tier-online`, `-tier-physical`, `-tier-chip` (values in `globals.css`). The `map-schematic` utility draws the static example map of the publish page's address step.
- **Extra radii from the home design:** `rounded-note` 7px, `rounded-icon` 12px, `rounded-float` 13px, `rounded-photo` 20px.
- **Motion:** durations `--duration-instant` 90ms, `--duration-fast` 160ms, `--duration-base` 240ms, `--duration-slow` 420ms, `--duration-scene` 640ms (used as `duration-(--duration-fast)`); easings `ease-standard` `cubic-bezier(.2,.7,.2,1)` and `ease-exit` `cubic-bezier(.4,0,1,1)`. Everything collapses to 1ms under `prefers-reduced-motion`.
- **Icons:** sizes 16, 20 (default), 24, 32 → `size-4`, `size-5`, `size-6`, `size-8`.
- **Layers:** base 0 · raised 10 · sticky header 100 · map overlay 200 · drawer 300 · dialog 400 · toast 500.

### 3.6 Layout

- Containers: `max-w-narrow` 760px (reports, forms), `max-w-default` 1180px, `max-w-wide` 1360px, with gutter `px-gutter` `clamp(20px, 4vw, 40px)`. Public pages use the design's `page-wrap` utility instead: `min(1360px, 100% - 64px)` wide, `min(100% - 36px, 650px)` at 820px and below, `100% - 30px` at 520px and below. Paragraphs copied from the design are capped at `max-w-copy` (68ch).
- Public-site breakpoints follow the home design, as max-width steps turned into Tailwind variants: `w480` 481, `w520` 521, `w560` 561, `w760` 761, `w767` 768, `w820` 821, `w860` 861, `w900` 901, `w960` 961, `w1059` 1060, `w1080` 1081, `w1180` 1181 (`w767` and `w1059` are the publish page's `mobile` and `narrow` switches) (each `wNNN:` applies above NNN px; `max-wNNN:` at NNN px and below). App shells keep `sm`/`md`/`lg`/`xl`.
- Section spacing on public pages: `py-section` `clamp(64px, 9vw, 112px)`.
- 12-column grid, 24px gap.
- Header height (`h-header`): 76px comfortable, 60px compact, 56px field. The public site header is full width (20px side padding), white, with a `border` bottom line and `shadow-header`; menu button, logo, the six section links (a second full-width row below 960px, a 4-column grid below 820px), then sign-in, "Publică anunț gratuit" (from 560px), Smart Check (from 560px) and Property Fizic buttons at 36px; no language switch in the bar (it lives in the menu drawer); app shells collapse below `lg`; other source breakpoints (960, 860, 720, 640, 560, 420) map to the nearest Tailwind breakpoint (`lg`, `md`, `sm`), mobile first.

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

| Design system component | Our implementation | Variants and notes |
| --- | --- | --- |
| **brand** | | |
| Logo | `components/brand/logo.tsx` | `product` `core` · `physical` · `smartcheck`; `layout` `horizontal` (default) · `stacked` · `compact` (SmartCheck only: "SmartCheck" + "by PropertyScore"); `tone` `color` · `inverse` · `mono-forest` · `mono-white` · `mono-black`; `surface` `default` · `accent` (Physical on a lime card: forest box with lime "Fizic"); sizes sm 24 · md 32 · lg 40 · xl 56 px high; inline SVG paths with fills from tokens (`fill-brand`, `fill-trust-physical-mark`, `fill-info`, `fill-on-inverse`), never hex; accessible name from `t('common:brand.<product>')`, `aria-hidden` when a visible name repeats it; links to home only inside `SiteHeader` |
| BrandMark | `components/brand/brand-mark.tsx` | symbol only, same `product` and `tone`; sizes 16 · 20 · 24 · 32 · 48 · 64; `pulse` loading variant that stays static under reduced motion |
| ProductTag | `components/brand/product-tag.tsx` on shadcn `badge` | `physical` (forest world, lime mark) · `smartcheck` (blue 50, blue 700 text, blue mark); with the product mark; for product names in cards, checkout lines, report and book headers, account and admin rows |
| Static brand files | `public/brand/` | `favicon.svg`, `favicon.ico`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `og-core.png`, `og-physical.png`, `og-smartcheck.png`, `email-header-<product>.png`; exported names from Prompt L (`ps-<product>-<layout>-<tone>.svg`) become paths in the components above, not files under `public/` |
| **actions** | | |
| Button | `components/ui/button.tsx` (shadcn, extend its `cva`) | `default` (primary forest) · `cta` (lime) · `info` (filled blue, SmartCheck actions) · `outline` (white, forest border = DS secondary) · `ghost` · `destructive` (danger) · `inverse` (white on forest); `shape` `default` · `pill`; sizes `sm` 36, `default` 44, `lg` 52, `icon`; optional price pill (`rounded-full`, 16% white on dark, 10% forest on light); `loading` shows a spinner and sets `aria-busy`; press moves 1px down |
| IconButton | `Button` with `size="icon"` | variants ghost, outline, default, `overlay` (white 94% + `shadow-sm`, on photos); `round` shape; pressed favourite turns `destructive` |
| TextLink | `components/navigation/text-link.tsx` on the router `Link` | bold brand link, underline on hover, optional arrow that moves 3px; `inline` underlined variant; `inverse` tone |
| Icon | `lucide-react` directly | DS icon `i_tram_front` = `TramFront`; no wrapper, no second set |
| **feedback** | | |
| Dialog | shadcn `dialog` | width 520 default; becomes a bottom sheet on mobile (`sheet`) via shadcn `drawer`/`sheet` |
| Drawer | shadcn `sheet` | sides right (default, 420px), left, bottom |
| ExampleLabel | `components/feedback/example-label.tsx` | tones `light`, `dark`; marks example and illustrative content ("Exemplu", "Valori de exemplu", "Imagine ilustrativă") |
| EmptyState | `components/layout/empty-state.tsx` | kinds `empty`, `error`, `offline`, `pending`, `insufficient`; icon, title, text, actions |
| Notice | shadcn `alert`, extended | tones `info`, `success`, `warning`, `error`, `neutral`; optional title, actions, dismiss |
| Skeleton | shadcn `skeleton` | lines, radius |
| StatusPill | `components/feedback/status-pill.tsx` on shadcn `badge` | tones `brand`, `success`, `warning`, `error`, `info`, `neutral`; label = translated status from the state machines (§8 of the plan) |
| Toast | `sonner` | tones success, error; optional action |
| **forms** | | |
| TextField | shadcn `field` + `input` (+ input group for prefix/suffix/icon) | label (15/600), "opțional" tag, hint, error and success messages with icon; `lg` size 60px; textarea variant; 1.5px border, focus border forest + 3px blue 28% halo |
| Select | shadcn `select` | chevron in brand colour |
| Checkbox | shadcn `checkbox` | 22px box, 5px radius, forest when checked, optional description |
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
| MapCanvas, MapPin, MapCluster, MapLegend, MapPopup | `components/map/*` on `maplibre-gl` with OpenFreeMap tiles (`MapCanvas` is lazy-loaded) | pins: `physical` (forest fill, white text), `online` (blue 500 fill, white text), `none` (white, green 300 border); label is the price on listing maps; selected and highlight turn lime with a forest border; cluster shows verified count; legend with counts |
| **media** | | |
| Photo | `components/media/photo.tsx` | ratio (4/3 default), 17px radius, caption, label, `placeholder` and `missing` states |
| PhotoGallery | `components/media/photo-gallery.tsx` | grid + lightbox, total count |
| FloorPlan, FloorPlanTour, PanoramaViewer | `components/media/*` | plan with room hotspots, "Plan orientativ, nu cadastral", animated plan → panorama transition with a `reduced` cross-fade |
| MediaUpload | `components/media/media-upload.tsx` | drop zone (over, invalid), file list (queued, error), camera capture |
| SignaturePad | `features/field-inspection/components/signature-pad.tsx` | empty, signed (with time), invalid |
| **navigation** | | |
| SiteFooter, SiteMenu | `components/layout/site-footer.tsx`, `site-menu.tsx` | footer on `surface-inverse` with brand block, two CTAs and link columns; menu drawer on `sheet` (left, forest) with page sections, services with prices and the segmented RO/EN switch |
| SiteHeader | `components/layout/site-header.tsx` | tones `cream` (default), `white`, `forest`; brand 22/800; nav links with active underline; RO/EN switcher (forest when pressed); mobile panel below `lg`; `scrolled` border |
| Breadcrumbs | `components/navigation/breadcrumbs.tsx` | truncates current item at 32ch |
| Tabs | shadcn `tabs` | `underline` (3px forest indicator) and `pill` (mist track, white selected); count bubble |
| SegmentedControl | shadcn `toggle-group` | forest selected, `sm` size, block |
| Stepper | `components/navigation/stepper.tsx` | `bars` (4px bars, labels hidden on mobile except current) and compact progress bar |
| Accordion | shadcn `accordion` | plus icon rotating 45°, 18/700 trigger; `compact` density |
| **property** | | |
| ListingCard | `components/property/listing-card.tsx` | `vertical`, `horizontal`, `compact`; 17px radius; trust badge top-left, favourite top-right, photo count; title clamped to 2 lines; trust row with divider; `highlight` (forest ring, linked to a map pin) |
| Price | `components/property/price.tsx` | currency from data, period ("/ lună"), previous price struck through, €/m², sizes sm/md/lg, "Preț la cerere" |
| PropertyFacts | `components/property/property-facts.tsx` | `grid` (hairline cells) and `inline` (icons + values); missing values italic |
| FilterChip | `components/property/filter-chip.tsx` | selected forest, count, removable |
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
| TrustBadge | `components/trust/trust-badge.tsx` | kinds `physical` (forest, lime check, muted date, lime score bubble), `online` (blue 50, blue border, blue score bubble), `none` (white, dashed border), `pending` (warning), `expired` (sunken); sizes sm 24, md 28, lg 34 |
| ScoreValue | `components/trust/score-value.tsx` | `physical` (max 10, forest, one decimal with Romanian comma) and `online` (max 100, blue); sizes sm/md/lg/xl; optional ring (conic progress, 8px inset); empty state |
| CategoryScores | `components/trust/category-scores.tsx` | bars (forest physical, blue online), `attention` below a threshold (amber), empty (dashed track, italic), 1 or 2 columns |
| ScorePanel | `components/trust/score-panel.tsx` | `physical` (forest head), `online` (blue 50 head), `none` (dashed, cream); verdict, categories, note well, footer with data labels, actions, missing list |
| DataLabel | `components/trust/data-label.tsx` | kinds `source`, `declared` (amber), `missing` (italic, dashed chip), `verified` (brand), `freshness` (`stale` turns warning); inline or chip |

The `ui_kits` in the export (Home, Booking, Listing, MapList, Report, Dashboard, Partner, Review, Agent) are reference screens: use them for composition, never copy their markup.

## 5. Usage rules

1. **One `cta` (lime) button per screen**, for the main conversion; everything else is `default`, `outline` or `ghost`.
2. **Forest means brand and physical verification; blue means online analysis and information.** Physical scores are forest, online scores blue, everywhere (badges, panels, bars, pins).
3. **Trust is always explicit:** every property shows a `TrustBadge` (`physical`, `online` or `none`); "none" is a neutral dashed label, never styled as an error.
4. **Data honesty:** every report value carries a `DataLabel` (source and date); buyer answers use `declared`; missing values use `missing` ("fără date", "necunoscut"), never an empty cell or a zero.
5. **Status = text + icon**, through `StatusPill` with the plan's state labels; colour reinforces, never carries the meaning alone.
6. **Cards:** white, 1px `border`, `rounded-lg` (listing cards and media `rounded-xl`), no shadow at rest, `shadow-md` and `border-strong` on hover for interactive cards.
7. **Focus:** 3px `ring` (blue 500) with 2px offset; on `surface-inverse` use `focus-inverse` (lime). Never remove it.
8. **Touch targets:** at least `--touch-min` (44px, 48px in the field app).
9. **Text on forest** is white, secondary text `on-inverse-muted`; text on lime is forest.
10. **Selection colour** is lime 300 with forest text.
11. **Density** comes from the shell (`data-density`), never from per-component overrides.
12. **Highlights:** key words in public headings use the `marker-cta` or `marker-info` utilities from `globals.css`; never an inline gradient.
13. **Gradients, tints and patterns** are built only from design-system colours (for example `from-primary to-primary-hover`, cream → mist), used sparingly; the hexagon-grid pattern is an SVG in `currentColor` at low opacity. Additions approved from Claude Design's visual language board (patterns, illustration set, motion specs) are recorded in this file before use.
13. **Logos only through the brand components.** Every PropertyScore, Physical or SmartCheck logo, mark or product name badge is a `Logo`, `BrandMark` or `ProductTag`; never retype the wordmark in text, recolour it outside its tones, stretch, rotate or outline it, or place it on a photo without a solid panel. Physical lockups and tags use only the forest/lime world, SmartCheck only the blue world, matching rule 2. Use `inverse` on `surface-inverse`, `mono-*` in one-colour documents (invoices, consent PDFs). Keep the clear space and minimum sizes from the Prompt L construction sheet (recorded here when approved). One `Logo` per header; product lockups appear where the page is about that product, the master logo everywhere else.
14. **Expressive accent palette** (approved with the home design; values in §3.1, tokens `category-*` in §3.2): Claude Design adds six category hues (Educație, Sănătate, Transport, Cumpărături & servicii, Spații verzi, Siguranță & liniște), each with 50/100/300/600/800 steps. Once approved, record them here as `--ps-<hue>-<step>` primitives and `category-<key>` / `category-<key>-surface` semantic tokens. They are for category icon tiles, map POIs, illustrations, marketing sections and category charts only; they never replace forest (physical), slate blue (online), lime (main action) or the status colours, and never carry status alone. Use colour at scale on public pages (forest, lime and blue sections), calmer in account, partner and admin.

## 6. Changing the design system

**A Claude Design export wins over this file.** When a screen is copied from an export, its values are used one to one; anything this file does not have yet is added here and in `globals.css` in the same change (as was done for the home page). One-off values that appear once in a screen may stay as Tailwind arbitrary values in that screen.


Adding a token or a shared component, or changing a value, is a design-system change: update this file, `src/styles/globals.css`, and note it for the Claude Design project so later batch designs use the same values. A one-off visual need in a single screen is solved with existing tokens, not a new one.
