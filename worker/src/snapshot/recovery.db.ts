import type { Sql, SqlTransaction } from '../db/sql.ts';
import { WorkerError } from '../lib/errors.ts';

export async function recordSnapshotExecution(
  sql: Sql,
  snapshotId: string,
  replicaId: string,
  valhallaUrl: string,
  ledgerId: string,
) {
  await sql`
    insert into private.score_snapshot_executions
      (snapshot_id, replica_id, valhalla_url, valhalla_ledger_id)
    values (${snapshotId}, ${replicaId}, ${valhallaUrl}, ${ledgerId})
  `;
}

export function trackCamsAttempts(sql: Sql, snapshotId: string) {
  return async (adsUrl: string) => {
    const [attempt] = await sql<{ id: string }[]>`
      insert into private.score_snapshot_cams_attempts (snapshot_id, ads_url)
      values (${snapshotId}, ${adsUrl})
      returning id
    `;
    if (!attempt)
      throw new WorkerError('snapshot_cams_not_recorded', 'CAMS attempt was not recorded');
    return async (jobId: string) => {
      const [updated] = await sql<{ id: string }[]>`
        update private.score_snapshot_cams_attempts set job_id = ${jobId}
        where id = ${attempt.id} and job_id is null
        returning id
      `;
      if (!updated)
        throw new WorkerError('snapshot_cams_not_recorded', 'CAMS job was not recorded');
    };
  };
}

export async function lockSnapshotRecovery(sql: SqlTransaction) {
  const [gate] = await sql<{ acquired: boolean }[]>`
    select pg_try_advisory_xact_lock(hashtext('propertyscore.snapshot') & 2147483647, 0) as acquired
  `;
  if (!gate?.acquired) return false;
  const [row] = await sql<{ busy: boolean }[]>`
    select exists (select 1 from private.score_snapshot_lock_holders()) as busy
  `;
  return row?.busy === false;
}

export async function readSnapshotEvidence(sql: SqlTransaction, snapshotId: string) {
  const [execution] = await sql<
    {
      replica_id: string;
      valhalla_url: string;
      valhalla_ledger_id: string;
    }[]
  >`
    select e.replica_id, e.valhalla_url, e.valhalla_ledger_id
    from private.score_snapshot_executions e
    join public.score_snapshots s on s.id = e.snapshot_id
    where s.id = ${snapshotId} and s.status = 'building'
      and s.uses_worker_lock and s.routing_pending
    for update of s
  `;
  if (!execution) return null;
  const attempts = await sql<{ ads_url: string; job_id: string | null }[]>`
    select ads_url, job_id from private.score_snapshot_cams_attempts
    where snapshot_id = ${snapshotId}
  `;
  return { execution, attempts };
}

export async function abandonConfirmedSnapshot(sql: SqlTransaction, snapshotId: string) {
  const [row] = await sql<{ id: string }[]>`
    update public.score_snapshots
    set status = 'failed', routing_pending = false, finished_at = now(), error_code = 'abandoned'
    where id = ${snapshotId} and status = 'building' and uses_worker_lock and routing_pending
    returning id
  `;
  if (!row) throw new WorkerError('snapshot_not_building', 'Snapshot recovery state changed');
}

export async function readSnapshotRuntime(sql: Sql, snapshotId: string) {
  const [run] = await sql<
    {
      snapshot_status: string;
      routing_pending: boolean;
      replica_id: string | null;
      valhalla_url: string | null;
      valhalla_ledger_id: string | null;
    }[]
  >`select * from snapshot_diagnostics.read_score_snapshot_runtime(${snapshotId})`;
  return run ?? null;
}

export function readSnapshotAdsAttempts(sql: Sql, snapshotId: string) {
  return sql<{ ads_url: string; job_id: string | null }[]>`
    select * from snapshot_diagnostics.read_score_snapshot_ads_attempts(${snapshotId})
  `;
}
