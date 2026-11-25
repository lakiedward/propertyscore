import type { CategoryKey } from '../../scoring/categories.ts';
import type { ChapterBuilder } from '../chapter.ts';
import {
  categoryEyebrow,
  categoryTile,
  chapter,
  chapterHead,
  chapterSources,
  footnote,
  iconTile,
  scoreCard,
  sourceDate,
} from '../components.ts';
import { esc, formatMinutes, formatNumber } from '../format.ts';
import { icon } from '../icons.ts';
import {
  EDUCATION_LEVELS,
  FIFTEEN_MINUTE_CATEGORIES,
  FIFTEEN_MINUTE_GROUPS,
  FIFTEEN_MINUTE_KEY,
  HEALTH_LAYERS,
} from '../labels.ts';
import { addressMarker, collection, mapHtml, type MapSpec } from '../maps.ts';
import type { ReportData } from '../report-data.ts';
import { CATEGORY_THEME } from '../theme.ts';

type FifteenMinute = NonNullable<ReportData['sections']['fifteen_minute']>;
type Group = FifteenMinute['groups'][number];

const WALK_LIMIT_MIN = 15;
const TILE_COUNT = 8;
const MORE_THAN_TYPICAL = 1.5;
const NEARBY_HEALTH_LAYERS = ['h1', 'h2', 'h3'];
const DEFAULT_DOT = '#55607A';

function groupColor(section: FifteenMinute, categoryKey: string): string {
  const group = section.categories.find((category) => category.key === categoryKey)?.group;
  return FIFTEEN_MINUTE_GROUPS[group ?? '']?.color ?? DEFAULT_DOT;
}

function checklist(section: FifteenMinute): string {
  const rows = [...section.categories]
    .sort((left, right) => (left.t1_min ?? Infinity) - (right.t1_min ?? Infinity))
    .map((category) => {
      const label = FIFTEEN_MINUTE_CATEGORIES[category.key] ?? category.key;
      const reached = category.t1_min !== null && category.t1_min <= WALK_LIMIT_MIN;
      const nearest = section.places
        .filter((place) => place.category === category.key)
        .sort((left, right) => left.minutes - right.minutes)[0];
      const choice =
        category.n15 === 1
          ? `singurul în ${String(WALK_LIMIT_MIN)} min`
          : `${formatNumber(category.n15)} în ${String(WALK_LIMIT_MIN)} min`;
      const detail = reached
        ? [nearest?.name, choice].filter(Boolean).join(' · ')
        : `mai departe de ${String(WALK_LIMIT_MIN)} minute`;
      const minutes =
        category.t1_min === null
          ? ''
          : `<span class="fqck-m"><b>${String(Math.max(1, Math.round(category.t1_min)))}</b> min</span>`;
      return `<li><div class="fqck-r ${reached ? 'ok' : 'no'}"><span class="fqck-i">${icon(reached ? 'check' : 'x')}</span><span class="fqck-t"><b>${esc(label)}</b><small>${esc(detail)}</small></span>${minutes}</div></li>`;
    });
  const share = section.total === 0 ? 0 : (section.covered / section.total) * 100;
  return `<aside class="fqC-p"><div class="fqck"><div class="ac-h"><div><div class="eyebrow">Lista ta de zi cu zi</div><h3>${String(section.covered)} din ${String(section.total)} la ${String(WALK_LIMIT_MIN)} minute pe jos</h3></div></div><div class="fqck-bar"><i style="width:${share.toFixed(0)}%"></i></div><ul class="fqck-l">${rows.join('')}</ul></div></aside>`;
}

function ratioText(ratio: number): string {
  const rounded = ratio >= 10 ? Math.round(ratio) : Math.round(ratio * 2) / 2;
  return formatNumber(rounded, Number.isInteger(rounded) ? 0 : 1);
}

function comparison(group: Group): string {
  const typical = group.typical_n15;
  if (typical === null || typical === undefined) return '';
  if (typical === 0) {
    return '<em class="up">rar în alte cartiere</em><small>cartier obișnuit: niciunul</small>';
  }
  const ratio = group.n15 / typical;
  const text =
    ratio >= MORE_THAN_TYPICAL
      ? `<em class="up">de ${ratioText(ratio)} ori mai multe</em>`
      : ratio <= 1 / MORE_THAN_TYPICAL
        ? '<em>mai puține decât de obicei</em>'
        : '<em>cam cât într-un cartier obișnuit</em>';
  return `${text}<small>cartier obișnuit: ${formatNumber(typical)}</small>`;
}

