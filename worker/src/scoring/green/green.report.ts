import { z } from 'zod';

import type { JsonObject, Sql } from '../../db/sql.ts';
import { WorkerError } from '../../lib/errors.ts';
import type { ReportSection } from '../../report/report-section.ts';
import type { Leg, ValhallaClient } from '../../routing/valhalla.ts';
import {
  candidateSchema,
  type DistanceMethod,
  walkCellCandidates,
} from '../../routing/walk-access.ts';
import { parseGreenParams } from './green.module.ts';

const PARKS_RADIUS_M = 1500;
const PARK_LIMIT = 6;

const COMPONENT_KEYS = ['c1', 'c2', 'c3', 'c4', 'c5'] as const;

const nearestSchema = z.object({
  green_area_id: z.string().nullable(),
  walk_m: z.number().nullable(),
});

const scoredInputsSchema = z.object({
  share: z.record(z.string(), z.number()),
  nearest_small: nearestSchema,
  nearest_large: nearestSchema,
  distance_method: z.string(),
  components: z.record(z.string(), z.number().nullable()),
});

const noDataInputsSchema = z.object({ reason: z.string() });

const surroundingsSchema = z.object({
  parks: z.array(
    z.object({
      id: z.string(),
      name: z.string().nullable(),
      kind: z.string(),
      area_ha: z.number(),
      amenities: z.array(z.string()),
      distance_m: z.number(),
      center: z.tuple([z.number(), z.number()]),
    }),
  ),
  areas: z.object({ type: z.literal('FeatureCollection'), features: z.array(z.unknown()) }),
});

type ScoredInputs = z.infer<typeof scoredInputsSchema>;

type SurroundingPark = z.infer<typeof surroundingsSchema>['parks'][number];

type Position = { latitude: number; longitude: number };

type CellRow = { inputs: unknown; city_avg_share_near: number | null };

async function readCell(
  sql: Sql,
  snapshotId: string,
  cellId: string,
  citySlug: string,
): Promise<CellRow | undefined> {
  const [row] = await sql<CellRow[]>`
    select
      cs.inputs -> 'green' as inputs,
      (s.stats #>> array['green', ${citySlug}, 'avg_share_near'])::float8 as city_avg_share_near
    from private.cell_scores cs
    join public.score_snapshots s on s.id = cs.snapshot_id
    where cs.snapshot_id = ${snapshotId} and cs.cell_id = ${cellId}
  `;
  return row;
}

async function readSurroundings(
  sql: Sql,
  snapshotId: string,
  position: Position,
  mapRadiusM: number,
  unnamedMinHa: number,
): Promise<z.infer<typeof surroundingsSchema>> {
  const [row] = await sql<{ described: unknown }[]>`
    select private.describe_green_surroundings(
      ${snapshotId},
      extensions.st_point(${position.longitude}, ${position.latitude}, 4326)::extensions.geography,
      ${PARKS_RADIUS_M},
      ${PARK_LIMIT},
      ${mapRadiusM},
      ${unnamedMinHa}
    ) as described
  `;
  const parsed = surroundingsSchema.safeParse(row?.described);
  if (!parsed.success) {
    throw new WorkerError(
      'green_surroundings_invalid',
      'Green surroundings do not match the schema',
    );
  }
  return parsed.data;
}

async function readParkEntrances(
  sql: Sql,
  snapshotId: string,
  position: Position,
  parkIds: readonly string[],
): Promise<z.infer<typeof candidateSchema>[]> {
  if (parkIds.length === 0) return [];
  const rows = await sql`
    with origin as (
      select extensions.st_point(${position.longitude}, ${position.latitude}, 4326) as point
    )
    select
      'park' as key,
      ga.id::text as poi_id,
      extensions.st_x(extensions.st_closestpoint(ga.geometry::extensions.geometry, origin.point)) as lng,
      extensions.st_y(extensions.st_closestpoint(ga.geometry::extensions.geometry, origin.point)) as lat,
      extensions.st_distance(ga.geometry, origin.point::extensions.geography)::float8 as straight_m
    from origin
    join private.green_areas ga
      on ga.snapshot_id = ${snapshotId}
      and ga.id = any(${[...parkIds]}::uuid[])
    order by ga.id
  `;
  return z.array(candidateSchema).parse(rows);
}

