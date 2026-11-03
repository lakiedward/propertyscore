import { z } from 'zod';

import type { JsonObject, Sql } from '../../db/sql.ts';
import { sectionParams } from '../../report/cell-category.ts';
import type { ReportSection } from '../../report/report-section.ts';
import { WorkerError } from '../../lib/errors.ts';
import type { Leg, LngLat, ValhallaClient } from '../../routing/valhalla.ts';
import { type DistanceMethod, legsFromOrigin } from '../../routing/walk-access.ts';
import {
  type FifteenMinuteParams,
  poiCategoriesFor,
  poiCategoryOf,
} from './fifteen-minute.params.ts';
import { parseFifteenMinuteParams } from './fifteen-minute.module.ts';

const geometrySchema = z.object({ type: z.string(), coordinates: z.unknown() });

const countsSchema = {
  n5: z.number().int().min(0),
  n10: z.number().int().min(0),
  n15: z.number().int().min(0),
};

export const fifteenMinuteReportSchema = z.object({
  score: z.number().int().min(0).max(100).nullable(),
  city_avg: z.object({ score: z.number().int().min(0).max(100).nullable() }),
  city_percentile: z.number().int().min(0).max(100).nullable(),
  covered: z.number().int().min(0),
  total: z.number().int().min(0),
  walk_speed_kmh: z.number().positive(),
  distance_method: z.enum(['pedestrian_routing', 'straight_line']),
  groups: z.array(z.object({ key: z.string(), categories: z.array(z.string()), ...countsSchema })),
  categories: z.array(
    z.object({
      key: z.string(),
      group: z.string(),
      t1_min: z.number().int().min(0).nullable(),
      distance_m: z.number().int().min(0).nullable(),
      ...countsSchema,
      status: z.enum(['ok', 'missing', 'no_data']),
    }),
  ),
  missing: z.array(
    z.object({
      key: z.string(),
      nearest_min: z.number().int().min(0).nullable(),
      nearest_m: z.number().int().min(0).nullable(),
    }),
  ),
  places: z.array(
    z.object({
      id: z.string(),
      category: z.string(),
      name: z.string().nullable(),
      lat: z.number(),
      lng: z.number(),
      distance_m: z.number().int().min(0),
      minutes: z.number().int().min(0),
      is_24h: z.boolean().nullable(),
      opening_hours: z.string().nullable(),
    }),
  ),
  isochrones: z.array(z.object({ minutes: z.number(), geometry: geometrySchema })),
  routes: z.array(
    z.object({
      place_id: z.string(),
      minutes: z.number().int().min(0),
      distance_m: z.number().int().min(0),
      polyline6: z.string(),
    }),
  ),
  nonstop: z.array(
    z.object({
      place_id: z.string(),
      category: z.string(),
      minutes: z.number().int().min(0),
      hours_source: z.literal('osm'),
    }),
  ),
});

type FifteenMinuteReport = z.infer<typeof fifteenMinuteReportSchema>;

export type ReportCandidate = {
  key: string;
  poi_id: string;
  source_ref: string;
  name: string | null;
  lng: number;
  lat: number;
  straight_m: number;
  opening_hours: string | null;
  is_24h: boolean | null;
};

export type ReportCell = {
  score: number | null;
  cityAvg: number | null;
  cityPercentile: number | null;
};

type RoutedCandidate = ReportCandidate & { leg: Leg | null };

type Assembled = Omit<FifteenMinuteReport, 'isochrones' | 'routes'>;

const reportCandidateSchema = z.object({
  key: z.string(),
  poi_id: z.string(),
  source_ref: z.string(),
  name: z.string().nullable(),
  lng: z.number(),
  lat: z.number(),
  straight_m: z.number(),
  opening_hours: z.string().nullable(),
  is_24h: z.boolean().nullable(),
});

function minutesOf(leg: Leg): number {
  return Math.round(leg.seconds / 60);
}

