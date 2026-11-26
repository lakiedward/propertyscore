import type { LngLat } from '@/components/map/map.config';
import { decodePolyline6 } from '@/components/report/report-map.utils';
import type { AccessibilitySection } from './sections/accessibility.types';

type Destination = AccessibilitySection['destinations'][number];

export function gtfsReferenceDate(section: AccessibilitySection | null | undefined): string | null {
  return section?.data_quality === 'gtfs' ? section.reference_date : null;
}

type RouteSwatch = {
  token: string;
  fill: string;
  text: string;
};

const ROUTE_SWATCHES = {
  sky: { token: '--report-safety', fill: 'bg-report-safety', text: 'text-report-safety' },
  teal: { token: '--report-noise', fill: 'bg-report-noise', text: 'text-report-noise' },
  rose: { token: '--report-health', fill: 'bg-report-health', text: 'text-report-health' },
  brown: {
    token: '--report-education',
    fill: 'bg-report-education',
    text: 'text-report-education',
  },
  red: { token: '--band-low-ink', fill: 'bg-band-low-ink', text: 'text-band-low-ink' },
  slate: { token: '--report-industry', fill: 'bg-report-industry', text: 'text-report-industry' },
  violet: { token: '--report-air', fill: 'bg-report-air', text: 'text-report-air' },
  berry: {
    token: '--report-fifteen-minute',
    fill: 'bg-report-fifteen-minute',
    text: 'text-report-fifteen-minute',
  },
  sun: {
    token: '--report-accessibility',
    fill: 'bg-report-accessibility',
    text: 'text-report-accessibility',
  },
} as const satisfies Record<string, RouteSwatch>;

const KIND_SWATCHES: Readonly<Record<string, readonly RouteSwatch[]>> = {
  station: [ROUTE_SWATCHES.teal],
  hospital: [ROUTE_SWATCHES.rose],
  mall: [ROUTE_SWATCHES.brown, ROUTE_SWATCHES.red, ROUTE_SWATCHES.berry],
  airport: [ROUTE_SWATCHES.slate],
  university: [ROUTE_SWATCHES.violet, ROUTE_SWATCHES.berry, ROUTE_SWATCHES.teal],
  center: [ROUTE_SWATCHES.sun],
  high_school: [ROUTE_SWATCHES.sky],
  faculty: [ROUTE_SWATCHES.violet],
};

const FALLBACK_SWATCHES: readonly RouteSwatch[] = [
  ROUTE_SWATCHES.sun,
  ROUTE_SWATCHES.slate,
  ROUTE_SWATCHES.berry,
];

export type TripLeg = {
  kind: 'walk' | 'wait' | 'ride';
  minutes: number;
};

export type DestinationRow = {
  id: string;
  kind: string;
  label: { ro: string; en: string };
  tag: string | null;
  walkDistanceM: number | null;
  carDistanceM: number | null;
  minutes: number;
  isWalkOnly: boolean;
  swatch: RouteSwatch;
  line: { ref: string; mode: string; colour: string | null } | null;
  boardingStop: string | null;
  legs: TripLeg[];
  path: (Destination['path'][number] | { mode: 'car'; coordinates: LngLat[] })[];
  end: LngLat | null;
};

function distanceMeters([lng1, lat1]: LngLat, [lng2, lat2]: LngLat): number {
  const metersPerDegree = 111_320;
  const dx = (lng1 - lng2) * metersPerDegree * Math.cos((lat1 * Math.PI) / 180);
  const dy = (lat1 - lat2) * metersPerDegree;
  return Math.hypot(dx, dy);
}

function pathMeters(path: Destination['path']): number | null {
  const metres = path
    .filter((leg) => leg.mode === 'walk')
    .reduce(
      (total, leg) =>
        total +
        leg.coordinates.slice(1).reduce((sum, point, index) => {
          const previous = leg.coordinates[index] ?? point;
          return sum + distanceMeters([previous[0], previous[1]], [point[0], point[1]]);
        }, 0),
      0,
    );
  return metres > 0 ? Math.round(metres) : null;
}

function boardingStopFor(section: AccessibilitySection, destination: Destination): string | null {
  const ref = destination.route?.ref;
  const board = destination.path.find((leg) => leg.mode === 'transit')?.coordinates[0];
  if (!ref || !board) return null;
  const candidates = section.stops.filter(
    (stop) => stop.name !== null && stop.routes.includes(ref),
  );
  const nearest = candidates
    .map((stop) => ({ stop, distance: distanceMeters(stop.location, [board[0], board[1]]) }))
    .sort((left, right) => left.distance - right.distance)[0];
  return nearest?.stop.name ?? null;
}

function legsFor(destination: Destination): TripLeg[] {
  if (destination.by_walking) {
    return [{ kind: 'walk', minutes: destination.minutes ?? 0 }];
  }
  const legs: TripLeg[] = [
    { kind: 'walk', minutes: destination.walk ?? 0 },
    { kind: 'wait', minutes: destination.wait ?? 0 },
    { kind: 'ride', minutes: destination.ride ?? 0 },
  ];
  return legs.filter((leg) => leg.minutes > 0);
}

