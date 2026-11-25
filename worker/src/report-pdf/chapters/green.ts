import { z } from 'zod';

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
import { esc, reportFormat, labelFor } from '../format.ts';
import { GREEN_AMENITIES } from '../labels.ts';
import {
  addressDot,
  mapHtml,
  type FeatureCollection,
  type MapMarker,
  type MapSpec,
} from '../maps.ts';
import type { ReportData } from '../report-data.ts';
import { categoryTheme } from '../theme.ts';

const LISTED_PARKS = 9;
const LARGE_PARK_HA = 1;
const WALK_METRES_PER_MINUTE = 80;

const rings = z.array(z.array(z.tuple([z.number(), z.number()])));
const polygon = z.discriminatedUnion('type', [
  z.object({ type: z.literal('Polygon'), coordinates: rings }),
  z.object({ type: z.literal('MultiPolygon'), coordinates: z.array(rings) }),
]);

type Park = NonNullable<ReportData['sections']['green']>['parks'][number];
type Position = Park['center'];

function walkDuration(park: Park): number {
  return park.walk_seconds === undefined
    ? park.walk_m / WALK_METRES_PER_MINUTE
    : park.walk_seconds / 60;
}

function walkMinutes(park: Park): number {
  return Math.max(1, Math.round(walkDuration(park)));
}

function greenMapFit(
  center: Position,
  parks: readonly Park[],
  areas: FeatureCollection,
): Position[] {
  const listedIds = new Set(parks.map((park) => park.id));
  const min: Position = [...center];
  const max: Position = [...center];
  const extend = ([lng, lat]: Position) => {
    min[0] = Math.min(min[0], lng);
    min[1] = Math.min(min[1], lat);
    max[0] = Math.max(max[0], lng);
    max[1] = Math.max(max[1], lat);
  };
  for (const park of parks) extend(park.center);
  for (const feature of areas.features) {
    const id = feature.properties?.id;
    if (typeof id !== 'string' || !listedIds.has(id)) continue;
    const parsed = polygon.safeParse(feature.geometry);
    if (!parsed.success) continue;
    const geometry = parsed.data;
    const points =
      geometry.type === 'Polygon' ? geometry.coordinates.flat() : geometry.coordinates.flat(2);
    for (const point of points) extend(point);
  }
  return [min, max];
}