export function assembleFifteenMinuteReport(input: {
  params: FifteenMinuteParams;
  candidates: readonly RoutedCandidate[];
  coveredKeys: ReadonlySet<string>;
  cell: ReportCell;
  distanceMethod: DistanceMethod;
}): Assembled {
  const { params, coveredKeys } = input;
  const limitS = params.proximity.limit_min * 60;
  const reachable = input.candidates
    .filter((candidate): candidate is ReportCandidate & { leg: Leg } => candidate.leg !== null)
    .sort((a, b) => a.leg.seconds - b.leg.seconds);

  const categories = params.categories.map((category) => {
    const own = reachable.filter((candidate) => candidate.key === poiCategoryOf(category.key));
    const nearest = own[0];
    const count = (seconds: number) =>
      own.filter((candidate) => candidate.leg.seconds <= seconds).length;
    const isCovered = coveredKeys.has(category.key);
    const status: 'ok' | 'missing' | 'no_data' = !isCovered
      ? 'no_data'
      : nearest && nearest.leg.seconds <= limitS
        ? 'ok'
        : 'missing';
    return {
      key: category.key,
      group: category.group,
      t1_min: nearest ? minutesOf(nearest.leg) : null,
      distance_m: nearest ? nearest.leg.meters : null,
      n5: count(300),
      n10: count(600),
      n15: count(900),
      status,
    };
  });

  const groupKeys = [...new Set(params.categories.map((category) => category.group))];
  const groups = groupKeys.map((group) => {
    const members = categories.filter(
      (category) => category.group === group && category.status !== 'no_data',
    );
    return {
      key: group,
      categories: members.map((category) => category.key),
      n5: members.reduce((sum, category) => sum + category.n5, 0),
      n10: members.reduce((sum, category) => sum + category.n10, 0),
      n15: members.reduce((sum, category) => sum + category.n15, 0),
    };
  });

  const keyByPoiCategory = new Map(
    params.categories.map((category) => [poiCategoryOf(category.key), category.key]),
  );
  const places = params.categories.flatMap((category) =>
    reachable
      .filter(
        (candidate) =>
          candidate.key === poiCategoryOf(category.key) && candidate.leg.seconds <= limitS,
      )
      .slice(0, params.report.places_per_category)
      .map((candidate) => ({
        id: candidate.source_ref,
        category: category.key,
        name: candidate.name,
        lat: candidate.lat,
        lng: candidate.lng,
        distance_m: candidate.leg.meters,
        minutes: minutesOf(candidate.leg),
        is_24h: candidate.is_24h,
        opening_hours: candidate.opening_hours,
      })),
  );

  const nonstop = reachable
    .filter((candidate) => candidate.is_24h === true && candidate.leg.seconds <= limitS)
    .map((candidate) => ({
      place_id: candidate.source_ref,
      category: keyByPoiCategory.get(candidate.key) ?? candidate.key,
      minutes: minutesOf(candidate.leg),
      hours_source: 'osm' as const,
    }));

  const scored = categories.filter((category) => category.status !== 'no_data');
  return {
    score: input.cell.score,
    city_avg: { score: input.cell.cityAvg },
    city_percentile: input.cell.cityPercentile,
    covered: scored.filter((category) => category.status === 'ok').length,
    total: scored.length,
    walk_speed_kmh: params.walk_speed_kmh,
    distance_method: input.distanceMethod,
    groups,
    categories,
    missing: categories
      .filter((category) => category.status === 'missing')
      .map((category) => ({
        key: category.key,
        nearest_min: category.t1_min,
        nearest_m: category.distance_m,
      })),
    places,
    nonstop,
  };
}

export function routeTargets(assembled: Assembled, limit: number): Assembled['places'] {
  const nearestPerCategory = new Map<string, Assembled['places'][number]>();
  for (const place of assembled.places) {
    const current = nearestPerCategory.get(place.category);
    if (!current || place.minutes < current.minutes) nearestPerCategory.set(place.category, place);
  }
  return [...nearestPerCategory.values()].sort((a, b) => a.minutes - b.minutes).slice(0, limit);
}

async function readReportCell(
  sql: Sql,
  snapshotId: string,
  origin: LngLat,
): Promise<ReportCell & { cityId: string }> {
  const [row] = await sql<
    {
      city_id: string;
      score: number | null;
      city_avg: number | null;
      city_percentile: number | null;
    }[]
  >`
    with origin as (
      select extensions.st_point(${origin.lng}, ${origin.lat}, 4326)::extensions.geography as point
    ),
    cell as (
      select g.id, g.city_id, c.slug
      from public.score_snapshots s
      join public.scoring_versions v on v.id = s.scoring_version_id
      cross join origin
      join private.grid_cells g
        on g.id = private.find_grid_cell(origin.point, (v.params ->> 'cell_size_m')::integer)
      join public.cities c on c.id = g.city_id
      where s.id = ${snapshotId}
    )
    select
      cell.city_id,
      (cs.categories ->> 'fifteen_minute')::integer as score,
      (s.stats #>> array['cities', cell.slug, 'categories', 'fifteen_minute', 'avg'])::integer as city_avg,
      private.cell_score_percentile(
        ${snapshotId}, cell.city_id, 'fifteen_minute', (cs.categories ->> 'fifteen_minute')::numeric
      ) as city_percentile
    from cell
    join public.score_snapshots s on s.id = ${snapshotId}
    left join private.cell_scores cs on cs.snapshot_id = s.id and cs.cell_id = cell.id
  `;
  if (!row) throw new WorkerError('address_outside_coverage', 'The address is outside the grid');
  return {
    cityId: row.city_id,
    score: row.score,
    cityAvg: row.city_avg,
    cityPercentile: row.score === null ? null : row.city_percentile,
  };
}

