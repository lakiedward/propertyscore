import { z } from 'zod';

import { WorkerError } from '../lib/errors.ts';
import type { SnapshotGeneration, WorkerStopProof } from './resume-plan.ts';

const stoppedSchema = z.object({
  run_id: z.uuid(),
  replica_id: z.string().min(1),
  state: z.literal('stopped'),
  children_stopped: z.literal(true),
  restart_excluded: z.literal(true),
});

export async function readWorkerStopProof(
  url: string,
  token: string,
  expected: SnapshotGeneration,
  signal: AbortSignal,
): Promise<WorkerStopProof> {
  const unconfirmed = () =>
    new WorkerError('snapshot_stop_unconfirmed', 'Previous Smart Check worker stop is unconfirmed');
  const response = await fetch(`${url.replace(/\/+$/, '')}/runs/${expected.id}`, {
    headers: { authorization: `Bearer ${token}` },
    cache: 'no-store',
    redirect: 'error',
    signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]),
  });
  if (response.status !== 200) throw unconfirmed();
  const proof = stoppedSchema.safeParse(await response.json());
  if (
    !proof.success ||
    proof.data.run_id !== expected.id ||
    proof.data.replica_id !== expected.replica_id
  ) {
    throw unconfirmed();
  }
  return {
    executionId: proof.data.run_id,
    replicaId: proof.data.replica_id,
    state: proof.data.state,
    childrenStopped: proof.data.children_stopped,
    restartExcluded: proof.data.restart_excluded,
  };
}
