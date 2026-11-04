import { z } from 'zod';

import { type Sql, withLongStatements } from '../db/sql.ts';
import { mapWithConcurrency } from '../lib/concurrency.ts';
import type { Leg, LngLat, ValhallaClient } from './valhalla.ts';

export type WalkAccessTarget = {
  key: string;
  poiCategories: readonly string[];
  searchRadiusM: number;
  maxCandidates: number;
};

export type DistanceMethod = 'pedestrian_routing' | 'straight_line';

export type WalkAccessRow = {
  cell_id: string;
  category: string;
  t_nearest_s: number | null;
  d_nearest_m: number | null;
  n5: number;
  n10: number;
  n15: number;
  candidates: number;
  nearest_poi_id: string | null;
  distance_method: DistanceMethod;
};

export type Candidate = LngLat & { key: string; poi_id: string; straight_m: number };

export type ComputeWalkAccessOptions = {
  sql: Sql;
  router: ValhallaClient | null;
  snapshotId: string;
  cityId: string;
  walkSpeedKmh: number;
  walkDetourFactor: number;
  targets: readonly WalkAccessTarget[];
  concurrency?: number;
};

export const candidateSchema = z.object({
  key: z.string(),
  poi_id: z.string(),
  lng: z.number(),
  lat: z.number(),
  straight_m: z.number(),
});

const cellSchema = z.object({
  cell_id: z.string(),
  lng: z.number(),
  lat: z.number(),
  candidates: z.array(candidateSchema),
});

const CELL_BATCH = 200;

export type CellCandidates<T extends Candidate> = {
  cell_id: string;
  lng: number;
  lat: number;
  candidates: T[];
};

type RoutedCandidate<T extends Candidate> = T & { leg: Leg | null };

export type RoutedCell<T extends Candidate> = {
  cellId: string;
  routed: RoutedCandidate<T>[];
};

export async function walkCellCandidates<T extends Candidate>(
  router: ValhallaClient,
  cells: readonly CellCandidates<T>[],
  options: { walkSpeedKmh?: number; concurrency?: number } = {},
): Promise<RoutedCell<T>[]> {
  const { walkSpeedKmh, concurrency = 4 } = options;
  return mapWithConcurrency(cells, concurrency, async (cell) => {
    if (cell.candidates.length === 0) return { cellId: cell.cell_id, routed: [] };
    const [row] = await router.matrix({
      costing: 'pedestrian',
      sources: [{ lng: cell.lng, lat: cell.lat }],
      targets: cell.candidates,
      ...(walkSpeedKmh === undefined ? {} : { walkSpeedKmh }),
    });
    return {
      cellId: cell.cell_id,
      routed: cell.candidates.map((candidate, index) => ({
        ...candidate,
        leg: row?.[index] ?? null,
      })),
    };
  });
}

export function straightLineLeg(meters: number, walkSpeedKmh: number, detourFactor: number): Leg {
  const walked = meters * detourFactor;
  return { meters: Math.round(walked), seconds: Math.round(walked / (walkSpeedKmh / 3.6)) };
}

export function summarizeLegs(
  cellId: string,
  key: string,
  candidates: readonly { poiId: string; leg: Leg | null }[],
  distanceMethod: DistanceMethod,
): WalkAccessRow {
  let nearest: { poiId: string; leg: Leg } | null = null;
  let n5 = 0;
  let n10 = 0;
  let n15 = 0;
  for (const { poiId, leg } of candidates) {
    if (!leg) continue;
    if (!nearest || leg.seconds < nearest.leg.seconds) nearest = { poiId, leg };
    if (leg.seconds <= 300) n5 += 1;
    if (leg.seconds <= 600) n10 += 1;
    if (leg.seconds <= 900) n15 += 1;
  }
  return {
    cell_id: cellId,
    category: key,
    t_nearest_s: nearest?.leg.seconds ?? null,
    d_nearest_m: nearest?.leg.meters ?? null,
    n5,
    n10,
    n15,
    candidates: candidates.length,
    nearest_poi_id: nearest?.poiId ?? null,
    distance_method: distanceMethod,
  };
}

export async function legsFromOrigin(
  router: ValhallaClient | null,
  origin: LngLat,
  candidates: readonly Candidate[],
  walkSpeedKmh: number,
  walkDetourFactor: number,
): Promise<(Leg | null)[]> {
  if (candidates.length === 0) return [];
  if (!router) {
    return candidates.map((candidate) =>
      straightLineLeg(candidate.straight_m, walkSpeedKmh, walkDetourFactor),
    );
  }
  const [row] = await router.matrix({
    costing: 'pedestrian',
    sources: [origin],
    targets: candidates,
    walkSpeedKmh,
  });
  return row ?? candidates.map(() => null);
}

export function walkAccessRowsForCell(
  cellId: string,
  targets: readonly WalkAccessTarget[],
  candidates: readonly Candidate[],
  legs: readonly (Leg | null)[],
  distanceMethod: DistanceMethod,
): WalkAccessRow[] {
  return targets.map((target) =>
    summarizeLegs(
      cellId,
      target.key,
      candidates.flatMap((candidate, index) =>
        candidate.key === target.key ? [{ poiId: candidate.poi_id, leg: legs[index] ?? null }] : [],
      ),
      distanceMethod,
    ),
  );
}

function targetsJson(targets: readonly WalkAccessTarget[]) {
  return targets.map((target) => ({
    key: target.key,
    poi_categories: [...target.poiCategories],
    search_radius_m: target.searchRadiusM,
    max_candidates: target.maxCandidates,
  }));
}

export async function computeWalkAccess(options: ComputeWalkAccessOptions): Promise<number> {
  const { sql, router, snapshotId, cityId, targets } = options;
  if (targets.length === 0) return 0;
  const distanceMethod: DistanceMethod = router ? 'pedestrian_routing' : 'straight_line';
  return withLongStatements(sql, async (transaction) => {
    let written = 0;
    const cursor = transaction`
      select cell_id, lng, lat, candidates
      from private.walk_access_candidates(${snapshotId}, ${cityId}, ${transaction.json(targetsJson(targets))}::jsonb)
    `.cursor(CELL_BATCH);
    for await (const batch of cursor) {
      const cells = z.array(cellSchema).parse(batch);
      const rows = await mapWithConcurrency(cells, options.concurrency ?? 4, async (cell) => {
        const legs = await legsFromOrigin(
          router,
          { lng: cell.lng, lat: cell.lat },
          cell.candidates,
          options.walkSpeedKmh,
          options.walkDetourFactor,
        );
        return walkAccessRowsForCell(cell.cell_id, targets, cell.candidates, legs, distanceMethod);
      });
      const [result] = await transaction<{ written: number }[]>`
        select private.write_cell_walk_access(${snapshotId}, ${transaction.json(rows.flat())}::jsonb) as written
      `;
      written += result?.written ?? 0;
    }
    return written;
  });
}

export async function refreshCityCategoryStats(
  sql: Sql,
  snapshotId: string,
  cityId: string,
  targets: readonly (WalkAccessTarget & { minPoiCount: number })[],
): Promise<void> {
  const payload = targets.map((target) => ({
    key: target.key,
    poi_categories: [...target.poiCategories],
    min_poi_count: target.minPoiCount,
  }));
  await withLongStatements(sql, async (transaction) => {
    await transaction`
      select private.refresh_city_category_stats(${snapshotId}, ${cityId}, ${transaction.json(payload)}::jsonb)
    `;
  });
}
