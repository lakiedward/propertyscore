import { setTimeout as delay } from 'node:timers/promises';

import { WorkerError } from '../lib/errors.ts';
import { parseRobots, type RobotsPolicy } from './robots.ts';

type PoliteResponse =
  | { status: 'ok'; body: string }
  | { status: 'redirect'; location: string | null }
  | { status: 'missing' };

export type PoliteClientOptions = {
  origin: string;
  userAgent: string;
  productToken: string;
  allowedPaths: readonly RegExp[];
  minIntervalMs: number;
  attempts?: number;
  fetch?: typeof fetch;
  wait?: (milliseconds: number) => Promise<unknown>;
  now?: () => number;
};

export type PoliteClient = {
  get: (path: string) => Promise<PoliteResponse>;
  requestCount: () => number;
};

const ROBOTS_PATH = '/robots.txt';
const DEFAULT_ATTEMPTS = 3;
const RESPONSE_TIMEOUT_MS = 60_000;
const MAX_RETRY_AFTER_MS = 120_000;

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function retryAfterMs(response: Response): number {
  const seconds = Number(response.headers.get('retry-after'));
  if (!Number.isFinite(seconds) || seconds <= 0) return 0;
  return Math.min(seconds * 1000, MAX_RETRY_AFTER_MS);
}

export function createPoliteClient(options: PoliteClientOptions): PoliteClient {
  const send = options.fetch ?? fetch;
  const wait = options.wait ?? delay;
  const now = options.now ?? Date.now;
  const attempts = options.attempts ?? DEFAULT_ATTEMPTS;
  let queue: Promise<unknown> = Promise.resolve();
  let lastFinishedAt: number | null = null;
  let requests = 0;
  let robots: RobotsPolicy | null = null;

  async function requestOnce(path: string, pauseMs: number): Promise<Response> {
    if (lastFinishedAt !== null) {
      const remaining = lastFinishedAt + Math.max(options.minIntervalMs, pauseMs) - now();
      if (remaining > 0) await wait(remaining);
    }
    requests += 1;
    try {
      return await send(`${options.origin}${path}`, {
        headers: { 'user-agent': options.userAgent, accept: 'text/html, text/csv, text/plain' },
        redirect: 'manual',
        signal: AbortSignal.timeout(RESPONSE_TIMEOUT_MS),
      });
    } finally {
      lastFinishedAt = now();
    }
  }

  async function request(path: string): Promise<PoliteResponse> {
    let pauseMs = 0;
    for (let attempt = 1; ; attempt += 1) {
      let response: Response;
      try {
        response = await requestOnce(path, pauseMs);
      } catch (error) {
        if (attempt >= attempts) {
          throw new WorkerError('source_download_failed', `Unreachable: ${path}`, {
            cause: error,
          });
        }
        pauseMs = options.minIntervalMs * 2 ** attempt;
        continue;
      }
      if (response.ok) {
        const body = await response.text();
        lastFinishedAt = now();
        return { status: 'ok', body };
      }
      await response.body?.cancel();
      if (response.status >= 300 && response.status < 400) {
        return { status: 'redirect', location: response.headers.get('location') };
      }
      if (response.status === 404 || response.status === 410) return { status: 'missing' };
      if (!isRetryableStatus(response.status) || attempt >= attempts) {
        throw new WorkerError(
          'source_download_failed',
          `Request failed with ${String(response.status)}: ${path}`,
        );
      }
      pauseMs = Math.max(options.minIntervalMs * 2 ** attempt, retryAfterMs(response));
    }
  }

  async function readRobots(): Promise<RobotsPolicy> {
    const response = await request(ROBOTS_PATH);
    if (response.status === 'missing') return { isAllowed: () => true };
    if (response.status !== 'ok') {
      throw new WorkerError('source_robots_unreadable', 'robots.txt could not be read');
    }
    return parseRobots(response.body, options.productToken);
  }

  async function guardedGet(path: string): Promise<PoliteResponse> {
    if (!options.allowedPaths.some((pattern) => pattern.test(path))) {
      throw new WorkerError('source_path_not_allowed', `Path outside the agreed pages: ${path}`);
    }
    robots ??= await readRobots();
    if (!robots.isAllowed(path)) {
      throw new WorkerError('source_disallowed_by_robots', `robots.txt disallows ${path}`);
    }
    return request(path);
  }

  return {
    get: (path) => {
      const result = queue.then(() => guardedGet(path));
      queue = result.catch(() => undefined);
      return result;
    },
    requestCount: () => requests,
  };
}
