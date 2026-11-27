import type { SqlTransaction } from '../db/sql.ts';
import type { WalkAccessRow, WalkAccessTarget } from './walk-access.ts';

export async function openWalkCandidateCursor(
  transaction: SqlTransaction,
  snapshotId: string,
  cityId: string,
  targets: readonly WalkAccessTarget[],
): Promise<void> {
  const payload = targets.map((target) => ({
    key: target.key,
    poi_categories: [...target.poiCategories],
    search_radius_m: target.searchRadiusM,
    max_candidates: target.maxCandidates,
  }));
  await transaction`
    declare walk_candidates no scroll cursor for
    select cell_id, lng, lat, candidates
    from private.walk_access_candidates(${snapshotId}, ${cityId}, ${transaction.json(payload)}::jsonb)
  `;
}

export async function readWalkCandidateBatch(
  transaction: SqlTransaction,
): Promise<readonly unknown[]> {
  return transaction`fetch forward 200 from walk_candidates`;
}

export async function writeWalkAccessBatch(
  transaction: SqlTransaction,
  snapshotId: string,
  rows: readonly WalkAccessRow[],
): Promise<number> {
  const [result] = await transaction<{ written: number }[]>`
    select private.write_cell_walk_access(${snapshotId}, ${transaction.json(rows)}::jsonb) as written
  `;
  return result?.written ?? 0;
}
