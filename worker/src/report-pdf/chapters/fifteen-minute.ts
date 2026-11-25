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
import { esc, reportFormat, labelFor, localize } from '../format.ts';
import { icon } from '../icons.ts';
import {
  EDUCATION_LEVELS,
  FIFTEEN_MINUTE_CATEGORIES,
  FIFTEEN_MINUTE_GROUPS,
  FIFTEEN_MINUTE_KEY,
  HEALTH_LAYERS,
} from '../labels.ts';
import { addressMarker, collection, mapHtml, type MapSpec } from '../maps.ts';
import type { ReportData, ReportLocale } from '../report-data.ts';
import { categoryTheme } from '../theme.ts';

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

function checklist(locale: ReportLocale, section: FifteenMinute): string {
  const { t, formatNumber } = reportFormat(locale);
  const rows = [...section.categories]
    .sort((left, right) => (left.t1_min ?? Infinity) - (right.t1_min ?? Infinity))
    .map((category) => {
      const label = labelFor(locale, FIFTEEN_MINUTE_CATEGORIES, category.key);
      const reached = category.t1_min !== null && category.t1_min <= WALK_LIMIT_MIN;
      const nearest = section.places
        .filter((place) => place.category === category.key)
        .sort((left, right) => left.minutes - right.minutes)[0];
      const choice =
        category.n15 === 1
          ? t('singurul în {0} min', 'the only one within {0} min', String(WALK_LIMIT_MIN))
          : t(
              '{0} în {1} min',
              '{0} within {1} min',
              formatNumber(category.n15),
              String(WALK_LIMIT_MIN),
            );
      const detail = reached
        ? [nearest?.name, choice].filter(Boolean).join(' · ')
        : t('mai departe de {0} minute', 'more than {0} minutes away', String(WALK_LIMIT_MIN));
      const minutes =
        category.t1_min === null
          ? ''
          : `<span class="fqck-m"><b>${String(Math.max(1, Math.round(category.t1_min)))}</b> min</span>`;
      return `<li><div class="fqck-r ${reached ? 'ok' : 'no'}"><span class="fqck-i">${icon(reached ? 'check' : 'x')}</span><span class="fqck-t"><b>${esc(label)}</b><small>${esc(detail)}</small></span>${minutes}</div></li>`;
    });
  const share = section.total === 0 ? 0 : (section.covered / section.total) * 100;
  return `<aside class="fqC-p"><div class="fqck"><div class="ac-h"><div><div class="eyebrow">${t('Lista ta de zi cu zi', 'Your everyday checklist')}</div><h3>${t('{0} din {1} la {2} minute pe jos', '{0} of {1} within a {2}-minute walk', String(section.covered), String(section.total), String(WALK_LIMIT_MIN))}</h3></div></div><div class="fqck-bar"><i style="width:${share.toFixed(0)}%"></i></div><ul class="fqck-l">${rows.join('')}</ul></div></aside>`;
}

function ratioText(locale: ReportLocale, ratio: number): string {
  const { formatNumber } = reportFormat(locale);
  const rounded = ratio >= 10 ? Math.round(ratio) : Math.round(ratio * 2) / 2;
  return formatNumber(rounded, Number.isInteger(rounded) ? 0 : 1);
}

function comparison(locale: ReportLocale, group: Group): string {
  const { t, formatNumber } = reportFormat(locale);
  const typical = group.typical_n15;
  if (typical === null || typical === undefined) return '';
  if (typical === 0) {
    return `<em class="up">${t('rar în alte cartiere', 'rare in other neighbourhoods')}</em><small>${t('cartier obișnuit: niciunul', 'typical neighbourhood: none')}</small>`;
  }
  const ratio = group.n15 / typical;
  const text =
    ratio >= MORE_THAN_TYPICAL
      ? `<em class="up">${t('de {0} ori mai multe', '{0} times as many', ratioText(locale, ratio))}</em>`
      : ratio <= 1 / MORE_THAN_TYPICAL
        ? `<em>${t('mai puține decât de obicei', 'fewer than usual')}</em>`
        : `<em>${t('cam cât într-un cartier obișnuit', 'about as many as in a typical neighbourhood')}</em>`;
  return `${text}<small>${t('cartier obișnuit: {0}', 'typical neighbourhood: {0}', formatNumber(typical))}</small>`;
}

