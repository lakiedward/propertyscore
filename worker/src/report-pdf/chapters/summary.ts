import { CATEGORY_KEYS, type CategoryKey } from '../../scoring/categories.ts';
import { SCORE_BANDS, scoreBand } from '../bands.ts';
import type { ChapterOutput } from '../chapter.ts';
import { categoryTile } from '../components.ts';
import {
  esc,
  escKeepingRangesTogether,
  formatDate,
  formatNumber,
  lowerFirst,
  plural,
} from '../format.ts';
import { icon, logo } from '../icons.ts';
import { CATEGORY_GROUPS } from '../labels.ts';
import { addressMarker, around, mapHtml, ring, type MapSpec } from '../maps.ts';
import type { CategorySummary, ReportData } from '../report-data.ts';
import { CATEGORY_THEME } from '../theme.ts';

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
  const { percentile } = report.zone;
  const city = report.city.name;
  if (percentile === null) return `Zona adresei, în ${city}`;
  if (percentile >= 90) return `Una dintre cele mai bune zone din ${city}`;
  if (percentile >= 60) return `O zonă peste media din ${city}`;
  if (percentile >= 40) return `O zonă în media din ${city}`;
  return `O zonă sub media din ${city}`;
}

function weakest(scored: readonly Scored[]): Scored | undefined {
  const lowest = [...scored].sort((left, right) => left.score - right.score)[0];
  return lowest && lowest.score < WEAK_POINT_BELOW ? lowest : undefined;
}

function heroLead(scored: readonly Scored[]): string {
  if (scored.length === 0) {
    return 'Nu avem suficiente date pentru a calcula scorurile acestei adrese.';
  }
  const strong = [...scored]
    .sort((left, right) => right.score - right.average - (left.score - left.average))
    .slice(0, 2)
    .map((item) => lowerFirst(CATEGORY_THEME[item.key].name));
  const weak = weakest(scored);
  const lead = `Zona stă cel mai bine la ${strong.join(' și ')}.`;
  return weak
    ? `${lead} Punctul slab e ${lowerFirst(CATEGORY_THEME[weak.key].name)}.`
    : `${lead} Niciunul dintre scorurile disponibile nu e slab.`;
}

function scoreRing(score: number | null): string {
  const offset = RING_CIRCUMFERENCE * (1 - (score ?? 0) / 100);
  return `<div class="ring2" style="--rs:84px"><svg viewBox="0 0 124 124"><circle class="t" cx="62" cy="62" r="55"/><circle class="v" cx="62" cy="62" r="55" stroke-dasharray="${String(RING_CIRCUMFERENCE)}" style="stroke-dashoffset:${offset.toFixed(2)}"/></svg><div class="n"><b>${score === null ? '–' : String(Math.round(score))}</b><span>/100</span></div></div>`;
}

