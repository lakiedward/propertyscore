import type { CategoryKey } from '../scoring/categories.ts';
import { SCORE_BANDS, bandWidthPercent, scoreBand } from './bands.ts';
import { esc, formatNumber } from './format.ts';
import { CATEGORY_LABELS, CATEGORY_SCOPE } from './labels.ts';
import type { CategorySummary, ReportData } from './report-data.ts';

export type Row = {
  title: string;
  detail?: string;
  value?: string;
  unit?: string;
  marker?: string;
  dot?: string;
  tags?: readonly string[];
};

export function chapterHead(input: {
  eyebrow: string;
  precision?: string;
  title: string;
  lead?: string;
}): string {
  const chip = input.precision ? `<span class="chip">Precizie: ${esc(input.precision)}</span>` : '';
  const lead = input.lead ? `<p class="lead">${esc(input.lead)}</p>` : '';
  return `<header class="chapter-head"><p class="eyebrow">${esc(input.eyebrow)}${chip}</p><h2>${esc(input.title)}</h2>${lead}</header>`;
}

export function categoryEyebrow(key: CategoryKey, summary: CategorySummary): string {
  const label = CATEGORY_LABELS[key];
  if (summary.score === null) return `${label} · fără date`;
  const score = Math.round(summary.score);
  return `${label} · ${String(score)} / 100 · ${scoreBand(score).label}`;
}

export function rows(items: readonly Row[], columns: 1 | 2 = 1): string {
  const html = items.map((item) => {
    const lead = item.marker
      ? `<span class="num">${esc(item.marker)}</span>`
      : item.dot
        ? `<span class="dot" style="--dot:${esc(item.dot)}"></span>`
        : '';
    const detail = item.detail ? `<span>${esc(item.detail)}</span>` : '';
    const tags = item.tags?.length
      ? `<div class="tags">${item.tags.map((tag) => `<span class="tag">${esc(tag)}</span>`).join('')}</div>`
      : '';
    const unit = item.unit ? `<small>${esc(item.unit)}</small>` : '';
    const value = item.value ? `<span class="row-value">${esc(item.value)}${unit}</span>` : '';
    return `<div class="row">${lead}<div class="row-text"><b>${esc(item.title)}</b>${detail}${tags}</div>${value}</div>`;
  });
  return `<div class="rows${columns === 2 ? ' two' : ''}">${html.join('')}</div>`;
}

export function card(title: string, body: string, eyebrow?: string): string {
  const head = eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : '';
  return `<section class="card">${head}<h3>${esc(title)}</h3>${body}</section>`;
}

export function note(text: string): string {
  return `<p class="note">${esc(text)}</p>`;
}

function bandBar(summary: CategorySummary, score: number): string {
  const track = SCORE_BANDS.map(
    (band, index) =>
      `<i style="flex:${String(bandWidthPercent(index))};background:${band.fill}"></i>`,
  ).join('');
  const average =
    summary.city_avg === null
      ? ''
      : `<span class="band-tick" style="left:${String(summary.city_avg)}%"></span><span class="band-label" style="left:${String(summary.city_avg)}%;top:9.4mm">Media ${String(Math.round(summary.city_avg))}</span>`;
  return `<div class="band-bar"><div class="band-track">${track}</div>${average}<span class="band-you" style="left:${String(score)}%"></span><span class="band-you-label" style="left:${String(Math.min(94, Math.max(6, score)))}%">Tu · ${String(score)}</span></div>`;
}

function percentileTitle(summary: CategorySummary, cityName: string, better: string): string {
  if (summary.percentile === null) {
    return summary.city_avg === null
      ? ''
      : `Media orașului: <b>${String(Math.round(summary.city_avg))}</b>`;
  }
  return `${esc(better)} decât <b>${String(Math.round(summary.percentile))}%</b> din zonele din ${esc(cityName)}`;
}

export function scoreCard(
  key: CategoryKey,
  report: ReportData,
  options: { better?: string; label?: string } = {},
): string {
  const summary = report.categories[key];
  const scope = CATEGORY_SCOPE[key];
  if (summary.score === null) {
    return `<section class="missing"><b>${esc(CATEGORY_LABELS[key])}: fără date.</b> Scorul se adaugă când sursele lui sunt importate. Până atunci nu intră în scorul de zonă.</section>`;
  }
  const score = Math.round(summary.score);
  const band = scoreBand(score);
  const range =
    summary.city_min === null ||
    summary.city_min === undefined ||
    summary.city_max === null ||
    summary.city_max === undefined
      ? ''
      : `<p class="note" style="text-align:center;margin-top:4.5mm">Zonele orașului: ${String(Math.round(summary.city_min))}–${String(Math.round(summary.city_max))}</p>`;
  const label = options.label ? `<p class="eyebrow">${esc(options.label)}</p>` : '';
  return `<section class="card"><div class="score-card"><div>${label}<div class="big">${String(score)}<small> /100</small></div><span class="pill" style="background:${band.fill};color:${band.text}">${esc(band.label)}</span></div><div><h4>${percentileTitle(summary, report.city.name, options.better ?? 'Mai bine')}</h4>${bandBar(summary, score)}${range}</div></div><div class="scope"><span class="yes"><b>Ține cont de</b> ${esc(scope.includes)}</span><span class="no"><b>Nu ține cont de</b> ${esc(scope.excludes)}</span></div></section>`;
}

export function scoreRing(score: number | null, sizeMm: number): string {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const filled = score === null ? 0 : (score / 100) * circumference;
  const text = score === null ? '–' : formatNumber(Math.round(score));
  return `<svg width="${String(sizeMm)}mm" height="${String(sizeMm)}mm" viewBox="0 0 100 100"><circle cx="50" cy="50" r="${String(radius)}" fill="none" stroke="#DCE6EC" stroke-width="8"/><circle cx="50" cy="50" r="${String(radius)}" fill="none" stroke="#2F5164" stroke-width="8" stroke-linecap="round" stroke-dasharray="${filled.toFixed(1)} ${circumference.toFixed(1)}" transform="rotate(-90 50 50)"/><text x="50" y="52" text-anchor="middle" font-size="30" font-weight="800" fill="#172B22">${esc(text)}</text><text x="50" y="68" text-anchor="middle" font-size="11" font-weight="600" fill="#52685B">/100</text></svg>`;
}

export function missingSection(text: string): string {
  return `<section class="missing">${esc(text)}</section>`;
}

export function chapter(body: string): string {
  return `<article class="chapter">${body}</article>`;
}