function fewerNote(locale: ReportLocale, groups: readonly Group[]): string {
  const { t, formatNumber } = reportFormat(locale);
  const fewer = groups.flatMap((group) => {
    const meta = FIFTEEN_MINUTE_GROUPS[group.key];
    const typical = group.typical_n15;
    if (!meta || typical === null || typical === undefined || group.n15 >= typical) return [];
    return [
      t(
        '{0}, {1} (un cartier obișnuit are {2})',
        '{0}, {1} (a typical neighbourhood has {2})',
        localize(locale, meta.label),
        formatNumber(group.n15),
        formatNumber(typical),
      ),
    ];
  });
  if (fewer.length === 0) return '';
  return `<p class="fqx-foot">${icon('info')}<span>${esc(t('Mai puține decât de obicei: {0}.', 'Fewer than usual: {0}.', fewer.join('; ')))}</span></p>`;
}

function choiceTiles(locale: ReportLocale, section: FifteenMinute): string {
  const { t, formatNumber } = reportFormat(locale);
  const shown = section.groups
    .filter((group) => group.n15 > 0 && FIFTEEN_MINUTE_GROUPS[group.key])
    .sort((left, right) => right.n15 - left.n15)
    .slice(0, TILE_COUNT);
  const tiles = shown.map((group) => {
    const meta = FIFTEEN_MINUTE_GROUPS[group.key];
    if (!meta) return '';
    return `<div class="fqx-tile" style="--c:${meta.color};--bg:${meta.tint}">${iconTile(meta.icon, meta.color, meta.tint)}<b>${formatNumber(group.n15)}</b><span class="fqx-tl">${esc(localize(locale, meta.label))}</span>${comparison(locale, group)}</div>`;
  });
  if (tiles.length === 0) return '';
  const rest = section.groups.filter((group) => !shown.includes(group));
  return `<section class="card ac fqx fqxP"><div class="ac-h"><div><div class="eyebrow">${t('Ai de unde alege', 'A choice of places')}</div><h3>${t('Nu doar un loc aproape, ci mai multe din care alegi', 'More than one place nearby to choose from')}</h3></div></div><div class="fqx-tiles">${tiles.join('')}</div>${fewerNote(locale, rest)}</section>`;
}

function subScore(
  key: CategoryKey,
  report: ReportData,
  rows: readonly { label: string; minutes: number | null; mode?: string | null }[],
): string {
  const { t, formatMinutes } = reportFormat(report.locale);
  const summary = report.categories[key];
  const theme = categoryTheme(report.locale, key);
  if (summary.score === null) return '';
  const standing = [
    summary.city_avg === null
      ? ''
      : t('media orașului {0}', 'City average: {0}', String(Math.round(summary.city_avg))),
    summary.percentile === null
      ? ''
      : t('mai bine decât {0}%', 'better than {0}%', String(Math.round(summary.percentile))),
  ]
    .filter(Boolean)
    .join(' · ');
  const items = rows
    .map(
      (row) =>
        `<li><span>${esc(row.label)}</span><b>${row.minutes === null ? '–' : `${formatMinutes(row.minutes)}${row.mode === 'car' ? t(' cu mașina', ' by car') : ''}`}</b></li>`,
    )
    .join('');
  return `<section class="card fqsub"><div class="fqsub-h">${categoryTile(key)}<span><b>${esc(theme.name)}</b><small>${esc(standing)}</small></span><span class="fqsub-s" style="color:${theme.color}">${String(Math.round(summary.score))}</span></div><ul>${items}</ul></section>`;
}

