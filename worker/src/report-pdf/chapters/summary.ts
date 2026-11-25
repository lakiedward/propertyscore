import { CATEGORY_KEYS, type CategoryKey } from '../../scoring/categories.ts';
import { SCORE_BANDS, scoreBand } from '../bands.ts';
import type { ChapterOutput } from '../chapter.ts';
import { categoryTile } from '../components.ts';
import { esc, escKeepingRangesTogether, reportFormat, localize } from '../format.ts';
import { icon, logo } from '../icons.ts';
import { CATEGORY_GROUPS } from '../labels.ts';
import { addressMarker, around, mapHtml, ring, type MapSpec } from '../maps.ts';
import type { CategorySummary, ReportData, ReportLocale } from '../report-data.ts';
import { CATEGORY_THEME, categoryTheme } from '../theme.ts';

type Scored = { key: CategoryKey; score: number; average: number; summary: CategorySummary };

const HIGHLIGHTS = 3;
const WEAK_POINT_BELOW = 55;
const NEAR_RING_M = 500;
const RING_CIRCUMFERENCE = 345.58;
const HISTOGRAM = { width: 640, height: 190, top: 34 };
const STACK_LABEL_FROM = 6;

function scoredCategories(report: ReportData): Scored[] {
  return CATEGORY_KEYS.flatMap((key) => {
    const summary = report.categories[key];
    if (summary.score === null) return [];
    const score = Math.round(summary.score);
    return [{ key, score, average: Math.round(summary.city_avg ?? score), summary }];
  });
}

function isFlat(summary: CategorySummary): boolean {
  return summary.city_min === summary.city_max || summary.histogram.filter(Boolean).length <= 1;
}

function zonePosition(report: ReportData): string {
  const { t } = reportFormat(report.locale);
  const { percentile } = report.zone;
  const city = report.city.name;
  if (percentile === null) return t('Zona adresei, în {0}', 'Area around the address in {0}', city);
  if (percentile >= 90)
    return t('Una dintre cele mai bune zone din {0}', 'One of the best-scoring areas in {0}', city);
  if (percentile >= 60)
    return t('O zonă peste media din {0}', 'An above-average area in {0}', city);
  if (percentile >= 40) return t('O zonă în media din {0}', 'An average area in {0}', city);
  return t('O zonă sub media din {0}', 'A below-average area in {0}', city);
}

function weakest(scored: readonly Scored[]): Scored | undefined {
  const lowest = [...scored].sort((left, right) => left.score - right.score)[0];
  return lowest && lowest.score < WEAK_POINT_BELOW ? lowest : undefined;
}

function heroLead(locale: ReportLocale, scored: readonly Scored[]): string {
  const { t, lowerFirst } = reportFormat(locale);
  if (scored.length === 0) {
    return t(
      'Nu avem suficiente date pentru a calcula scorurile acestei adrese.',
      'There is not enough data to calculate scores for this address.',
    );
  }
  const strong = [...scored]
    .sort((left, right) => right.score - right.average - (left.score - left.average))
    .slice(0, 2)
    .map((item) => lowerFirst(categoryTheme(locale, item.key).name));
  const weak = weakest(scored);
  const lead = t(
    'Zona stă cel mai bine la {0}.',
    "The area's strongest scores are in {0}.",
    strong.join(t(' și ', ' and ')),
  );
  return weak
    ? t(
        '{0} Punctul slab e {1}.',
        '{0} The weakest score is in {1}.',
        lead,
        lowerFirst(categoryTheme(locale, weak.key).name),
      )
    : t(
        '{0} Niciunul dintre scorurile disponibile nu e slab.',
        '{0} None of the available scores are low.',
        lead,
      );
}

function scoreRing(score: number | null): string {
  const offset = RING_CIRCUMFERENCE * (1 - (score ?? 0) / 100);
  return `<div class="ring2" style="--rs:84px"><svg viewBox="0 0 124 124"><circle class="t" cx="62" cy="62" r="55"/><circle class="v" cx="62" cy="62" r="55" stroke-dasharray="${String(RING_CIRCUMFERENCE)}" style="stroke-dashoffset:${offset.toFixed(2)}"/></svg><div class="n"><b>${score === null ? '–' : String(Math.round(score))}</b><span>/100</span></div></div>`;
}

