import type { Sql } from '../db/sql.ts';
import { WorkerError } from '../lib/errors.ts';

export type CoveredCity = {
  id: string;
  slug: string;
  name: string;
};

export type SnapshotVersion = {
  snapshotId: string;
  period: string;
  params: Record<string, unknown>;
};

export async function listCoveredCities(
  sql: Sql,
  slugs: readonly string[],
): Promise<CoveredCity[]> {
  const rows = await sql<CoveredCity[]>`
    select id, slug, name
    from public.cities
    where has_online_coverage
      and (
        jsonb_array_length(${sql.json([...slugs])}::jsonb) = 0
        or slug in (select jsonb_array_elements_text(${sql.json([...slugs])}::jsonb))
      )
    order by position
  `;
  return [...rows];
}

export async function startSnapshot(sql: Sql, period: string): Promise<SnapshotVersion> {
  const [started] = await sql<{ id: string }[]>`
    select private.start_score_snapshot(${period}::date) as id
  `;
  if (!started)
    throw new WorkerError('snapshot_not_started', 'start_score_snapshot returned no snapshot');
  try {
    const [row] = await sql<{ period: string; params: Record<string, unknown> }[]>`
      select to_char(s.period, 'YYYY-MM-DD') as period, v.params
      from public.score_snapshots s
      join public.scoring_versions v on v.id = s.scoring_version_id
      where s.id = ${started.id}
    `;
    if (!row)
      throw new WorkerError('snapshot_not_readable', 'The started snapshot is not readable');
    return { snapshotId: started.id, period: row.period, params: row.params };
  } catch (error) {
    await failSnapshot(sql, started.id, 'start_failed');
    throw error;
  }
}

export async function prepareCityCells(
  sql: Sql,
  snapshotId: string,
  cityId: string,
  cellSizeM: number,
): Promise<number> {
  await sql`select private.build_grid_cells(${cityId}, ${cellSizeM})`;
  const [row] = await sql<{ seeded: number }[]>`
    select private.seed_cell_scores(${snapshotId}, ${cityId}) as seeded
  `;
  return row?.seeded ?? 0;
}

export async function finishSnapshot(
  sql: Sql,
  snapshotId: string,
  sourceDates: Record<string, string>,
): Promise<void> {
  await sql.begin(async (transaction) => {
    await transaction`select private.compute_overall_scores(${snapshotId})`;
    await transaction`select private.compute_snapshot_stats(${snapshotId})`;
    await transaction`select private.publish_score_snapshot(${snapshotId}, ${transaction.json(sourceDates)}::jsonb)`;
  });
}

export async function failSnapshot(sql: Sql, snapshotId: string, code: string): Promise<void> {
  await sql`select private.fail_score_snapshot(${snapshotId}, ${code})`;
}
