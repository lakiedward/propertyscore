import type { CategoryKey } from '../scoring/categories.ts';
import { SCORE_BANDS, bandWidthPercent, scoreBand } from './bands.ts';
import { esc, reportFormat, labelFor, localize } from './format.ts';
import { icon, type IconName } from './icons.ts';
import { CATEGORY_SCOPE, CATEGORY_SOURCES, SOURCE_LABELS } from './labels.ts';
import type { CategorySummary, ReportData, ReportLocale } from './report-data.ts';
import { CATEGORY_THEME, categoryTheme } from './theme.ts';

const NARROW_CITY_SPREAD = 10;
const CLOSE_TO_AVERAGE = 12;

export function iconTile(name: IconName, color: string, tint: string, className = 'ico'): string {
  return `<span class="${className}" style="--ibg:${tint};--ic:${color};--c:${color}">${icon(name)}</span>`;
}

export function categoryTile(key: CategoryKey): string {
  const theme = CATEGORY_THEME[key];
  return iconTile(theme.icon, theme.color, theme.tint);
}

export function chapterHead(
  locale: ReportLocale,
  input: {
    eyebrow: string;
    color: string;
    precision?: string;
    title: string;
    lead?: string;
  },
): string {
  const { t } = reportFormat(locale);
  const precision = input.precision
    ? `<span class="acc" style="--c:${input.color}"><i></i>${t('Precizie: {0}', 'Precision: {0}', esc(input.precision))}</span>`
    : '';
  const lead = input.lead ? `<p class="lead">${esc(input.lead)}</p>` : '';
  return `<div class="ch-head" style="--c:${input.color}"><div class="eyebrow"><span style="color:${input.color}">${esc(input.eyebrow)}</span>${precision}</div><h2>${esc(input.title)}</h2>${lead}</div>`;
}

export function categoryEyebrow(
  locale: ReportLocale,
  key: CategoryKey,
  summary: CategorySummary,
  name?: string,
): string {
  const { t } = reportFormat(locale);
  const label = name ?? categoryTheme(locale, key).name;
  if (summary.score === null) return t('{0} · fără date', '{0} · no data', label);
  const score = Math.round(summary.score);
  return `${label} · ${String(score)} / 100 · ${localize(locale, scoreBand(score).label)}`;
}

function bandTrack(
  locale: ReportLocale,
  summary: CategorySummary,
  score: number,
  color: string,
): string {
  const { t } = reportFormat(locale);
  const track = SCORE_BANDS.map(
    (band, index) =>
      `<i style="flex:${String(bandWidthPercent(index))};background:${band.fill}"></i>`,
  ).join('');
  const { city_min: min, city_max: max, city_avg: average } = summary;
  const range =
    min === null || min === undefined || max === null || max === undefined
      ? ''
      : `<div class="scvs-r" style="left:${String(min)}%;width:${String(max - min)}%"><span>${t('Zonele orașului: {0}–{1}', 'City area scores: {0}–{1}', String(Math.round(min)), String(Math.round(max)))}</span></div>`;
  const label =
    average !== null && Math.abs(average - score) < CLOSE_TO_AVERAGE
      ? ''
      : `<span>${t('Media {0}', 'Average {0}', String(Math.round(average ?? 0)))}</span>`;
  const mean =
    average === null ? '' : `<div class="scvs-avg" style="left:${String(average)}%">${label}</div>`;
  return `<div class="scvs"><div class="scvs-t">${track}</div>${range}${mean}<div class="scvs-me" style="left:${String(score)}%;--c:${color}"><b>${t('Tu · {0}', 'You · {0}', String(score))}</b></div></div>`;
}

function standing(
  locale: ReportLocale,
  summary: CategorySummary,
  cityName: string,
  better: string,
): string {
  const { t } = reportFormat(locale);
  const spread = (summary.city_max ?? 100) - (summary.city_min ?? 0);
  if (summary.percentile === null || spread < NARROW_CITY_SPREAD) {
    return summary.city_avg === null
      ? ''
      : `${t('Media orașului: ', 'City average: ')}<b>${String(Math.round(summary.city_avg))}</b>`;
  }
  return `${t('{0} decât ', '{0} than ', esc(better))}<b>${String(Math.round(summary.percentile))}%</b>${t(' din zonele din {0}', ' of areas in {0}', esc(cityName))}`;
}

