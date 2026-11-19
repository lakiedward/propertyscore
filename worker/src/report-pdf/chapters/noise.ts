import type { ChapterBuilder } from '../chapter.ts';
import {
  categoryEyebrow,
  chapter,
  chapterHead,
  chapterSources,
  footnote,
  scoreCard,
  sourceDate,
} from '../components.ts';
import { esc, formatNumber } from '../format.ts';
import { NOISE_CLASSES, NOISE_KINDS, NOISE_REFERENCES } from '../labels.ts';
import { addressDot, around, mapHtml, type FeatureCollection, type MapSpec } from '../maps.ts';
import { CATEGORY_THEME } from '../theme.ts';

const BAND_DB = 5;
const MAP_RADIUS_M = 500;
const BANDS_RADIUS_M = 1000;
const LISTED_SOURCES = 5;
const LOUD = '#B8432B';
const BUSY = '#E07F55';
const MODERATE = '#F0B877';
const RAIL = '#55607A';
const QUIET = '#F6E3A8';
const BAND_COLORS: readonly (readonly [number, string])[] = [
  [70, LOUD],
  [65, BUSY],
  [60, MODERATE],
];
const LOUD_ROADS = ['motorway', 'trunk', 'primary'];
const BUSY_ROADS = ['secondary'];
const HEAT_STOPS: readonly (readonly [number, string])[] = [
  [50, '#FFF3CC'],
  [55, '#FBE3A0'],
  [60, '#F4C06F'],
  [65, '#E78A55'],
  [70, '#C8472F'],
  [75, '#8E2A1E'],
];
const HEAT_FADE_FROM_DB = 51;
const HEAT_FADE_TO_DB = 56;
const HEAT_OPACITY = 0.78;
const MAP_KEY = [
  { label: 'sub 55 dB', swatch: 'background:#E9F1EF;border:1px solid #D5E2DF' },
  { label: '55–60', swatch: 'background:#FBE3A0' },
  { label: '60–65', swatch: 'background:#F4C06F' },
  { label: '65–70', swatch: 'background:#E78A55' },
  { label: 'peste 70', swatch: 'background:#C8472F' },
];

const LINES_KEY = [
  { label: 'drum mare', color: LOUD },
  { label: 'bulevard, tramvai', color: BUSY },
  { label: 'stradă', color: MODERATE },
  { label: 'cale ferată', color: RAIL },
];

function decibelBand(value: number): string {
  const low = Math.floor(value / BAND_DB) * BAND_DB;
  return `${String(low)}–${String(low + BAND_DB)} dB`;
}

function reference(value: number): string {
  const closest = [...NOISE_REFERENCES].sort(
    (left, right) => Math.abs(left.db - value) - Math.abs(right.db - value),
  )[0];
  return closest ? `cât o ${closest.label}` : '';
}

function sourceColor(kind: string, sourceClass: string): string {
  if (kind === 'rail') return RAIL;
  if (kind === 'tram') return BUSY;
  if (LOUD_ROADS.includes(sourceClass)) return LOUD;
  return BUSY_ROADS.includes(sourceClass) ? BUSY : MODERATE;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function bandColor(level: unknown): string {
  const value = typeof level === 'number' ? level : 0;
  return BAND_COLORS.find(([low]) => value >= low)?.[1] ?? QUIET;
}

function banded(bands: FeatureCollection): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: bands.features.map((feature) => ({
      ...feature,
      properties: { ...feature.properties, color: bandColor(feature.properties?.db_low) },
    })),
  };
}

function coloured(lines: FeatureCollection): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: lines.features.map((feature) => ({
      ...feature,
      properties: {
        ...feature.properties,
        color: sourceColor(text(feature.properties?.kind), text(feature.properties?.source_class)),
      },
    })),
  };
}