async function walkToParks(
  sql: Sql,
  router: ValhallaClient,
  snapshotId: string,
  position: Position,
  parks: readonly SurroundingPark[],
): Promise<Map<string, Leg | null>> {
  const entrances = await readParkEntrances(
    sql,
    snapshotId,
    position,
    parks.map((park) => park.id),
  );
  const [cell] = await walkCellCandidates(router, [
    { cell_id: 'address', lng: position.longitude, lat: position.latitude, candidates: entrances },
  ]);
  return new Map((cell?.routed ?? []).map((park) => [park.poi_id, park.leg]));
}

export function walkedParks(
  parks: readonly SurroundingPark[],
  legs: ReadonlyMap<string, Leg | null>,
  walkDetourFactor: number,
) {
  return parks
    .map(({ distance_m, ...park }) => {
      const leg = legs.get(park.id);
      return {
        ...park,
        walk_m: Math.round(leg ? leg.meters : distance_m * walkDetourFactor),
      };
    })
    .sort((a, b) => a.walk_m - b.walk_m);
}

function componentValue(
  key: (typeof COMPONENT_KEYS)[number],
  inputs: ScoredInputs,
  radii: { near: number; wide: number },
) {
  if (key === 'c1') return inputs.share[String(radii.near)] ?? null;
  if (key === 'c2') return inputs.share[String(radii.wide)] ?? null;
  if (key === 'c3') return inputs.nearest_small.walk_m;
  if (key === 'c4') return inputs.nearest_large.walk_m;
  return null;
}

export const greenReportSection: ReportSection = {
  key: 'green',
  build: async ({
    sql,
    router,
    snapshotId,
    cellId,
    citySlug,
    latitude,
    longitude,
    params,
    logger,
  }) => {
    const greenParams = parseGreenParams(z.object({ green: z.unknown() }).parse(params).green);
    const cell = await readCell(sql, snapshotId, cellId, citySlug);
    if (!cell) {
      logger.warn('green section skipped: the cell has no green score', {
        cell_id: cellId,
        city: citySlug,
      });
      return null;
    }

    const noData = noDataInputsSchema.safeParse(cell.inputs);
    if (noData.success) return { schema_version: 1, status: 'no_data', reason: noData.data.reason };

    const inputs = scoredInputsSchema.safeParse(cell.inputs);
    if (!inputs.success) {
      logger.warn('green section skipped: the cell inputs do not match the schema', {
        cell_id: cellId,
      });
      return null;
    }

    const radii = { near: greenParams.near_radius_m, wide: greenParams.wide_radius_m };
    const surroundings = await readSurroundings(
      sql,
      snapshotId,
      { latitude, longitude },
      Math.max(radii.wide, PARKS_RADIUS_M),
      greenParams.small_min_ha,
    );
    const legs = router
      ? await walkToParks(sql, router, snapshotId, { latitude, longitude }, surroundings.parks)
      : new Map<string, Leg | null>();
    const distanceMethod: DistanceMethod = router ? 'pedestrian_routing' : 'straight_line';

    const section: JsonObject = {
      schema_version: 1,
      status: 'scored',
      radii_m: greenParams.radii_m,
      near_radius_m: radii.near,
      wide_radius_m: radii.wide,
      share_cap: greenParams.share_cap,
      thresholds: {
        small_min_ha: greenParams.small_min_ha,
        small_full_m: greenParams.small_full_m,
        large_min_ha: greenParams.large_min_ha,
        large_full_m: greenParams.large_full_m,
      },
      share: inputs.data.share,
      city_avg_share_near: cell.city_avg_share_near,
      distance_method: distanceMethod,
      cell_distance_method: inputs.data.distance_method,
      nearest_small_id: inputs.data.nearest_small.green_area_id,
      nearest_large_id: inputs.data.nearest_large.green_area_id,
      components: COMPONENT_KEYS.map((key) => ({
        key,
        value: componentValue(key, inputs.data, radii),
        points: inputs.data.components[key] ?? null,
        weight: greenParams.weights[key],
      })),
      parks: walkedParks(surroundings.parks, legs, greenParams.walk_detour_factor),
      areas: surroundings.areas as JsonObject,
    };
    return section;
  },
};
