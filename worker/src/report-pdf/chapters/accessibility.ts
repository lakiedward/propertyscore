import { decodePolyline6 } from '../../routing/polyline.ts';
import type { ChapterBuilder } from '../chapter.ts';
import {
  categoryEyebrow,
  chapter,
  chapterHead,
  chapterSources,
  footnote,
  iconTile,
  scoreCard,
  sourceDate,
} from '../components.ts';
import { esc, reportFormat, labelFor } from '../format.ts';
import { DESTINATION_KINDS, TRANSIT_MODES } from '../labels.ts';
import {
  addressMarker,
  collection,
  mapHtml,
  points,
  within,
  type MapMarker,
  type MapSpec,
} from '../maps.ts';
import type { ReportData, ReportLocale } from '../report-data.ts';
import { categoryTheme } from '../theme.ts';

type Accessibility = NonNullable<ReportData['sections']['accessibility']>;
type Destination = Accessibility['destinations'][number];
type Reach = NonNullable<Extract<Accessibility, { status: 'scored' }>['reach']>;

const NEAR_STOP_MIN = 5;
const MAP_REACH_M = 4500;
const WALK_METRES_PER_MINUTE = 80;
const DEFAULT_LINE = '#55607A';
const LIGHT_LINE_FROM = 150;
const REACH_BANDS = [
  { minutes: 15, color: '#7E5F00' },
  { minutes: 30, color: '#C9A227' },
  { minutes: 45, color: '#EBCF6E' },
];
const REACH_FALLBACK = '#F6E7B4';
const REACH_FILL_OPACITY = 0.55;
const REACH_LINE_OPACITY = 0.9;
const REACH_LABEL_SPACING = 0.11;
const REACH_FRAME_MARGIN = 0.15;
const REACH_PLACE_ORDER = ['suburb', 'quarter', 'neighbourhood'];
const METRES_PER_DEGREE = 111_195;

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

function tripDetail(locale: ReportLocale, destination: Destination): string {
  const { t, formatDistance, plural } = reportFormat(locale);
  if (destination.by_walking) {
    const metres = (destination.walk ?? destination.minutes ?? 0) * WALK_METRES_PER_MINUTE;
    return t(
      '{0} pe jos, mai repede decât cu linia',
      '{0} on foot, faster than taking public transport',
      esc(formatDistance(metres)),
    );
  }
  const mode = labelFor(
    locale,
    TRANSIT_MODES,
    destination.route?.mode ?? '',
    t('transportul public', 'public transport'),
  );
  const changes =
    destination.transfers === null || destination.transfers === 0
      ? t('fără schimbare', 'no changes')
      : plural(destination.transfers, ['schimbare', 'change'], 'schimbări', [
          'de schimbări',
          'changes',
        ]);
  return destination.route?.ref
    ? t('{0} cu {1}, {2}', '{0} by {1}, {2}', lineChip(destination), esc(mode), esc(changes))
    : t('cu {0}, {1}', 'by {0}, {1}', esc(mode), esc(changes));
}

