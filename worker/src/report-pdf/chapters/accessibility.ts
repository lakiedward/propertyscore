import type { ChapterBuilder } from '../chapter.ts';
import {
  categoryEyebrow,
  chapter,
  chapterHead,
  chapterSources,
  footnote,
  iconTile,
  scoreCard,
} from '../components.ts';
import { esc, formatDate, formatDistance, formatNumber, plural } from '../format.ts';
import { DESTINATION_KINDS, TRANSIT_MODES } from '../labels.ts';
import {
  addressDot,
  addressMarker,
  collection,
  mapHtml,
  points,
  within,
  type MapMarker,
  type MapSpec,
} from '../maps.ts';
import type { ReportData } from '../report-data.ts';
import { CATEGORY_THEME } from '../theme.ts';

type Accessibility = NonNullable<ReportData['sections']['accessibility']>;
type Destination = Accessibility['destinations'][number];
type Reach = NonNullable<Accessibility['reach']>;

const NEAR_STOP_MIN = 5;
const MAP_REACH_M = 4500;
const WALK_METRES_PER_MINUTE = 80;
const DEFAULT_LINE = '#55607A';
const LIGHT_LINE_FROM = 150;
const REACH_SHADES = ['#7E5F00', '#C9A227', '#EBCF6E'];

function kindOf(destination: Destination) {
  return DESTINATION_KINDS[destination.kind] ?? { icon: 'pin' as const, color: '#2F5164' };
}

function lineChip(destination: Destination): string {
  const colour = /^#?[0-9a-f]{6}$/i.test(destination.route?.colour ?? '')
    ? `#${(destination.route?.colour ?? '').replace('#', '')}`
    : DEFAULT_LINE;
  const value = Number.parseInt(colour.slice(1), 16);
  const brightness =
    ((value >> 16) * 299 + ((value >> 8) & 255) * 587 + (value & 255) * 114) / 1000;
  return `<span class="acl" style="--lc:${colour};color:${brightness > LIGHT_LINE_FROM ? '#2A2100' : '#fff'}">${esc(destination.route?.ref ?? '')}</span>`;
}

function tripDetail(destination: Destination): string {
  if (destination.by_walking) {
    const metres = (destination.walk ?? destination.minutes ?? 0) * WALK_METRES_PER_MINUTE;
    return `${esc(formatDistance(metres))} pe jos, mai repede decât cu linia`;
  }
  const mode = TRANSIT_MODES[destination.route?.mode ?? ''] ?? 'transportul public';
  const changes =
    destination.transfers === null || destination.transfers === 0
      ? 'fără schimbare'
      : plural(destination.transfers, 'schimbare', 'schimbări', 'de schimbări');
  return destination.route?.ref
    ? `${lineChip(destination)} cu ${esc(mode)}, ${esc(changes)}`
    : `cu ${esc(mode)}, ${esc(changes)}`;
}

function tripLegs(destination: Destination): string {
  if (destination.by_walking) {
    return `<div class="legs acleg"><i class="w" style="flex:1">${String(Math.round(destination.minutes ?? 0))} min pe jos</i></div>`;
  }
  const legs = [
    { minutes: destination.walk, kind: 'w' },
    { minutes: destination.wait, kind: 't' },
    { minutes: destination.ride, kind: 'r' },
  ]
    .filter((leg): leg is { minutes: number; kind: string } => (leg.minutes ?? 0) > 0)
    .map(
      (leg) =>
        `<i class="${leg.kind}" style="flex:${String(leg.minutes)}">${String(Math.round(leg.minutes))}</i>`,
    );
  return `<div class="legs acleg" style="--c:${kindOf(destination).color}">${legs.join('')}</div>`;
}

