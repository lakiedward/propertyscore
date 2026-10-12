---
paths:
  - 'src/**/*.tsx'
  - 'src/**/*.css'
  - 'components.json'
---

# Styling rules

## Rules

- **Tailwind 4 utilities in `className`** for layout, spacing, typography, colour and radius. Configuration is CSS-first in `src/styles/globals.css` (`@import "tailwindcss"`, `@theme`, the tokens); no `tailwind.config.js` unless a plugin requires one.
- **Colours only through semantic tokens** (`bg-background`, `text-foreground`, `text-muted-foreground`, `bg-primary`, `border-border`, `text-destructive`, …) defined as CSS variables in `globals.css` with the shadcn names. Never a raw hex, `rgb()` or Tailwind palette class (`text-gray-500`, `bg-blue-600`) in components; a new colour is a new token used in both themes.
- **No arbitrary values for magic numbers** (`p-[13px]`, `w-[37%]`, `text-[0.7rem]`). Use the scale; when the design truly needs an off-scale value used more than once, add a token. Arbitrary values are allowed only for CSS-variable references and grid templates (`grid-cols-[9rem_1fr]`).
- **Merge classes with `cn()`** from `@/lib/utils` whenever a component accepts `className` or classes are conditional; never template-string concatenation.
- **Variants with `cva`** (`class-variance-authority`) as the shadcn components do; never a chain of ternaries producing class strings.
- **No `@apply`**, no CSS Modules, no inline `style` except for values computed at runtime (a progress width, a chart colour from data). When the same set of classes repeats, extract a component.
- Long class lists are fine; `prettier-plugin-tailwindcss` orders them.

## Components

- shadcn/ui is added with `pnpm dlx shadcn@latest add <name>` into `src/components/ui/`; the files are ours. Edit them only for system-wide changes, and replace their hidden English strings with `t()` on add (`.claude/rules/i18n.md`).
- Feature-specific looks wrap a primitive in a feature component; never fork a primitive into a feature folder.
- Use the existing primitive before writing markup: `Button`, `Input`, `Form`, `Dialog`, `Sheet`, `DropdownMenu`, `Select`, `Tabs`, `Card`, `Badge`, `Skeleton`, `Alert`, `Tooltip`, `Table`, `Calendar`. Never a hand-built modal, menu, popover or select.
- Toasts only through `sonner`'s `toast` (normally from the global mutation error handler); one `<Toaster />` in the app root.

## Layout and responsiveness

- Mobile first: base classes target phones, `sm:` 640, `md:` 768, `lg:` 1024, `xl:` 1280 add up. No custom breakpoints, no `max-*` variants except to undo a single case.
- No horizontal page scroll at 360px; wide tables scroll inside their own container.
- Text containers wrap or truncate with `truncate` + `Tooltip`; never fixed widths on text-bearing elements (Romanian strings are longer).

## Theme, icons, fonts

- Light and dark tokens are both defined from day one; the `dark` class on `<html>` switches them. Use `dark:` variants only when a token cannot express the difference.
- Icons: `lucide-react` only, `size-4` inline with text and `size-5` by default; decorative icons `aria-hidden`, icon-only buttons with a translated `aria-label`. No emoji, inline SVG copies or a second icon set.
- Fonts are self-hosted through `@fontsource/*` with the `latin` and `latin-ext` subsets (ș, ț, ă, â, î); no Google Fonts request.
- Charts, when needed, use `recharts` through the shadcn chart wrapper with the `--chart-*` tokens.
- Focus styles stay visible (`focus-visible:ring-*` as the shadcn primitives ship them); never `outline-none` without a replacement.