function fewerNote(groups: readonly Group[]): string {
  const fewer = groups.flatMap((group) => {
    const meta = FIFTEEN_MINUTE_GROUPS[group.key];
    const typical = group.typical_n15;
    if (!meta || typical === null || typical === undefined || group.n15 >= typical) return [];
    return [
      `${meta.label}, ${formatNumber(group.n15)} (un cartier obișnuit are ${formatNumber(typical)})`,
    ];
  });
  if (fewer.length === 0) return '';
  return `<p class="fqx-foot">${icon('info')}<span>${esc(`Mai puține decât de obicei: ${fewer.join('; ')}.`)}</span></p>`;
}

function choiceTiles(section: FifteenMinute): string {
  const shown = section.groups
    .filter((group) => group.n15 > 0 && FIFTEEN_MINUTE_GROUPS[group.key])
    .sort((left, right) => right.n15 - left.n15)
    .slice(0, TILE_COUNT);
  const tiles = shown.map((group) => {
    const meta = FIFTEEN_MINUTE_GROUPS[group.key];
    if (!meta) return '';
    return `<div class="fqx-tile" style="--c:${meta.color};--bg:${meta.tint}">${iconTile(meta.icon, meta.color, meta.tint)}<b>${formatNumber(group.n15)}</b><span class="fqx-tl">${esc(meta.label)}</span>${comparison(group)}</div>`;
  });
  if (tiles.length === 0) return '';
  const rest = section.groups.filter((group) => !shown.includes(group));
  return `<section class="card ac fqx fqxP"><div class="ac-h"><div><div class="eyebrow">Ai de unde alege</div><h3>Nu doar un loc aproape, ci mai multe din care alegi</h3></div></div><div class="fqx-tiles">${tiles.join('')}</div>${fewerNote(rest)}</section>`;
}

function subScore(
  key: CategoryKey,
  report: ReportData,
  rows: readonly { label: string; minutes: number | null; mode?: string | null }[],
): string {
  const summary = report.categories[key];
  const theme = CATEGORY_THEME[key];
  if (summary.score === null) return '';
  const standing = [
    summary.city_avg === null ? '' : `media orașului ${String(Math.round(summary.city_avg))}`,
    summary.percentile === null ? '' : `mai bine decât ${String(Math.round(summary.percentile))}%`,
  ]
    .filter(Boolean)
    .join(' · ');
  const items = rows
    .map(
      (row) =>
        `<li><span>${esc(row.label)}</span><b>${row.minutes === null ? '–' : `${formatMinutes(row.minutes)}${row.mode === 'car' ? ' cu mașina' : ''}`}</b></li>`,
    )
    .join('');
  return `<section class="card fqsub"><div class="fqsub-h">${categoryTile(key)}<span><b>${esc(theme.name)}</b><small>${esc(standing)}</small></span><span class="fqsub-s" style="color:${theme.color}">${String(Math.round(summary.score))}</span></div><ul>${items}</ul></section>`;
}

function subScores(report: ReportData): string {
  const education = subScore(
    'education',
    report,
    (report.sections.education?.levels ?? []).map((level) => ({
      label: EDUCATION_LEVELS[level.key] ?? level.key,
      minutes: level.nearest_min,
    })),
  );
  const health = subScore(
    'health',
    report,
    (report.sections.health?.layers ?? [])
      .filter((layer) => NEARBY_HEALTH_LAYERS.includes(layer.key))
      .map((layer) => ({
        label: HEALTH_LAYERS[layer.key] ?? layer.key,
        minutes: layer.minutes,
        mode: layer.mode,
      })),
  );
  return education || health ? `<div class="fqsubs">${education}${health}</div>` : '';
}

function walkingTimeNote(section: FifteenMinute): string {
  if (section.distance_method === 'straight_line') {
    return 'Timpii pe jos sunt estimați din distanța în linie dreaptă, ajustată pentru ocoluri.';
  }
  if (section.distance_method !== 'pedestrian_routing') return '';
  const speed = section.walk_speed_kmh;
  const pace = speed !== null && speed > 0 ? `, la ${formatNumber((speed * 1000) / 60)} m/min` : '';
  return `Timpii pe jos sunt calculați pe rețeaua pietonală (străzi și alei)${pace}.`;
}