function hero(report: ReportData, scored: readonly Scored[], map: MapSpec): string {
  const { t, formatNumber, formatDate } = reportFormat(report.locale);
  const { zone } = report;
  const band =
    zone.score === null
      ? t('Fără date', 'No data')
      : localize(report.locale, scoreBand(Math.round(zone.score)).label);
  const average =
    zone.score === null || zone.city_avg === null
      ? ''
      : t('Media orașului {0}.', 'City average: {0}.', String(Math.round(zone.city_avg)));
  const best =
    zone.score === null || zone.city_max === null || zone.city_max === undefined
      ? ''
      : t(' Cel mai bun scor {0}.', ' Best score: {0}.', String(Math.round(zone.city_max)));
  const area = report.sections.investment?.declared.area_m2;
  const declared =
    area === null || area === undefined
      ? `<li>${t('{0}Fără detalii declarate', '{0}No declared details', icon('info'))}</li>`
      : `<li>${t('{0}Suprafață declarată: {1} m²', '{0}Declared floor area: {1} m²', icon('info'), formatNumber(area))}</li>`;
  const mapKey = `<div class="key"><b>${t('Pe hartă', 'On the map')}</b><span><i style="background:#103F32;border-radius:50%;width:10px;height:10px"></i>${t('Adresa', 'Address')}</span><span><i style="background:#8FB05A"></i>${t('Parcuri și grădini', 'Parks and gardens')}</span><span><i style="background:transparent;border:2px solid #3F6E1B;height:10px;width:10px;border-radius:50%"></i>${t('Raza de {0} m', '{0} m radius', String(NEAR_RING_M))}</span></div>`;
  return `<section class="hD"><div class="wrap hd-in"><span class="brand">${logo('scoreDark', 'lg')}<span class="lk score"><span>Property</span><b>Score</b></span></span><span class="hbtn sc">${logo('smart', 'lg')}<span class="lk sc"><span>Smart</span><b>Check</b></span></span></div><div class="wrap hD-g"><div class="hD-txt"><span class="eb-l">${t('Smart Check · raport nr. {0} · generat pe {1}', 'Smart Check · report no. {0} · generated on {1}', String(report.number), esc(formatDate(report.generatedAt)))}</span><h1>${escKeepingRangesTogether(report.addressText)}</h1><p class="lead">${esc(heroLead(report.locale, scored))}</p><span class="meta-l">${t('{0}Calculat pe datele din {1} · rază de până la 1,2 km', '{0}Based on data from {1} · radius up to 1.2 km', icon('db'), esc(formatDate(report.snapshot.period)))}</span><ul class="facts"><li class="ok2">${t('{0}Raport gata', '{0}Report ready', icon('check'))}</li>${declared}</ul></div><div class="hD-vis"><div class="hD-off"></div><div class="hD-map">${mapHtml(report.locale, map, mapKey)}</div><div class="hD-float">${scoreRing(zone.score)}<div class="zt"><span class="eyebrow">${t('Scor de zonă', 'Area score')}</span><strong>${esc(band)}</strong><small>${esc(average + best)}</small></div></div><span class="hD-lab">${t('{0}Spații verzi în jurul adresei · OpenStreetMap', '{0}Green spaces around the address · OpenStreetMap', icon('layers'))}</span></div></div></section>`;
}

function headline(report: ReportData, scored: readonly Scored[]): string {
  const { t, lowerFirst } = reportFormat(report.locale);
  if (scored.length === 0)
    return t(
      'Scoruri indisponibile pentru această adresă',
      'Scores are not available for this address',
    );
  const weak = weakest(scored);
  const position = esc(zonePosition(report));
  if (!weak) return position;
  return `${t('{0}, cu un punct slab: ', '{0}, with one weak point: ', position)}<span class="hl">${esc(lowerFirst(categoryTheme(report.locale, weak.key).name))}</span>`;
}