function subScores(report: ReportData): string {
  const education = subScore(
    'education',
    report,
    (report.sections.education?.levels ?? []).map((level) => ({
      label: labelFor(report.locale, EDUCATION_LEVELS, level.key),
      minutes: level.nearest_min,
    })),
  );
  const health = subScore(
    'health',
    report,
    (report.sections.health?.layers ?? [])
      .filter((layer) => NEARBY_HEALTH_LAYERS.includes(layer.key))
      .map((layer) => ({
        label: labelFor(report.locale, HEALTH_LAYERS, layer.key),
        minutes: layer.minutes,
        mode: layer.mode,
      })),
  );
  return education || health ? `<div class="fqsubs">${education}${health}</div>` : '';
}

export const fifteenMinuteChapter: ChapterBuilder = (report) => {
  const { t } = reportFormat(report.locale);
  const summary = report.categories.fifteen_minute;
  const section = report.sections.fifteen_minute;
  const theme = categoryTheme(report.locale, 'fifteen_minute');
  const sources = chapterSources(report, ['fifteen_minute', 'education', 'health']);
  if (!section) {
    const head = chapterHead(report.locale, {
      eyebrow: categoryEyebrow(report.locale, 'fifteen_minute', summary),
      color: theme.color,
      title: t(
        'Ce ai la {0} minute pe jos',
        'What is within a {0}-minute walk',
        String(WALK_LIMIT_MIN),
      ),
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
      : t(
          ' Aici ai mai multe la îndemână decât în {0}% din zonele din {1}.',
          ' More is within reach here than in {0}% of areas in {1}.',
          String(Math.round(summary.percentile)),
          report.city.name,
        );
  const head = chapterHead(report.locale, {
    eyebrow: categoryEyebrow(report.locale, 'fifteen_minute', summary),
    color: theme.color,
    precision:
      section.distance_method === 'pedestrian_routing'
        ? theme.precision
        : t('adresă · estimare', 'address · estimate'),
    title: all
      ? t(
          'Toate cele {0} lucruri de zi cu zi, la cel mult {1} minute pe jos',
          'All {0} everyday essentials within a {1}-minute walk',
          String(section.total),
          String(WALK_LIMIT_MIN),
        )
      : t(
          '{0} din {1} lucruri de zi cu zi, la cel mult {2} minute pe jos',
          '{0} of {1} everyday essentials within a {2}-minute walk',
          String(section.covered),
          String(section.total),
          String(WALK_LIMIT_MIN),
        ),
    lead:
      summary.city_avg === null
        ? undefined
        : t(
            'Media orașului e {0}.{1}',
            'City average: {0}.{1}',
            String(Math.round(summary.city_avg)),
            better,
          ),
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
  const walkLimit = t('{0} minute pe jos', '{0}-minute walk', String(WALK_LIMIT_MIN));
  const overlay = `<span class="mapchip" style="--c:${theme.color}"><i></i>${walkLimit}</span><div class="key"><b>${t('Pe hartă', 'On the map')}</b><span><i style="background:#103F32;border-radius:50%;width:10px;height:10px"></i>${t('Adresa', 'Address')}</span><span><i style="background:rgba(138,53,111,.16);border:1.5px solid rgba(138,53,111,.7)"></i>${walkLimit}</span><span class="fqkd">${dots}${t('Locuri de zi cu zi', 'Everyday places')}</span></div>`;
  const osm = sourceDate(report, 'osm');
  const note = t(
    'Locurile: OpenStreetMap{0}. Drumurile pe jos urmează străzile și aleile, la 80 de metri pe minut.',
    'Places: OpenStreetMap{0}. Walking routes follow streets and paths at 80 metres per minute.',
    osm ? `, ${osm}` : '',
  );
  const places15 = `<section class="fqC"><div class="fqmap fqC-m">${mapHtml(report.locale, map, overlay)}</div>${checklist(report.locale, section)}</section>${footnote(note)}`;
  return {
    html: chapter(
      `${head}${places15}${choiceTiles(report.locale, section)}<div class="sfB-rest">${scoreCard('fifteen_minute', report)}${subScores(report)}${sources}</div>`,
      'fqch fqCh',
    ),
    maps: [map],
  };
};