async function readCoveredKeys(
  sql: Sql,
  snapshotId: string,
  cityId: string,
  params: FifteenMinuteParams,
): Promise<Set<string>> {
  const rows = await sql<{ category: string }[]>`
    select category
    from private.city_category_stats
    where snapshot_id = ${snapshotId} and city_id = ${cityId} and is_covered
  `;
  const covered = new Set(rows.map((row) => row.category));
  return new Set(
    params.categories
      .filter((category) => covered.has(poiCategoryOf(category.key)))
      .map((category) => category.key),
  );
}

async function readCandidates(
  sql: Sql,
  snapshotId: string,
  origin: LngLat,
  params: FifteenMinuteParams,
): Promise<ReportCandidate[]> {
  const targets = params.categories.map((category) => ({
    key: poiCategoryOf(category.key),
    poi_categories: poiCategoriesFor(category),
    search_radius_m: params.search_radius_m,
    max_candidates: params.report.candidates_per_category,
  }));
  const rows = await sql`
    select key, poi_id, source_ref, name, lng, lat, straight_m, opening_hours, is_24h
    from private.walk_candidates_from(
      ${snapshotId},
      extensions.st_point(${origin.lng}, ${origin.lat}, 4326)::extensions.geography,
      ${sql.json(targets)}::jsonb
    )
  `;
  return z.array(reportCandidateSchema).parse(rows);
}

async function buildFifteenMinuteReport(options: {
  sql: Sql;
  router: ValhallaClient | null;
  snapshotId: string;
  origin: LngLat;
  params: FifteenMinuteParams;
}): Promise<FifteenMinuteReport> {
  const { sql, router, snapshotId, origin, params } = options;
  const cell = await readReportCell(sql, snapshotId, origin);
  const [coveredKeys, candidates] = await Promise.all([
    readCoveredKeys(sql, snapshotId, cell.cityId, params),
    readCandidates(sql, snapshotId, origin, params),
  ]);
  const legs = await legsFromOrigin(
    router,
    origin,
    candidates,
    params.walk_speed_kmh,
    params.walk_detour_factor,
  );
  const assembled = assembleFifteenMinuteReport({
    params,
    candidates: candidates.map((candidate, index) => ({ ...candidate, leg: legs[index] ?? null })),
    coveredKeys,
    cell,
    distanceMethod: router ? 'pedestrian_routing' : 'straight_line',
  });

  const isochrones = router
    ? await router.isochrones({
        origin,
        minutes: params.report.isochrone_minutes,
        walkSpeedKmh: params.walk_speed_kmh,
      })
    : [];
  const routes = [];
  if (router) {
    for (const place of routeTargets(assembled, params.report.routes)) {
      const route = await router.route({
        origin,
        destination: { lng: place.lng, lat: place.lat },
        walkSpeedKmh: params.walk_speed_kmh,
      });
      if (route) {
        routes.push({
          place_id: place.id,
          minutes: Math.round(route.seconds / 60),
          distance_m: route.meters,
          polyline6: route.polyline6,
        });
      }
    }
  }

  return fifteenMinuteReportSchema.parse({ ...assembled, isochrones, routes });
}

export const fifteenMinuteReportSection: ReportSection = {
  key: 'fifteen_minute',
  build: async ({ sql, router, snapshotId, latitude, longitude, params }) => {
    const report = await buildFifteenMinuteReport({
      sql,
      router: router ?? null,
      snapshotId,
      origin: { lng: longitude, lat: latitude },
      params: parseFifteenMinuteParams(sectionParams(params, 'fifteen_minute')),
    });
    const { isochrones, ...rest } = report;
    const section: JsonObject = {
      schema_version: 1,
      status: report.score === null ? 'no_data' : 'scored',
      ...rest,
      isochrones: isochrones.map((isochrone) => ({
        minutes: isochrone.minutes,
        geometry: isochrone.geometry as JsonObject,
      })),
    };
    return section;
  },
};
