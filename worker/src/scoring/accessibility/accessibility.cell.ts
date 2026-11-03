import type { JsonObject } from '../../db/sql.ts';
import {
  accessIndex,
  accessibilityScore,
  accessPoints,
  coveragePoints,
  directionsWithoutTransfer,
  isWithinModeRadius,
  travelPoints,
  walkMeters,
  type StopService,
} from './accessibility.formula.ts';
import type { AccessibilityParams } from './accessibility.params.ts';
import type { DestinationTiming, Itinerary } from './routing.ts';
import type {
  KeyDestination,
  LngLat,
  TransitMode,
  TransitPattern,
  TransitStop,
} from './transit.types.ts';

export type CityTransitContext = {
  params: AccessibilityParams;
  stops: ReadonlyMap<string, TransitStop>;
  services: readonly StopService[];
  patterns: readonly TransitPattern[];
  modeOfRoute: ReadonlyMap<string, TransitMode>;
  destinations: readonly KeyDestination[];
  routeKeyOf: (routeId: string | null) => string | null;
};

export type CellInput = {
  origin: LngLat;
  walks: readonly { stopId: string; minutes: number }[];
  timings: ReadonlyMap<string, DestinationTiming>;
  itineraries: ReadonlyMap<string, Itinerary>;
};

export type CellEvaluation = {
  raw: number | null;
  accessIndex: number;
  sAccess: number;
  sTravel: number | null;
  sCoverage: number;
  directions: number;
  stops: JsonObject[];
  destinations: JsonObject[];
};

const LISTED_STOPS = 8;

function fastest(timing: DestinationTiming | undefined): number | null {
  const values = [timing?.transitMinutes, timing?.walkMinutes].filter(
    (value): value is number => typeof value === 'number',
  );
  return values.length === 0 ? null : Math.min(...values);
}

export function evaluateCell(context: CityTransitContext, input: CellInput): CellEvaluation {
  const { params } = context;
  const walks = input.walks
    .filter((walk) => context.stops.has(walk.stopId))
    .map((walk) => ({ stopKey: walk.stopId, walkMinutes: walk.minutes }));
  const access = accessIndex(walks, context.services, params);
  const sAccess = accessPoints(access.index, params.access.ai_min, params.access.ai_max);

  const reachable = walks
    .filter((walk) => {
      const stop = context.stops.get(walk.stopKey);
      return (
        stop?.modes.some((mode) => isWithinModeRadius(walk.walkMinutes, mode, params)) ?? false
      );
    })
    .sort((a, b) => a.walkMinutes - b.walkMinutes || a.stopKey.localeCompare(b.stopKey));
  const coverage = directionsWithoutTransfer({
    origin: input.origin,
    boardingStopKeys: new Set(reachable.map((walk) => walk.stopKey)),
    patterns: context.patterns,
    stops: context.stops,
    modeOfRoute: context.modeOfRoute,
    coverage: params.coverage,
  });
  const sCoverage = coveragePoints(coverage, params.coverage);

  const destinations = context.destinations.map((destination) => {
    const timing = input.timings.get(destination.id);
    const itinerary = input.itineraries.get(destination.id);
    const minutes = fastest(timing);
    const byWalking =
      minutes !== null && timing?.walkMinutes !== null && timing?.walkMinutes === minutes;
    return {
      destination,
      minutes,
      entry: {
        destination_id: destination.id,
        kind: destination.kind,
        minutes: minutes === null ? null : Math.round(minutes),
        by_walking: byWalking,
        walk: byWalking
          ? Math.round(minutes)
          : itinerary
            ? Math.round(itinerary.walkMinutes)
            : null,
        wait: byWalking || !itinerary ? null : Math.round(itinerary.waitMinutes),
        ride: byWalking || !itinerary ? null : Math.round(itinerary.rideMinutes),
        transfers: byWalking || !itinerary ? null : itinerary.transfers,
        route_key: byWalking || !itinerary ? null : context.routeKeyOf(itinerary.routeId),
      } satisfies JsonObject,
    };
  });
  const sTravel = travelPoints(
    destinations.map((item) => ({ kind: item.destination.kind, minutes: item.minutes })),
    params.travel,
  );

  return {
    raw: accessibilityScore(
      { access: sAccess, travel: sTravel, coverage: sCoverage },
      params.weights,
    ),
    accessIndex: access.index,
    sAccess,
    sTravel,
    sCoverage,
    directions: coverage.directions,
    stops: reachable.slice(0, LISTED_STOPS).map((walk) => ({
      stop_key: walk.stopKey,
      walk_min: Math.round(walk.walkMinutes * 10) / 10,
      walk_m: Math.round(walkMeters(walk.walkMinutes, params.walk_speed_kmh)),
    })),
    destinations: destinations.map((item) => item.entry),
  };
}
