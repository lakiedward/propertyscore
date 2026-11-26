import { z } from 'zod';

import type { JsonObject, Sql } from '../../db/sql.ts';
import { readCellCategory, sectionParams } from '../../report/cell-category.ts';
import type { ReportSection } from '../../report/report-section.ts';
import { routeFromAddress } from './accessibility.address.ts';
import { listCityCells, readTravelRow } from './accessibility.db.ts';
import { parseAccessibilityParams } from './accessibility.params.ts';
import { buildReach, decodeTravelRow } from './accessibility.reach.ts';
import { routeByCar } from './car-routes.ts';
import type { EducationKind, EducationPlace } from './education-places.ts';
import type { NeighbourhoodPlace } from './osm-transit.ts';
import type { DestinationTiming, Itinerary } from './routing.ts';
import { routeKeyResolver } from './transit-network.ts';

const LISTED_ROUTES = 12;

const gridParamsSchema = z.object({ cell_size_m: z.number().positive() });

const inputsSchema = z.object({
  s_access: z.number().nullable(),
  s_travel: z.number().nullable(),
  s_coverage: z.number().nullable(),
  directions: z.number().nullable(),
  weights: z.object({ access: z.number(), travel: z.number(), coverage: z.number() }),
  data_quality: z.enum(['gtfs', 'osm_only']),
  reference_date: z.string().nullable(),
});

const cellStopSchema = z.object({
  stop_key: z.string(),
  walk_min: z.number(),
  walk_m: z.number(),
});

const cellDestinationSchema = z.object({
  destination_id: z.string(),
  kind: z.string(),
  minutes: z.number().nullable(),
  by_walking: z.boolean(),
  walk: z.number().nullable(),
  wait: z.number().nullable(),
  ride: z.number().nullable(),
  transfers: z.number().nullable(),
  route_key: z.string().nullable(),
});

const transitRowSchema = z.object({
  stops: z.array(cellStopSchema),
  destinations: z.array(cellDestinationSchema),
});

const stopSchema = z.object({
  stop_key: z.string(),
  name: z.string().nullable(),
  modes: z.array(z.string()),
  longitude: z.number(),
  latitude: z.number(),
});

const routeSchema = z.object({
  route_key: z.string(),
  ref: z.string().nullable(),
  mode: z.string(),
  long_name: z.string().nullable(),
  colour: z.string().nullable(),
  text_colour: z.string().nullable(),
  stop_keys: z.array(z.string()),
  peak_per_hour: z.number().nullable(),
});

const destinationSchema = z.object({
  id: z.string(),
  kind: z.string(),
  label_ro: z.string(),
  label_en: z.string(),
  longitude: z.number(),
  latitude: z.number(),
});

type StopRow = z.infer<typeof stopSchema>;
type RouteRow = z.infer<typeof routeSchema>;
type DestinationRow = z.infer<typeof destinationSchema>;

async function readCellTransit(sql: Sql, snapshotId: string, cellId: string): Promise<unknown> {
  const [row] = await sql`
    select stops, destinations
    from private.cell_transit
    where snapshot_id = ${snapshotId} and cell_id = ${cellId}
  `;
  return row;
}

async function readStops(
  sql: Sql,
  snapshotId: string,
  cityId: string,
  stopKeys: readonly string[],
): Promise<StopRow[]> {
  if (stopKeys.length === 0) return [];
  const rows = await sql`
    select
      s.stop_key,
      s.name,
      s.modes,
      extensions.st_x(s.location::extensions.geometry) as longitude,
      extensions.st_y(s.location::extensions.geometry) as latitude
    from private.transit_stops s
    where s.snapshot_id = ${snapshotId}
      and s.city_id = ${cityId}
      and s.stop_key = any(${[...stopKeys]}::text[])
  `;
  return z.array(stopSchema).parse(rows);
}

async function readRoutes(
  sql: Sql,
  snapshotId: string,
  cityId: string,
  stopKeys: readonly string[],
): Promise<RouteRow[]> {
  if (stopKeys.length === 0) return [];
  const rows = await sql`
    select
      r.route_key,
      r.ref,
      r.mode,
      r.long_name,
      r.colour,
      r.text_colour,
      array_agg(distinct sr.stop_key) as stop_keys,
      max(sr.peak_departures_per_hour)::float8 as peak_per_hour
    from private.transit_stop_routes sr
    join private.transit_routes r
      on r.snapshot_id = sr.snapshot_id and r.city_id = sr.city_id and r.route_key = sr.route_key
    where sr.snapshot_id = ${snapshotId}
      and sr.city_id = ${cityId}
      and sr.stop_key = any(${[...stopKeys]}::text[])
    group by r.route_key, r.ref, r.mode, r.long_name, r.colour, r.text_colour
  `;
  return z.array(routeSchema).parse(rows);
}

