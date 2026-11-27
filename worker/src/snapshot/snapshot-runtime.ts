import type { Sql } from '../db/sql.ts';
import type { createValhallaRegistryReader } from '../routing/valhalla-registry.ts';
import {
  isActiveCamsJob,
  isTerminalCamsJob,
  type createCamsJobVerifier,
} from '../scoring/air/cams.source.ts';
import { readSnapshotAdsAttempts, readSnapshotRuntime } from './recovery.db.ts';
import type { createReplicaInspector } from './replica-inspector.ts';

type WorkState = 'active' | 'stopped' | 'unknown';
type Evidence = { state: WorkState; reason: string };

export type SnapshotRuntimeReaders = {
  replica?: ReturnType<typeof createReplicaInspector>;
  valhalla?: ReturnType<typeof createValhallaRegistryReader>;
  ads?: ReturnType<typeof createCamsJobVerifier>;
};

const unknown = (reason: string): Evidence => ({ state: 'unknown', reason });

async function inspectReplica(
  reader: SnapshotRuntimeReaders['replica'],
  runId: string,
  replicaId: string,
  signal: AbortSignal,
): Promise<Evidence> {
  if (!reader) return unknown('inspector_not_configured');
  try {
    const state = await reader.read(runId, replicaId, signal);
    if (state === 'active') return { state, reason: 'replica_active' };
    if (state === 'stopped') return { state, reason: 'replica_and_children_stopped' };
    return unknown('replica_stop_not_proven');
  } catch {
    return unknown('replica_evidence_unavailable');
  }
}

async function inspectValhalla(
  reader: SnapshotRuntimeReaders['valhalla'],
  runId: string,
  endpoint: string,
  ledgerId: string,
  signal: AbortSignal,
): Promise<Evidence> {
  if (!reader) return unknown('registry_not_configured');
  if (reader.endpoint !== endpoint) return unknown('registry_endpoint_changed');
  try {
    const result = await reader.read(runId, ledgerId, signal);
    if (result.state === 'unknown') return unknown('routing_drain_unproven');
    if (result.state === 'busy' && (result.queued > 0 || result.running > 0)) {
      return { state: 'active', reason: 'routing_work_pending' };
    }
    if (
      result.state === 'drained' &&
      result.admission === 'fenced' &&
      result.drained &&
      result.queued === 0 &&
      result.running === 0
    ) {
      return { state: 'stopped', reason: 'routing_fenced_and_drained' };
    }
    return unknown(
      result.admission === 'open' ? 'routing_admission_open' : 'routing_drain_unproven',
    );
  } catch {
    return unknown('routing_evidence_unavailable');
  }
}

async function inspectAds(
  reader: SnapshotRuntimeReaders['ads'],
  worker: Evidence,
  attempts: Awaited<ReturnType<typeof readSnapshotAdsAttempts>>,
  signal: AbortSignal,
): Promise<Evidence> {
  const knownJobs = attempts.filter(
    (attempt) => attempt.job_id !== null && reader?.endpoint === attempt.ads_url,
  );
  const statuses = reader
    ? await Promise.allSettled(
        knownJobs.flatMap(({ job_id }) => (job_id ? [reader.read(job_id, signal)] : [])),
      )
    : [];
  if (statuses.some((result) => result.status === 'fulfilled' && isActiveCamsJob(result.value))) {
    return { state: 'active', reason: 'ads_job_not_terminal' };
  }
  if (attempts.some((attempt) => !attempt.job_id)) return unknown('ads_job_identity_missing');
  if (attempts.length > 0 && !reader) return unknown('ads_reader_not_configured');
  if (knownJobs.length !== attempts.length) return unknown('ads_endpoint_changed');
  if (
    statuses.length !== attempts.length ||
    !statuses.every((result) => result.status === 'fulfilled' && isTerminalCamsJob(result.value))
  ) {
    return unknown('ads_terminal_evidence_unavailable');
  }
  if (worker.state !== 'stopped') return unknown('ads_submissions_still_possible');
  return {
    state: 'stopped',
    reason: attempts.length > 0 ? 'all_ads_jobs_terminal' : 'no_ads_submissions',
  };
}

export async function inspectSnapshotRuntime(
  sql: Sql,
  runId: string,
  readers: SnapshotRuntimeReaders,
  signal: AbortSignal,
) {
  const run = await readSnapshotRuntime(sql, runId);
  if (!run) return null;
  const { snapshot_status, routing_pending, replica_id, valhalla_url, valhalla_ledger_id } = run;
  const noIdentity = unknown('no_execution_identity');
  const report = (worker: Evidence, valhalla: Evidence, ads: Evidence) => ({
    run_id: runId,
    snapshot_status,
    routing_pending,
    worker,
    valhalla,
    ads,
    work_ended: [worker, valhalla, ads].every(({ state }) => state === 'stopped'),
  });
  if (!replica_id || !valhalla_url || !valhalla_ledger_id) {
    return report(noIdentity, noIdentity, noIdentity);
  }
  const [worker, valhalla] = await Promise.all([
    inspectReplica(readers.replica, runId, replica_id, signal),
    inspectValhalla(readers.valhalla, runId, valhalla_url, valhalla_ledger_id, signal),
  ]);
  const attempts = await readSnapshotAdsAttempts(sql, runId);
  return report(worker, valhalla, await inspectAds(readers.ads, worker, attempts, signal));
}
