import { createWriteStream } from 'node:fs';
import { mkdir, rename, rm, stat } from 'node:fs/promises';
import { dirname } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import { WorkerError } from '../lib/errors.ts';

async function fileExists(path: string): Promise<boolean> {
  try {
    const info = await stat(path);
    return info.isFile() && info.size > 0;
  } catch {
    return false;
  }
}

export async function downloadOnce(url: string, destination: string): Promise<string> {
  if (await fileExists(destination)) return destination;
  await mkdir(dirname(destination), { recursive: true });
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new WorkerError(
      'source_download_failed',
      `Download failed with ${response.status}: ${url}`,
    );
  }
  const partial = `${destination}.part`;
  try {
    await pipeline(Readable.fromWeb(response.body), createWriteStream(partial));
    await rename(partial, destination);
  } catch (error) {
    await rm(partial, { force: true });
    throw new WorkerError('source_download_failed', `Download interrupted: ${url}`, {
      cause: error,
    });
  }
  return destination;
}