function hero(report: ReportData, scored: readonly Scored[], map: MapSpec): string {
  const { zone } = report;
  const band = zone.score === null ? 'Fără date' : scoreBand(Math.round(zone.score)).label;
  const average =
    zone.city_avg === null ? '' : `Media orașului ${String(Math.round(zone.city_avg))}.`;
  const best =
    zone.city_max === null || zone.city_max === undefined
      ? ''
      : ` Cel mai bun scor ${String(Math.round(zone.city_max))}.`;
  const area = report.sections.investment?.declared.area_m2;
  const declared =
    area === null || area === undefined
      ? `<li>${icon('info')}Fără detalii declarate</li>`
      : `<li>${icon('info')}Suprafață declarată: ${formatNumber(area)} m²</li>`;
  const mapKey = `<div class="key"><b>Pe hartă</b><span><i style="background:#103F32;border-radius:50%;width:10px;height:10px"></i>Adresa</span><span><i style="background:#8FB05A"></i>Parcuri și grădini</span><span><i style="background:transparent;border:2px solid #3F6E1B;height:10px;width:10px;border-radius:50%"></i>Raza de ${String(NEAR_RING_M)} m</span></div>`;
  return `<section class="hD"><div class="wrap hd-in"><span class="brand">${logo('scoreDark', 'lg')}<span class="lk score"><span>Property</span><b>Score</b></span></span><span class="hbtn sc">${logo('smart', 'lg')}<span class="lk sc"><span>Smart</span><b>Check</b></span></span></div><div class="wrap hD-g"><div class="hD-txt"><span class="eb-l">Smart Check · raport nr. ${String(report.number)} · generat pe ${esc(formatDate(report.generatedAt))}</span><h1>${escKeepingRangesTogether(report.addressText)}</h1><p class="lead">${esc(heroLead(scored))}</p><span class="meta-l">${icon('db')}Calculat pe datele din ${esc(formatDate(report.snapshot.period))} · rază de până la 1,2 km</span><ul class="facts"><li class="ok2">${icon('check')}Raport gata</li>${declared}</ul></div><div class="hD-vis"><div class="hD-off"></div><div class="hD-map">${mapHtml(map, mapKey)}</div><div class="hD-float">${scoreRing(zone.score)}<div class="zt"><span class="eyebrow">Scor de zonă</span><strong>${esc(band)}</strong><small>${esc(average + best)}</small></div></div><span class="hD-lab">${icon('layers')}Spații verzi în jurul adresei · OpenStreetMap</span></div></div></section>`;
}

function headline(report: ReportData, scored: readonly Scored[]): string {
  if (scored.length === 0) return 'Scoruri indisponibile pentru această adresă';
  const weak = weakest(scored);
  const position = esc(zonePosition(report));
  if (!weak) return position;
  return `${position}, cu un punct slab: <span class="hl">${esc(lowerFirst(CATEGORY_THEME[weak.key].name))}</span>`;
}

function summaryHead(report: ReportData, scored: readonly Scored[]): string {
  const { zone } = report;
  const contexts = [
    report.sections.seismic ? 'riscul seismic' : '',
    report.sections.investment ? 'investiția' : '',
  ].filter(Boolean);
  const zoneLine =
    zone.score === null
      ? ''
      : ` Zona primește ${String(Math.round(zone.score))} din 100${zone.city_avg === null ? '' : `, față de ${String(Math.round(zone.city_avg))} media orașului`}.`;
  const contextLine =
    contexts.length > 0
      ? `Raportul include ${contexts.join(' și ')} ca informații de context.`
      : '';
  const scoreCount = plural(scored.length, 'scor', 'scoruri', 'de scoruri');
  const contextCount = plural(contexts.length, 'context', 'contexte', 'de contexte');
  const lead =
    scored.length === 0
      ? contextLine
      : [
          `Am calculat ${scoreCount} pe o rază de până la 1,2 km.${zoneLine}`,
          contextLine,
          'Fiecare scor are capitolul lui.',
        ]
          .filter(Boolean)
          .join(' ');
  return `<div class="sx-head"><div class="eyebrow"><span>Pe scurt</span><span class="acc" style="--c:#3F6478"><i></i>${scoreCount} · ${contextCount}</span></div><h2>${headline(report, scored)}</h2>${lead ? `<p class="lead">${esc(lead)}</p>` : ''}</div>`;
}

function standing(item: Scored, cityName: string): string {
  const { percentile } = item.summary;
  if (isFlat(item.summary)) return 'Estimare la nivel de oraș, la fel pentru toate zonele.';
  if (percentile === null) return '';
  if (percentile >= 99) return 'Printre cele mai bune zone din oraș.';
  if (percentile <= 1) return 'Printre cele mai slabe zone din oraș.';
  return `Mai bine decât ${String(Math.round(percentile))}% din zonele din ${cityName}.`;
}