export const greenChapter: ChapterBuilder = (report) => {
  const { t, formatNumber, plural } = reportFormat(report.locale);
  const summary = report.categories.green;
  const section = report.sections.green;
  const theme = categoryTheme(report.locale, 'green');
  const sources = chapterSources(report, ['green']);
  if (!section) {
    const head = chapterHead(report.locale, {
      eyebrow: categoryEyebrow(report.locale, 'green', summary, t('Spații verzi', 'Green spaces')),
      color: theme.color,
      title: t(
        'Parcurile și spațiile verzi din jurul adresei',
        'Parks and green spaces around the address',
      ),
      lead: t(
        'Nu avem date despre spațiile verzi pentru această adresă.',
        'No green space data is available for this address.',
      ),
    });
    return { html: chapter(head + scoreCard('green', report) + sources), maps: [] };
  }
  const parks = [...section.parks].sort((left, right) => walkDuration(left) - walkDuration(right));
  const large = parks.filter((park) => park.area_ha >= LARGE_PARK_HA);
  const listed = (large.length > 0 ? large : parks).slice(0, LISTED_PARKS);
  const farthest = listed.at(-1);
  const hasRoutedTimes = section.parks.some((park) => park.walk_seconds !== undefined);
  const isWalkEstimated = (park: Park) =>
    park.walk_seconds === undefined &&
    (section.distance_method === 'straight_line' || hasRoutedTimes);
  const hasEstimatedWalk = listed.some(isWalkEstimated);
  const totalHa = listed.reduce((sum, park) => sum + park.area_ha, 0);
  const biggest = [...listed].sort((left, right) => right.area_ha - left.area_ha)[0];
  const share = section.share[String(section.near_radius_m)];
  const shareText =
    share === undefined
      ? ''
      : t(
          ' {0}% din suprafața pe {1} m e spațiu verde{2}.',
          ' {0}% of the area within {1} m is green space{2}.',
          formatNumber(share * 100),
          String(section.near_radius_m),
          section.city_avg_share_near === null
            ? ''
            : t(
                ', față de {0}% media orașului',
                ', compared with the city average of {0}%',
                formatNumber(section.city_avg_share_near * 100),
              ),
        );
  const head = chapterHead(report.locale, {
    eyebrow: categoryEyebrow(report.locale, 'green', summary, t('Spații verzi', 'Green spaces')),
    color: theme.color,
    precision: theme.precision,
    title:
      listed.length === 0 || !farthest
        ? t(
            'Niciun parc mare la o plimbare de adresă',
            'No large park within walking distance of the address',
          )
        : t(
            hasEstimatedWalk
              ? '{0}, până la circa {1} minute pe jos'
              : '{0}, la cel mult {1} minute pe jos',
            hasEstimatedWalk
              ? '{0}, within about a {1}-minute walk'
              : '{0}, within a {1}-minute walk',
            plural(listed.length, ['parc mare', 'large park'], 'parcuri mari', [
              'de parcuri mari',
              'large parks',
            ]),
            String(walkMinutes(farthest)),
          ),
    lead:
      biggest && listed.length > 0
        ? t(
            'Împreună au {0} ha. Cel mai mare, {1}, are {2} ha.{3}',
            'They cover {0} ha in total. The largest, {1}, covers {2} ha.{3}',
            formatNumber(totalHa),
            biggest.name ?? t('un spațiu verde fără nume', 'an unnamed green space'),
            formatNumber(biggest.area_ha, 1),
            shareText,
          )
        : shareText.trim() || undefined,
  });
  const center: [number, number] = [report.longitude, report.latitude];
  const map: MapSpec = {
    id: 'map-green',
    center,
    fit: greenMapFit(center, listed, section.areas),
    padding: 48,
    layers: [{ kind: 'fill', data: section.areas, color: '#7DA94B', opacity: 0.7 }],
    markers: [
      ...listed.map((park, index): MapMarker => ({
        position: park.center,
        html: `<span class="fqx-n onmap" style="--c:${theme.color}">${String(index + 1)}</span>`,
      })),
      addressDot(center),
    ],
  };
  const cards = listed
    .map((park, index) => {
      const chips = park.amenities
        .map((amenity) => `<i>${esc(labelFor(report.locale, GREEN_AMENITIES, amenity))}</i>`)
        .join('');
      return `<div class="gz-pc"><span class="gz-pc-h"><span class="fqx-n" style="--c:${theme.color}">${String(index + 1)}</span><b>${esc(park.name ?? t('Spațiu verde fără nume', 'Unnamed green space'))}</b></span><span class="gz-pc-s"><b>${formatNumber(park.area_ha, 1)}</b> ha<span>·</span>${t('{0}{1} min pe jos', '{0}{1} min on foot', isWalkEstimated(park) ? t('circa ', 'about ') : '', String(walkMinutes(park)))}</span>${chips ? `<span class="gz-ch">${chips}</span>` : ''}</div>`;
    })
    .join('');
  const list =
    listed.length === 0
      ? `<p class="hint">${t('Nu am găsit spații verzi publice în apropiere.', 'We found no public green spaces nearby.')}</p>`
      : cards;
  const osm = sourceDate(report, 'osm');
  return {
    html: chapter(
      `${head}<section class="gzB"><div class="gzB-m">${mapHtml(report.locale, map)}</div><div class="gzB-l">${list}</div></section>${footnote(t('Parcuri, iarbă, păduri și alei: OpenStreetMap{0}.', 'Parks, grass, woods and paths: OpenStreetMap{0}.', osm ? `, ${osm}` : ''))}<div class="sfB-rest">${scoreCard('green', report)}${sources}</div>`,
    ),
    maps: [map],
  };
};
