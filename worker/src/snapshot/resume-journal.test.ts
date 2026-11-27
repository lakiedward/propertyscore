import { createHash, randomUUID } from 'node:crypto';

import { describe, expect, it, vi } from 'vitest';

import { createSnapshotResumeConnection, createSql } from '../db/sql.ts';
import {
  claimSnapshotResume,
  createSnapshotJournal,
  readSnapshotProgress,
  readSnapshotRequests,
  startSnapshotProgress,
} from './resume-journal.ts';
import {
  summarizeSnapshotProgress,
  verifyRequestReceipt,
  type RecoveryProof,
} from './resume-plan.ts';
import { runCheckpointedRequest } from './resume-request.ts';
import { runMissingSnapshotSteps } from './resume-steps.ts';

const databaseUrl = process.env.DATABASE_URL;
const sha256 = (value: Uint8Array | string) => createHash('sha256').update(value).digest('hex');

describe.skipIf(!databaseUrl)('Smart Check checkpoint recovery against local Postgres', () => {
  it('keeps completed work, rejects duplicate admissions and reconciles a lost job ID', async () => {
    const database = databaseUrl ?? '';
    const reader = createSql(database);
    const old = createSnapshotResumeConnection(database, () => undefined);
    const next = createSnapshotResumeConnection(database, () => undefined);
    const competing = createSnapshotResumeConnection(database, () => undefined);
    const gridKey = `grid:${randomUUID()}`;
    const scoreKey = 'score:air';
    const plan = { sha256: sha256('fixed inputs and worker version'), steps: [gridKey, scoreKey] };
    const valhallaLedgerId = randomUUID();
    const readyFixture = randomUUID();
    await reader`
      insert into public.score_snapshots (id, scoring_version_id, period, status, finished_at, stats)
      select ${readyFixture}, id, '2099-02-01', 'ready', now(), '{"ready_fixture":true}'
      from public.scoring_versions where kind = 'online' and is_active
        and private.current_score_snapshot_id() is null
    `;
    const active = () => reader`
      select id, stats from public.score_snapshots where id = private.current_score_snapshot_id()
    `;
    const originalActive = await active();
    expect(originalActive).toHaveLength(1);
    const work = {
      provider: 'ads',
      operationKey: 'pm25:2099-03',
      fingerprint: sha256('ADS CAMS account, dataset, pollutant and month'),
    } as const;
    const lost = { ...work, operationKey: 'no2:2099-03', fingerprint: sha256('different inputs') };
    const pm25 = new Uint8Array([1, 2, 3]);
    const no2 = new Uint8Array([4, 5, 6]);
    const stored = new Map<string, Uint8Array>();
    const artifacts = {
      read: (hash: string) => Promise.resolve(stored.get(hash) ?? null),
      store: (hash: string, bytes: Uint8Array) => {
        stored.set(hash, bytes);
        return Promise.resolve();
      },
    };
    const pmProvider = {
      submit: vi.fn(() => Promise.resolve('ads-known-job')),
      wait: vi.fn(() => Promise.resolve(pm25)),
    };
    const no2Provider = {
      submit: vi.fn(() => Promise.reject(new Error('response lost after submit'))),
      wait: vi.fn(() => Promise.resolve(no2)),
    };
    const signal = new AbortController().signal;
    const grid = vi.fn(() => Promise.resolve({ cells: 16 }));
    const score = vi.fn(async (journal: Parameters<typeof runCheckpointedRequest>[0]) => {
      const resultPm25 = await runCheckpointedRequest(
        journal,
        scoreKey,
        work,
        pmProvider,
        artifacts,
        signal,
      );
      await expect(
        journal.beginRequest(scoreKey, { ...work, fingerprint: lost.fingerprint }),
      ).rejects.toMatchObject({ code: 'snapshot_request_changed' });
      const resultNo2 = await runCheckpointedRequest(
        journal,
        scoreKey,
        lost,
        no2Provider,
        artifacts,
        signal,
      );
      return { points: resultPm25.length + resultNo2.length, source_dates: { cams: '2099-03' } };
    });
    const steps = [
      { key: gridKey, run: grid },
      { key: scoreKey, run: score },
    ];
    let snapshotId: string | undefined;

    try {
      const snapshot = await startSnapshotProgress({
        sql: old,
        period: '2099-04-01',
        plan,
        replicaId: 'old-worker',
      });
      snapshotId = snapshot.snapshotId;
      const registered = snapshot.executionId;
      const oldJournal = createSnapshotJournal(old, snapshotId, registered);
      await oldJournal.recordValhallaLedger(valhallaLedgerId);
      await expect(runMissingSnapshotSteps(steps, oldJournal, signal)).rejects.toThrow(
        'response lost',
      );
      expect(await readSnapshotProgress(reader, snapshotId)).toMatchObject({
        routing_pending: true,
        generations: [{ id: registered }],
        steps: [
          { key: gridKey, completed_by: registered },
          { key: scoreKey, completed_by: null },
        ],
        requests: { unconfirmed: 1, accepted: 0, succeeded: 1 },
      });
      const previous = (await readSnapshotProgress(reader, snapshotId))?.generations[0];
      if (!previous) throw new Error('execution fixture missing');
      const proof: RecoveryProof = {
        worker: {
          executionId: registered,
          replicaId: 'old-worker',
          state: 'stopped',
          childrenStopped: true,
          restartExcluded: true,
        },
        valhalla: {
          runId: registered,
          ledgerId: valhallaLedgerId,
          admission: 'fenced',
          state: 'drained',
          queued: 0,
          running: 0,
        },
      };
      const resume = {
        sql: next,
        snapshotId,
        plan,
        replicaId: 'new-worker',
        previous,
        proof,
        receipts: [],
      };
      await expect(claimSnapshotResume(resume)).rejects.toMatchObject({
        code: 'snapshot_guard_unconfirmed',
      });
      await old.end({ timeout: 0 });
      await expect(
        reader`select private.start_score_snapshot('2099-05-01', true)`,
      ).rejects.toMatchObject({ message: 'snapshot_routing_unconfirmed' });
      await expect(
        claimSnapshotResume({
          ...resume,
          proof: { ...proof, valhalla: { ...proof.valhalla, ledgerId: randomUUID() } },
        }),
      ).rejects.toMatchObject({ code: 'snapshot_stop_unconfirmed' });
      await expect(
        claimSnapshotResume({
          ...resume,
          plan: { ...plan, sha256: sha256('different input revision') },
        }),
      ).rejects.toMatchObject({ code: 'snapshot_plan_changed' });
      await expect(claimSnapshotResume(resume)).rejects.toMatchObject({
        code: 'snapshot_request_unconfirmed',
      });

      const page = await readSnapshotRequests(reader, snapshotId, null);
      expect(page).toHaveLength(2);
      expect(await readSnapshotRequests(reader, snapshotId, page[0]?.id ?? null)).toEqual(
        page.slice(1),
      );
      const request = page.find((entry) => entry.state === 'unconfirmed');
      if (!request) throw new Error('request fixture missing');
      expect(no2Provider.submit).toHaveBeenCalledWith(request.id, signal);
      const receipt = {
        provider: 'ads',
        upstreamId: 'ads-lost-job',
        fingerprint: request.fingerprint,
        correlationId: request.id,
        state: 'succeeded',
        artifactSha256: sha256(no2),
      } as const;
      expect(verifyRequestReceipt(request, [{ ...receipt, correlationId: null }])).toBeNull();
      expect(
        verifyRequestReceipt(request, [receipt, { ...receipt, upstreamId: 'ambiguous' }]),
      ).toBeNull();
      const verified = verifyRequestReceipt(request, [receipt]);
      if (!verified) throw new Error('receipt fixture missing');
      stored.set(receipt.artifactSha256, no2);

      const [admissions] = await Promise.allSettled([
        claimSnapshotResume({ ...resume, receipts: [verified] }),
        claimSnapshotResume({ ...resume, sql: competing, receipts: [verified] }),
      ]).then((outcomes) => {
        expect(outcomes.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
        return outcomes
          .map((outcome, i) => ({ outcome, sql: i === 0 ? next : competing }))
          .filter(({ outcome }) => outcome.status === 'fulfilled');
      });
      if (admissions?.outcome.status !== 'fulfilled') throw new Error('resume not admitted');
      const executionId = admissions.outcome.value;
      const journal = createSnapshotJournal(admissions.sql, snapshotId, executionId);
      expect(executionId).not.toBe(registered);
      await journal.recordValhallaLedger(valhallaLedgerId);
      await expect(runMissingSnapshotSteps(steps, journal, signal)).resolves.toEqual(
        new Map([
          [gridKey, { cells: 16 }],
          [scoreKey, { points: 6, source_dates: { cams: '2099-03' } }],
        ]),
      );
      expect(grid).toHaveBeenCalledOnce();
      expect(score).toHaveBeenCalledTimes(2);
      expect(pmProvider.submit).toHaveBeenCalledOnce();
      expect(no2Provider.submit).toHaveBeenCalledOnce();
      expect(no2Provider.wait).not.toHaveBeenCalled();

      const progress = await readSnapshotProgress(reader, snapshotId);
      if (!progress) throw new Error('progress fixture missing');
      expect(summarizeSnapshotProgress(progress)).toMatchObject({
        pending_steps: [],
        requires_request_reconciliation: false,
        routing_pending: true,
        steps: [{ completed_by: registered }, { completed_by: executionId }],
      });
      expect(await active()).toEqual(originalActive);
    } finally {
      await Promise.all([
        old.end({ timeout: 0 }),
        next.end({ timeout: 0 }),
        competing.end({ timeout: 0 }),
      ]);
      if (snapshotId) await reader`delete from public.score_snapshots where id = ${snapshotId}`;
      await reader`delete from public.score_snapshots where id = ${readyFixture}`;
      await reader.end({ timeout: 0 });
    }
  });
});