function formattedScoreCount(locale: ReportLocale, count: number): string {
  return reportFormat(locale).plural(count, ['scor', 'score'], 'scoruri', ['de scoruri', 'scores']);
}

function summaryHead(report: ReportData, scored: readonly Scored[]): string {
  const { t, plural } = reportFormat(report.locale);
  const { zone } = report;
  const contexts = [
    report.sections.seismic ? t('riscul seismic', 'seismic risk') : '',
    report.sections.investment ? t('investiția', 'investment') : '',
  ].filter(Boolean);
  const zoneLine =
    zone.score === null
      ? ''
      : t(
          ' Zona primește {0} din 100{1}.',
          ' The area scores {0} out of 100{1}.',
          String(Math.round(zone.score)),
          zone.city_avg === null
            ? ''
            : t(
                ', față de {0} media orașului',
                ', compared with the city average of {0}',
                String(Math.round(zone.city_avg)),
              ),
        );
  const contextLine = contexts.length
    ? t(
        'Raportul include {0} ca informații de context.',
        'This report includes {0} for context.',
        contexts.join(t(' și ', ' and ')),
      )
    : '';
  const scoreCount = formattedScoreCount(report.locale, scored.length);
  const contextCount = plural(contexts.length, ['context', 'context chapter'], 'contexte', [
    'de contexte',
    'context chapters',
  ]);
  const lead =
    scored.length === 0
      ? contextLine
      : [
          t(
            'Am calculat {0} pe o rază de până la 1,2 km.{1}',
            'We calculated {0} within a radius of up to 1.2 km.{1}',
            scoreCount,
            zoneLine,
          ),
          contextLine,
          t('Fiecare scor are capitolul lui.', 'Each score has its own chapter.'),
        ]
          .filter(Boolean)
          .join(' ');
  return `<div class="sx-head"><div class="eyebrow"><span>${t('Pe scurt', 'At a glance')}</span><span class="acc" style="--c:#3F6478"><i></i>${scoreCount} · ${contextCount}</span></div><h2>${headline(report, scored)}</h2>${lead ? `<p class="lead">${esc(lead)}</p>` : ''}</div>`;
}

function standing(locale: ReportLocale, item: Scored, cityName: string): string {
  const { t } = reportFormat(locale);
  const { percentile } = item.summary;
  if (isFlat(item.summary))
    return t(
      'Estimare la nivel de oraș, la fel pentru toate zonele.',
      'Citywide estimate, the same for every area.',
    );
  if (percentile === null) return '';
  if (percentile >= 99)
    return t('Printre cele mai bune zone din oraș.', 'Among the best-scoring areas in the city.');
  if (percentile <= 1)
    return t(
      'Printre cele mai slabe zone din oraș.',
      'Among the lowest-scoring areas in the city.',
    );
  return t(
    'Mai bine decât {0}% din zonele din {1}.',
    'Better than {0}% of areas in {1}.',
    String(Math.round(percentile)),
    cityName,
  );
}

function cardTitle(locale: ReportLocale, item: Scored): string {
  const { t } = reportFormat(locale);
  const name = categoryTheme(locale, item.key).name;
  if (isFlat(item.summary))
    return t('{0}: la fel în tot orașul', '{0}: the same across the city', name);
  if (item.score > item.average) {
    return (item.summary.percentile ?? 0) >= 90
      ? t('{0} mult peste oraș', '{0} well above the city average', name)
      : t('{0} peste media orașului', '{0} above the city average', name);
  }
  if (item.score < item.average)
    return t('{0} sub media orașului', '{0} below the city average', name);
  return t('{0} la media orașului', '{0} at the city average', name);
}

function bigCard(locale: ReportLocale, item: Scored, cityName: string): string {
  const { t } = reportFormat(locale);
  const theme = CATEGORY_THEME[item.key];
  return `<div class="bigc" style="--c:${theme.color}"><span class="top">${categoryTile(item.key)}<span class="sc">${String(item.score)}<small>/100</small></span></span><b class="t">${esc(cardTitle(locale, item))}</b><span class="d">${t('{0} Media orașului: {1}.', '{0} City average: {1}.', esc(standing(locale, item, cityName)), String(item.average))}</span></div>`;
}

