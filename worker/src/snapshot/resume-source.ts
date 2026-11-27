import { AsyncLocalStorage } from 'node:async_hooks';
import { readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

import {
  artifactUnconfirmed,
  snapshotDigest,
  snapshotFileDigest,
  writeSnapshotArtifact,
} from './resume-artifacts.ts';
import type { StepJournal } from './resume-steps.ts';

type SourceStep = {
  journal: StepJournal;
  step: string;
  signal: AbortSignal;
  directory: string;
};

const sourceStep = new AsyncLocalStorage<
  SourceStep & { inflight: Map<string, Promise<unknown>> }
>();

export function withCheckpointedSources<T>(context: SourceStep, run: () => Promise<T>) {
  return sourceStep.run({ ...context, inflight: new Map() }, run);
}

async function checkpointRead<T>(
  identity: readonly string[],
  read: (signal?: AbortSignal) => Promise<T>,
  store: (value: T, context: SourceStep) => Promise<string>,
  load: (digest: string, context: SourceStep) => Promise<T>,
  isUnavailable: (error: unknown) => boolean = () => false,
  unavailable?: () => never,
): Promise<T> {
  const context = sourceStep.getStore();
  if (!context) return read();
  const { journal, signal, step } = context;
  signal.throwIfAborted();
  const fingerprint = snapshotDigest(JSON.stringify(identity));
  async function capture(known: SourceStep) {
    const attempt = await journal.beginRequest(step, {
      provider: 'source',
      operationKey: fingerprint,
      fingerprint,
    });
    signal.throwIfAborted();
    if (attempt.outcome === 'reuse') return load(attempt.artifactSha256, known);
    if (attempt.outcome === 'unavailable') {
      if (unavailable) return unavailable();
      artifactUnconfirmed();
    }
    await journal.acceptRequest(attempt.requestId, attempt.requestId);
    signal.throwIfAborted();
    let value: T;
    try {
      value = await read(signal);
    } catch (error) {
      if (isUnavailable(error)) await journal.finishRequest(attempt.requestId, 'failed');
      throw error;
    }
    const artifactSha256 = await store(value, known);
    await journal.finishRequest(attempt.requestId, { artifactSha256 });
    return value;
  }
  const pending = context.inflight.get(fingerprint);
  if (pending) return (await pending) as T;
  const captured = capture(context);
  context.inflight.set(fingerprint, captured);
  try {
    return await captured;
  } finally {
    context.inflight.delete(fingerprint);
  }
}

export function checkpointSourceFile(
  url: string,
  destination: string,
  download: (signal?: AbortSignal) => Promise<string>,
  isUnavailable: (error: unknown) => boolean,
  unavailable: () => never,
) {
  return checkpointRead(
    ['GET', url, relative(sourceStep.getStore()?.directory ?? '.', destination)],
    download,
    (path, { signal }) => snapshotFileDigest(path, signal),
    async (digest, { signal }) => {
      if ((await snapshotFileDigest(destination, signal)) !== digest) artifactUnconfirmed();
      return destination;
    },
    isUnavailable,
    unavailable,
  );
}

export function checkpointSourceText(
  identity: readonly string[],
  read: (signal?: AbortSignal) => Promise<string>,
) {
  return checkpointRead(
    identity,
    read,
    async (value, { directory }) => {
      const digest = snapshotDigest(value);
      await writeSnapshotArtifact(directory, digest, Buffer.from(value));
      return digest;
    },
    async (digest, { directory, signal }) => {
      const bytes = await readFile(join(directory, digest), { signal });
      if (snapshotDigest(bytes) !== digest) artifactUnconfirmed();
      return bytes.toString();
    },
  );
}
