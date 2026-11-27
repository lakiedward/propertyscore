import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { createServer, type Server } from 'node:http';

import { describe, expect, it } from 'vitest';

import { createSql } from '../db/sql.ts';
import {
  createValhallaRecoveryController,
  createValhallaRegistryReader,
} from '../routing/valhalla-registry.ts';
import { createCamsJobVerifier } from '../scoring/air/cams.source.ts';
import { recordSnapshotExecution, trackCamsAttempts } from './recovery.db.ts';
import { createReplicaInspector } from './replica-inspector.ts';
import { createSnapshotStatusServer } from './serve-snapshot-status.ts';

const databaseUrl = process.env.DATABASE_URL;
const readerToken = randomUUID();
const upstreamToken = randomUUID();
const fenceToken = randomUUID();

async function listen(server: Server) {
  await once(server.listen(0, '127.0.0.1'), 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No loopback listener');
  return `http://127.0.0.1:${address.port}`;
}

describe('serve snapshot status', () => {
  it.skipIf(!databaseUrl)('reads each service without unlocking a run', async () => {
    const sql = createSql(databaseUrl ?? '');
    const runId = randomUUID();
    const legacyId = randomUUID();
    const ledgerId = randomUUID();
    const replicaId = randomUUID();
    let replicaState = 'active';
    let restartExcluded = false;
    let routedLedger = ledgerId;
    let admission = 'open';
    let queued = 1;
    let adsStatus = 'running';
    let adsJobId = 'job-known';
    const upstreamCalls: string[] = [];
    const upstream = createServer((request, response) => {
      const path = request.url ?? '';
      upstreamCalls.push(`${request.method} ${path}`);
      if (request.method === 'PUT' && path === `/router/runs/${runId}/fence`) {
        if (request.headers.authorization !== `Bearer ${fenceToken}`) {
          response.writeHead(401).end();
          return;
        }
        response.end(
          JSON.stringify({
            run_id: runId,
            ledger_id: ledgerId,
            state: 'drained',
            admission: 'fenced',
            queued: 0,
            running: 0,
            drained: true,
          }),
        );
        return;
      }
      if (request.method !== 'GET') {
        response.writeHead(405).end();
        return;
      }
      if (
        request.headers.authorization !== `Bearer ${upstreamToken}` &&
        request.headers['private-token'] !== upstreamToken
      ) {
        response.writeHead(401).end();
        return;
      }
      if (path === `/replica/runs/${runId}`) {
        response.end(
          JSON.stringify({
            run_id: runId,
            replica_id: replicaId,
            state: replicaState,
            children_stopped: true,
            restart_excluded: restartExcluded,
          }),
        );
      } else if (
        path === `/router/runs/${runId}` &&
        request.headers['x-valhalla-ledger'] === ledgerId
      ) {
        response.end(
          JSON.stringify({
            run_id: runId,
            ledger_id: routedLedger,
            admission,
            state: queued > 0 ? 'busy' : admission === 'fenced' ? 'drained' : 'idle',
            queued,
            running: 0,
            drained: admission === 'fenced' && queued === 0,
          }),
        );
      } else if (path === '/ads/retrieve/v1/jobs/job-known') {
        response.end(JSON.stringify({ jobID: adsJobId, status: adsStatus }));
      } else {
        response.writeHead(404).end();
      }
    });
    const upstreamUrl = await listen(upstream);
    const status = createSnapshotStatusServer({
      sql,
      token: readerToken,
      readers: {
        replica: createReplicaInspector(`${upstreamUrl}/replica`, upstreamToken),
        valhalla: createValhallaRegistryReader(`${upstreamUrl}/router`, upstreamToken),
        ads: createCamsJobVerifier(`${upstreamUrl}/ads`, upstreamToken),
      },
    });
    try {
      await sql`
        insert into public.score_snapshots (id, scoring_version_id, period, status, finished_at, error_code)
        select fixture.id, v.id, '2026-11-01', 'failed', now(), 'test_fixture'
        from public.scoring_versions v
        cross join (values (${runId}::uuid), (${legacyId}::uuid)) fixture(id)
        where v.kind = 'online' and v.is_active
      `;
      await recordSnapshotExecution(sql, runId, replicaId, `${upstreamUrl}/router`, ledgerId);
      const record = trackCamsAttempts(sql, runId);
      await (
        await record(`${upstreamUrl}/ads`)
      )('job-known');
      const url = await listen(status);
      const auth = { authorization: `Bearer ${readerToken}` };
      const path = `${url}/runs/${runId}`;
      const read = async (target: string) => {
        const response = await fetch(target, { headers: auth });
        expect(response.status).toBe(200);
        expect(response.headers.get('Cache-Control')).toBe('no-store');
        return response.json();
      };
      expect((await fetch(path)).status).toBe(401);
      expect((await fetch(path, { method: 'POST', headers: auth })).status).toBe(405);
      expect(upstreamCalls).toHaveLength(0);
      const unknownState = { state: 'unknown' };
      expect(await read(`${url}/runs/${legacyId}`)).toMatchObject({
        worker: unknownState,
        valhalla: unknownState,
        ads: unknownState,
        work_ended: false,
      });
      expect(upstreamCalls).toHaveLength(0);
      const active = { state: 'active' };
      expect(await read(path)).toMatchObject({
        run_id: runId,
        worker: active,
        valhalla: active,
        ads: active,
        work_ended: false,
      });

      replicaState = 'stopped';
      admission = 'fenced';
      queued = 0;
      adsStatus = 'successful';
      const stopped = { state: 'stopped' };
      expect(await read(path)).toMatchObject({
        worker: unknownState,
        valhalla: stopped,
        ads: unknownState,
        work_ended: false,
      });

      restartExcluded = true;
      routedLedger = randomUUID();
      adsJobId = 'job-wrong';
      expect(await read(path)).toMatchObject({
        worker: stopped,
        valhalla: unknownState,
        ads: unknownState,
        work_ended: false,
      });

      routedLedger = ledgerId;
      adsJobId = 'job-known';
      expect(await read(path)).toMatchObject({
        worker: stopped,
        valhalla: stopped,
        ads: stopped,
        work_ended: true,
      });
      await record(`${upstreamUrl}/ads`);
      expect(await read(path)).toMatchObject({
        worker: stopped,
        valhalla: stopped,
        ads: { state: 'unknown', reason: 'ads_job_identity_missing' },
        work_ended: false,
      });
      expect(upstreamCalls.every((call) => call.startsWith('GET '))).toBe(true);
      const wrongToken = createValhallaRecoveryController(
        `${upstreamUrl}/router`,
        upstreamToken,
        upstreamToken,
      );
      await expect(
        wrongToken.fenceAndCheck(runId, ledgerId, AbortSignal.timeout(500)),
      ).rejects.toThrow();
      const controller = createValhallaRecoveryController(
        `${upstreamUrl}/router`,
        upstreamToken,
        fenceToken,
      );
      await expect(
        controller.fenceAndCheck(runId, ledgerId, AbortSignal.timeout(500)),
      ).resolves.toBe(true);
      const [candidate] = await sql`select status from public.score_snapshots where id = ${runId}`;
      expect(candidate?.status).toBe('failed');
    } finally {
      status.close();
      upstream.close();
      await sql`delete from public.score_snapshots where id in (${runId}, ${legacyId})`;
      await sql.end({ timeout: 5 });
    }
  });
});