function tripRow(destination: Destination): string {
  const kind = kindOf(destination);
  return `<div class="acr" style="--c:${kind.color}">${iconTile(kind.icon, kind.color, `color-mix(in srgb,${kind.color} 13%,#fff)`)}<span class="acr-t"><b>${esc(destination.label.ro)}</b><small>${tripDetail(destination)}</small></span><span class="acr-b">${tripLegs(destination)}</span><span class="acr-m"><b>${String(Math.round(destination.minutes ?? 0))}</b> min</span></div>`;
}

function reachCard(reach: Reach, center: [number, number]): { html: string; map: MapSpec } {
  const bands = [...reach.isochrones].sort((left, right) => right.minutes - left.minutes);
  const map: MapSpec = {
    id: 'map-reach',
    center,
    fit: reach.neighbourhoods.map((place) => place.location),
    padding: 48,
    layers: bands.map((band, index) => ({
      kind: 'fill' as const,
      data: collection([band.geometry]),
      color: REACH_SHADES[bands.length - 1 - index] ?? REACH_SHADES[0] ?? DEFAULT_LINE,
      opacity: 0.55,
    })),
    markers: [
      ...reach.neighbourhoods.map((place): MapMarker => {
        const inside = place.minutes !== null && place.minutes <= reach.minutes;
        return {
          position: place.location,
          html: `<span class="reach-pl${inside ? '' : ' out'}"><i></i><b>${esc(place.name)}</b>${place.minutes === null ? '' : `<small>${String(Math.round(place.minutes))} min</small>`}</span>`,
          anchor: 'top',
        };
      }),
      addressDot(center),
    ],
  };
  const key = bands
    .slice()
    .reverse()
    .map((band, index, all) => {
      const from = index === 0 ? 'sub ' : `${String(all[index - 1]?.minutes ?? 0)}–`;
      return `<span><i style="background:${REACH_SHADES[index] ?? DEFAULT_LINE}"></i>${from}${String(band.minutes)} min</span>`;
    })
    .join('');
  const html = `<section class="card ac acn acnA"><div class="ac-h"><div><div class="eyebrow">Cât de departe ajungi</div><h3>Orașul, în minute de la ușa ta</h3></div><div class="seg acnseg"><span class="on">${String(reach.minutes)} min</span></div></div><div class="acnA-g"><div class="acnA-t"><div class="acn-big"><b>${formatNumber(reach.share_pct)}%</b><span>din oraș</span></div><p class="acn-s">În <b>${String(reach.minutes)} de minute</b>, cu transportul public și pe jos, ajungi în ${formatNumber(reach.share_pct)}% din oraș.</p><p class="acn-n"><b>${String(reach.neighbourhoods_reached)} din ${String(reach.neighbourhoods_total)}</b> cartiere, plecând la 8 dimineața.</p><div class="acn-key">${key}</div></div><div class="acnA-m">${mapHtml(map)}</div></div></section>`;
  return { html, map };
}

export const accessibilityChapter: ChapterBuilder = (report) => {
  const summary = report.categories.accessibility;
  const section = report.sections.accessibility;
  const theme = CATEGORY_THEME.accessibility;
  if (!section) {
    const head = chapterHead({
      eyebrow: categoryEyebrow('accessibility', summary),
      color: theme.color,
      title: 'Transportul public din jurul adresei',
    });
    return {
      html: chapter(
        head + scoreCard('accessibility', report) + chapterSources(report, ['accessibility']),
      ),
      maps: [],
    };
  }
  const nearStops = section.stops.filter((stop) => stop.walk_min <= NEAR_STOP_MIN).length;
  const lineCount = new Set(section.stops.flatMap((stop) => stop.routes)).size;
  const better =
    summary.percentile === null
      ? ''
      : ` De aici ajungi cu transportul public mai ușor decât din ${String(Math.round(summary.percentile))}% din zonele din ${report.city.name}.`;
  const head = chapterHead({
    eyebrow: categoryEyebrow('accessibility', summary),
    color: theme.color,
    precision: theme.precision,
    title: `${plural(nearStops, 'stație', 'stații', 'de stații')} la ${String(NEAR_STOP_MIN)} minute și ${plural(lineCount, 'linie', 'linii', 'de linii')} care te duc în tot orașul`,
    lead:
      summary.city_avg === null
        ? undefined
        : `Media orașului e ${String(Math.round(summary.city_avg))}.${better}`,
  });
  const center: [number, number] = [report.longitude, report.latitude];
  const reachable = section.destinations
    .filter((destination) => destination.minutes !== null)
    .sort((left, right) => (left.minutes ?? 0) - (right.minutes ?? 0));
  const map: MapSpec = {
    id: 'map-accessibility',
    center,
    fit: within(
      center,
      reachable.map((destination) => destination.location),
      MAP_REACH_M,
    ),
    padding: 64,
    layers: [
      ...reachable.flatMap((destination) =>
        destination.path.flatMap((leg) => {
          const data = collection([{ type: 'LineString', coordinates: leg.coordinates }]);
          const isWalk = leg.mode === 'walk';
          return [
            { kind: 'line' as const, data, color: '#FFFFFF', width: isWalk ? 5 : 7 },
            {
              kind: 'line' as const,
              data,
              color: kindOf(destination).color,
              width: isWalk ? 3 : 4,
              dotted: isWalk,
            },
          ];
        }),
      ),
      {
        kind: 'circle',
        data: points(section.stops.map((stop) => stop.location)),
        color: '#52685B',
        radius: 4,
      },
    ],
    markers: [
      ...reachable.map((destination): MapMarker => ({
        position: destination.location,
        html: `<span class="rp" style="--c:${kindOf(destination).color}"><b>${String(Math.round(destination.minutes ?? 0))} min</b></span>`,
        anchor: 'left',
        offset: [6, 0],
      })),
      addressMarker(center, report.addressText.split(',')[0]),
    ],
  };
  const mapOverlay = `<span class="mapchip" style="--c:#0F766E"><i></i>Trasee transport</span><div class="key"><b>Pe hartă</b><span><i style="background:#103F32;border-radius:50%;width:10px;height:10px"></i>Adresa</span><span><i style="background:#0F766E;height:4px;border-radius:2px"></i>Cu vehiculul</span><span><i style="background:transparent;border-top:3px dotted #0F766E;height:0;border-radius:0"></i>Pe jos</span><span><i style="background:#52685B;border-radius:50%;width:8px;height:8px"></i>Stații din jur</span></div>`;
  const legend = reachable
    .map(
      (destination) =>
        `<span style="--c:${kindOf(destination).color}"><i></i>${esc(destination.label.ro)} <b>${String(Math.round(destination.minutes ?? 0))} min</b></span>`,
    )
    .join('');
  const unrouted = reachable.filter((destination) => destination.path.length === 0).length;
  const routesNote =
    unrouted === 0
      ? 'Traseele de pe hartă urmează străzile și liniile, de la adresă la destinație.'
      : unrouted === reachable.length
        ? 'Traseele pe străzi nu sunt disponibile pentru această adresă: harta arată doar destinațiile.'
        : 'Traseele de pe hartă urmează străzile și liniile. Unde traseul lipsește, apare doar destinația.';
  const schedule =
    section.data_quality === 'gtfs' && section.reference_date
      ? `Liniile, stațiile și orarul: operatorul de transport, orar din ${formatDate(section.reference_date)}, o zi lucrătoare. ${routesNote}`
      : `Orașul nu publică orarul în format deschis: stațiile și liniile vin din OpenStreetMap. ${routesNote}`;
  const trips =
    reachable.length === 0
      ? '<p class="hint">Nu am putut calcula drumurile spre locurile importante.</p>'
      : `<div class="acd acp-l">${reachable.map(tripRow).join('')}</div>`;
  const reach = section.reach ? reachCard(section.reach, center) : null;
  const body = `<section class="acW"><div class="acmap acW-m">${mapHtml(map, mapOverlay)}<div class="rleg">${legend}</div></div><div class="acW-l"><div class="acp"><div class="ac-h"><div><h3>Cât faci până acolo, dimineața la 8</h3></div><div class="legkey"><span><i style="background:#52685B"></i>pe jos</span><span><i style="background:#C9A44A"></i>așteptare</span><span><i style="background:#8A8F99"></i>cu linia</span></div></div>${trips}</div></div>${footnote(schedule)}</section>`;
  return {
    html: chapter(
      `${head}${body}<div class="sfB-rest">${scoreCard('accessibility', report)}${reach?.html ?? ''}${chapterSources(report, ['accessibility'])}</div>`,
    ),
    maps: reach ? [map, reach.map] : [map],
  };
};