function tripLegs(locale: ReportLocale, destination: Destination): string {
  const { t } = reportFormat(locale);
  if (destination.by_walking) {
    return `<div class="legs acleg"><i class="w" style="flex:1">${t('{0} min pe jos', '{0} min on foot', String(Math.round(destination.minutes ?? 0)))}</i></div>`;
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

function tripRow(locale: ReportLocale, destination: Destination): string {
  const kind = kindOf(destination);
  return `<div class="acr" style="--c:${kind.color}">${iconTile(kind.icon, kind.color, `color-mix(in srgb,${kind.color} 13%,#fff)`)}<span class="acr-t"><b>${esc(destination.label[locale])}</b><small>${tripDetail(locale, destination)}</small></span><span class="acr-b">${tripLegs(locale, destination)}</span><span class="acr-m"><b>${String(Math.round(destination.minutes ?? 0))}</b> min</span></div>`;
}

function carCard(
  report: ReportData,
  destinations: readonly Destination[],
  center: [number, number],
) {
  const { t, formatDistance, formatNumber } = reportFormat(report.locale);
  const title = t('Mașină personală', 'Private car');
  const routes = destinations
    .flatMap((destination) => {
      const route = destination.car_route;
      return route ? [{ destination, route, coordinates: decodePolyline6(route.polyline6) }] : [];
    })
    .sort((left, right) => left.route.seconds - right.route.seconds);
  if (routes.length === 0) {
    return {
      map: null,
      html: `<section class="acW-l"><h3>${title}</h3>${footnote(t('Nu sunt disponibile trasee cu mașina către locurile importante pentru acest raport.', 'Driving routes to key places are not available for this report.'))}</section>`,
    };
  }

  const minutesLabel = (seconds: number) => formatNumber(Math.max(1, Math.round(seconds / 60)));
  const map: MapSpec = {
    id: 'map-accessibility-car',
    center,
    fit: routes.flatMap(({ coordinates }) => coordinates),
    padding: 64,
    maxZoom: 16,
    layers: routes.flatMap(({ destination, coordinates }) => {
      const data = collection([{ type: 'LineString', coordinates }]);
      return [
        { kind: 'line', data, color: '#FFFFFF', width: 7 },
        { kind: 'line', data, color: kindOf(destination).color, width: 4 },
      ];
    }),
    markers: [
      addressMarker(center, report.addressText.split(',')[0]),
      ...routes.map(({ destination, route, coordinates }): MapMarker => ({
        position: coordinates.at(-1) ?? destination.location,
        html: `<span class="rp" style="--c:${kindOf(destination).color}"><b>${minutesLabel(route.seconds)} min</b></span>`,
        anchor: 'left',
        offset: [6, 0],
      })),
    ],
  };
  const rows = routes
    .map(({ destination, route }) => {
      const kind = kindOf(destination);
      return `<div class="acr" style="--c:${kind.color}">${iconTile(kind.icon, kind.color, `color-mix(in srgb,${kind.color} 13%,#fff)`)}<span class="acr-t"><b>${esc(destination.label[report.locale])}</b></span><span>${esc(formatDistance(route.meters))}</span><span class="acr-m"><b>${minutesLabel(route.seconds)}</b> min</span></div>`;
    })
    .join('');
  const note = t(
    'Sunt afișate doar traseele calculate pe drumuri din OpenStreetMap (Valhalla). Duratele nu includ traficul în timp real sau parcarea și nu influențează scorul.',
    'Only routes calculated on OpenStreetMap roads (Valhalla) are shown. Travel times do not include live traffic or parking and do not affect the score.',
  );
  return {
    map,
    html: `<section class="acW-l"><div class="ac-h"><h3>${title}</h3></div>${mapHtml(report.locale, map)}<div class="acd">${rows}</div>${footnote(note)}</section>`,
  };
}

function reachColour(minutes: number): string {
  return REACH_BANDS.find((band) => minutes <= band.minutes)?.color ?? REACH_FALLBACK;
}

function reachPhrase(locale: ReportLocale, sharePct: number): string {
  const { t } = reportFormat(locale);
  if (sharePct >= 75) return t('aproape tot orașul', 'almost the whole city');
  if (sharePct >= 66) return t('peste două treimi din oraș', 'over two thirds of the city');
  if (sharePct >= 45) return t('aproape jumătate din oraș', 'almost half the city');
  if (sharePct >= 30) return t('peste o treime din oraș', 'over a third of the city');
  return t('centru și cartierele vecine', 'the centre and nearby neighbourhoods');
}

function ringPositions(geometry: unknown): [number, number][] {
  const found: [number, number][] = [];
  const collect = (value: unknown): void => {
    if (!Array.isArray(value)) return;
    const items: unknown[] = value;
    const [first, second] = items;
    if (typeof first === 'number' && typeof second === 'number') found.push([first, second]);
    else items.forEach(collect);
  };
  collect((geometry as { coordinates?: unknown }).coordinates);
  return found;
}

function boundsOf(positions: readonly [number, number][]) {
  const longitudes = positions.map((position) => position[0]);
  const latitudes = positions.map((position) => position[1]);
  return {
    west: Math.min(...longitudes),
    east: Math.max(...longitudes),
    south: Math.min(...latitudes),
    north: Math.max(...latitudes),
  };
}

function widened(frame: [number, number][]): [number, number][] {
  if (frame.length === 0) return [];
  const box = boundsOf(frame);
  const east = ((box.east - box.west) * REACH_FRAME_MARGIN) / 2;
  const north = ((box.north - box.south) * REACH_FRAME_MARGIN) / 2;
  return [
    [box.west - east, box.south - north],
    [box.east + east, box.north + north],
  ];
}

function labelledPlaces(
  reach: Reach,
  frame: [number, number][],
  center: [number, number],
): Reach['neighbourhoods'] {
  if (frame.length === 0) return [];
  const box = boundsOf(frame);
  const latitude = ((box.north + box.south) / 2) * (Math.PI / 180);
  const toMetres = (position: [number, number]): [number, number] => [
    position[0] * METRES_PER_DEGREE * Math.cos(latitude),
    position[1] * METRES_PER_DEGREE,
  ];
  const [west, south] = toMetres([box.west, box.south]);
  const [east, north] = toMetres([box.east, box.north]);
  const spacing = Math.max(east - west, north - south) * REACH_LABEL_SPACING;
  const taken: [number, number][] = [toMetres(center)];
  const chosen: Reach['neighbourhoods'] = [];
  const rank = (place: Reach['neighbourhoods'][number]) => {
    const order = REACH_PLACE_ORDER.indexOf(place.place ?? '');
    return order < 0 ? REACH_PLACE_ORDER.length : order;
  };
  [...reach.neighbourhoods]
    .filter((place) => place.minutes !== null)
    .sort((left, right) => rank(left) - rank(right) || (left.minutes ?? 0) - (right.minutes ?? 0))
    .forEach((place) => {
      const at = toMetres(place.location);
      const inside = at[0] >= west && at[0] <= east && at[1] >= south && at[1] <= north;
      const crowded = taken.some(
        (other) => Math.hypot(other[0] - at[0], other[1] - at[1]) < spacing,
      );
      if (!inside || crowded) return;
      taken.push(at);
      chosen.push(place);
    });
  return chosen;
}

function reachCard(
  locale: ReportLocale,
  reach: Reach,
  center: [number, number],
): { html: string; map: MapSpec } {
  const { t, formatNumber } = reportFormat(locale);
  const shown = [...reach.isochrones].sort((left, right) => right.minutes - left.minutes);
  const outermost = shown[0];
  const frame = outermost ? ringPositions(outermost.geometry) : [];
  const view = widened(frame);
  const places = labelledPlaces(reach, view, center);
  const map: MapSpec = {
    id: 'map-reach',
    center,
    fit: [...view, ...places.map((place) => place.location), center],
    padding: 24,
    labels: false,
    layers: shown.flatMap((band) => {
      const data = collection([band.geometry]);
      const color = reachColour(band.minutes);
      return [
        { kind: 'fill' as const, data, color, opacity: REACH_FILL_OPACITY },
        { kind: 'line' as const, data, color, opacity: REACH_LINE_OPACITY, width: 1.5 },
      ];
    }),
    markers: [
      ...places.map((place): MapMarker => {
        const inside =
          place.minutes !== null && outermost !== undefined && place.minutes <= outermost.minutes;
        return {
          position: place.location,
          html: `<span class="acn-lb${inside ? ' on' : ''}"><b>${esc(place.name)}</b><i></i><small>${String(Math.round(place.minutes ?? 0))} min</small></span>`,
        };
      }),
      { position: center, html: '<span class="acn-me"><i></i></span>' },
    ],
  };
  const key = REACH_BANDS.map(
    (band, index) =>
      `<span><i style="background:${band.color}"></i>${index === 0 ? t('sub {0} min', 'under {0} min', String(band.minutes)) : `${String(REACH_BANDS[index - 1]?.minutes ?? 0)}–${String(band.minutes)} min`}</span>`,
  ).join('');
  const segment = REACH_BANDS.map(
    (band) =>
      `<span${band.minutes === reach.minutes ? ' class="on"' : ''}>${String(band.minutes)} min</span>`,
  ).join('');
  const neighbourhoodsLine =
    reach.neighbourhoods_total === 0
      ? ''
      : `<p class="acn-n"><b>${t('{0} din {1}', '{0} of {1}', String(reach.neighbourhoods_reached), String(reach.neighbourhoods_total))}</b>${t(' cartiere, plecând la 8 dimineața.', ' neighbourhoods, leaving at 8 am.')}</p>`;
  const html = `<section class="card ac acn acnA"><div class="ac-h"><div><div class="eyebrow">${t('Cât de departe ajungi', 'How far you can get')}</div><h3>${t('Orașul, în minute de la ușa ta', 'The city, in minutes from your door')}</h3></div><div class="seg acnseg">${segment}</div></div><div class="acnA-g"><div class="acnA-t"><div class="acn-big"><b>${formatNumber(reach.share_pct)}%</b><span>${t('din oraș', 'of the city')}</span></div><p class="acn-s">${t('În ', 'In ')}<b>${t('{0} de minute', '{0} minutes', String(reach.minutes))}</b>${t(', cu transportul public și pe jos, ajungi în {0}.', ' you can reach {0} by public transport and on foot.', reachPhrase(locale, reach.share_pct))}</p>${neighbourhoodsLine}<div class="acn-key">${key}</div></div><div class="acnA-m">${mapHtml(locale, map)}</div></div></section>`;
  return { html, map };
}

export const accessibilityChapter: ChapterBuilder = (report) => {
  const { t, plural } = reportFormat(report.locale);
  const summary = report.categories.accessibility;
  const section = report.sections.accessibility;
  const theme = categoryTheme(report.locale, 'accessibility');
  const center: [number, number] = [report.longitude, report.latitude];
  if (section?.status !== 'scored') {
    const head = chapterHead(report.locale, {
      eyebrow: categoryEyebrow(
        report.locale,
        'accessibility',
        section?.status === 'car_only' ? { ...summary, score: null } : summary,
      ),
      color: theme.color,
      title: t(
        'Datele despre transportul public nu sunt disponibile pentru această adresă',
        'Public transport data is not available for this address',
      ),
    });
    if (section?.status === 'car_only') {
      const car = carCard(report, section.destinations, center);
      return { html: chapter(head + car.html), maps: car.map ? [car.map] : [] };
    }
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
      : t(
          ' De aici ajungi cu transportul public mai ușor decât din {0}% din zonele din {1}.',
          ' Public transport is more convenient here than in {0}% of areas in {1}.',
          String(Math.round(summary.percentile)),
          report.city.name,
        );
  const head = chapterHead(report.locale, {
    eyebrow: categoryEyebrow(report.locale, 'accessibility', summary),
    color: theme.color,
    precision: theme.precision,
    title: t(
      '{0} la {1} minute și {2} care te duc în tot orașul',
      '{0} within {1} minutes and {2} taking you across the city',
      plural(nearStops, ['stație', 'stop'], 'stații', ['de stații', 'stops']),
      String(NEAR_STOP_MIN),
      plural(lineCount, ['linie', 'route'], 'linii', ['de linii', 'routes']),
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
  const mapOverlay = `<span class="mapchip" style="--c:#0F766E"><i></i>${t('Trasee transport', 'Public transport routes')}</span><div class="key"><b>${t('Pe hartă', 'On the map')}</b><span><i style="background:#103F32;border-radius:50%;width:10px;height:10px"></i>${t('Adresa', 'Address')}</span><span><i style="background:#0F766E;height:4px;border-radius:2px"></i>${t('Cu vehiculul', 'By public transport')}</span><span><i style="background:transparent;border-top:3px dotted #0F766E;height:0;border-radius:0"></i>${t('Pe jos', 'On foot')}</span><span><i style="background:#52685B;border-radius:50%;width:8px;height:8px"></i>${t('Stații din jur', 'Nearby stops')}</span></div>`;
  const legend = reachable
    .map(
      (destination) =>
        `<span style="--c:${kindOf(destination).color}"><i></i>${esc(destination.label[report.locale])} <b>${String(Math.round(destination.minutes ?? 0))} min</b></span>`,
    )
    .join('');
  const unrouted = reachable.filter((destination) => destination.path.length === 0).length;
  const routesNote =
    unrouted === 0
      ? t(
          'Traseele de pe hartă urmează străzile și liniile, de la adresă la destinație.',
          'Routes on the map follow streets and public transport lines from the address to the destination.',
        )
      : unrouted === reachable.length
        ? t(
            'Traseele pe străzi nu sunt disponibile pentru această adresă: harta arată doar destinațiile.',
            'Street routes are not available for this address: the map only shows destinations.',
          )
        : t(
            'Traseele de pe hartă urmează străzile și liniile. Unde traseul lipsește, apare doar destinația.',
            'Routes on the map follow streets and public transport lines. Where a route is missing, only the destination is shown.',
          );
  const timetableDate = sourceDate(report, 'gtfs');
  const schedule = timetableDate
    ? t(
        'Liniile, stațiile și orarul vin din datele de transport public (GTFS) pentru {0}, o zi lucrătoare.',
        'Routes, stops and timetables use public transport data (GTFS) for {0}, a weekday.',
        timetableDate,
      )
    : section.data_quality === 'gtfs'
      ? t(
          'Liniile, stațiile și orarul vin din datele de transport public (GTFS). Data orarului nu este disponibilă în raport.',
          'Routes, stops and timetables use public transport data (GTFS). No timetable date is available in the report.',
        )
      : t(
          'Liniile și stațiile vin din OpenStreetMap. Raportul nu a folosit orarul operatorului, iar timpul de așteptare este estimat.',
          'Routes and stops are from OpenStreetMap. The report did not use the operator timetable, and waiting times are estimated.',
        );
  const trips =
    reachable.length === 0
      ? `<p class="hint">${t('Nu am putut calcula drumurile spre locurile importante.', 'We could not calculate journeys to key destinations.')}</p>`
      : `<div class="acd acp-l">${reachable.map((destination) => tripRow(report.locale, destination)).join('')}</div>`;
  const reach = section.reach ? reachCard(report.locale, section.reach, center) : null;
  const car = carCard(report, section.destinations, center);
  const body = `<section class="acW"><div class="acmap acW-m">${mapHtml(report.locale, map, mapOverlay)}<div class="rleg">${legend}</div></div><div class="acW-l"><div class="acp"><div class="ac-h"><div><h3>${t('Cât faci până acolo, dimineața la 8', 'How long it takes to get there at 8 am')}</h3></div><div class="legkey"><span><i style="background:#52685B"></i>${t('pe jos', 'on foot')}</span><span><i style="background:#C9A44A"></i>${t('așteptare', 'waiting')}</span><span><i style="background:#8A8F99"></i>${t('cu linia', 'in transit')}</span></div></div>${trips}</div></div>${footnote(`${schedule} ${routesNote}`)}</section>`;
  return {
    html: chapter(
      `${head}${body}${car.html}<div class="sfB-rest">${scoreCard('accessibility', report)}${reach?.html ?? ''}${chapterSources(report, ['accessibility'])}</div>`,
    ),
    maps: [map, ...(car.map ? [car.map] : []), ...(reach ? [reach.map] : [])],
  };
};
