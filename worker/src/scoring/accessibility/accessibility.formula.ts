import { linearPoints, weightedScore } from '../components.ts';
import type { AccessibilityParams } from './accessibility.params.ts';
import { bearingDegrees, distanceMeters } from './geo.ts';
import type {
  DestinationKind,
  LngLat,
  TransitMode,
  TransitPattern,
  TransitStop,
} from './transit.types.ts';

export type StopWalk = { stopKey: string; walkMinutes: number };

export type StopService = {
  stopKey: string;
  routeKey: string;
  mode: TransitMode;
  departuresPerHour: number | null;
};

export type RouteAccess = {
  routeKey: string;
  stopKey: string;
  walkMinutes: number;
  accessMinutes: number;
  frequency: number;
};

export type AccessResult = {
  index: number;
  routes: RouteAccess[];
};

export type DestinationTime = {
  kind: DestinationKind;
  minutes: number | null;
};

export function walkMeters(walkMinutes: number, walkSpeedKmh: number): number {
  return (walkMinutes * walkSpeedKmh * 1000) / 60;
}

export function isWithinModeRadius(
  walkMinutes: number,
  mode: TransitMode,
  params: Pick<AccessibilityParams, 'modes' | 'walk_speed_kmh'>,
): boolean {
  return walkMeters(walkMinutes, params.walk_speed_kmh) <= params.modes[mode].radius_m;
}

export function accessIndex(
  walks: readonly StopWalk[],
  services: readonly StopService[],
  params: Pick<AccessibilityParams, 'modes' | 'walk_speed_kmh'>,
): AccessResult {
  const walkByStop = new Map(walks.map((walk) => [walk.stopKey, walk.walkMinutes]));
  const best = new Map<string, RouteAccess>();
  for (const service of services) {
    const walkMinutes = walkByStop.get(service.stopKey);
    if (walkMinutes === undefined || !isWithinModeRadius(walkMinutes, service.mode, params)) {
      continue;
    }
    const mode = params.modes[service.mode];
    const departures = service.departuresPerHour ?? mode.osm_departures_per_hour;
    if (departures <= 0) continue;
    const accessMinutes = walkMinutes + 0.5 * (60 / departures) + mode.reliability_min;
    const frequency = 30 / accessMinutes;
    const current = best.get(service.routeKey);
    if (!current || frequency > current.frequency) {
      best.set(service.routeKey, {
        routeKey: service.routeKey,
        stopKey: service.stopKey,
        walkMinutes,
        accessMinutes,
        frequency,
      });
    }
  }
  const routes = [...best.values()].sort((a, b) => b.frequency - a.frequency);
  const index = routes.reduce(
    (sum, route, position) => sum + (position === 0 ? route.frequency : 0.5 * route.frequency),
    0,
  );
  return { index, routes };
}

export function accessPoints(index: number, aiMin: number, aiMax: number): number {
  if (index <= 0) return 0;
  return linearPoints(Math.log(index), Math.log(aiMin), Math.log(aiMax));
}

export function destinationPoints(
  kind: DestinationKind,
  minutes: number | null,
  travel: AccessibilityParams['travel'],
): number {
  if (minutes === null) return 0;
  return kind === 'airport'
    ? linearPoints(minutes, travel.airport_zero_at_min, travel.airport_full_at_min)
    : linearPoints(minutes, travel.zero_at_min, travel.full_at_min);
}

export function travelPoints(
  times: readonly DestinationTime[],
  travel: AccessibilityParams['travel'],
): number | null {
  const perKind = new Map<DestinationKind, number>();
  for (const time of times) perKind.set(time.kind, (perKind.get(time.kind) ?? 0) + 1);
  let totalWeight = 0;
  let total = 0;
  for (const time of times) {
    const weight = travel.kind_weights[time.kind] / (perKind.get(time.kind) ?? 1);
    totalWeight += weight;
    total += weight * destinationPoints(time.kind, time.minutes, travel);
  }
  return totalWeight === 0 ? null : total / totalWeight;
}

export type CoverageInput = {
  origin: LngLat;
  boardingStopKeys: ReadonlySet<string>;
  patterns: readonly TransitPattern[];
  stops: ReadonlyMap<string, TransitStop>;
  modeOfRoute: ReadonlyMap<string, TransitMode>;
  coverage: AccessibilityParams['coverage'];
};

export type CoverageResult = {
  directions: number;
  modes: TransitMode[];
};

export function directionsWithoutTransfer(input: CoverageInput): CoverageResult {
  const sectorWidth = 360 / input.coverage.sectors;
  const sectors = new Set<number>();
  const modes = new Set<TransitMode>();
  for (const pattern of input.patterns) {
    const boardAt = pattern.stopKeys.findIndex((key) => input.boardingStopKeys.has(key));
    if (boardAt === -1) continue;
    const mode = input.modeOfRoute.get(pattern.routeKey);
    if (mode) modes.add(mode);
    for (const key of pattern.stopKeys.slice(boardAt + 1)) {
      const stop = input.stops.get(key);
      if (!stop || distanceMeters(input.origin, stop) < input.coverage.min_distance_m) continue;
      sectors.add(
        Math.floor(bearingDegrees(input.origin, stop) / sectorWidth) % input.coverage.sectors,
      );
    }
  }
  return { directions: sectors.size, modes: [...modes].sort() };
}

export function coveragePoints(
  result: CoverageResult,
  coverage: AccessibilityParams['coverage'],
): number {
  const bonus = result.modes.length >= 2 ? coverage.multimodal_bonus : 0;
  return Math.min(1, result.directions / coverage.sectors + bonus);
}

export function accessibilityScore(
  components: { access: number | null; travel: number | null; coverage: number | null },
  weights: AccessibilityParams['weights'],
): number | null {
  return weightedScore([
    { key: 'access', weight: weights.access, points: components.access },
    { key: 'travel', weight: weights.travel, points: components.travel },
    { key: 'coverage', weight: weights.coverage, points: components.coverage },
  ]);
}

export function smoothScore(
  raw: number | null,
  neighbours: readonly (number | null)[],
  smoothing: AccessibilityParams['smoothing'],
): number | null {
  if (raw === null) return null;
  const scored = neighbours.filter((value): value is number => value !== null);
  if (scored.length === 0) return raw;
  const mean = scored.reduce((sum, value) => sum + value, 0) / scored.length;
  return Math.round(smoothing.cell * raw + smoothing.neighbours * mean);
}
