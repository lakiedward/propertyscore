import { createWriteStream } from 'node:fs';
import { mkdir, rename, rm, stat } from 'node:fs/promises';
import { dirname } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { setTimeout as delay } from 'node:timers/promises';

import { WorkerError } from '../lib/errors.ts';

export type DownloadOptions = {
  attempts?: number;
  backoffMs?: number;
  headers?: Readonly<Record<string, string>>;
};

const DEFAULT_ATTEMPTS = 4;
const DEFAULT_BACKOFF_MS = 2000;
const RESPONSE_TIMEOUT_MS = 60_000;

async function fileExists(path: string): Promise<boolean> {
  try {
    const info = await stat(path);
    return info.isFile() && info.size > 0;
  } catch {
    return false;
  }
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

class RetryableDownloadError extends WorkerError {}

async function downloadAttempt(
  url: string,
  destination: string,
  headers: Readonly<Record<string, string>>,
): Promise<void> {
  let response: Response;
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, RESPONSE_TIMEOUT_MS);
  try {
    response = await fetch(url, { headers, signal: controller.signal });
  } catch (error) {
    throw new RetryableDownloadError('source_download_failed', `Download unreachable: ${url}`, {
      cause: error,
    });
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok || !response.body) {
    await response.body?.cancel();
    const ErrorType = isRetryableStatus(response.status) ? RetryableDownloadError : WorkerError;
    throw new ErrorType(
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
    throw new RetryableDownloadError('source_download_failed', `Download interrupted: ${url}`, {
      cause: error,
    });
  }
}

export async function downloadOnce(
  url: string,
  destination: string,
  options: DownloadOptions = {},
): Promise<string> {
  if (await fileExists(destination)) return destination;
  await mkdir(dirname(destination), { recursive: true });
  const attempts = options.attempts ?? DEFAULT_ATTEMPTS;
  const backoffMs = options.backoffMs ?? DEFAULT_BACKOFF_MS;
  for (let attempt = 1; ; attempt += 1) {
    try {
      await downloadAttempt(url, destination, options.headers ?? {});
      return destination;
    } catch (error) {
      if (!(error instanceof RetryableDownloadError) || attempt >= attempts) throw error;
      await delay(backoffMs * 2 ** (attempt - 1));
    }
  }
}
