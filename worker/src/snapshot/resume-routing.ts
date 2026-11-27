import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { z } from 'zod';

import { WorkerError } from '../lib/errors.ts';
import { createValhallaClient } from '../routing/valhalla.ts';
import { snapshotDigest, writeSnapshotArtifact } from './resume-artifacts.ts';
import { runCheckpointedRequest } from './resume-request.ts';
import type { StepJournal } from './resume-steps.ts';

const registrySchema = z.object({
  run_id: z.uuid(),
  ledger_id: z.uuid(),
  admission: z.enum(['open', 'fenced']),
  state: z.enum(['idle', 'busy', 'drained', 'unknown']),
  queued: z.number().int().nullable(),
  running: z.number().int().nullable(),
});

export function routingUnconfirmed(): never {
  throw new WorkerError(
    'snapshot_valhalla_unconfirmed',
    'Smart Check routing state is unconfirmed',
  );
}

export function createResumeRouting(url: string, controlToken: string, routingToken: string) {
  const endpoint = url.replace(/\/+$/, '');
  return {
    async control(runId: string, action: 'register' | 'fence', signal: AbortSignal) {
      const path = `${endpoint}/runs/${runId}${action === 'fence' ? '/fence' : ''}`;
      const response = await fetch(path, {
        method: 'PUT',
        headers: { authorization: `Bearer ${controlToken}` },
        redirect: 'error',
        signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]),
      });
      if (response.status !== 200 && response.status !== 201) routingUnconfirmed();
      const value = registrySchema.safeParse(await response.json());
      if (!value.success || value.data.run_id !== runId) routingUnconfirmed();
      return value.data;
    },
    router({
      runId,
      ledgerId,
      step,
      journal,
      artifactsDir,
      signal,
    }: {
      runId: string;
      ledgerId: string;
      step: string;
      journal: StepJournal;
      artifactsDir: string;
      signal: AbortSignal;
    }) {
      const root = `${endpoint}/runs/${runId}`;
      const inflight = new Map<string, Promise<Uint8Array>>();
      return createValhallaClient(root, {
        checkpointFetch: async (url, init, validate) => {
          const headers = new Headers(init.headers);
          headers.set('authorization', `Bearer ${routingToken}`);
          headers.set('x-valhalla-ledger', ledgerId);
          const requestSignal = AbortSignal.any([signal, ...(init.signal ? [init.signal] : [])]);
          const path = url.slice(root.length);
          const fingerprint = snapshotDigest(JSON.stringify([path, init.method, init.body]));
          let packedResponse: Uint8Array | null = null;
          const promise =
            inflight.get(fingerprint) ??
            runCheckpointedRequest(
              journal,
              step,
              {
                provider: 'valhalla',
                operationKey: fingerprint,
                fingerprint,
              },
              {
                submit: async (correlationId, abort) => {
                  headers.set('x-propertyscore-request', correlationId);
                  const response = await fetch(url, {
                    ...init,
                    headers,
                    redirect: 'error',
                    signal: abort,
                  });
                  const body = new Uint8Array(await response.arrayBuffer());
                  const json: unknown = JSON.parse(new TextDecoder().decode(body));
                  validate(response.status, json);
                  const packed = new Uint8Array(body.length + 2);
                  new DataView(packed.buffer).setUint16(0, response.status);
                  packed.set(body, 2);
                  packedResponse = packed;
                  return correlationId;
                },
                wait: () => Promise.resolve(packedResponse ?? routingUnconfirmed()),
              },
              {
                read: async (sha256, _upstreamId, abort) =>
                  readFile(join(artifactsDir, sha256), { signal: abort }),
                store: (sha256, bytes) => writeSnapshotArtifact(artifactsDir, sha256, bytes),
              },
              requestSignal,
            );
          inflight.set(fingerprint, promise);
          let result: Uint8Array;
          try {
            result = await promise;
          } finally {
            if (inflight.get(fingerprint) === promise) inflight.delete(fingerprint);
          }
          return new Response(Uint8Array.from(result.subarray(2)), {
            status: new DataView(result.buffer, result.byteOffset, result.byteLength).getUint16(0),
          });
        },
      });
    },
  };
}
