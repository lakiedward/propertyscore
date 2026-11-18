import type { ChapterBuilder } from '../chapter.ts';
import {
  card,
  categoryEyebrow,
  chapter,
  chapterHead,
  note,
  rows,
  scoreCard,
  type Row,
} from '../components.ts';
import { plural } from '../format.ts';
import { FIFTEEN_MINUTE_CATEGORIES, FIFTEEN_MINUTE_GROUPS } from '../labels.ts';
import { collection, mapHtml, points, type MapSpec } from '../maps.ts';
import type { ReportData } from '../report-data.ts';

type FifteenMinute = NonNullable<ReportData['sections']['fifteen_minute']>;

const LISTED_CATEGORIES = 8;
const LISTED_GROUPS = 4;
const HUE = '#8A356F';

function nearestRows(section: FifteenMinute): Row[] {
  return section.categories
    .filter((category) => category.t1_min !== null)
    .sort((left, right) => (left.t1_min ?? 0) - (right.t1_min ?? 0))
    .slice(0, LISTED_CATEGORIES)
    .map((category) => {
      const nearest = section.places
        .filter((place) => place.category === category.key)
        .sort((left, right) => left.minutes - right.minutes)[0];
      const choice = `${plural(category.n15, 'loc', 'locuri', 'de locuri')} în 15 min`;
      return {
        title: FIFTEEN_MINUTE_CATEGORIES[category.key] ?? category.key,
        detail: nearest?.name ? `${nearest.name} · ${choice}` : choice,
        value: String(Math.max(1, Math.round(category.t1_min ?? 0))),
        unit: 'min',
        dot: HUE,
      };
    });
}

function choiceCards(section: FifteenMinute): string {
  const groups = section.groups
    .filter((group) => group.n15 > 0 && group.key !== 'other')
    .sort((left, right) => right.n15 - left.n15)
    .slice(0, LISTED_GROUPS)
    .map(
      (group) =>
        `<div class="soft" style="margin:0"><strong>${String(group.n15)}</strong><span>${FIFTEEN_MINUTE_GROUPS[group.key] ?? group.key}</span></div>`,
    );
  if (groups.length === 0) return '';
  return card(
    'Nu doar un loc aproape, ci mai multe din care alegi',
    `<div class="grid" style="grid-template-columns:repeat(4,1fr);gap:2.5mm">${groups.join('')}</div>`,
    'Ai de unde alege · locuri la 15 minute pe jos',
  );
}

export const fifteenMinuteChapter: ChapterBuilder = (report) => {
  const summary = report.categories.fifteen_minute;
  const section = report.sections.fifteen_minute;
  if (!section) {
    const head = chapterHead({
      eyebrow: categoryEyebrow('fifteen_minute', summary),
      title: 'Ce ai la 15 minute pe jos',
    });
    return {
      html: chapter(head + scoreCard('fifteen_minute', report)),
      maps: [],
    };
  }
  const all = section.covered === section.total;
  const head = chapterHead({
    eyebrow: categoryEyebrow('fifteen_minute', summary),
    precision:
      section.distance_method === 'pedestrian_routing'
        ? 'adresă · pe străzi reale'
        : 'adresă · estimare',
    title: all
      ? `Toate cele ${String(section.total)} lucruri de zi cu zi, la cel mult 15 minute pe jos`
      : `${String(section.covered)} din ${String(section.total)} lucruri de zi cu zi, la cel mult 15 minute pe jos`,
    lead:
      summary.city_avg === null
        ? undefined
        : `Media orașului e ${String(Math.round(summary.city_avg))}.`,
  });
  const center: [number, number] = [report.longitude, report.latitude];
  const widest = [...section.isochrones].sort((left, right) => right.minutes - left.minutes);
  const places = section.places.map((place): [number, number] => [place.lng, place.lat]);
  const map: MapSpec = {
    id: 'map-fifteen',
    center,
    fit: places,
    layers: [
      ...widest.map((isochrone) => ({
        kind: 'fill' as const,
        data: collection([isochrone.geometry]),
        color: HUE,
        opacity: 0.14,
      })),
      { kind: 'circle', data: points(places), color: HUE, radius: 2.5 },
    ],
    markers: [{ position: center }],
  };
  const missing = section.categories
    .filter((category) => category.status === 'missing')
    .map((category) => FIFTEEN_MINUTE_CATEGORIES[category.key] ?? category.key);
  const missingNote =
    missing.length === 0 ? '' : note(`Mai departe de 15 minute: ${missing.join(', ')}.`);
  return {
    html: chapter(
      head +
        `<div class="grid cols-map">${mapHtml(map, 84)}${card(`${String(section.covered)} din ${String(section.total)} la 15 minute pe jos`, rows(nearestRows(section)) + missingNote, 'Lista de zi cu zi')}</div>` +
        choiceCards(section) +
        scoreCard('fifteen_minute', report),
    ),
    maps: [map],
  };
};