export const DESTINATION_GROUPS = ['places', 'highSchools', 'faculties'] as const;

export type DestinationGroup = (typeof DESTINATION_GROUPS)[number];
export type DestinationMode = 'transit' | 'car';

function groupDestinations(section: AccessibilitySection, group: DestinationGroup) {
  if (group === 'highSchools') return section.destination_groups.high_schools;
  if (group === 'faculties') return section.destination_groups.faculties;
  return section.destinations;
}

export function destinationRows(
  section: AccessibilitySection,
  group: DestinationGroup = 'places',
  mode: DestinationMode = 'transit',
): DestinationRow[] {
  const seen = new Map<string, number>();
  return groupDestinations(section, group)
    .flatMap((destination) => {
      const carRoute = mode === 'car' ? destination.car_route : null;
      const minutes =
        mode === 'car'
          ? carRoute && Math.max(1, Math.round(carRoute.seconds / 60))
          : destination.minutes;
      return minutes == null ? [] : [{ destination, minutes, carRoute }];
    })
    .sort((left, right) => left.minutes - right.minutes)
    .map(({ destination, minutes, carRoute }) => {
      const index = seen.get(destination.kind) ?? 0;
      seen.set(destination.kind, index + 1);
      const palette = KIND_SWATCHES[destination.kind] ?? FALLBACK_SWATCHES;
      const swatch = palette[index % palette.length] ?? ROUTE_SWATCHES.sun;
      const path: DestinationRow['path'] = carRoute
        ? [{ mode: 'car', coordinates: decodePolyline6(carRoute.polyline6) }]
        : destination.path;
      const last = path.at(-1)?.coordinates.at(-1);
      return {
        id: destination.id,
        kind: destination.kind,
        label: destination.label,
        tag: destination.group,
        walkDistanceM: !carRoute && destination.by_walking ? pathMeters(destination.path) : null,
        carDistanceM: carRoute?.meters ?? null,
        minutes,
        isWalkOnly: !carRoute && destination.by_walking,
        swatch,
        line:
          !carRoute && destination.route
            ? {
                ref: destination.route.ref ?? '',
                mode: destination.route.mode,
                colour: destination.route.colour ?? null,
              }
            : null,
        boardingStop: carRoute ? null : boardingStopFor(section, destination),
        legs: carRoute ? [] : legsFor(destination),
        path,
        end: last ? [last[0], last[1]] : destination.location,
      };
    });
}

function normalizedSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function matchingRows(
  rows: readonly DestinationRow[],
  query: string,
  language: 'ro' | 'en',
): DestinationRow[] {
  const needle = normalizedSearch(query);
  if (needle === '') return [...rows];
  return rows.filter((row) =>
    normalizedSearch(`${row.label[language]} ${row.tag ?? ''}`).includes(needle),
  );
}

export function nearestStopsSummary(section: AccessibilitySection) {
  const lines = new Set(section.stops.flatMap((stop) => stop.routes));
  const farthest = Math.max(0, ...section.stops.map((stop) => stop.walk_min));
  return { stops: section.stops.length, lines: lines.size, walkMinutes: Math.max(1, farthest) };
}

export type ReachShare = { minutes: 15 | 30 | 45; sharePct: number; reached: number };

export const REACH_MINUTES = [15, 30, 45] as const;

export function reachShares(section: AccessibilitySection): ReachShare[] {
  const reach = section.reach;
  if (!reach) return [];
  return REACH_MINUTES.flatMap((minutes) => {
    const share = reach.shares.find((item) => item.minutes === minutes);
    return share
      ? [{ minutes, sharePct: share.share_pct, reached: share.neighbourhoods_reached }]
      : [];
  });
}

export type ReachScale = 'all' | 'twoThirds' | 'half' | 'third' | 'centre';

export function reachScale(sharePct: number): ReachScale {
  if (sharePct >= 75) return 'all';
  if (sharePct >= 66) return 'twoThirds';
  if (sharePct >= 45) return 'half';
  if (sharePct >= 30) return 'third';
  return 'centre';
}

const HEX_COLOUR = /^#([0-9a-f]{6})$/i;
const DARK_INK = '#2a2100';
const LIGHT_INK = '#ffffff';
const LIGHT_BACKGROUND_LUMINANCE = 150;

export function readableInk(colour: string | null): string {
  const match = colour ? HEX_COLOUR.exec(colour) : null;
  if (!match?.[1]) return LIGHT_INK;
  const value = parseInt(match[1], 16);
  const luminance =
    (((value >> 16) & 255) * 299 + ((value >> 8) & 255) * 587 + (value & 255) * 114) / 1000;
  return luminance > LIGHT_BACKGROUND_LUMINANCE ? DARK_INK : LIGHT_INK;
}