function highlights(report: ReportData, scored: readonly Scored[]): string {
  const { t } = reportFormat(report.locale);
  const byLead = [...scored].sort(
    (left, right) => right.score - right.average - (left.score - left.average),
  );
  const good = byLead.slice(0, HIGHLIGHTS);
  const watch = byLead.slice(HIGHLIGHTS).slice(-HIGHLIGHTS).reverse();
  const block = (label: string, tone: string, iconHtml: string, items: readonly Scored[]) =>
    items.length === 0
      ? ''
      : `<div class="sC-lab ${tone}">${iconHtml}${label}</div><div class="sC-cards">${items.map((item) => bigCard(report.locale, item, report.city.name)).join('')}</div>`;
  return (
    block(t('Ce e bun', 'What stands out'), 'g', icon('up'), good) +
    block(t('La ce să fii atent', 'What to watch for'), 'b', icon('warn'), watch)
  );
}

function difference(locale: ReportLocale, item: Scored): string {
  const { t } = reportFormat(locale);
  const delta = item.score - item.average;
  if (isFlat(item.summary))
    return `<span class="dl same">${t('la fel în tot orașul', 'same across the city')}</span>`;
  if (Math.abs(delta) < 2)
    return `<span class="dl same">${t('la media orașului', 'at the city average')}</span>`;
  return `<span class="dl ${delta > 0 ? 'up' : 'dn'}">${t('{0}{1} față de oraș', '{0}{1} compared with the city average', delta > 0 ? '+' : '−', String(Math.abs(delta)))}</span>`;
}

function allScores(report: ReportData, scored: readonly Scored[]): string {
  const { t } = reportFormat(report.locale);
  const totalWeight = scored.reduce((sum, item) => sum + item.summary.weight, 0) || 1;
  const axis = `<div class="scC-ax"><span></span><span class="sc-axis">${[0, 25, 50, 75, 100].map((value) => `<i style="left:${String(value)}%">${String(value)}</i>`).join('')}</span><span></span></div>`;
  const groups = CATEGORY_GROUPS.map((group) => {
    const rows = group.keys.flatMap((key) => {
      const item = scored.find((candidate) => candidate.key === key);
      if (!item) return [];
      const theme = categoryTheme(report.locale, key);
      const weight = Math.round((item.summary.weight / totalWeight) * 100);
      return [
        `<div class="scC-r" style="--c:${theme.color};--bg:${theme.tint}"><span class="nm">${categoryTile(key)}<span><b>${esc(theme.name)}</b><small>${String(weight)}%</small></span></span><span class="pl"><span class="rg" style="left:0;width:${String(item.score)}%"></span><u style="left:${String(item.average)}%"></u><span class="dt" style="left:${String(item.score)}%"><b class="num">${String(item.score)}</b></span></span>${difference(report.locale, item)}</div>`,
      ];
    });
    return rows.length === 0
      ? ''
      : `<div class="glab scC-lab"><span>${esc(localize(report.locale, group.title))}</span></div>${rows.join('')}`;
  });
  const zoneScore = report.zone.score;
  let zone = '';
  if (zoneScore !== null && scored.length > 0) {
    const score = String(Math.round(zoneScore));
    const calculation =
      scored.length === 1
        ? t(
            'Scorul de zonă ({0}) se bazează pe singurul scor disponibil.',
            'The area score ({0}) is based on the only available score.',
            score,
          )
        : t(
            'Scorul de zonă ({0}) este media ponderată a celor {1}.',
            'The area score ({0}) is the weighted average of the {1}.',
            score,
            formattedScoreCount(report.locale, scored.length),
          );
    const context = t(
      'Riscul seismic și investiția sunt context și nu intră în scor.',
      'Seismic risk and investment are context and do not count towards the score.',
    );
    zone = `<p class="hint sc-note">${calculation} ${context}</p>`;
  }
  return `<div class="scsec"><div class="card scC"><div class="sc-h"><div><div class="eyebrow">${t('Toate scorurile · ponderea în scor lângă nume', 'All scores · weights shown next to each name')}</div><h3>${t('Toate scorurile, față de tot orașul', 'All scores compared with the city')}</h3></div><span class="legend"><span><i></i>${t('adresa', 'address')}</span><span><u></u>${t('media orașului', 'city average')}</span></span></div><p class="hint">${t('Fiecare bară pornește de la 0 și se oprește la scorul adresei. Linia neagră e media orașului.', 'Each bar goes from 0 to the address score. The black line shows the city average.')}</p>${axis}${groups.join('')}${zone}</div></div>`;
}

