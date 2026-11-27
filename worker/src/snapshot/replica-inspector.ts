import { z } from 'zod';

import { WorkerError } from '../lib/errors.ts';

const replicaState = z.intersection(
  z.object({ run_id: z.uuid(), replica_id: z.string().min(1) }),
  z.discriminatedUnion('state', [
    z.object({ state: z.literal('active') }),
    z.object({
      state: z.literal('stopped'),
      children_stopped: z.literal(true),
      restart_excluded: z.literal(true),
    }),
    z.object({ state: z.literal('unknown') }),
  ]),
);

export function createReplicaInspector(url: string, token: string) {
  const endpoint = url.replace(/\/+$/, '');
  return {
    async read(runId: string, replicaId: string, signal: AbortSignal) {
      const response = await fetch(`${endpoint}/runs/${z.uuid().parse(runId)}`, {
        method: 'GET',
        headers: { authorization: `Bearer ${token}` },
        redirect: 'error',
        cache: 'no-store',
        signal,
      });
      if (response.status !== 200) {
        await response.body?.cancel();
        throw new WorkerError('snapshot_replica_unconfirmed', 'Replica inspection unavailable');
      }
      const proof = replicaState.parse(await response.json());
      if (proof.run_id !== runId || proof.replica_id !== replicaId) {
        throw new WorkerError(
          'snapshot_replica_unconfirmed',
          'Replica inspection identity changed',
        );
      }
      return proof.state;
    },
  };
}
