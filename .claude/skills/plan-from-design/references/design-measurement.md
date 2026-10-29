2# Measuring the design: render it, measure it, diff against it

A Claude Design export is only trustworthy once it is rendered. Its stylesheets are stacked in layers that override each other (`!important` blocks appended late, a "colour v2" block, a "hero option B" block), and its scripts reorder and restyle elements after load. Reading the CSS gives the wrong answer more often than not. The rendered page in a browser is the specification; every value in the plan and the build comes from it.

## 1. Serve the export through the dev server

The in-app browser shows files outside the project as static snapshots and refuses ad-hoc local servers, so the export is served by the project's own Vite dev server from the git-ignored design cache:

1. Copy the export into `.claude/design-cache/<hash>/site/` (`index.html` plus every asset folder it references: `assets/home`, `assets/logos`, stylesheets such as `assets/ps-header.css`, data files). A standalone bundled export (one large HTML with a `__bundler` manifest) is copied as it is.
2. Check that every relative `src`/`href` resolves inside `site/`. Assets missing from the provided file (for example a single HTML downloaded without its `assets` folder) are taken from the full project export when the user supplied one; otherwise ask the user for them before measuring.
3. Start the dev server (`preview_start` with `property-score-dev`) and open `http://localhost:<port>/.claude/design-cache/<hash>/site/index.html` in a second tab. Confirm it rendered: the page title, the computed background of the header, and how many images loaded.
4. Disable smooth scrolling in both tabs before measuring (`document.documentElement.style.scrollBehavior = 'auto'`).

The app tab and the design tab share an origin, so they share `localStorage`: measurements taken in the design tab are read in the app tab.

## 2. The extractor

Run in the design tab, once per width (1440 and 375 at least, plus every breakpoint the design defines). It records, per section and keyed by the element's own text, the computed font size, weight, line height, letter spacing, colour, font family, position and width, and the background, radius, padding and border of the nearest box around it. The code is stored in `localStorage` (`dz-code`) so both tabs evaluate the same functions after every reload:

