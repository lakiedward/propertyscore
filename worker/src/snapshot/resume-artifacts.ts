import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { WorkerError } from '../lib/errors.ts';

export function snapshotDigest(value: string | Uint8Array) {
  return createHash('sha256').update(value).digest('hex');
}

export async function snapshotFileDigest(path: string, signal: AbortSignal) {
  const hash = createHash('sha256');
  try {
    const bytes: AsyncIterable<Buffer> = createReadStream(path, { signal });
    for await (const chunk of bytes) hash.update(chunk);
  } catch {
    signal.throwIfAborted();
    artifactUnconfirmed();
  }
  return hash.digest('hex');
}

export async function writeSnapshotArtifact(directory: string, name: string, bytes: Uint8Array) {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const temp = join(directory, randomUUID());
  try {
    await writeFile(temp, bytes, { flag: 'wx', mode: 0o600, flush: true });
    await rename(temp, join(directory, name));
  } finally {
    await rm(temp, { force: true });
  }
}

export function artifactUnconfirmed(): never {
  throw new WorkerError('snapshot_artifact_unconfirmed', 'Saved Smart Check result is unavailable');
}
