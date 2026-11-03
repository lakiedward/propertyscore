import type { JsonObject, Sql } from '../db/sql.ts';
import type { CategoryKey } from './categories.ts';

export type CellCategoryScore = {
  cellId: string;
  score: number | null;
  inputs: JsonObject;
};

const BATCH_SIZE = 1000;

export async function writeCategoryScores(
  sql: Sql,
  snapshotId: string,
  category: CategoryKey,
  rows: readonly CellCategoryScore[],
): Promise<number> {
  let written = 0;
  for (let start = 0; start < rows.length; start += BATCH_SIZE) {
    const batch = rows.slice(start, start + BATCH_SIZE).map((row) => ({
      cell_id: row.cellId,
      score: row.score === null ? null : Math.round(row.score),
      inputs: row.inputs,
    }));
    const result = await sql`
      update private.cell_scores as cs
      set
        categories = cs.categories || jsonb_build_object(${category}::text, batch.score),
        inputs = cs.inputs || jsonb_build_object(${category}::text, batch.inputs)
      from jsonb_to_recordset(${sql.json(batch)}::jsonb) as batch (cell_id uuid, score smallint, inputs jsonb)
      where cs.snapshot_id = ${snapshotId} and cs.cell_id = batch.cell_id
    `;
    written += result.count;
  }
  return written;
}
