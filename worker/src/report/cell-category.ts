import { z } from 'zod';

import type { Sql } from '../db/sql.ts';
import type { CategoryKey, ContextKey } from '../scoring/categories.ts';

export type CellCategory = {
  score: number | null;
  inputs: unknown;
  cityId: string;
};

export async function readCellCategory(
  sql: Sql,
  snapshotId: string,
  cellId: string,
  key: CategoryKey,
): Promise<CellCategory | undefined> {
  const [row] = await sql<{ score: number | null; inputs: unknown; city_id: string }[]>`
    select
      (cs.categories ->> ${key})::int as score,
      cs.inputs -> ${key} as inputs,
      g.city_id
    from private.cell_scores cs
    join private.grid_cells g on g.id = cs.cell_id
    where cs.snapshot_id = ${snapshotId} and cs.cell_id = ${cellId}
  `;
  if (!row) return undefined;
  return { score: row.score, inputs: row.inputs, cityId: row.city_id };
}

export function sectionParams(params: unknown, key: CategoryKey | ContextKey): unknown {
  const parsed = z.record(z.string(), z.unknown()).safeParse(params);
  return parsed.success ? parsed.data[key] : undefined;
}