async function readRouteKeys(sql: Sql, snapshotId: string, cityId: string): Promise<string[]> {
  const rows = await sql<{ route_key: string }[]>`
    select route_key
    from private.transit_routes
    where snapshot_id = ${snapshotId} and city_id = ${cityId}
  `;
  return rows.map((row) => row.route_key);
}

async function readRoutesByKeys(
  sql: Sql,
  snapshotId: string,
  cityId: string,
  routeKeys: readonly string[],
): Promise<RouteRow[]> {
  if (routeKeys.length === 0) return [];
  const rows = await sql`
    select
      r.route_key,
      r.ref,
      r.mode,
      r.long_name,
      r.colour,
      r.text_colour,
      array[]::text[] as stop_keys,
      null::float8 as peak_per_hour
    from private.transit_routes r
    where r.snapshot_id = ${snapshotId}
      and r.city_id = ${cityId}
      and r.route_key = any(${[...routeKeys]}::text[])
  `;
  return z.array(routeSchema).parse(rows);
}

async function readReach(
  sql: Sql,
  options: {
    snapshotId: string;
    cityId: string;
    cellId: string;
    cellSizeM: number;
    origin: { lng: number; lat: number };
    places: readonly NeighbourhoodPlace[];
  },
): Promise<JsonObject | null> {
  const [row, cells] = await Promise.all([
    readTravelRow(sql, options.snapshotId, options.cellId),
    listCityCells(sql, options.snapshotId, options.cityId),
  ]);
  const minutes = row ? decodeTravelRow(row, cells.length) : null;
  if (!minutes) return null;
  return buildReach({
    origin: options.origin,
    cells: cells.map((cell, index) => ({
      lng: cell.lng,
      lat: cell.lat,
      minutes: minutes[index] ?? null,
    })),
    cellSizeM: options.cellSizeM,
    places: options.places,
  });
}

async function readDestinations(sql: Sql, ids: readonly string[]): Promise<DestinationRow[]> {
  if (ids.length === 0) return [];
  const rows = await sql`
    select
      d.id::text as id,
      d.kind,
      d.label_ro,
      d.label_en,
      extensions.st_x(d.location::extensions.geometry) as longitude,
      extensions.st_y(d.location::extensions.geometry) as latitude
    from private.key_destinations d
    where d.id = any(${[...ids]}::uuid[])
  `;
  return z.array(destinationSchema).parse(rows);
}

function position(row: { longitude: number; latitude: number }): [number, number] {
  return [Number(row.longitude.toFixed(6)), Number(row.latitude.toFixed(6))];
}

type RouteLabel = (key: string | null) => JsonObject | null;
type CarRoutes = Awaited<ReturnType<typeof routeByCar>>;

function fastestMinutes(timing: DestinationTiming | undefined): number | null {
  const values = [timing?.transitMinutes, timing?.walkMinutes].filter(
    (value): value is number => typeof value === 'number',
  );
  return values.length === 0 ? null : Math.min(...values);
}

function educationGroup(
  kind: EducationKind,
  places: readonly EducationPlace[],
  timings: ReadonlyMap<string, DestinationTiming>,
  trips: ReadonlyMap<string, Itinerary>,
  routeKeyOf: (routeId: string | null) => string | null,
  routeLabel: RouteLabel,
  carRoutes: CarRoutes | undefined,
): JsonObject[] {
  return places
    .filter((place) => place.kind === kind)
    .flatMap((place) => {
      const timing = timings.get(place.id);
      const minutes = fastestMinutes(timing);
      const carRoute = carRoutes?.get(place.id);
      if (minutes === null && !carRoute) return [];
      const roundedMinutes = minutes === null ? null : Math.round(minutes);
      const byWalking = minutes !== null && timing?.walkMinutes === minutes;
      const planned = minutes === null ? undefined : trips.get(place.id);
      const trip = byWalking ? undefined : planned;
      const legs = byWalking ? planned?.walkLegs : planned?.legs;
      return [
        {
          id: place.id,
          kind,
          label: { ro: place.name, en: place.name },
          group: place.group,
          location: position({ longitude: place.lng, latitude: place.lat }),
          minutes: roundedMinutes,
          by_walking: byWalking,
          walk: byWalking ? roundedMinutes : trip ? Math.round(trip.walkMinutes) : null,
          wait: trip ? Math.round(trip.waitMinutes) : null,
          ride: trip ? Math.round(trip.rideMinutes) : null,
          transfers: trip ? trip.transfers : null,
          route: trip ? routeLabel(routeKeyOf(trip.routeId)) : null,
          ...(carRoute ? { car_route: carRoute } : {}),
          path: (legs ?? []).map((leg) => ({
            mode: leg.mode,
            route: routeLabel(routeKeyOf(leg.routeId)),
            coordinates: leg.coordinates,
          })),
        },
      ];
    })
    .sort((left, right) => (left.minutes ?? Infinity) - (right.minutes ?? Infinity));
}

