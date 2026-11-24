import { z } from 'zod';

import type { JsonObject, Sql } from '../../db/sql.ts';
import { SAFETY_TYPES, type SafetyParams, type SafetyType } from './safety.params.ts';

const ELEMENTS_HALF_WIDTH_M = 3000;

const ELEMENTS_HALF_HEIGHT_M = 2500;

const METRES_PER_DEGREE = 111_320;

const MAX_PER_TYPE = 2500;

const SIMPLIFY_DEGREES = 0.00003;

const COORDINATE_DECIMALS = 5;

const MAP_TYPES: readonly SafetyType[] = SAFETY_TYPES.filter((type) => type !== 'mixed_use');

const POINT_TYPES: readonly SafetyType[] = [
  'shop',
  'nonstop',
  'police',
  'fire_station',
  'diplomatic',
  'bar',
  'train_station',
  'train_halt',
  'transit_stop',
];

const elementRowSchema = z.object({
  feature_type: z.enum(SAFETY_TYPES),
  geometry: z.string(),
});

type ElementRow = z.infer<typeof elementRowSchema>;

type Position = [number, number];

const positionSchema = z.tuple([z.number(), z.number()]).rest(z.number());

const geometrySchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('Point'), coordinates: positionSchema }),
  z.object({ type: z.literal('MultiPoint'), coordinates: z.array(positionSchema) }),
  z.object({ type: z.literal('LineString'), coordinates: z.array(positionSchema) }),
  z.object({ type: z.literal('MultiLineString'), coordinates: z.array(z.array(positionSchema)) }),
  z.object({ type: z.literal('Polygon'), coordinates: z.array(z.array(positionSchema)) }),
  z.object({
    type: z.literal('MultiPolygon'),
    coordinates: z.array(z.array(z.array(positionSchema))),
  }),
]);

export function elementsEnvelope(position: { longitude: number; latitude: number }) {
  const latitudeDelta = ELEMENTS_HALF_HEIGHT_M / METRES_PER_DEGREE;
  const longitudeDelta =
    ELEMENTS_HALF_WIDTH_M / (METRES_PER_DEGREE * Math.cos((position.latitude * Math.PI) / 180));
  return {
    west: position.longitude - longitudeDelta,
    south: position.latitude - latitudeDelta,
    east: position.longitude + longitudeDelta,
    north: position.latitude + latitudeDelta,
  };
}

export async function readMapElements(
  sql: Sql,
  snapshotId: string,
  cityId: string,
  position: { longitude: number; latitude: number },
): Promise<ElementRow[]> {
  const envelope = elementsEnvelope(position);
  const rows = await sql`
    with origin as (
      select
        extensions.st_point(${position.longitude}, ${position.latitude}, 4326)::extensions.geography as point,
        extensions.st_makeenvelope(
          ${envelope.west}, ${envelope.south}, ${envelope.east}, ${envelope.north}, 4326
        ) as frame
    ),
    ranked as (
      select
        f.feature_type,
        f.geometry::extensions.geometry as shape,
        row_number() over (
          partition by f.feature_type, extensions.geometrytype(f.geometry) = 'POINT'
          order by extensions.st_distance(origin.point, f.geometry, false), f.id
        ) as position
      from origin
      join private.safety_features f
        on f.snapshot_id = ${snapshotId}
        and f.city_id = ${cityId}
        and f.feature_type = any(${[...MAP_TYPES]}::text[])
        and extensions.st_intersects(f.geometry, origin.frame::extensions.geography)
    ),
    shaped as (
      select
        ranked.feature_type,
        case
          when ranked.feature_type = any(${[...POINT_TYPES]}::text[])
            or extensions.geometrytype(ranked.shape) = 'POINT'
            then extensions.st_pointonsurface(ranked.shape)
          when extensions.geometrytype(ranked.shape) in ('LINESTRING', 'MULTILINESTRING')
            then extensions.st_simplifypreservetopology(
              extensions.st_collectionextract(extensions.st_intersection(ranked.shape, origin.frame), 2),
              ${SIMPLIFY_DEGREES}
            )
          else extensions.st_simplifypreservetopology(
            extensions.st_collectionextract(extensions.st_intersection(ranked.shape, origin.frame), 3),
            ${SIMPLIFY_DEGREES}
          )
        end as shape
      from ranked
      cross join origin
      where ranked.position <= ${MAX_PER_TYPE}
    )
    select feature_type, extensions.st_asgeojson(shape, ${COORDINATE_DECIMALS}) as geometry
    from shaped
    where shape is not null and not extensions.st_isempty(shape)
  `;
  return z.array(elementRowSchema).parse(rows);
}

function position(value: readonly number[]): Position | null {
  const [longitude, latitude] = value;
  return longitude === undefined || latitude === undefined ? null : [longitude, latitude];
}

function line(values: readonly (readonly number[])[]): Position[] | null {
  const positions = values.flatMap((value) => {
    const parsed = position(value);
    return parsed ? [parsed] : [];
  });
  return positions.length >= 2 ? positions : null;
}

function polygon(rings: readonly (readonly (readonly number[])[])[]): Position[][] | null {
  const parsed = rings.flatMap((ring) => {
    const positions = line(ring);
    return positions && positions.length >= 4 ? [positions] : [];
  });
  return parsed.length > 0 ? parsed : null;
}

type Shapes = { points: Position[]; lines: Position[][]; areas: Position[][][] };

function shapesOf(geometry: z.infer<typeof geometrySchema>): Shapes {
  const empty: Shapes = { points: [], lines: [], areas: [] };
  switch (geometry.type) {
    case 'Point': {
      const point = position(geometry.coordinates);
      return { ...empty, points: point ? [point] : [] };
    }
    case 'MultiPoint':
      return {
        ...empty,
        points: geometry.coordinates.flatMap((value) => {
          const point = position(value);
          return point ? [point] : [];
        }),
      };
    case 'LineString': {
      const parsed = line(geometry.coordinates);
      return { ...empty, lines: parsed ? [parsed] : [] };
    }
    case 'MultiLineString':
      return {
        ...empty,
        lines: geometry.coordinates.flatMap((value) => {
          const parsed = line(value);
          return parsed ? [parsed] : [];
        }),
      };
    case 'Polygon': {
      const parsed = polygon(geometry.coordinates);
      return { ...empty, areas: parsed ? [parsed] : [] };
    }
    case 'MultiPolygon':
      return {
        ...empty,
        areas: geometry.coordinates.flatMap((value) => {
          const parsed = polygon(value);
          return parsed ? [parsed] : [];
        }),
      };
  }
}

function parseGeometry(text: string): z.infer<typeof geometrySchema> | null {
  try {
    const parsed = geometrySchema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function elementsJson(rows: readonly ElementRow[], params: SafetyParams): JsonObject {
  const points: Partial<Record<SafetyType, Position[]>> = {};
  const lines: Partial<Record<SafetyType, Position[][]>> = {};
  const areas: Partial<Record<SafetyType, Position[][][]>> = {};
  for (const row of rows) {
    const geometry = parseGeometry(row.geometry);
    if (!geometry) continue;
    const shapes = shapesOf(geometry);
    if (shapes.points.length > 0) (points[row.feature_type] ??= []).push(...shapes.points);
    if (shapes.lines.length > 0) (lines[row.feature_type] ??= []).push(...shapes.lines);
    if (shapes.areas.length > 0) (areas[row.feature_type] ??= []).push(...shapes.areas);
  }
  const reach = Object.fromEntries(MAP_TYPES.map((type) => [type, params.types[type].radius_m]));
  return { reach_m: reach, points, lines, areas };
}
