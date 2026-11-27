import { z } from 'zod';

import { WorkerError } from '../lib/errors.ts';
import { createValhallaClient, type ValhallaRequestScope } from './valhalla.ts';

const runState = z.intersection(
  z.object({ run_id: z.uuid(), ledger_id: z.uuid(), admission: z.enum(['open', 'fenced']) }),
  z.discriminatedUnion('state', [
    z.object({
      state: z.enum(['idle', 'busy', 'drained']),
      queued: z.number().int().nonnegative(),
      running: z.number().int().nonnegative(),
      drained: z.boolean(),
    }),
    z.object({
      state: z.literal('unknown'),
      queued: z.null(),
      running: z.null(),
      drained: z.literal(false),
    }),
  ]),
);

export type ValhallaRegistry = ReturnType<typeof createValhallaRegistry>;

function createRegistryClient(url: string, token: string) {
  if (!token.trim())
    throw new WorkerError('snapshot_registry_auth_missing', 'Missing registry token');
  const endpoint = url.replace(/\/+$/, '');
  const baseHeaders = { authorization: `Bearer ${token}` };
  const runUrl = (id: string) => `${endpoint}/runs/${z.uuid().parse(id)}`;

  async function state(
    id: string,
    method: 'GET' | 'PUT',
    options: { signal: AbortSignal; fence?: boolean; ledgerId?: string },
  ) {
    const response = await fetch(`${runUrl(id)}${options.fence ? '/fence' : ''}`, {
      method,
      headers: {
        ...baseHeaders,
        ...(options.ledgerId ? { 'X-Valhalla-Ledger': options.ledgerId } : {}),
      },
      redirect: 'error',
      cache: 'no-store',
      signal: options.signal,
    });
    if (response.status !== 200) {
      await response.body?.cancel();
      throw new WorkerError(
        'snapshot_registry_unconfirmed',
        'Valhalla registry state is unavailable',
      );
    }
    const result = runState.parse(await response.json());
    if (result.run_id !== id || (options.ledgerId && result.ledger_id !== options.ledgerId)) {
      throw new WorkerError('snapshot_registry_unconfirmed', 'Valhalla registry identity changed');
    }
    return result;
  }

  const read = (id: string, ledgerId: string, signal: AbortSignal) =>
    state(id, 'GET', { ledgerId, signal });
  return { endpoint, baseHeaders, runUrl, state, read };
}

export function createValhallaRegistryReader(url: string, token: string) {
  const { endpoint, read } = createRegistryClient(url, token);
  return { endpoint, read };
}

export function createValhallaRegistry(url: string, routingToken: string, controlToken: string) {
  const { endpoint, baseHeaders, runUrl } = createRegistryClient(url, routingToken);
  const { state } = createRegistryClient(url, controlToken);
  return {
    endpoint,
    async register(id: string, signal: AbortSignal) {
      const result = await state(id, 'PUT', { signal });
      if (
        result.state !== 'idle' ||
        result.admission !== 'open' ||
        result.queued !== 0 ||
        result.running !== 0
      ) {
        throw new WorkerError('snapshot_registry_unconfirmed', 'Valhalla run did not open empty');
      }
      return result.ledger_id;
    },

    router(id: string, ledgerId: string, requestScope: ValhallaRequestScope) {
      return createValhallaClient(runUrl(id), {
        requestScope,
        fetch: (url, init) => {
          const headers = new Headers(init?.headers);
          headers.set('authorization', baseHeaders.authorization);
          headers.set('X-Valhalla-Ledger', ledgerId);
          return fetch(url, { ...init, headers, redirect: 'error' });
        },
      });
    },
  };
}

export function createValhallaRecoveryController(
  url: string,
  readToken: string,
  fenceToken: string,
) {
  const { endpoint, read } = createValhallaRegistryReader(url, readToken);
  const { state } = createRegistryClient(url, fenceToken);
  return {
    endpoint,
    async fenceAndCheck(id: string, ledgerId: string, signal: AbortSignal) {
      await read(id, ledgerId, signal);
      await state(id, 'PUT', { fence: true, ledgerId, signal });
      const result = await read(id, ledgerId, signal);
      return (
        result.state === 'drained' &&
        result.admission === 'fenced' &&
        result.queued === 0 &&
        result.running === 0 &&
        result.drained
      );
    },
  };
}
