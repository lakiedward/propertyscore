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
import { esc, walkMinutes, reportFormat, labelFor } from '../format.ts';
import { GREEN_AMENITIES } from '../labels.ts';
import { addressDot, mapHtml, type MapMarker, type MapSpec } from '../maps.ts';
import { categoryTheme } from '../theme.ts';

const LISTED_PARKS = 9;
const LARGE_PARK_HA = 1;

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
  const parks = [...section.parks].sort((left, right) => left.walk_m - right.walk_m);
  const large = parks.filter((park) => park.area_ha >= LARGE_PARK_HA);
  const listed = (large.length > 0 ? large : parks).slice(0, LISTED_PARKS);
  const farthest = listed.at(-1);
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
            '{0}, la cel mult {1} minute pe jos',
            '{0}, within a {1}-minute walk',
            plural(listed.length, ['parc mare', 'large park'], 'parcuri mari', [
              'de parcuri mari',
              'large parks',
            ]),
            String(walkMinutes(farthest.walk_m)),
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
    fit: [center, ...listed.map((park) => park.center)],
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
  const approximate = section.distance_method === 'straight_line';
  const cards = listed
    .map((park, index) => {
      const chips = park.amenities
        .map((amenity) => `<i>${esc(labelFor(report.locale, GREEN_AMENITIES, amenity))}</i>`)
        .join('');
      return `<div class="gz-pc"><span class="gz-pc-h"><span class="fqx-n" style="--c:${theme.color}">${String(index + 1)}</span><b>${esc(park.name ?? t('Spațiu verde fără nume', 'Unnamed green space'))}</b></span><span class="gz-pc-s"><b>${formatNumber(park.area_ha, 1)}</b> ha<span>·</span>${t('{0}{1} min pe jos', '{0}{1} min on foot', approximate ? t('circa ', 'about ') : '', String(walkMinutes(park.walk_m)))}</span>${chips ? `<span class="gz-ch">${chips}</span>` : ''}</div>`;
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
