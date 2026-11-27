import { type Sql, withLongStatements } from '../db/sql.ts';
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
  lockOwnerPid: number | null;
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
  const [features] = await sql<{ worker_lock: boolean }[]>`
    select to_regprocedure('private.start_score_snapshot(date,boolean)') is not null as worker_lock
  `;
  const [started] = features?.worker_lock
    ? await sql<{ id: string }[]>`select private.start_score_snapshot(${period}::date, true) as id`
    : await sql<{ id: string }[]>`select private.start_score_snapshot(${period}::date) as id`;
  if (!started)
    throw new WorkerError('snapshot_not_started', 'start_score_snapshot returned no snapshot');
  try {
    const [row] = await sql<{ period: string; params: Record<string, unknown>; pid: number }[]>`
      select to_char(s.period, 'YYYY-MM-DD') as period, v.params, pg_backend_pid() as pid
      from public.score_snapshots s
      join public.scoring_versions v on v.id = s.scoring_version_id
      where s.id = ${started.id}
    `;
    if (!row)
      throw new WorkerError('snapshot_not_readable', 'The started snapshot is not readable');
    return {
      snapshotId: started.id,
      period: row.period,
      params: row.params,
      lockOwnerPid: features?.worker_lock ? row.pid : null,
    };
  } catch (error) {
    await failSnapshot(sql, started.id, 'start_failed');
    throw error;
  }
}

export async function holdSnapshot(sql: Sql, version: SnapshotVersion): Promise<void> {
  if (version.lockOwnerPid === null) return;
  await sql`select private.hold_score_snapshot(${version.snapshotId}, ${version.lockOwnerPid})`;
}

export async function markSnapshotRouting(
  sql: Sql,
  snapshotId: string,
  pending: boolean,
): Promise<void> {
  const [row] = await sql<{ id: string }[]>`
    update public.score_snapshots
    set routing_pending = ${pending}
    where id = ${snapshotId} and status = 'building' and uses_worker_lock
    returning id
  `;
  if (!row) throw new WorkerError('snapshot_not_building', 'Cannot set the snapshot routing state');
}

export async function prepareCityCells(
  sql: Sql,
  snapshotId: string,
  cityId: string,
  cellSizeM: number,
): Promise<number> {
  return withLongStatements(sql, async (transaction) => {
    await transaction`select private.build_grid_cells(${cityId}, ${cellSizeM})`;
    const [row] = await transaction<{ seeded: number }[]>`
      select private.seed_cell_scores(${snapshotId}, ${cityId}) as seeded
    `;
    return row?.seeded ?? 0;
  });
}

export async function finishSnapshot(
  sql: Sql,
  snapshotId: string,
  sourceDates: Record<string, string>,
): Promise<void> {
  await withLongStatements(sql, async (transaction) => {
    await transaction`select private.compute_overall_scores(${snapshotId})`;
    await transaction`select private.compute_snapshot_stats(${snapshotId})`;
    await transaction`select private.publish_score_snapshot(${snapshotId}, ${transaction.json(sourceDates)}::jsonb)`;
  });
}

export async function failSnapshot(sql: Sql, snapshotId: string, code: string): Promise<void> {
  await sql`select private.fail_score_snapshot(${snapshotId}, ${code})`;
}
