import { CATEGORY_KEYS, type CategoryKey } from '../../scoring/categories.ts';
import { scoreBand } from '../bands.ts';
import type { ChapterOutput } from '../chapter.ts';
import { card, chapter, chapterHead, scoreRing } from '../components.ts';
import { esc, formatDate, formatMonth, lowerFirst } from '../format.ts';
import { CATEGORY_COLORS, CATEGORY_GROUPS, CATEGORY_LABELS } from '../labels.ts';
import { around, ring, type MapSpec } from '../maps.ts';
import type { CategorySummary, ReportData } from '../report-data.ts';

type Scored = { key: CategoryKey; score: number; summary: CategorySummary };

const HIGHLIGHTS = 3;
const WEAK_POINT_BELOW = 55;
const NEAR_RING_M = 500;
const WIDE_RING_M = 1000;
const HISTOGRAM_HEIGHT_MM = 34;

function scoredCategories(report: ReportData): Scored[] {
  return CATEGORY_KEYS.flatMap((key) => {
    const summary = report.categories[key];
    return summary.score === null ? [] : [{ key, score: Math.round(summary.score), summary }];
  }).sort((left, right) => right.score - left.score);
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

function headline(report: ReportData, scored: readonly Scored[]): string {
  const weakest = scored.at(-1);
  const position = esc(zonePosition(report));
  if (!weakest || weakest.score >= WEAK_POINT_BELOW) return position;
  return `${position}, cu un punct slab: <mark>${esc(lowerFirst(CATEGORY_LABELS[weakest.key]))}</mark>`;
}

function againstCity(summary: CategorySummary, score: number): string {
  if (summary.city_avg === null) return 'Fără medie pe oraș.';
  const average = Math.round(summary.city_avg);
  if (score > average) return `Peste media orașului (${String(average)}).`;
  if (score < average) return `Sub media orașului (${String(average)}).`;
  return `La fel ca media orașului (${String(average)}).`;
}

function summaryCard(item: Scored): string {
  const better =
    item.summary.percentile === null
      ? ''
      : ` Mai bine decât ${String(Math.round(item.summary.percentile))}% din zone.`;
  return `<section class="card summary-card"><span class="value">${String(item.score)}<small> /100</small></span><b>${esc(CATEGORY_LABELS[item.key])} · ${esc(scoreBand(item.score).label)}</b><p>${esc(againstCity(item.summary, item.score))}${esc(better)}</p></section>`;
}

function highlights(scored: readonly Scored[]): string {
  const good = scored.slice(0, HIGHLIGHTS);
  const watch = scored.slice(HIGHLIGHTS).slice(-HIGHLIGHTS).reverse();
  const block = (title: string, tone: string, items: readonly Scored[]) =>
    items.length === 0
      ? ''
      : `<p class="group-title ${tone}">${title}</p><div class="grid cols-3">${items.map(summaryCard).join('')}</div>`;
  return block('Ce e bun', 'good', good) + block('La ce să fii atent', 'watch', watch);
}

function cover(report: ReportData, scored: readonly Scored[], map: MapSpec): string {
  const { zone } = report;
  const band = zone.score === null ? 'Fără date' : scoreBand(Math.round(zone.score)).label;
  const average =
    zone.city_avg === null ? '' : `Media orașului ${String(Math.round(zone.city_avg))}.`;
  const best =
    zone.city_max === null || zone.city_max === undefined
      ? ''
      : ` Cel mai bun scor ${String(Math.round(zone.city_max))}.`;
  const lead = `Am calculat ${String(scored.length)} scoruri pe o rază de până la 1,2 km, plus riscul seismic și investiția ca context. Fiecare scor are capitolul lui.`;
  return `<section class="cover"><div class="hero"><div class="brand"><span>Smart<b>Check</b></span><span>PropertyScore</span></div><p class="eyebrow">Smart Check · Raport nr. ${String(report.number)} · ${esc(formatDate(report.generatedAt))}</p><h1>${esc(report.addressText)}</h1><div class="hero-grid"><div class="hero-meta"><p>Calculat pe datele din ${esc(formatMonth(report.snapshot.period))}.</p><p>Scorul descrie zona, nu apartamentul.</p></div><div class="zone-card">${scoreRing(zone.score, 22)}<div><p class="eyebrow">Scor de zonă</p><strong>${esc(band)}</strong><p>${esc(average + best)}</p></div></div></div></div><div class="cover-body"><header class="chapter-head" style="margin:0"><p class="eyebrow">Pe scurt · ${String(scored.length)} scoruri · 2 contexte</p><h2>${headline(report, scored)}</h2><p class="lead">${esc(lead)}</p></header><div>${highlights(scored)}</div><div class="cover-map map"><div class="map-canvas" id="${map.id}"></div><span class="map-credit">© OpenStreetMap · cercuri la 500 m și 1 km</span></div></div></section>`;
}

function scoreBars(report: ReportData): string {
  const totalWeight =
    CATEGORY_KEYS.reduce((sum, key) => sum + report.categories[key].weight, 0) || 1;
  const lines = CATEGORY_GROUPS.map((group) => {
    const items = group.keys.map((key) => {
      const summary = report.categories[key];
      const weight = `${String(Math.round((summary.weight / totalWeight) * 100))}%`;
      const name = `<span class="name"><b>${esc(CATEGORY_LABELS[key])}</b><small>${weight}</small></span>`;
      if (summary.score === null) {
        return `${name}<span class="track"></span><span class="diff">fără date</span>`;
      }
      const score = Math.round(summary.score);
      const average =
        summary.city_avg === null
          ? ''
          : `<span class="avg" style="left:${String(summary.city_avg)}%"></span>`;
      const delta = summary.city_avg === null ? null : score - Math.round(summary.city_avg);
      const diff =
        delta === null
          ? ''
          : delta === 0
            ? 'la media orașului'
            : `${delta > 0 ? '+' : '−'}${String(Math.abs(delta))} față de oraș`;
      const tone = delta === null || delta === 0 ? '' : delta > 0 ? ' up' : ' down';
      return `${name}<span class="track"><span class="fill" style="width:${String(score)}%;--fill:${scoreBand(score).fill}"></span>${average}<span class="value" style="left:${String(score)}%">${String(score)}</span></span><span class="diff${tone}">${diff}</span>`;
    });
    return `<span class="section">${esc(group.title)}</span>${items.join('')}`;
  });
  return card(
    'Toate scorurile, față de tot orașul',
    `<div class="bars">${lines.join('')}</div><p class="note">Bara merge până la scorul adresei. Linia neagră e media orașului. Procentul de lângă nume e ponderea în scorul de zonă.</p>`,
    'Toate scorurile · ponderea în dreptul numelui',
  );
}

function zoneHistogram(report: ReportData): string {
  const { zone } = report;
  if (zone.score === null || zone.histogram.length === 0) return '';
  const score = Math.round(zone.score);
  const peak = Math.max(...zone.histogram, 1);
  const binSize = 100 / zone.histogram.length;
  const columns = zone.histogram.map((count, index) => {
    const from = index * binSize;
    const isAddress =
      score >= from && (score < from + binSize || index === zone.histogram.length - 1);
    const fill = isAddress ? '#2F5164' : scoreBand(from).fill;
    const height = ((count / peak) * (HISTOGRAM_HEIGHT_MM - 5)).toFixed(1);
    const label = isAddress ? `adresa · ${String(score)}` : '';
    return `<div class="col">${label}<i style="height:${height}mm;--swatch:${fill}"></i></div>`;
  });
  const better =
    zone.percentile === null
      ? ''
      : `<p class="lead" style="font-size:9pt">Mai bine decât <b>${String(Math.round(zone.percentile))}%</b> din zonele locuite din ${esc(report.city.name)}${zone.city_avg === null ? '' : `, unde media e ${String(Math.round(zone.city_avg))}`}.</p>`;
  return card(
    'Unde se află zona față de tot orașul',
    `<div class="columns-chart" style="height:${String(HISTOGRAM_HEIGHT_MM)}mm">${columns.join('')}</div><div class="columns-labels"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div>${better}`,
    `Scorul zonei · ${String(score)} / 100 · ${scoreBand(score).label}`,
  );
}

function composition(report: ReportData, scored: readonly Scored[]): string {
  if (report.zone.score === null || scored.length === 0) return '';
  const totalWeight = scored.reduce((sum, item) => sum + item.summary.weight, 0);
  if (totalWeight === 0) return '';
  const parts = CATEGORY_KEYS.flatMap((key) => {
    const item = scored.find((candidate) => candidate.key === key);
    if (!item) return [];
    return [{ key, points: (item.score * item.summary.weight) / totalWeight }];
  });
  const earned = parts.reduce((sum, part) => sum + part.points, 0);
  const lost = Math.max(0, 100 - earned);
  const segments = parts.map(
    (part) =>
      `<i style="flex:${part.points.toFixed(2)};--swatch:${CATEGORY_COLORS[part.key]}">${part.points >= 4 ? part.points.toFixed(1).replace('.', ',') : ''}</i>`,
  );
  const legend = parts.map(
    (part) =>
      `<span><i style="--swatch:${CATEGORY_COLORS[part.key]}"></i>${esc(CATEGORY_LABELS[part.key])} ${part.points.toFixed(1).replace('.', ',')}</span>`,
  );
  return card(
    `Din ce se adună cele ${String(Math.round(report.zone.score))} de puncte`,
    `<div class="stack">${segments.join('')}<i class="lost" style="flex:${lost.toFixed(2)}">−${lost.toFixed(1).replace('.', ',')}</i></div><div class="legend">${legend.join('')}</div>`,
  );
}

export function summaryChapter(report: ReportData): ChapterOutput {
  const scored = scoredCategories(report);
  const center: [number, number] = [report.longitude, report.latitude];
  const map: MapSpec = {
    id: 'map-cover',
    center,
    fit: around(center, WIDE_RING_M),
    layers: [
      { kind: 'line', data: ring(center, NEAR_RING_M), color: '#103F32', width: 1.5 },
      { kind: 'line', data: ring(center, WIDE_RING_M), color: '#103F32', width: 1, dashed: true },
    ],
    markers: [{ position: center }],
  };
  const overview = chapter(
    chapterHead({
      eyebrow: 'Scorurile adresei',
      title: `${String(scored.length)} scoruri, comparate cu tot orașul`,
    }) +
      scoreBars(report) +
      zoneHistogram(report) +
      composition(report, scored),
  );
  return { html: cover(report, scored, map) + overview, maps: [map] };
}
