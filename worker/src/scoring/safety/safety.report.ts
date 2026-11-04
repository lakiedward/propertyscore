import { z } from 'zod';

import type { JsonObject, Sql } from '../../db/sql.ts';
import { readCellCategory, sectionParams } from '../../report/cell-category.ts';
import type { ReportSection } from '../../report/report-section.ts';
import type { ValhallaClient } from '../../routing/valhalla.ts';
import {
  candidateSchema,
  type DistanceMethod,
  type RoutedCell,
  walkCellCandidates,
} from '../../routing/walk-access.ts';
import {
  type CellDistances,
  groupCellInputs,
  reachByType,
  walkedCellDistances,
  walkingTypes,
} from './safety.cells.ts';
import { scoreAtPoint, type PointSafety } from './safety.formula.ts';
import { WALK_CANDIDATES } from './safety.module.ts';
import {
  safetyParamsSchema,
  SAFETY_TYPES,
  type SafetyParams,
  type SafetyType,
} from './safety.params.ts';

const LANDMARK_TYPES: readonly SafetyType[] = [
  'police',
  'fire_station',
  'nonstop',
  'diplomatic',
  'train_station',
];

const cellInputsSchema = z.object({
  day: z.number(),
  night: z.number(),
  excluded_types: z.array(z.enum(SAFETY_TYPES)),
  distance_method: z.string(),
});

const distanceRowSchema = z.object({
  feature_type: z.enum(SAFETY_TYPES),
  distances: z.array(z.number()),
  night_states: z.array(z.enum(['open', 'closed', 'unknown'])),
});

const landmarkSchema = z.object({
  id: z.string(),
  feature_type: z.enum(SAFETY_TYPES),
  name: z.string().nullable(),
  longitude: z.number(),
  latitude: z.number(),
  distance_m: z.number(),
});

const walkCandidateSchema = candidateSchema.extend({
  key: z.enum(SAFETY_TYPES),
  name: z.string().nullable(),
  night_state: z.enum(['open', 'closed', 'unknown']),
});

type WalkCandidate = z.infer<typeof walkCandidateSchema>;

type Landmark = z.infer<typeof landmarkSchema>;

type Position = { longitude: number; latitude: number };

async function readPointDistances(
  sql: Sql,
  snapshotId: string,
  cityId: string,
  position: Position,
  reachM: Record<string, number>,
): Promise<z.infer<typeof distanceRowSchema>[]> {
  const rows = await sql`
    with origin as (
      select extensions.st_point(${position.longitude}, ${position.latitude}, 4326)::extensions.geography as point
    )
    select
      f.feature_type,
      array_agg(extensions.st_distance(origin.point, f.geometry, false)::float8 order by f.id) as distances,
      array_agg(f.night_state order by f.id) as night_states
    from origin
    cross join lateral jsonb_each_text(${sql.json(reachM)}::jsonb) as reach (feature_type, metres)
    join private.safety_features f
      on f.snapshot_id = ${snapshotId}
      and f.city_id = ${cityId}
      and f.feature_type = reach.feature_type
      and extensions.st_dwithin(origin.point, f.geometry, reach.metres::double precision, false)
    group by f.feature_type
  `;
  return z.array(distanceRowSchema).parse(rows);
}