export function accessibilitySection(input: {
  inputs: z.infer<typeof inputsSchema>;
  transit: z.infer<typeof transitRowSchema>;
  stops: readonly StopRow[];
  routes: readonly RouteRow[];
  destinations: readonly DestinationRow[];
  addressTrips?: ReadonlyMap<string, Itinerary>;
  addressTimings?: ReadonlyMap<string, DestinationTiming>;
  education?: readonly EducationPlace[];
  carRoutes?: CarRoutes;
  tripRoutes?: readonly RouteRow[];
  routeKeyOf?: (routeId: string | null) => string | null;
  reach?: JsonObject | null;
}): JsonObject {
  const { inputs, transit } = input;
  const addressTrips = input.addressTrips ?? new Map<string, Itinerary>();
  const routeKeyOf = input.routeKeyOf ?? (() => null);
  const stopsByKey = new Map(input.stops.map((stop) => [stop.stop_key, stop]));
  const routesByKey = new Map(
    [...(input.tripRoutes ?? []), ...input.routes].map((route) => [route.route_key, route]),
  );
  const destinationsById = new Map(input.destinations.map((item) => [item.id, item]));
  const routeLabel: RouteLabel = (key) => {
    if (key === null) return null;
    const route = routesByKey.get(key);
    return route ? { ref: route.ref, mode: route.mode, colour: route.colour } : null;
  };
  const routes = [...input.routes]
    .sort(
      (left, right) =>
        (right.peak_per_hour ?? 0) - (left.peak_per_hour ?? 0) ||
        (left.ref ?? '').localeCompare(right.ref ?? '', 'ro', { numeric: true }),
    )
    .slice(0, LISTED_ROUTES);

  return {
    schema_version: 1,
    status: 'scored',
    data_quality: inputs.data_quality,
    reference_date: inputs.reference_date,
    components: [
      { key: 'access', points: inputs.s_access, weight: inputs.weights.access },
      { key: 'travel', points: inputs.s_travel, weight: inputs.weights.travel },
      { key: 'coverage', points: inputs.s_coverage, weight: inputs.weights.coverage },
    ],
    directions: inputs.directions,
    stops: transit.stops.flatMap((walk) => {
      const stop = stopsByKey.get(walk.stop_key);
      if (!stop) return [];
      return [
        {
          id: stop.stop_key,
          name: stop.name,
          modes: stop.modes,
          location: position(stop),
          walk_min: walk.walk_min,
          walk_m: walk.walk_m,
          routes: input.routes
            .filter((route) => route.stop_keys.includes(stop.stop_key))
            .map((route) => route.ref ?? route.route_key)
            .slice(0, 8),
        },
      ];
    }),
    routes: routes.map((route) => ({
      key: route.route_key,
      ref: route.ref,
      mode: route.mode,
      name: route.long_name,
      colour: route.colour,
      text_colour: route.text_colour,
      peak_per_hour:
        route.peak_per_hour === null ? null : Math.round(route.peak_per_hour * 10) / 10,
    })),
    destinations: transit.destinations.flatMap((entry) => {
      const destination = destinationsById.get(entry.destination_id);
      if (!destination) return [];
      const planned = entry.minutes === null ? undefined : addressTrips.get(destination.id);
      const trip = entry.by_walking ? undefined : planned;
      const legs = entry.by_walking ? planned?.walkLegs : planned?.legs;
      const carRoute = input.carRoutes?.get(destination.id);
      return [
        {
          id: destination.id,
          kind: destination.kind,
          label: { ro: destination.label_ro, en: destination.label_en },
          location: position(destination),
          minutes: entry.minutes,
          by_walking: entry.by_walking,
          walk: trip ? Math.round(trip.walkMinutes) : entry.walk,
          wait: trip ? Math.round(trip.waitMinutes) : entry.wait,
          ride: trip ? Math.round(trip.rideMinutes) : entry.ride,
          transfers: trip ? trip.transfers : entry.transfers,
          route: routeLabel(trip ? routeKeyOf(trip.routeId) : entry.route_key),
          ...(carRoute ? { car_route: carRoute } : {}),
          path: (legs ?? []).map((leg) => ({
            mode: leg.mode,
            route: routeLabel(routeKeyOf(leg.routeId)),
            coordinates: leg.coordinates,
          })),
        },
      ];
    }),
    destination_groups: {
      high_schools: educationGroup(
        'high_school',
        input.education ?? [],
        input.addressTimings ?? new Map(),
        addressTrips,
        routeKeyOf,
        routeLabel,
        input.carRoutes,
      ),
      faculties: educationGroup(
        'faculty',
        input.education ?? [],
        input.addressTimings ?? new Map(),
        addressTrips,
        routeKeyOf,
        routeLabel,
        input.carRoutes,
      ),
    },
    reach: input.reach ?? null,
  };
}

