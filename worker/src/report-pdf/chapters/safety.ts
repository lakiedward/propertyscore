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
import { formatDistance, formatMinutes, plural } from '../format.ts';
import { HEALTH_LAYERS, SAFETY_TYPES } from '../labels.ts';
import { mapHtml, within, type MapSpec } from '../maps.ts';
import type { ReportData } from '../report-data.ts';

type Safety = NonNullable<ReportData['sections']['safety']>;
type Contribution = Safety['address']['day']['contributions'][number];

const RAISES = '#2E9C82';
const LOWERS = '#D0583C';
const HELP_TYPES = ['police', 'fire_station', 'nonstop'];
const MAX_FACTORS = 4;
const MAP_REACH_M = 1500;

function factorRow(item: Contribution): Row {
  const nearest =
    item.nearest_m === null ? '' : `, cel mai aproape la ${formatDistance(item.nearest_m)}`;
  const points = Math.round(Math.abs(item.points));
  return {
    title: SAFETY_TYPES[item.type] ?? item.type,
    detail: `${plural(item.count, 'loc', 'locuri', 'de locuri')}${nearest}`,
    value: `${item.points >= 0 ? '+' : '−'}${String(points)}`,
    dot: item.points >= 0 ? RAISES : LOWERS,
  };
}

function factors(safety: Safety, moment: 'day' | 'night'): string {
  const { contributions, score } = safety.address[moment];
  const strongest = [...contributions]
    .filter((item) => Math.round(Math.abs(item.points)) > 0)
    .sort((left, right) => Math.abs(right.points) - Math.abs(left.points))
    .slice(0, MAX_FACTORS);
  const title = `De ce are adresa ${String(Math.round(score))} ${moment === 'day' ? 'ziua' : 'noaptea'}`;
  const body =
    strongest.length === 0
      ? note('Niciun element din jur nu schimbă scorul de pornire.')
      : rows(strongest.map(factorRow));
  return card(title, body, `Pornește de la ${String(Math.round(safety.address.start))} puncte`);
}

function helpRows(report: ReportData, safety: Safety): Row[] {
  const landmarks = HELP_TYPES.flatMap((type) => {
    const nearest = safety.landmarks
      .filter((landmark) => landmark.type === type)
      .sort((left, right) => left.distance_m - right.distance_m)[0];
    if (!nearest) return [];
    return [
      {
        title: SAFETY_TYPES[type] ?? type,
        detail: nearest.name ?? undefined,
        value: formatDistance(nearest.distance_m),
      },
    ];
  });
  const medical = (report.sections.health?.layers ?? []).flatMap((layer) => {
    if (layer.minutes === null || !['h4', 'h5'].includes(layer.key)) return [];
    return [
      {
        title: HEALTH_LAYERS[layer.key] ?? layer.key,
        detail: layer.place?.name ?? undefined,
        value: formatMinutes(layer.minutes),
        unit: layer.mode === 'car' ? 'cu mașina' : 'pe jos',
      },
    ];
  });
  return [...landmarks, ...medical];
}

export const safetyChapter: ChapterBuilder = (report) => {
  const summary = report.categories.safety;
  const safety = report.sections.safety;
  const head = chapterHead({
    eyebrow: categoryEyebrow('safety', summary),
    precision: 'zonă (celulă)',
    title: 'Lumină, magazine deschise și lume pe stradă',
    lead: safety
      ? `Ziua zona are ${String(Math.round(safety.day))}, noaptea ${String(Math.round(safety.night))}. Mai jos e fiecare element din jur care urcă sau coboară scorul.`
      : undefined,
  });
  if (!safety) return { html: chapter(head + scoreCard('safety', report)), maps: [] };
  const center: [number, number] = [report.longitude, report.latitude];
  const map: MapSpec = {
    id: 'map-safety',
    center,
    fit: within(
      center,
      safety.landmarks.map((landmark) => landmark.location),
      MAP_REACH_M,
    ),
    layers: [],
    markers: [
      { position: center },
      ...safety.landmarks.map((landmark) => ({
        position: landmark.location,
        label: (SAFETY_TYPES[landmark.type] ?? landmark.type).charAt(0),
        color: '#1C6B67',
      })),
    ],
  };
  const help = helpRows(report, safety);
  const helpCard =
    help.length === 0
      ? ''
      : card('Cât de departe e ajutorul', rows(help, 2), 'Dacă ai nevoie de ajutor');
  return {
    html: chapter(
      head +
        mapHtml(map, 44) +
        `<div class="grid cols-2">${factors(safety, 'day')}${factors(safety, 'night')}</div>` +
        scoreCard('safety', report) +
        helpCard,
    ),
    maps: [map],
  };
};