async function readWalkCandidates(
  sql: Sql,
  snapshotId: string,
  cityId: string,
  position: Position,
  reachM: Record<string, number>,
): Promise<WalkCandidate[]> {
  const rows = await sql`
    with origin as (
      select extensions.st_point(${position.longitude}, ${position.latitude}, 4326)::extensions.geography as point
    )
    select
      candidate.feature_type as key,
      candidate.id::text as poi_id,
      candidate.name,
      candidate.night_state,
      extensions.st_x(candidate.point) as lng,
      extensions.st_y(candidate.point) as lat,
      candidate.straight_m
    from origin
    cross join lateral jsonb_each_text(${sql.json(reachM)}::jsonb) as reach (feature_type, metres)
    cross join lateral (
      select
        f.id,
        f.feature_type,
        f.name,
        f.night_state,
        extensions.st_closestpoint(f.geometry::extensions.geometry, origin.point::extensions.geometry) as point,
        extensions.st_distance(origin.point, f.geometry, false)::float8 as straight_m
      from private.safety_features f
      where f.snapshot_id = ${snapshotId}
        and f.city_id = ${cityId}
        and f.feature_type = reach.feature_type
        and extensions.st_dwithin(origin.point, f.geometry, reach.metres::double precision, false)
      order by straight_m, f.id
      limit ${WALK_CANDIDATES}
    ) as candidate
    order by candidate.feature_type, candidate.straight_m, candidate.id
  `;
  return z.array(walkCandidateSchema).parse(rows);
}

async function walkFromAddress(
  sql: Sql,
  router: ValhallaClient,
  options: {
    snapshotId: string;
    cityId: string;
    position: Position;
    reachM: Record<string, number>;
  },
): Promise<RoutedCell<WalkCandidate>> {
  const candidates = await readWalkCandidates(
    sql,
    options.snapshotId,
    options.cityId,
    options.position,
    options.reachM,
  );
  const [cell] = await walkCellCandidates(router, [
    {
      cell_id: 'address',
      lng: options.position.longitude,
      lat: options.position.latitude,
      candidates,
    },
  ]);
  return cell ?? { cellId: 'address', routed: [] };
}

async function readLandmarks(
  sql: Sql,
  snapshotId: string,
  cityId: string,
  position: Position,
  radiusM: number,
): Promise<z.infer<typeof landmarkSchema>[]> {
  const rows = await sql`
    with origin as (
      select extensions.st_point(${position.longitude}, ${position.latitude}, 4326)::extensions.geography as point
    ),
    ranked as (
      select
        f.id::text as id,
        f.feature_type,
        f.name,
        extensions.st_x(extensions.st_closestpoint(f.geometry::extensions.geometry, origin.point::extensions.geometry)) as longitude,
        extensions.st_y(extensions.st_closestpoint(f.geometry::extensions.geometry, origin.point::extensions.geometry)) as latitude,
        extensions.st_distance(origin.point, f.geometry, false)::float8 as distance_m,
        row_number() over (
          partition by f.feature_type
          order by extensions.st_distance(origin.point, f.geometry, false)
        ) as position
      from origin
      join private.safety_features f
        on f.snapshot_id = ${snapshotId}
        and f.city_id = ${cityId}
        and f.feature_type = any(${[...LANDMARK_TYPES]}::text[])
        and extensions.st_dwithin(origin.point, f.geometry, ${radiusM}, false)
    )
    select id, feature_type, name, longitude, latitude, distance_m
    from ranked
    where position = 1
    order by distance_m
  `;
  return z.array(landmarkSchema).parse(rows);
}

function pointInputs(
  rows: readonly z.infer<typeof distanceRowSchema>[],
  walked: readonly CellDistances[],
  params: SafetyParams,
) {
  return (
    groupCellInputs(
      [
        ...rows.map((row) => ({
          cellId: 'address',
          type: row.feature_type,
          distances: row.distances,
          nightStates: row.night_states,
        })),
        ...walked,
      ],
      params,
    ).get('address') ?? {}
  );
}