function cardTitle(item: Scored): string {
  const name = CATEGORY_THEME[item.key].name;
  if (isFlat(item.summary)) return `${name}: la fel în tot orașul`;
  if (item.score > item.average) {
    return (item.summary.percentile ?? 0) >= 90
      ? `${name} mult peste oraș`
      : `${name} peste media orașului`;
  }
  if (item.score < item.average) return `${name} sub media orașului`;
  return `${name} la media orașului`;
}

function bigCard(item: Scored, cityName: string): string {
  const theme = CATEGORY_THEME[item.key];
  return `<div class="bigc" style="--c:${theme.color}"><span class="top">${categoryTile(item.key)}<span class="sc">${String(item.score)}<small>/100</small></span></span><b class="t">${esc(cardTitle(item))}</b><span class="d">${esc(standing(item, cityName))} Media orașului: ${String(item.average)}.</span></div>`;
}

function highlights(report: ReportData, scored: readonly Scored[]): string {
  const byLead = [...scored].sort(
    (left, right) => right.score - right.average - (left.score - left.average),
  );
  const good = byLead.slice(0, HIGHLIGHTS);
  const watch = byLead.slice(HIGHLIGHTS).slice(-HIGHLIGHTS).reverse();
  const block = (label: string, tone: string, iconHtml: string, items: readonly Scored[]) =>
    items.length === 0
      ? ''
      : `<div class="sC-lab ${tone}">${iconHtml}${label}</div><div class="sC-cards">${items.map((item) => bigCard(item, report.city.name)).join('')}</div>`;
  return (
    block('Ce e bun', 'g', icon('up'), good) + block('La ce să fii atent', 'b', icon('warn'), watch)
  );
}

function difference(item: Scored): string {
  const delta = item.score - item.average;
  if (isFlat(item.summary)) return '<span class="dl same">la fel în tot orașul</span>';
  if (Math.abs(delta) < 2) return '<span class="dl same">la media orașului</span>';
  return `<span class="dl ${delta > 0 ? 'up' : 'dn'}">${delta > 0 ? '+' : '−'}${String(Math.abs(delta))} față de oraș</span>`;
}

function allScores(report: ReportData, scored: readonly Scored[]): string {
  const totalWeight = scored.reduce((sum, item) => sum + item.summary.weight, 0) || 1;
  const axis = `<div class="scC-ax"><span></span><span class="sc-axis">${[0, 25, 50, 75, 100].map((value) => `<i style="left:${String(value)}%">${String(value)}</i>`).join('')}</span><span></span></div>`;
  const groups = CATEGORY_GROUPS.map((group) => {
    const rows = group.keys.flatMap((key) => {
      const item = scored.find((candidate) => candidate.key === key);
      if (!item) return [];
      const theme = CATEGORY_THEME[key];
      const weight = Math.round((item.summary.weight / totalWeight) * 100);
      return [
        `<div class="scC-r" style="--c:${theme.color};--bg:${theme.tint}"><span class="nm">${categoryTile(key)}<span><b>${esc(theme.name)}</b><small>${String(weight)}%</small></span></span><span class="pl"><span class="rg" style="left:0;width:${String(item.score)}%"></span><u style="left:${String(item.average)}%"></u><span class="dt" style="left:${String(item.score)}%"><b class="num">${String(item.score)}</b></span></span>${difference(item)}</div>`,
      ];
    });
    return rows.length === 0
      ? ''
      : `<div class="glab scC-lab"><span>${esc(group.title)}</span></div>${rows.join('')}`;
  });
  const zone =
    report.zone.score === null
      ? ''
      : `<p class="hint sc-note">Scorul de zonă (${String(Math.round(report.zone.score))}) este media ponderată a celor ${String(scored.length)} scoruri. Riscul seismic și investiția sunt context și nu intră în scor.</p>`;
  return `<div class="scsec"><div class="card scC"><div class="sc-h"><div><div class="eyebrow">Toate scorurile · ponderea în scor lângă nume</div><h3>Toate scorurile, față de tot orașul</h3></div><span class="legend"><span><i></i>adresa</span><span><u></u>media orașului</span></span></div><p class="hint">Fiecare bară pornește de la 0 și se oprește la scorul adresei. Linia neagră e media orașului.</p>${axis}${groups.join('')}${zone}</div></div>`;
}

