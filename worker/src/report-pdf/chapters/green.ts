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
import { esc, formatNumber, plural, walkMinutes } from '../format.ts';
import { GREEN_AMENITIES } from '../labels.ts';
import { addressDot, mapHtml, type MapMarker, type MapSpec } from '../maps.ts';
import { CATEGORY_THEME } from '../theme.ts';

const LISTED_PARKS = 9;
const LARGE_PARK_HA = 1;

export const greenChapter: ChapterBuilder = (report) => {
  const summary = report.categories.green;
  const section = report.sections.green;
  const theme = CATEGORY_THEME.green;
  const sources = chapterSources(report, ['green']);
  if (!section) {
    const head = chapterHead({
      eyebrow: categoryEyebrow('green', summary, 'Spații verzi'),
      color: theme.color,
      title: 'Parcurile și spațiile verzi din jurul adresei',
      lead: 'Nu avem date despre spațiile verzi pentru această adresă.',
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
      : ` ${formatNumber(share * 100)}% din suprafața pe ${String(section.near_radius_m)} m e spațiu verde${section.city_avg_share_near === null ? '' : `, față de ${formatNumber(section.city_avg_share_near * 100)}% media orașului`}.`;
  const head = chapterHead({
    eyebrow: categoryEyebrow('green', summary, 'Spații verzi'),
    color: theme.color,
    precision: theme.precision,
    title:
      listed.length === 0 || !farthest
        ? 'Niciun parc mare la o plimbare de adresă'
        : `${plural(listed.length, 'parc mare', 'parcuri mari', 'de parcuri mari')}, la cel mult ${String(walkMinutes(farthest.walk_m))} minute pe jos`,
    lead:
      biggest && listed.length > 0
        ? `Împreună au ${formatNumber(totalHa)} ha. Cel mai mare, ${biggest.name ?? 'un spațiu verde fără nume'}, are ${formatNumber(biggest.area_ha, 1)} ha.${shareText}`
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
        .map((amenity) => `<i>${esc(GREEN_AMENITIES[amenity] ?? amenity)}</i>`)
        .join('');
      return `<div class="gz-pc"><span class="gz-pc-h"><span class="fqx-n" style="--c:${theme.color}">${String(index + 1)}</span><b>${esc(park.name ?? 'Spațiu verde fără nume')}</b></span><span class="gz-pc-s"><b>${formatNumber(park.area_ha, 1)}</b> ha<span>·</span>${approximate ? 'circa ' : ''}${String(walkMinutes(park.walk_m))} min pe jos</span>${chips ? `<span class="gz-ch">${chips}</span>` : ''}</div>`;
    })
    .join('');
  const list =
    listed.length === 0
      ? '<p class="hint">Nu am găsit spații verzi publice în apropiere.</p>'
      : cards;
  const osm = sourceDate(report, 'osm');
  return {
    html: chapter(
      `${head}<section class="gzB"><div class="gzB-m">${mapHtml(map)}</div><div class="gzB-l">${list}</div></section>${footnote(`Parcuri, iarbă, păduri și alei: OpenStreetMap${osm ? `, ${osm}` : ''}.`)}<div class="sfB-rest">${scoreCard('green', report)}${sources}</div>`,
    ),
    maps: [map],
  };
};