export const noiseChapter: ChapterBuilder = (report) => {
  const summary = report.categories.noise;
  const section = report.sections.noise;
  const theme = CATEGORY_THEME.noise;
  const sourcesNote = chapterSources(report, ['noise']);
  if (section?.lden == null) {
    const head = chapterHead({
      eyebrow: categoryEyebrow('noise', summary),
      color: theme.color,
      title: 'Zgomotul din jurul adresei',
    });
    return {
      html: chapter(head + scoreCard('noise', report, { better: 'Mai liniștit' }) + sourcesNote),
      maps: [],
    };
  }
  const sources = [...section.sources]
    .sort((left, right) => left.distance_m - right.distance_m)
    .slice(0, LISTED_SOURCES);
  const average =
    summary.city_avg === null || summary.score === null
      ? ''
      : ` Zona are scorul ${String(Math.round(summary.score))}, ${summary.score < summary.city_avg ? 'sub' : 'peste'} media orașului (${String(Math.round(summary.city_avg))}).`;
  const loudest = sources[0];
  const head = chapterHead({
    eyebrow: categoryEyebrow('noise', summary),
    color: theme.color,
    precision: section.precision === 'street' ? 'hărți strategice de zgomot' : theme.precision,
    title: `Cam ${decibelBand(section.lden)} la adresă, ${reference(section.lden)}`,
    lead: loudest
      ? `Cea mai apropiată sursă de zgomot e ${loudest.name ?? NOISE_KINDS[loudest.kind] ?? loudest.kind}, la ${formatNumber(loudest.distance_m)} m.${average}`
      : `Nu am găsit surse mari de zgomot în apropiere.${average}`,
  });
  const center: [number, number] = [report.longitude, report.latitude];
  const heat = section.map.heat ?? null;
  const bands = !heat && section.map.bands ? banded(section.map.bands) : null;
  const lines = section.map.lines ? coloured(section.map.lines) : null;
  const map: MapSpec = {
    id: 'map-noise',
    center,
    fit: around(center, heat || bands ? BANDS_RADIUS_M : MAP_RADIUS_M),
    padding: 0,
    layers: heat
      ? [
          {
            kind: 'heat',
            grid: heat,
            stops: HEAT_STOPS,
            fadeFromDb: HEAT_FADE_FROM_DB,
            fadeToDb: HEAT_FADE_TO_DB,
            opacity: HEAT_OPACITY,
          },
        ]
      : bands
        ? [{ kind: 'fill', data: bands, color: QUIET, colorProperty: 'color', opacity: 0.55 }]
        : lines
          ? [
              { kind: 'line', data: lines, color: '#FFFFFF', width: 7 },
              { kind: 'line', data: lines, color: LOUD, colorProperty: 'color', width: 4 },
            ]
          : [],
    markers: [addressDot(center)],
  };
  const keyItems =
    heat || bands
      ? `${MAP_KEY.map((item) => `<span><i style="${item.swatch}"></i>${item.label}</span>`).join('')}<span class="zg-est">estimare ziua</span>`
      : LINES_KEY.map(
          (item) => `<span><i style="background:${item.color}"></i>${item.label}</span>`,
        ).join('');
  const key = heat || bands || lines ? `<div class="gz-key zg-key">${keyItems}</div>` : '';
  const night =
    section.lnight === null
      ? ''
      : `<div class="fqx-big g"><b>${decibelBand(section.lnight)}</b><span>noaptea</span></div>`;
  const list =
    sources.length === 0
      ? '<p class="hint">Nu am găsit surse mari de zgomot în apropiere.</p>'
      : `<ul class="zg-src">${sources
          .map(
            (source) =>
              `<li><span class="zg-dot" style="background:${sourceColor(source.kind, source.source_class)}"></span><span class="zg-src-t"><b>${esc(source.name ?? NOISE_KINDS[source.kind] ?? source.kind)}</b><small>${esc(NOISE_CLASSES[source.source_class] ?? NOISE_KINDS[source.kind] ?? source.kind)}</small></span><span class="zg-src-m"><b>${formatNumber(source.distance_m)}</b> m</span></li>`,
          )
          .join('')}</ul>`;
  const scale = NOISE_REFERENCES.map(
    (item) => `<span><b>${String(item.db)} dB</b>${esc(item.label)}</span>`,
  ).join('');
  const osm = sourceDate(report, 'osm');
  const method =
    section.precision === 'street'
      ? 'Valoarea vine din hărțile strategice de zgomot ale orașului.'
      : `Estimare din străzile, liniile de tramvai, calea ferată și clădirile din OpenStreetMap${osm ? `, ${osm}` : ''}.`;
  return {
    html: chapter(
      `${head}<section class="gzA zgA"><div class="gzA-m">${mapHtml(map)}${key}</div><aside class="gzA-p"><div class="eyebrow">La adresă</div><div class="gzA-t"><div class="fqx-big zgb"><b>${decibelBand(section.lden)}</b><span>ziua, ${reference(section.lden)}</span></div>${night}</div><h3 class="zg-h3">Ce se aude cel mai tare</h3>${list}</aside></section><div class="zg-eq">${scale}</div>${footnote(method)}<div class="sfB-rest">${scoreCard('noise', report, { better: 'Mai liniștit' })}${sourcesNote}</div>`,
    ),
    maps: [map],
  };
};
