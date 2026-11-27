import { z } from 'zod';

const sha256 = z.string().regex(/^[0-9a-f]{64}$/);
const generationSchema = z.object({
  id: z.uuid(),
  generation: z.number().int().positive(),
  replica_id: z.string().min(1),
  valhalla_ledger_id: z.uuid().nullable(),
});

export const progressSchema = z.object({
  snapshot_id: z.uuid(),
  snapshot_status: z.enum(['building', 'failed', 'ready', 'superseded']),
  routing_pending: z.boolean(),
  plan_sha256: sha256.nullable(),
  generations: z.array(generationSchema),
  steps: z.array(
    z.object({
      key: z.string(),
      started_at: z.string().nullable(),
      started_by: z.uuid().nullable(),
      completed_at: z.string().nullable(),
      completed_by: z.uuid().nullable(),
    }),
  ),
  requests: z.object({
    unconfirmed: z.number().int().nonnegative(),
    accepted: z.number().int().nonnegative(),
    succeeded: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
    discarded: z.number().int().nonnegative(),
  }),
});

export const requestSchema = z.object({
  id: z.uuid(),
  execution_id: z.uuid(),
  step_key: z.string(),
  provider: z.enum(['ads', 'valhalla']),
  operation_key: z.string(),
  fingerprint: sha256,
  attempt: z.number().int().positive(),
  upstream_id: z.string().min(1).nullable(),
  state: z.enum(['unconfirmed', 'accepted', 'succeeded', 'failed', 'discarded']),
  artifact_sha256: sha256.nullable(),
  created_at: z.string(),
});

export type SnapshotProgress = z.infer<typeof progressSchema>;
export type SnapshotRequest = z.infer<typeof requestSchema>;
export type SnapshotGeneration = z.infer<typeof generationSchema>;

const workerStopSchema = z.object({
  executionId: z.uuid(),
  replicaId: z.string(),
  state: z.literal('stopped'),
  childrenStopped: z.literal(true),
  restartExcluded: z.literal(true),
});

const recoveryProofSchema = z.object({
  worker: workerStopSchema,
  valhalla: z.object({
    runId: z.uuid(),
    ledgerId: z.uuid(),
    admission: z.literal('fenced'),
    state: z.literal('drained'),
    queued: z.literal(0),
    running: z.literal(0),
  }),
});

export type WorkerStopProof = z.infer<typeof workerStopSchema>;
export type RecoveryProof = z.infer<typeof recoveryProofSchema>;

export function hasExactStopProof(generation: SnapshotGeneration, proof: unknown): boolean {
  const parsed = recoveryProofSchema.safeParse(proof);
  if (!parsed.success) return false;
  const { worker, valhalla } = parsed.data;
  return (
    worker.executionId === generation.id &&
    worker.replicaId === generation.replica_id &&
    valhalla.runId === generation.id &&
    valhalla.ledgerId === generation.valhalla_ledger_id
  );
}

type ExternalReceipt = {
  upstreamId: string;
  fingerprint: string;
  provider: SnapshotRequest['provider'];
  correlationId: string | null;
} & ({ state: 'succeeded'; artifactSha256: string } | { state: 'failed' });

export type VerifiedRequestResult = { request: SnapshotRequest; receipt: ExternalReceipt };

export function verifyRequestReceipt(
  request: SnapshotRequest,
  receipts: readonly ExternalReceipt[],
): VerifiedRequestResult | null {
  const matches = receipts.filter(
    (receipt) =>
      receipt.provider === request.provider &&
      receipt.fingerprint === request.fingerprint &&
      (request.upstream_id !== null
        ? receipt.upstreamId === request.upstream_id
        : receipt.correlationId === request.id),
  );
  return matches.length === 1 && matches[0] ? { request, receipt: matches[0] } : null;
}

export function summarizeSnapshotProgress(progress: SnapshotProgress) {
  return {
    ...progress,
    recorded: progress.plan_sha256 !== null,
    pending_steps: progress.steps
      .filter((step) => step.completed_at === null)
      .map((step) => step.key),
    requires_request_reconciliation:
      progress.requests.unconfirmed > 0 || progress.requests.accepted > 0,
  };
}
