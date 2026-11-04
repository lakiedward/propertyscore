import { z } from 'zod';

import { type Sql, withLongStatements } from '../../db/sql.ts';
import { mapWithConcurrency } from '../../lib/concurrency.ts';
import type { Leg, LngLat, ValhallaClient } from '../../routing/valhalla.ts';
import type { WalkAccessTarget } from '../../routing/walk-access.ts';

export type CarDistanceMethod = 'car_routing' | 'straight_line';

export type NearestByCar = {
  poiId: string;
  seconds: number;
};

export type WalkAccessRecord = {
  cellId: string;
  category: string;
  tNearestS: number | null;
  n5: number;
  n10: number;
  n15: number;
  nearestPoiId: string | null;
  distanceMethod: 'pedestrian_routing' | 'straight_line';
};

const candidateSchema = z.object({
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

type Candidate = z.infer<typeof candidateSchema>;

const CELL_BATCH = 200;

export function straightLineCarLeg(meters: number, speedKmh: number, detourFactor: number): Leg {
  const driven = meters * detourFactor;
  return { meters: Math.round(driven), seconds: Math.round(driven / (speedKmh / 3.6)) };
}

export function nearestByCar(
  candidates: readonly Candidate[],
  legs: readonly (Leg | null)[],
): Map<string, NearestByCar> {
  const nearest = new Map<string, NearestByCar>();
  candidates.forEach((candidate, index) => {
    const leg = legs[index];
    if (!leg) return;
    const current = nearest.get(candidate.key);
    if (!current || leg.seconds < current.seconds) {
      nearest.set(candidate.key, { poiId: candidate.poi_id, seconds: leg.seconds });
    }
  });
  return nearest;
}

async function carLegs(
  router: ValhallaClient | null,
  origin: LngLat,
  candidates: readonly Candidate[],
  speedKmh: number,
  detourFactor: number,
): Promise<(Leg | null)[]> {
  if (candidates.length === 0) return [];
  if (!router) {
    return candidates.map((candidate) =>
      straightLineCarLeg(candidate.straight_m, speedKmh, detourFactor),
    );
  }
  const [row] = await router.matrix({ costing: 'auto', sources: [origin], targets: candidates });
  return row ?? candidates.map(() => null);
}

export async function computeCarAccess(options: {
  sql: Sql;
  router: ValhallaClient | null;
  snapshotId: string;
  cityId: string;
  targets: readonly WalkAccessTarget[];
  carSpeedKmh: number;
  carDetourFactor: number;
  concurrency?: number;
}): Promise<Map<string, Map<string, NearestByCar>>> {
  const { sql, snapshotId, cityId } = options;
  const targets = options.targets.map((target) => ({
    key: target.key,
    poi_categories: [...target.poiCategories],
    search_radius_m: target.searchRadiusM,
    max_candidates: target.maxCandidates,
  }));
  const byCell = new Map<string, Map<string, NearestByCar>>();
  await withLongStatements(sql, async (transaction) => {
    const cursor = transaction`
      select cell_id, lng, lat, candidates
      from private.walk_access_candidates(${snapshotId}, ${cityId}, ${transaction.json(targets)}::jsonb)
    `.cursor(CELL_BATCH);
    for await (const batch of cursor) {
      const cells = z.array(cellSchema).parse(batch);
      await mapWithConcurrency(cells, options.concurrency ?? 4, async (cell) => {
        const legs = await carLegs(
          options.router,
          { lng: cell.lng, lat: cell.lat },
          cell.candidates,
          options.carSpeedKmh,
          options.carDetourFactor,
        );
        byCell.set(cell.cell_id, nearestByCar(cell.candidates, legs));
      });
    }
  });
  return byCell;
}

export async function readWalkAccess(
  sql: Sql,
  snapshotId: string,
  cityId: string,
  categories: readonly string[],
): Promise<WalkAccessRecord[]> {
  const rows = await sql<
    {
      cell_id: string;
      category: string;
      t_nearest_s: number | null;
      n5: number;
      n10: number;
      n15: number;
      nearest_poi_id: string | null;
      distance_method: 'pedestrian_routing' | 'straight_line';
    }[]
  >`
    select a.cell_id, a.category, a.t_nearest_s, a.n5, a.n10, a.n15, a.nearest_poi_id, a.distance_method
    from private.cell_walk_access a
    join private.grid_cells g on g.id = a.cell_id
    where a.snapshot_id = ${snapshotId}
      and g.city_id = ${cityId}
      and a.category in ${sql([...categories])}
  `;
  return rows.map((row) => ({
    cellId: row.cell_id,
    category: row.category,
    tNearestS: row.t_nearest_s,
    n5: row.n5,
    n10: row.n10,
    n15: row.n15,
    nearestPoiId: row.nearest_poi_id,
    distanceMethod: row.distance_method,
  }));
}
