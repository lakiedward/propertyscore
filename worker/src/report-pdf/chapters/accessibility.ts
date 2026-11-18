import type { ChapterBuilder } from '../chapter.ts';
import { card, categoryEyebrow, chapter, chapterHead, note, scoreCard } from '../components.ts';
import { esc, formatDate, formatNumber, plural } from '../format.ts';
import { mapHtml, points, within, type MapSpec } from '../maps.ts';
import type { ReportData } from '../report-data.ts';

type Accessibility = NonNullable<ReportData['sections']['accessibility']>;
type Destination = Accessibility['destinations'][number];

const NEAR_STOP_MIN = 5;
const MAP_REACH_M = 4000;
const WALK = '#52685B';
const WAIT = '#C8A24A';
const RIDE = '#2F5164';

function tripBar(destination: Destination): string {
  const legs = [
    { minutes: destination.walk, color: WALK },
    { minutes: destination.wait, color: WAIT },
    { minutes: destination.ride, color: RIDE },
  ].filter(
    (leg): leg is { minutes: number; color: string } => leg.minutes !== null && leg.minutes > 0,
  );
  if (legs.length === 0) return '<span></span>';
  const segments = legs.map(
    (leg) =>
      `<i style="flex:${String(leg.minutes)};--swatch:${leg.color}">${leg.minutes >= 3 ? String(Math.round(leg.minutes)) : ''}</i>`,
  );
  return `<div class="trip-bar">${segments.join('')}</div>`;
}

function trip(destination: Destination): string {
  const how = destination.by_walking
    ? 'pe jos, mai repede decât cu linia'
    : destination.route?.ref
      ? `cu linia ${destination.route.ref}`
      : 'cu transportul public';
  const minutes =
    destination.minutes === null
      ? '<span class="row-value">–</span>'
      : `<span class="row-value">${formatNumber(Math.round(destination.minutes))}<small>min</small></span>`;
  return `<div class="trip"><div class="row-text"><b>${esc(destination.label.ro)}</b><span>${esc(how)}</span></div>${tripBar(destination)}${minutes}</div>`;
}

export const accessibilityChapter: ChapterBuilder = (report) => {
  const summary = report.categories.accessibility;
  const section = report.sections.accessibility;
  if (!section) {
    const head = chapterHead({
      eyebrow: categoryEyebrow('accessibility', summary),
      title: 'Transportul public din jurul adresei',
    });
    return { html: chapter(head + scoreCard('accessibility', report)), maps: [] };
  }
  const nearStops = section.stops.filter((stop) => stop.walk_min <= NEAR_STOP_MIN).length;
  const lineCount = new Set(section.stops.flatMap((stop) => stop.routes)).size;
  const head = chapterHead({
    eyebrow: categoryEyebrow('accessibility', summary),
    precision: 'adresă · transport public',
    title: `${plural(nearStops, 'stație', 'stații', 'de stații')} la ${String(NEAR_STOP_MIN)} minute și ${plural(lineCount, 'linie', 'linii', 'de linii')} care te duc în oraș`,
    lead:
      summary.city_avg === null
        ? undefined
        : `Media orașului e ${String(Math.round(summary.city_avg))}.`,
  });
  const center: [number, number] = [report.longitude, report.latitude];
  const reachable = section.destinations.filter((destination) => destination.minutes !== null);
  const map: MapSpec = {
    id: 'map-accessibility',
    center,
    fit: within(
      center,
      reachable.map((destination) => destination.location),
      MAP_REACH_M,
    ),
    layers: [
      {
        kind: 'circle',
        data: points(section.stops.map((stop) => stop.location)),
        color: '#7E5F00',
        radius: 3.5,
      },
    ],
    markers: [
      { position: center },
      ...reachable.map((destination) => ({
        position: destination.location,
        label: `${String(Math.round(destination.minutes ?? 0))} min`,
        color: '#2F5164',
      })),
    ],
  };
  const schedule =
    section.data_quality === 'gtfs' && section.reference_date
      ? `Linii, stații și orar din datele operatorului, pentru ${formatDate(section.reference_date)}, o zi lucrătoare, dimineața.`
      : 'Orașul nu publică orarul în format deschis: stațiile și liniile vin din OpenStreetMap.';
  const legend = `<div class="legend"><span><i style="--swatch:${WALK}"></i>pe jos</span><span><i style="--swatch:${WAIT}"></i>așteptare</span><span><i style="--swatch:${RIDE}"></i>cu linia</span></div>`;
  const trips =
    reachable.length === 0
      ? note('Nu am putut calcula drumurile spre locurile importante.')
      : reachable
          .sort((left, right) => (left.minutes ?? 0) - (right.minutes ?? 0))
          .map(trip)
          .join('') + legend;
  return {
    html: chapter(
      head +
        mapHtml(map, 64) +
        card(
          'Cât faci până acolo, dimineața',
          trips + note(schedule),
          'Drumuri spre locurile importante',
        ) +
        scoreCard('accessibility', report),
    ),
    maps: [map],
  };
};