```js
localStorage.setItem('dz-code', `
window.__extract = function (sections) {
  const norm = (s) => s.replace(/\\s+/g, ' ').replace(/[↗→↓]/g, '').trim().toLowerCase().slice(0, 48);
  const boxOf = (el) => {
    let a = el;
    while (a && a !== document.body) {
      const cs = getComputedStyle(a);
      if (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || (parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none')) return a;
      a = a.parentElement;
    }
    return null;
  };
  const out = {};
  for (const [key, el] of Object.entries(sections)) {
    if (!el) continue;
    const top = el.getBoundingClientRect().top + scrollY;
    const left = el.getBoundingClientRect().left;
    const items = {};
    el.querySelectorAll('*').forEach((e) => {
      if (e.closest('.maplibregl-map, svg, [hidden], .leaflet-container')) return;
      const own = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ');
      const t = norm(own);
      if (t.length < 2 || items[t]) return;
      const r = e.getBoundingClientRect();
      if (!r.width) return;
      const cs = getComputedStyle(e);
      const b = boxOf(e);
      const bcs = b && getComputedStyle(b);
      const br = b && b.getBoundingClientRect();
      items[t] = {
        tag: e.tagName, fs: cs.fontSize, fw: cs.fontWeight, lh: cs.lineHeight, ls: cs.letterSpacing,
        c: cs.color, ff: cs.fontFamily.split(',')[0], x: Math.round(r.left - left),
        y: Math.round(r.top + scrollY - top), w: Math.round(r.width),
        bg: bcs ? bcs.backgroundColor : null, rad: bcs ? bcs.borderTopLeftRadius : null,
        bw: br ? Math.round(br.width) : null, bpad: bcs ? bcs.paddingTop + ' ' + bcs.paddingLeft : null,
      };
    });
    out[key] = { h: Math.round(el.getBoundingClientRect().height), bg: getComputedStyle(el).backgroundColor, items };
  }
  return out;
};
window.__diff = function (designKey, appData, only) {
  const d = JSON.parse(localStorage.getItem(designKey));
  const res = {};
  for (const k of Object.keys(d)) {
    if (only && k !== only) continue;
    const a = appData[k];
    if (!a) { res[k] = 'missing section'; continue; }
    const lines = ['SECTION h ' + d[k].h + ' vs ' + a.h + '; bg ' + d[k].bg + ' vs ' + a.bg];
    for (const [t, dv] of Object.entries(d[k].items)) {
      const av = a.items[t];
      if (!av) { lines.push('MISSING "' + t + '" (' + dv.tag + ' ' + dv.fs + '/' + dv.fw + ')'); continue; }
      const f = [];
      if (Math.abs(parseFloat(dv.fs) - parseFloat(av.fs)) > 0.6) f.push('fs ' + dv.fs + '→' + av.fs);
      if (Math.abs(+dv.fw - +av.fw) >= 50) f.push('fw ' + dv.fw + '→' + av.fw);
      if (dv.c !== av.c) f.push('c ' + dv.c + '→' + av.c);
      if (dv.bg !== av.bg) f.push('box ' + dv.bg + '→' + av.bg);
      if (dv.rad !== av.rad) f.push('rad ' + dv.rad + '→' + av.rad);
      if (Math.abs(dv.x - av.x) > 6) f.push('x ' + dv.x + '→' + av.x);
      if (Math.abs(dv.w - av.w) > 12) f.push('w ' + dv.w + '→' + av.w);
      if (f.length) lines.push('"' + t + '": ' + f.join('; '));
    }
    for (const t of Object.keys(a.items)) if (!d[k].items[t]) lines.push('EXTRA "' + t + '"');
    res[k] = lines;
  }
  return res;
};
`);
eval(localStorage.getItem('dz-code'));
```

Sections are passed as a map from a shared name to the element in each page (`{ header, hero, pricing, footer }` → the design's `.site-header`, `section.hero`, `#preturi` … and the app's `header`, `main section`, `#pricing` …). In the design tab: `localStorage.setItem('dz-design-' + innerWidth, JSON.stringify(__extract(designSections)))`. In the app tab: `__diff('dz-design-' + innerWidth, __extract(appSections))`.

For values the text keys do not reach (grid templates, gaps, pseudo-elements such as a decorative `::before` panel, SVG ring strokes, shadows), measure the design element directly with `getComputedStyle(el)` and `getComputedStyle(el, '::before')`, and read the SVG markup the page actually rendered.

## 3. How to read the diff

| Line | Meaning | Action |
| --- | --- | --- |
| `SECTION h` differs a lot | spacing, padding or a block missing | compare section padding and the measured gaps first |
| `fs`, `fw`, `c`, `box`, `rad` | a style differs | copy the design's value |
| `x` | container width, gutter or column template differs | check `page-wrap` and the grid template |
| `w` | column ratio, max-width or a block that should be inline | copy the measured widths or `max-width` |
| `y` only | follows from changes above it, or from line breaks of a wider font | ignore once everything above it matches |
| `MISSING` / `EXTRA` | copy differs, an element is missing, or text is split differently | take the exact text from the design; a split wordmark or price ("500" + "lei") is often only a split |

A section is done when only `y` lines and widths explained by the font remain, at every measured width, in both languages.

## 4. Side-by-side screenshots

After the diff is clean, screenshot the same region of both tabs at the same width (scroll both to the same section heading). Screenshots catch what text keys cannot: images, illustrations, icon choice, ring and chart shapes, decorative panels, order of cards.

## 5. Pitfalls already met

- **Rendered order differs from markup order.** The export may reorder cards with CSS `order` or a script. Follow what is rendered.
- **Fonts.** The design names fonts that may be system-only (Segoe UI) and resolve to a fallback on macOS. Ask which self-hosted font stands in, and set titles in the same family the design uses for them; never introduce a heading font the rendered design does not show.
- **Tailwind grid items without a column template** size to their min-content and overflow on mobile: every responsive grid starts with `grid-cols-1` (`minmax(0, 1fr)`).
- **shadcn primitives with fixed sizes.** Variant-prefixed defaults (for example `group-data-horizontal/tabs:h-8` on `TabsList`) beat a plain `h-auto` in class merging, so taller tabs spill out of the list. Check every primitive's base classes when the design's element is larger, and fix the primitive once.
- **Custom font-size tokens named like colours** (`text-card`) are merged away by `cn()` next to a colour class. Name size tokens so they cannot collide (`text-service`) and register them in `src/lib/utils.ts`.
- **Class props on custom components** (`currencyClassName`) are flagged by the i18next lint unless the config excludes `.+ClassName`.
- **Prices drawn as a large number and a small currency** need `formatPriceParts` and `SplitPrice`, with a real space between the parts.
- **The design overflows too.** An export that scrolls sideways at 375 px is not copied in that respect; the app must not overflow at 360 px.