function zoneHistogram(report: ReportData, score: number): string {
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
      : `<line class="av" x1="${String(averageX)}" x2="${String(averageX)}" y1="${String(top - 10)}" y2="${String(height + top)}"/><text class="avt" x="${String(averageX - 6)}" y="${String(top - 14)}" text-anchor="${averageX < 150 ? 'start' : 'end'}" dx="${averageX < 150 ? '12' : '0'}">media orașului · ${String(Math.round(average))}</text>`;
  const ownX = own * binWidth + binWidth / 2;
  const ownHeight = ((histogram[own] ?? 0) / peak) * (height - 8);
  const pin = `<g class="mepin" transform="translate(${String(ownX)},${String(height + top - ownHeight - 10)})"><rect x="-44" y="-26" width="88" height="24" rx="12"/><text y="-9" text-anchor="middle">adresa · ${String(score)}</text><path d="M-5 -2 L0 4 L5 -2z"/></g>`;
  const bands = SCORE_BANDS.map((band, index) => {
    const end = SCORE_BANDS[index + 1]?.from ?? 100;
    const x = (band.from / 100) * width;
    const bandWidth = ((end - band.from) / 100) * width;
    return `<rect x="${String(x + 1)}" y="${String(height + top + 8)}" width="${String(bandWidth - 2)}" height="6" rx="3" style="fill:${band.fill}"/><text x="${String(x + bandWidth / 2)}" y="${String(height + top + 30)}" text-anchor="middle">${esc(band.label)}</text>`;
  }).join('');
  return `<svg class="fhist d" viewBox="0 0 ${String(width)} ${String(height + top + 44)}">${grid}${bars}${averageMark}${pin}<g class="bandax">${bands}</g></svg>`;
}

function formation(report: ReportData, scored: readonly Scored[]): string {
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
      : `<li><b>${score >= zone.city_avg ? '+' : '−'}${String(Math.abs(score - Math.round(zone.city_avg)))}</b> față de media orașului</li>`,
    total === 0
      ? ''
      : `<li><b>${String(Math.floor((below / total) * 100))}%</b> din zone au un scor mai mic</li>`,
    total === 0
      ? ''
      : `<li>doar <b>${formatNumber(atLeast)}</b> zone din ${formatNumber(total)} au ${String(own * binSize)}+</li>`,
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
        `<span class="fchip" style="--c:${CATEGORY_THEME[part.item.key].color}"><i></i>${esc(CATEGORY_THEME[part.item.key].name)} <b class="num">${formatNumber(part.points, 1)}</b></span>`,
    )
    .join('');
  return `<div class="fsec"><div class="card fB"><div class="fB-top"><div class="fB-score"><div class="eyebrow">Scorul zonei</div><div class="fB-big"><b class="num">${String(score)}</b><span>/100</span></div><div class="fB-band">${esc(scoreBand(score).label)}</div><ul>${facts}</ul></div><div class="fB-hist"><h3>Unde se află zona față de tot orașul</h3><p class="hint">Fiecare coloană e un grup de zone cu scoruri apropiate.</p>${zoneHistogram(report, score)}</div></div><div class="fB-form"><h3>Din ce se adună cele ${String(score)} de puncte</h3><div class="fstack">${stack}<span class="lost" style="flex:${lost.toFixed(2)}">−${formatNumber(lost, 1)}</span></div><div class="fchips">${chips}<span class="fchip lostc"><i></i>pierdut <b class="num">${formatNumber(lost, 1)}</b></span></div></div></div></div>`;
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
