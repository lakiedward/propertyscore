import type { ChapterBuilder } from '../chapter.ts';
import {
  card,
  categoryEyebrow,
  chapter,
  chapterHead,
  note,
  rows,
  scoreCard,
} from '../components.ts';
import { formatNumber, plural, walkMinutes } from '../format.ts';
import { GREEN_AMENITIES } from '../labels.ts';
import { mapHtml, type MapSpec } from '../maps.ts';

const LISTED_PARKS = 8;
const LARGE_PARK_HA = 1;

export const greenChapter: ChapterBuilder = (report) => {
  const summary = report.categories.green;
  const section = report.sections.green;
  if (!section) {
    const head = chapterHead({
      eyebrow: categoryEyebrow('green', summary),
      title: 'Parcurile și verdele din jurul adresei',
    });
    return { html: chapter(head + scoreCard('green', report)), maps: [] };
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
    eyebrow: categoryEyebrow('green', summary),
    precision: 'adresă',
    title:
      listed.length === 0 || !farthest
        ? 'Niciun parc mare la o plimbare de adresă'
        : `${plural(listed.length, 'parc', 'parcuri', 'de parcuri')}, la cel mult ${String(walkMinutes(farthest.walk_m))} minute pe jos`,
    lead:
      biggest && listed.length > 0
        ? `Împreună au ${formatNumber(totalHa)} ha. Cel mai mare, ${biggest.name ?? 'un spațiu verde fără nume'}, are ${formatNumber(biggest.area_ha, 1)} ha.${shareText}`
        : shareText.trim() || undefined,
  });
  const center: [number, number] = [report.longitude, report.latitude];
  const map: MapSpec = {
    id: 'map-green',
    center,
    fit: listed.map((park) => park.center),
    layers: [{ kind: 'fill', data: section.areas, color: '#3F6E1B', opacity: 0.35 }],
    markers: [
      { position: center },
      ...listed.map((park, index) => ({
        position: park.center,
        label: String(index + 1),
        color: '#3F6E1B',
      })),
    ],
  };
  const approximate = section.distance_method === 'straight_line';
  const list =
    listed.length === 0
      ? note('Nu am găsit spații verzi publice în apropiere.')
      : rows(
          listed.map((park, index) => ({
            marker: String(index + 1),
            title: park.name ?? 'Spațiu verde fără nume',
            detail: `${formatNumber(park.area_ha, 1)} ha · ${approximate ? '~' : ''}${String(walkMinutes(park.walk_m))} min pe jos`,
            tags: park.amenities.map((amenity) => GREEN_AMENITIES[amenity] ?? amenity),
          })),
        );
  return {
    html: chapter(
      head +
        `<div class="grid cols-map">${mapHtml(map, 110)}${card('Parcurile cele mai apropiate', list)}</div>` +
        note('Parcuri, păduri și spații verzi publice din OpenStreetMap.') +
        scoreCard('green', report),
    ),
    maps: [map],
  };
};
