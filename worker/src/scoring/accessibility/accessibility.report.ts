import { z } from 'zod';

import type { JsonObject, Sql } from '../../db/sql.ts';
import { readCellCategory, sectionParams } from '../../report/cell-category.ts';
import type { ReportSection } from '../../report/report-section.ts';
import { planTripsFromAddress } from './accessibility.address.ts';
import { parseAccessibilityParams } from './accessibility.params.ts';
import type { Itinerary } from './routing.ts';
import { routeKeyResolver } from './transit-network.ts';

const LISTED_ROUTES = 12;

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

export function accessibilitySection(input: {
  inputs: z.infer<typeof inputsSchema>;
  transit: z.infer<typeof transitRowSchema>;
  stops: readonly StopRow[];
  routes: readonly RouteRow[];
  destinations: readonly DestinationRow[];
  addressTrips?: ReadonlyMap<string, Itinerary>;
  tripRoutes?: readonly RouteRow[];
  routeKeyOf?: (routeId: string | null) => string | null;
}): JsonObject {
  const { inputs, transit } = input;
  const addressTrips = input.addressTrips ?? new Map<string, Itinerary>();
  const routeKeyOf = input.routeKeyOf ?? (() => null);
  const stopsByKey = new Map(input.stops.map((stop) => [stop.stop_key, stop]));
  const routesByKey = new Map(
    [...(input.tripRoutes ?? []), ...input.routes].map((route) => [route.route_key, route]),
  );
  const destinationsById = new Map(input.destinations.map((item) => [item.id, item]));
  const routeLabel = (key: string | null) => {
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
      const trip =
        entry.by_walking || entry.minutes === null ? undefined : addressTrips.get(destination.id);
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
        },
      ];
    }),
  };
}

export const accessibilityReportSection: ReportSection = {
  key: 'accessibility',
  build: async ({ sql, snapshotId, cellId, latitude, longitude, params, logger }) => {
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
    const addressTrips = await planTripsFromAddress({
      sql,
      logger,
      snapshotId,
      cityId: cell.cityId,
      address: { lng: longitude, lat: latitude },
      destinations: destinations
        .filter((destination) =>
          transit.data.destinations.some(
            (entry) =>
              entry.destination_id === destination.id &&
              !entry.by_walking &&
              entry.minutes !== null,
          ),
        )
        .map((destination) => ({
          id: destination.id,
          lng: destination.longitude,
          lat: destination.latitude,
        })),
      params: accessibilityParams,
    });
    const routeKeyOf = routeKeyResolver(
      addressTrips.size === 0 ? [] : await readRouteKeys(sql, snapshotId, cell.cityId),
    );
    const tripRouteKeys = [...addressTrips.values()]
      .map((trip) => routeKeyOf(trip.routeId))
      .filter((key): key is string => key !== null);
    const tripRoutes = await readRoutesByKeys(sql, snapshotId, cell.cityId, tripRouteKeys);
    return accessibilitySection({
      inputs: inputs.data,
      transit: transit.data,
      stops,
      routes,
      destinations,
      addressTrips,
      tripRoutes,
      routeKeyOf,
    });
  },
};