export const fifteenMinuteChapter: ChapterBuilder = (report) => {
  const summary = report.categories.fifteen_minute;
  const section = report.sections.fifteen_minute;
  const theme = CATEGORY_THEME.fifteen_minute;
  const sources = chapterSources(report, ['fifteen_minute', 'education', 'health']);
  if (!section) {
    const head = chapterHead({
      eyebrow: categoryEyebrow('fifteen_minute', summary),
      color: theme.color,
      title: `Ce ai la ${String(WALK_LIMIT_MIN)} minute pe jos`,
    });
    return {
      html: chapter(head + scoreCard('fifteen_minute', report) + subScores(report) + sources),
      maps: [],
    };
  }
  const all = section.covered === section.total;
  const better =
    summary.percentile === null
      ? ''
      : ` Aici ai mai multe la îndemână decât în ${String(Math.round(summary.percentile))}% din zonele din ${report.city.name}.`;
  const precision =
    section.distance_method === 'pedestrian_routing'
      ? theme.precision
      : section.distance_method === 'straight_line'
        ? 'adresă · estimare în linie dreaptă'
        : undefined;
  const head = chapterHead({
    eyebrow: categoryEyebrow('fifteen_minute', summary),
    color: theme.color,
    precision,
    title: all
      ? `Toate cele ${String(section.total)} lucruri de zi cu zi, la cel mult ${String(WALK_LIMIT_MIN)} minute pe jos`
      : `${String(section.covered)} din ${String(section.total)} lucruri de zi cu zi, la cel mult ${String(WALK_LIMIT_MIN)} minute pe jos`,
    lead:
      summary.city_avg === null
        ? undefined
        : `Media orașului e ${String(Math.round(summary.city_avg))}.${better}`,
  });
  const center: [number, number] = [report.longitude, report.latitude];
  const widest = [...section.isochrones].sort((left, right) => right.minutes - left.minutes)[0];
  const places = section.places.map((place): [number, number] => [place.lng, place.lat]);
  const map: MapSpec = {
    id: 'map-fifteen',
    center,
    fit: places,
    padding: 44,
    layers: [
      ...(widest
        ? [
            {
              kind: 'fill' as const,
              data: collection([widest.geometry]),
              color: theme.color,
              opacity: 0.16,
              outline: theme.color,
            },
          ]
        : []),
      {
        kind: 'circle',
        data: {
          type: 'FeatureCollection',
          features: section.places.map((place) => ({
            type: 'Feature',
            properties: { color: groupColor(section, place.category) },
            geometry: { type: 'Point', coordinates: [place.lng, place.lat] },
          })),
        },
        color: DEFAULT_DOT,
        colorProperty: 'color',
        radius: 3.2,
      },
    ],
    markers: [addressMarker(center, report.addressText.split(',')[0])],
  };
  const dots = FIFTEEN_MINUTE_KEY.map((item) => `<i style="background:${item.color}"></i>`).join(
    '',
  );
  const zoneKey = widest
    ? `<span><i style="background:rgba(138,53,111,.16);border:1.5px solid rgba(138,53,111,.7)"></i>${String(WALK_LIMIT_MIN)} minute pe jos</span>`
    : '';
  const overlay = `<span class="mapchip" style="--c:${theme.color}"><i></i>${String(WALK_LIMIT_MIN)} minute pe jos</span><div class="key"><b>Pe hartă</b><span><i style="background:#103F32;border-radius:50%;width:10px;height:10px"></i>Adresa</span>${zoneKey}<span class="fqkd">${dots}Locuri de zi cu zi</span></div>`;
  const osm = sourceDate(report, 'osm');
  const note = [`Locurile: OpenStreetMap${osm ? `, ${osm}` : ''}.`, walkingTimeNote(section)]
    .filter(Boolean)
    .join(' ');
  const places15 = `<section class="fqC"><div class="fqmap fqC-m">${mapHtml(map, overlay)}</div>${checklist(section)}</section>${footnote(note)}`;
  return {
    html: chapter(
      `${head}${places15}${choiceTiles(section)}<div class="sfB-rest">${scoreCard('fifteen_minute', report)}${subScores(report)}${sources}</div>`,
      'fqch fqCh',
    ),
    maps: [map],
  };
};