export function walkedLandmarks(
  landmarks: readonly Landmark[],
  walked: RoutedCell<WalkCandidate> | null,
  params: SafetyParams,
): Landmark[] {
  const nearestWalk = new Map<SafetyType, Landmark>();
  for (const candidate of walked?.routed ?? []) {
    if (!candidate.leg) continue;
    const current = nearestWalk.get(candidate.key);
    if (current && current.distance_m <= candidate.leg.meters) continue;
    nearestWalk.set(candidate.key, {
      id: candidate.poi_id,
      feature_type: candidate.key,
      name: candidate.name,
      longitude: candidate.lng,
      latitude: candidate.lat,
      distance_m: candidate.leg.meters,
    });
  }
  return landmarks
    .map(
      (landmark) =>
        nearestWalk.get(landmark.feature_type) ?? {
          ...landmark,
          distance_m:
            landmark.distance_m *
            (params.types[landmark.feature_type].walking ? params.walk_detour_factor : 1),
        },
    )
    .sort((a, b) => a.distance_m - b.distance_m);
}

function momentJson(moment: PointSafety['day']): JsonObject {
  return {
    score: moment.score,
    waterfall: moment.waterfall.rows.map((row) => ({ key: row.key, points: row.points })),
    far_types: moment.waterfall.farTypes,
    contributions: moment.contributions.map((row) => ({
      type: row.type,
      points: Math.round(row.points * 10) / 10,
      count: row.count,
      nearest_m: row.nearestM,
    })),
  };
}

function safetySection(input: {
  cell: z.infer<typeof cellInputsSchema>;
  point: PointSafety;
  landmarks: readonly Landmark[];
  params: SafetyParams;
  distanceMethod: DistanceMethod;
}): JsonObject {
  const { cell, point, landmarks, params, distanceMethod } = input;
  return {
    schema_version: 1,
    status: 'scored',
    day: cell.day,
    night: cell.night,
    moment_weights: params.moment_weights,
    excluded_types: cell.excluded_types,
    distance_method: distanceMethod,
    cell_distance_method: cell.distance_method,
    address: {
      score: point.score,
      start: params.start,
      day: momentJson(point.day),
      night: momentJson(point.night),
    },
    landmarks: landmarks.map((landmark) => ({
      id: landmark.id,
      type: landmark.feature_type,
      name: landmark.name,
      location: [Number(landmark.longitude.toFixed(6)), Number(landmark.latitude.toFixed(6))],
      distance_m: Math.round(landmark.distance_m),
    })),
  };
}

export const safetyReportSection: ReportSection = {
  key: 'safety',
  build: async ({ sql, router, snapshotId, cellId, latitude, longitude, params }) => {
    const safetyParams = safetyParamsSchema.parse(sectionParams(params, 'safety'));
    const cell = await readCellCategory(sql, snapshotId, cellId, 'safety');
    if (!cell) return null;
    const inputs = cellInputsSchema.safeParse(cell.inputs);
    if (cell.score === null || !inputs.success) return { schema_version: 1, status: 'no_data' };
    const position = { longitude, latitude };
    const reach = reachByType(safetyParams);
    const walkedTypes: readonly string[] = router ? walkingTypes(safetyParams) : [];
    const splitReach = (isWalked: boolean) =>
      Object.fromEntries(
        Object.entries(reach).filter(([type]) => walkedTypes.includes(type) === isWalked),
      );
    const rows = await readPointDistances(
      sql,
      snapshotId,
      cell.cityId,
      position,
      splitReach(false),
    );
    const walked =
      router && walkedTypes.length > 0
        ? await walkFromAddress(sql, router, {
            snapshotId,
            cityId: cell.cityId,
            position,
            reachM: splitReach(true),
          })
        : null;
    const excluded = new Set(inputs.data.excluded_types);
    const point = scoreAtPoint(
      pointInputs(rows, walked ? walkedCellDistances([walked]) : [], safetyParams),
      safetyParams,
      excluded,
    );
    const landmarks = await readLandmarks(
      sql,
      snapshotId,
      cell.cityId,
      position,
      Math.max(...Object.values(reach)),
    );
    return safetySection({
      cell: inputs.data,
      point,
      landmarks: walkedLandmarks(landmarks, walked, safetyParams),
      params: safetyParams,
      distanceMethod: walked ? 'pedestrian_routing' : 'straight_line',
    });
  },
};
