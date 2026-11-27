import { z } from 'zod';

import type { Sql } from '../db/sql.ts';
import type { createValhallaRecoveryController } from '../routing/valhalla-registry.ts';
import type { createCamsJobVerifier } from '../scoring/air/cams.source.ts';
import {
  abandonConfirmedSnapshot,
  lockSnapshotRecovery,
  readSnapshotEvidence,
} from './recovery.db.ts';

type RecoveryOptions = {
  sql: Sql;
  snapshotId: string;
  replicaStopped: (replicaId: string, runId: string, signal: AbortSignal) => Promise<boolean>;
  registry: ReturnType<typeof createValhallaRecoveryController>;
  cams: ReturnType<typeof createCamsJobVerifier>;
};

async function confirmed(verify: () => Promise<boolean>) {
  try {
    return await verify();
  } catch {
    return false;
  }
}

export async function recoverSnapshot(options: RecoveryOptions) {
  const snapshotId = z.uuid().parse(options.snapshotId);
  const result = await options.sql.begin(async (sql) => {
    if (!(await lockSnapshotRecovery(sql))) return { outcome: 'busy' } as const;
    const evidence = await readSnapshotEvidence(sql, snapshotId);
    if (!evidence) return { outcome: 'execution_unconfirmed' } as const;

    const { execution, attempts } = evidence;
    const signal = AbortSignal.timeout(10_000);
    if (
      !(await confirmed(() => options.replicaStopped(execution.replica_id, snapshotId, signal)))
    ) {
      return { outcome: 'replica_unconfirmed' } as const;
    }
    if (
      options.registry.endpoint !== execution.valhalla_url ||
      !(await confirmed(() =>
        options.registry.fenceAndCheck(snapshotId, execution.valhalla_ledger_id, signal),
      ))
    ) {
      return { outcome: 'valhalla_unconfirmed' } as const;
    }
    for (const { ads_url, job_id } of attempts) {
      if (
        !job_id ||
        ads_url !== options.cams.endpoint ||
        !(await confirmed(() => options.cams.isTerminal(job_id, signal)))
      ) {
        return { outcome: 'cams_unconfirmed' } as const;
      }
    }
    if (signal.aborted) return { outcome: 'proof_deadline' } as const;
    await abandonConfirmedSnapshot(sql, snapshotId);
    return { outcome: 'recovered' } as const;
  });
  return result.outcome;
}
