import type { CategoryKey } from '../scoring/categories.ts';
import { SCORE_BANDS, bandWidthPercent, scoreBand } from './bands.ts';
import { esc, formatNumber, formatSourceDate } from './format.ts';
import { icon, type IconName } from './icons.ts';
import { CATEGORY_SCOPE, CATEGORY_SOURCES, SOURCE_LABELS } from './labels.ts';
import type { CategorySummary, ReportData } from './report-data.ts';
import { CATEGORY_THEME } from './theme.ts';

const NARROW_CITY_SPREAD = 10;
const CLOSE_TO_AVERAGE = 12;

export function iconTile(name: IconName, color: string, tint: string, className = 'ico'): string {
  return `<span class="${className}" style="--ibg:${tint};--ic:${color};--c:${color}">${icon(name)}</span>`;
}

export function categoryTile(key: CategoryKey): string {
  const theme = CATEGORY_THEME[key];
  return iconTile(theme.icon, theme.color, theme.tint);
}

export function chapterHead(input: {
  eyebrow: string;
  color: string;
  precision?: string;
  title: string;
  lead?: string;
}): string {
  const precision = input.precision
    ? `<span class="acc" style="--c:${input.color}"><i></i>Precizie: ${esc(input.precision)}</span>`
    : '';
  const lead = input.lead ? `<p class="lead">${esc(input.lead)}</p>` : '';
  return `<div class="ch-head"><div class="eyebrow"><span style="color:${input.color}">${esc(input.eyebrow)}</span>${precision}</div><h2>${esc(input.title)}</h2>${lead}</div>`;
}

export function categoryEyebrow(key: CategoryKey, summary: CategorySummary, name?: string): string {
  const label = name ?? CATEGORY_THEME[key].name;
  if (summary.score === null) return `${label} · fără date`;
  const score = Math.round(summary.score);
  return `${label} · ${String(score)} / 100 · ${scoreBand(score).label}`;
}

function bandTrack(summary: CategorySummary, score: number, color: string): string {
  const track = SCORE_BANDS.map(
    (band, index) =>
      `<i style="flex:${String(bandWidthPercent(index))};background:${band.fill}"></i>`,
  ).join('');
  const { city_min: min, city_max: max, city_avg: average } = summary;
  const range =
    min === null || min === undefined || max === null || max === undefined
      ? ''
      : `<div class="scvs-r" style="left:${String(min)}%;width:${String(max - min)}%"><span>Zonele orașului: ${String(Math.round(min))}–${String(Math.round(max))}</span></div>`;
  const label =
    average !== null && Math.abs(average - score) < CLOSE_TO_AVERAGE
      ? ''
      : `<span>Media ${String(Math.round(average ?? 0))}</span>`;
  const mean =
    average === null ? '' : `<div class="scvs-avg" style="left:${String(average)}%">${label}</div>`;
  return `<div class="scvs"><div class="scvs-t">${track}</div>${range}${mean}<div class="scvs-me" style="left:${String(score)}%;--c:${color}"><b>Tu · ${String(score)}</b></div></div>`;
}

function standing(summary: CategorySummary, cityName: string, better: string): string {
  const spread = (summary.city_max ?? 100) - (summary.city_min ?? 0);
  if (summary.percentile === null || spread < NARROW_CITY_SPREAD) {
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
  const theme = CATEGORY_THEME[key];
  if (summary.score === null) {
    return `<section class="card scv nodata">${icon('info')}<p><b>${esc(theme.name)}: fără date.</b> Scorul se adaugă când sursele lui sunt importate. Până atunci nu intră în scorul de zonă.</p></section>`;
  }
  const score = Math.round(summary.score);
  const band = scoreBand(score);
  const scope = CATEGORY_SCOPE[key];
  const label = options.label ? `<span class="scv-k">${esc(options.label)}</span>` : '';
  return `<section class="card scv scv1" style="--c:${theme.color}"><div class="scv1-s">${label}<span class="scv-big" style="color:${theme.color}">${String(score)}<small>/100</small></span><span class="scv-pill" style="background:${band.fill};color:${band.text}">${esc(band.label)}</span></div><div class="scv1-r"><p class="scv-h">${standing(summary, report.city.name, options.better ?? 'Mai bine')}</p>${bandTrack(summary, score, theme.color)}</div><div class="scvm"><span class="y">${icon('check')}<span><b>Ține cont de</b> ${esc(scope.includes)}</span></span><span class="n">${icon('x')}<span><b>Nu ține cont de</b> ${esc(scope.excludes)}</span></span></div></section>`;
}

export function footnote(text: string): string {
  return `<p class="sfhon">${icon('info')}<span>${esc(text)}</span></p>`;
}

export function sourceDate(report: ReportData, key: string): string | null {
  const value = report.snapshot.sourceDates[key];
  return value === undefined ? null : formatSourceDate(value);
}

function sourceList(report: ReportData, keys: readonly string[]): string {
  return keys
    .flatMap((key) => {
      const date = sourceDate(report, key);
      return date === null ? [] : [`${SOURCE_LABELS[key] ?? key} · ${date}`];
    })
    .join(' · ');
}

export function chapterSources(report: ReportData, keys: readonly CategoryKey[]): string {
  const totalWeight =
    Object.values(report.categories).reduce((sum, summary) => sum + summary.weight, 0) || 1;
  const sources = sourceList(report, [...new Set(keys.flatMap((key) => CATEGORY_SOURCES[key]))]);
  const weights = keys.flatMap((key) => {
    const summary = report.categories[key];
    if (summary.score === null) return [];
    const weight = (summary.weight / totalWeight) * 100;
    const points = (summary.score * weight) / 100;
    const name = keys.length > 1 ? `${CATEGORY_THEME[key].name}: ` : '';
    return [
      `${name}${formatNumber(weight)}% din 100. Adresa aduce ${formatNumber(points, 1)} puncte din ${formatNumber(weight)}.`,
    ];
  });
  const sourcesLine = sources ? `<p><b>Surse:</b> ${esc(sources)}</p>` : '';
  const weightLine =
    weights.length === 0
      ? ''
      : `<p><b>Pondere în scorul de zonă:</b> ${esc(weights.join(' '))}</p>`;
  if (!sourcesLine && !weightLine) return '';
  return `<div class="how"><div class="how-t">${icon('info')}Surse și date</div><div class="in">${sourcesLine}${weightLine}</div></div>`;
}

export function chapter(body: string, className = ''): string {
  return `<article class="chapter ${className}"><div class="wrap"><div class="ch">${body}</div></div></article>`;
}
