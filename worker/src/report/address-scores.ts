import { z } from 'zod';

import type { Sql } from '../db/sql.ts';
import { CATEGORY_KEYS, type CategoryKey } from '../scoring/categories.ts';

type Point = { x: number; y: number };

type ScoredCell = { center: Point; categories: Partial<Record<CategoryKey, number | null>> };

export type AddressScores = {
  overall: number | null;
  categories: Record<CategoryKey, number | null>;
};

function inverseDistanceWeights(point: Point, corners: readonly Point[]): number[] {
  const distances = corners.map((corner) => Math.hypot(corner.x - point.x, corner.y - point.y));
  const exact = distances.findIndex((distance) => distance === 0);
  if (exact >= 0) return distances.map((_, index) => (index === exact ? 1 : 0));
  const inverse = distances.map((distance) => 1 / distance);
  const total = inverse.reduce((sum, value) => sum + value, 0);
  return inverse.map((value) => value / total);
}

export function barycentricWeights(point: Point, corners: readonly Point[]): number[] {
  const [a, b, c] = corners;
  if (!a) return [];
  if (!b) return [1];
  if (!c) return inverseDistanceWeights(point, [a, b]);
  const determinant = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
  if (Math.abs(determinant) < 1e-9) return [1, 0, 0];
  const wa = ((b.y - c.y) * (point.x - c.x) + (c.x - b.x) * (point.y - c.y)) / determinant;
  const wb = ((c.y - a.y) * (point.x - c.x) + (a.x - c.x) * (point.y - c.y)) / determinant;
  const clamped = [wa, wb, 1 - wa - wb].map((weight) => Math.max(0, weight));
  const total = clamped.reduce((sum, weight) => sum + weight, 0);
  return total === 0 ? [1, 0, 0] : clamped.map((weight) => weight / total);
}

export function interpolateCategories(
  cells: readonly ScoredCell[],
  weights: readonly number[],
): Record<CategoryKey, number | null> {
  const result = {} as Record<CategoryKey, number | null>;
  for (const key of CATEGORY_KEYS) {
    let weighted = 0;
    let total = 0;
    cells.forEach((cell, index) => {
      const value = cell.categories[key];
      const weight = weights[index] ?? 0;
      if (typeof value !== 'number' || weight <= 0) return;
      weighted += weight * value;
      total += weight;
    });
    result[key] = total === 0 ? null : Math.round(weighted / total);
  }
  return result;
}

export function overallScore(
  categories: Readonly<Record<CategoryKey, number | null>>,
  weights: Readonly<Record<string, number>>,
): number | null {
  let weighted = 0;
  let total = 0;
  for (const key of CATEGORY_KEYS) {
    const value = categories[key];
    const weight = weights[key];
    if (value === null || weight === undefined) continue;
    weighted += weight * value;
    total += weight;
  }
  return total === 0 ? null : Math.round(weighted / total);
}

const categoriesSchema = z.record(z.string(), z.unknown()).transform((raw) => {
  const categories: Partial<Record<CategoryKey, number | null>> = {};
  for (const key of CATEGORY_KEYS) {
    const value = raw[key];
    categories[key] = typeof value === 'number' ? value : null;
  }
  return categories;
});

const nearestCellSchema = z.object({
  center_x: z.number(),
  center_y: z.number(),
  point_x: z.number(),
  point_y: z.number(),
  categories: categoriesSchema,
});

export async function interpolateAddressCategories(
  sql: Sql,
  input: { snapshotId: string; cellId: string; longitude: number; latitude: number },
): Promise<Record<CategoryKey, number | null>> {
  const rows = z.array(nearestCellSchema).parse(
    await sql`
      select center_x, center_y, point_x, point_y, categories
      from private.report_nearest_cells(
        ${input.snapshotId},
        ${input.cellId},
        extensions.st_point(${input.longitude}, ${input.latitude}, 4326)::extensions.geography
      )
    `,
  );
  const cells = rows.map((row) => ({
    center: { x: row.center_x, y: row.center_y },
    categories: row.categories,
  }));
  const first = rows[0];
  const point = first ? { x: first.point_x, y: first.point_y } : { x: 0, y: 0 };
  return interpolateCategories(
    cells,
    barycentricWeights(
      point,
      cells.map((cell) => cell.center),
    ),
  );
}
