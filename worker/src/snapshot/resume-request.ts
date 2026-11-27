import { WorkerError } from '../lib/errors.ts';
import { artifactUnconfirmed, snapshotDigest } from './resume-artifacts.ts';
import type { createSnapshotJournal, SnapshotRequestKey } from './resume-journal.ts';

type Journal = Pick<
  ReturnType<typeof createSnapshotJournal>,
  'beginRequest' | 'acceptRequest' | 'finishRequest'
>;
type Provider = {
  submit: (correlationId: string, signal: AbortSignal) => Promise<string>;
  wait: (upstreamId: string, signal: AbortSignal) => Promise<Uint8Array | 'failed'>;
};
type Artifacts = {
  read: (sha256: string, upstreamId: string, signal: AbortSignal) => Promise<Uint8Array | null>;
  store: (sha256: string, bytes: Uint8Array, signal: AbortSignal) => Promise<void>;
};

export async function runCheckpointedRequest(
  journal: Journal,
  step: string,
  key: SnapshotRequestKey,
  provider: Provider,
  artifacts: Artifacts,
  signal: AbortSignal,
): Promise<Uint8Array> {
  signal.throwIfAborted();
  const attempt = await journal.beginRequest(step, key);
  signal.throwIfAborted();
  if (attempt.outcome === 'reuse') {
    const bytes = await artifacts.read(attempt.artifactSha256, attempt.upstreamId, signal);
    if (bytes === null || snapshotDigest(bytes) !== attempt.artifactSha256) artifactUnconfirmed();
    return bytes;
  }
  if (attempt.outcome !== 'submit') artifactUnconfirmed();

  const upstreamId = await provider.submit(attempt.requestId, signal);
  await journal.acceptRequest(attempt.requestId, upstreamId);
  signal.throwIfAborted();
  const result = await provider.wait(upstreamId, signal);
  if (result === 'failed') {
    await journal.finishRequest(attempt.requestId, 'failed');
    throw new WorkerError(
      'snapshot_request_failed',
      'Smart Check provider reported a terminal failure',
    );
  }
  const sha256 = snapshotDigest(result);
  await artifacts.store(sha256, result, signal);
  await journal.finishRequest(attempt.requestId, { artifactSha256: sha256 });
  return result;
}