export function scoreCard(
  key: CategoryKey,
  report: ReportData,
  options: { better?: string; label?: string } = {},
): string {
  const { t } = reportFormat(report.locale);
  const summary = report.categories[key];
  const theme = categoryTheme(report.locale, key);
  if (summary.score === null) {
    return `<section class="card scv nodata">${icon('info')}<p><b>${t('{0}: fără date.', '{0}: no data.', esc(theme.name))}</b>${t(' Scorul se adaugă când sursele lui sunt importate. Până atunci nu intră în scorul de zonă.', ' This score will be added when its sources are imported. Until then, it does not count towards the area score.')}</p></section>`;
  }
  const score = Math.round(summary.score);
  const band = scoreBand(score);
  const scope = CATEGORY_SCOPE[key];
  const label = options.label ? `<span class="scv-k">${esc(options.label)}</span>` : '';
  return `<section class="card scv scv1" style="--c:${theme.color}"><div class="scv1-s">${label}<span class="scv-big" style="color:${theme.color}">${String(score)}<small>/100</small></span><span class="scv-pill" style="background:${band.fill};color:${band.text}">${esc(localize(report.locale, band.label))}</span></div><div class="scv1-r"><p class="scv-h">${standing(report.locale, summary, report.city.name, options.better ?? t('Mai bine', 'Better'))}</p>${bandTrack(report.locale, summary, score, theme.color)}</div><div class="scvm"><span class="y">${icon('check')}<span><b>${t('Ține cont de', 'Includes')}</b> ${esc(localize(report.locale, scope.includes))}</span></span><span class="n">${icon('x')}<span><b>${t('Nu ține cont de', 'Excludes')}</b> ${esc(localize(report.locale, scope.excludes))}</span></span></div></section>`;
}

export function footnote(text: string): string {
  return `<p class="sfhon">${icon('info')}<span>${esc(text)}</span></p>`;
}

export function sourceDate(report: ReportData, key: string): string | null {
  const { formatSourceDate } = reportFormat(report.locale);
  if (key === 'eea_industrial' && report.sections.industry?.source.legacy_observed_at) return null;
  if (key === 'siiir' && report.sections.education?.legacy_observed_at) return null;
  if (key === 'gtfs') {
    const section = report.sections.accessibility;
    return section?.status === 'scored' && section.data_quality === 'gtfs' && section.reference_date
      ? formatSourceDate(section.reference_date)
      : null;
  }
  const value = report.snapshot.sourceDates[key];
  return value === undefined ? null : formatSourceDate(value);
}

function sourceList(report: ReportData, keys: readonly string[]): string {
  return keys
    .flatMap((key) => {
      const date = sourceDate(report, key);
      return date === null ? [] : [`${labelFor(report.locale, SOURCE_LABELS, key)} · ${date}`];
    })
    .join(' · ');
}

export function chapterSources(report: ReportData, keys: readonly CategoryKey[]): string {
  const { t, formatNumber } = reportFormat(report.locale);
  const totalWeight =
    Object.values(report.categories).reduce((sum, summary) => sum + summary.weight, 0) || 1;
  const sources = sourceList(report, [...new Set(keys.flatMap((key) => CATEGORY_SOURCES[key]))]);
  const weights = keys.flatMap((key) => {
    const summary = report.categories[key];
    if (summary.score === null) return [];
    const weight = (summary.weight / totalWeight) * 100;
    const points = (summary.score * weight) / 100;
    const name = keys.length > 1 ? `${categoryTheme(report.locale, key).name}: ` : '';
    return [
      t(
        '{0}{1}% din 100. Adresa aduce {2} puncte din {3}.',
        '{0}{1}% of the overall score. This address contributes {2} points out of {3}.',
        name,
        formatNumber(weight),
        formatNumber(points, 1),
        formatNumber(weight),
      ),
    ];
  });
  const sourcesLine = sources ? `<p><b>${t('Surse:', 'Sources:')}</b> ${esc(sources)}</p>` : '';
  const weightLine =
    weights.length === 0
      ? ''
      : `<p><b>${t('Pondere în scorul de zonă:', 'Weight in the area score:')}</b> ${esc(weights.join(' '))}</p>`;
  if (!sourcesLine && !weightLine) return '';
  return `<div class="how"><div class="how-t">${t('{0}Surse și date', '{0}Sources and data', icon('info'))}</div><div class="in">${sourcesLine}${weightLine}</div></div>`;
}

export function chapter(body: string, className = ''): string {
  return `<article class="chapter ${className}"><div class="wrap"><div class="ch">${body}</div></div></article>`;
}