function zoneHistogram(report: ReportData, score: number): string {
  const { t } = reportFormat(report.locale);
  const { histogram, city_avg: average } = report.zone;
  const { width, height, top } = HISTOGRAM;
  const binWidth = width / histogram.length;
  const binSize = 100 / histogram.length;
  const peak = Math.max(...histogram, 1);
  const own = Math.min(histogram.length - 1, Math.floor(score / binSize));
  const grid = [25, 50, 75]
    .map((value) => {
      const x = (value / 100) * width;
      return `<line class="gl" x1="${String(x)}" x2="${String(x)}" y1="${String(top)}" y2="${String(height + top)}"/>`;
    })
    .join('');
  const bars = histogram
    .map((count, index) => {
      const barHeight = Math.max(count ? 3 : 0, (count / peak) * (height - 8));
      const fill = index === own ? '#2F5164' : scoreBand(index * binSize + 2).fill;
      return `<rect class="hb" x="${String(index * binWidth + 2)}" y="${String(height + top - barHeight)}" width="${String(binWidth - 4)}" height="${String(barHeight)}" rx="4" style="fill:${fill}"/>`;
    })
    .join('');
  const averageX = ((average ?? 0) / 100) * width;
  const averageMark =
    average === null
      ? ''
      : `<line class="av" x1="${String(averageX)}" x2="${String(averageX)}" y1="${String(top - 10)}" y2="${String(height + top)}"/><text class="avt" x="${String(averageX - 6)}" y="${String(top - 14)}" text-anchor="${averageX < 150 ? 'start' : 'end'}" dx="${averageX < 150 ? '12' : '0'}">${t('media orașului · {0}', 'city average · {0}', String(Math.round(average)))}</text>`;
  const ownX = own * binWidth + binWidth / 2;
  const ownHeight = ((histogram[own] ?? 0) / peak) * (height - 8);
  const pin = `<g class="mepin" transform="translate(${String(ownX)},${String(height + top - ownHeight - 10)})"><rect x="-44" y="-26" width="88" height="24" rx="12"/><text y="-9" text-anchor="middle">${t('adresa · {0}', 'address · {0}', String(score))}</text><path d="M-5 -2 L0 4 L5 -2z"/></g>`;
  const bands = SCORE_BANDS.map((band, index) => {
    const end = SCORE_BANDS[index + 1]?.from ?? 100;
    const x = (band.from / 100) * width;
    const bandWidth = ((end - band.from) / 100) * width;
    return `<rect x="${String(x + 1)}" y="${String(height + top + 8)}" width="${String(bandWidth - 2)}" height="6" rx="3" style="fill:${band.fill}"/><text x="${String(x + bandWidth / 2)}" y="${String(height + top + 30)}" text-anchor="middle">${esc(localize(report.locale, band.label))}</text>`;
  }).join('');
  return `<svg class="fhist d" viewBox="0 0 ${String(width)} ${String(height + top + 44)}">${grid}${bars}${averageMark}${pin}<g class="bandax">${bands}</g></svg>`;
}