export const accessibilityReportSection: ReportSection = {
  key: 'accessibility',
  build: async ({ sql, snapshotId, cellId, latitude, longitude, params, logger, router }) => {
    const cell = await readCellCategory(sql, snapshotId, cellId, 'accessibility');
    if (!cell) return null;
    const inputs = inputsSchema.safeParse(cell.inputs);
    const transit = transitRowSchema.safeParse(await readCellTransit(sql, snapshotId, cellId));
    if (cell.score === null || !inputs.success || !transit.success) {
      return { schema_version: 1, status: 'no_data' };
    }
    const stopKeys = transit.data.stops.map((stop) => stop.stop_key);
    const [stops, routes, destinations] = await Promise.all([
      readStops(sql, snapshotId, cell.cityId, stopKeys),
      readRoutes(sql, snapshotId, cell.cityId, stopKeys),
      readDestinations(
        sql,
        transit.data.destinations.map((entry) => entry.destination_id),
      ),
    ]);
    const accessibilityParams = parseAccessibilityParams(sectionParams(params, 'accessibility'));
    const address = { lng: longitude, lat: latitude };
    const {
      trips: addressTrips,
      timings: addressTimings,
      places,
      education,
    } = await routeFromAddress({
      sql,
      logger,
      snapshotId,
      cityId: cell.cityId,
      address,
      destinations: destinations
        .filter((destination) =>
          transit.data.destinations.some(
            (entry) => entry.destination_id === destination.id && entry.minutes !== null,
          ),
        )
        .map((destination) => ({
          id: destination.id,
          lng: destination.longitude,
          lat: destination.latitude,
        })),
      params: accessibilityParams,
    });
    const carRoutes = routeByCar(
      router,
      address,
      [
        ...destinations.map(({ id, longitude: lng, latitude: lat }) => ({ id, lng, lat })),
        ...education,
      ],
      logger,
    );
    const routeKeyOf = routeKeyResolver(
      addressTrips.size === 0 ? [] : await readRouteKeys(sql, snapshotId, cell.cityId),
    );
    const tripRouteKeys = [...addressTrips.values()]
      .flatMap((trip) => [trip.routeId, ...(trip.legs ?? []).map((leg) => leg.routeId)])
      .map((routeId) => routeKeyOf(routeId))
      .filter((key): key is string => key !== null);
    const tripRoutes = await readRoutesByKeys(sql, snapshotId, cell.cityId, tripRouteKeys);
    const grid = gridParamsSchema.safeParse(params);
    const reach = grid.success
      ? await readReach(sql, {
          snapshotId,
          cityId: cell.cityId,
          cellId,
          cellSizeM: grid.data.cell_size_m,
          origin: { lng: longitude, lat: latitude },
          places,
        })
      : null;
    return accessibilitySection({
      inputs: inputs.data,
      transit: transit.data,
      stops,
      routes,
      destinations,
      addressTrips,
      addressTimings,
      education,
      carRoutes: await carRoutes,
      tripRoutes,
      routeKeyOf,
      reach,
    });
  },
};