function formation(report: ReportData, scored: readonly Scored[]): string {
  const { t, formatNumber } = reportFormat(report.locale);
  const { zone } = report;
  if (zone.score === null || zone.histogram.length === 0) return '';
  const score = Math.round(zone.score);
  const total = zone.histogram.reduce((sum, count) => sum + count, 0);
  const binSize = 100 / zone.histogram.length;
  const own = Math.min(zone.histogram.length - 1, Math.floor(score / binSize));
  const below = zone.histogram.slice(0, own).reduce((sum, count) => sum + count, 0);
  const atLeast = total - below;
  const facts = [
    zone.city_avg === null
      ? ''
      : `<li><b>${score >= zone.city_avg ? '+' : '−'}${String(Math.abs(score - Math.round(zone.city_avg)))}</b>${t(' față de media orașului', ' compared with the city average')}</li>`,
    total === 0
      ? ''
      : `<li><b>${String(Math.floor((below / total) * 100))}%</b>${t(' din zone au un scor mai mic', ' of areas score lower')}</li>`,
    total === 0
      ? ''
      : `<li>${t('doar ', 'only ')}<b>${formatNumber(atLeast)}</b>${t(' zone din {0} au {1}+', ' of {0} areas score {1}+', formatNumber(total), String(own * binSize))}</li>`,
  ].join('');
  const totalWeight = scored.reduce((sum, item) => sum + item.summary.weight, 0) || 1;
  const parts = scored
    .map((item) => ({ item, points: (item.score * item.summary.weight) / totalWeight }))
    .sort((left, right) => right.item.summary.weight - left.item.summary.weight);
  const lost = Math.max(0, 100 - parts.reduce((sum, part) => sum + part.points, 0));
  const stack = parts
    .map(
      (part) =>
        `<span style="flex:${part.points.toFixed(2)};--c:${CATEGORY_THEME[part.item.key].color}">${part.points >= STACK_LABEL_FROM ? formatNumber(part.points, 1) : ''}</span>`,
    )
    .join('');
  const chips = parts
    .map(
      (part) =>
        `<span class="fchip" style="--c:${CATEGORY_THEME[part.item.key].color}"><i></i>${esc(categoryTheme(report.locale, part.item.key).name)} <b class="num">${formatNumber(part.points, 1)}</b></span>`,
    )
    .join('');
  return `<div class="fsec"><div class="card fB"><div class="fB-top"><div class="fB-score"><div class="eyebrow">${t('Scorul zonei', 'Area score')}</div><div class="fB-big"><b class="num">${String(score)}</b><span>/100</span></div><div class="fB-band">${esc(localize(report.locale, scoreBand(score).label))}</div><ul>${facts}</ul></div><div class="fB-hist"><h3>${t('Unde se află zona față de tot orașul', 'How the area compares with the rest of the city')}</h3><p class="hint">${t('Fiecare coloană e un grup de zone cu scoruri apropiate.', 'Each column groups areas with similar scores.')}</p>${zoneHistogram(report, score)}</div></div><div class="fB-form"><h3>${t('Din ce se adună cele {0} de puncte', 'Where the {0} points come from', String(score))}</h3><div class="fstack">${stack}<span class="lost" style="flex:${lost.toFixed(2)}">−${formatNumber(lost, 1)}</span></div><div class="fchips">${chips}<span class="fchip lostc"><i></i>${t('pierdut ', 'unearned ')}<b class="num">${formatNumber(lost, 1)}</b></span></div></div></div></div>`;
}

export function summaryChapter(report: ReportData): ChapterOutput {
  const scored = scoredCategories(report);
  const center: [number, number] = [report.longitude, report.latitude];
  const green = report.sections.green;
  const heroMap: MapSpec = {
    id: 'map-hero',
    center,
    fit: around(center, NEAR_RING_M * 1.25),
    padding: 10,
    layers: [
      ...(green
        ? [{ kind: 'fill' as const, data: green.areas, color: '#8FB05A', opacity: 0.75 }]
        : []),
      { kind: 'line', data: ring(center, NEAR_RING_M), color: '#3F6E1B', width: 1.5 },
    ],
    markers: [addressMarker(center, report.addressText.split(',')[0])],
  };
  const scoresPage =
    scored.length === 0
      ? ''
      : `<article class="chapter"><div class="wrap"><div class="sx sC">${allScores(report, scored)}${formation(report, scored)}</div></div></article>`;
  const html = `<article class="chapter cover">${hero(report, scored, heroMap)}<div class="wrap"><div class="sx sC">${summaryHead(report, scored)}${highlights(report, scored)}</div></div></article>${scoresPage}`;
  return { html, maps: [heroMap] };
}
