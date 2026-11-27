import { expect, it } from 'vitest';

import { createSnapshotSql, createSql } from '../db/sql.ts';
import { startSnapshot } from './snapshot.db.ts';

const databaseUrl = process.env.DATABASE_URL;

it.skipIf(!databaseUrl)(
  'recovers after losing the build session without replacing the ready snapshot',
  async () => {
    const sql = createSql(databaseUrl ?? '');
    const owner = createSnapshotSql(databaseUrl ?? '');
    const retry = createSnapshotSql(databaseUrl ?? '');
    const created: string[] = [];

    try {
      const [ready] = await sql<{ id: string | null }[]>`
      select private.current_score_snapshot_id() as id
    `;
      let readyId = ready?.id;
      if (!readyId) {
        const [fixture] = await sql<{ id: string }[]>`
        insert into public.score_snapshots (scoring_version_id, period, status, finished_at)
        select id, '2026-11-01', 'ready', now()
        from public.scoring_versions where kind = 'online' and is_active
        returning id
      `;
        if (!fixture) throw new Error('Missing active formula');
        readyId = fixture.id;
        created.push(readyId);
      }

      const interrupted = await startSnapshot(owner, '2026-12-01');
      created.push(interrupted.snapshotId);
      const alreadyBuilding = { code: 'P0001', message: 'snapshot_already_building' };

      await sql`
      update public.score_snapshots set started_at = now() - interval '13 hours'
      where id = ${interrupted.snapshotId}
    `;
      await expect(startSnapshot(retry, '2026-12-01')).rejects.toMatchObject(alreadyBuilding);
      await expect(startSnapshot(owner, '2026-12-01')).rejects.toMatchObject(alreadyBuilding);
      await expect(sql`select private.start_score_snapshot('2026-12-01')`).rejects.toMatchObject(
        alreadyBuilding,
      );

      await sql`
      update public.score_snapshots set started_at = now() where id = ${interrupted.snapshotId}
    `;
      const [session] = await owner<{ pid: number }[]>`select pg_backend_pid() as pid`;
      if (!session) throw new Error('Missing build session');
      const [terminated] = await sql<{ ok: boolean }[]>`
      select pg_terminate_backend(${session.pid}, 5000) as ok
    `;
      expect(terminated?.ok).toBe(true);

      const replacement = await startSnapshot(retry, '2026-12-01');
      created.push(replacement.snapshotId);
      await expect(owner`select pg_backend_pid()`).rejects.toThrow();
      const [state] = await sql<
        {
          status: string;
          error_code: string;
          ready_id: string;
          replacement_status: string;
        }[]
      >`
      select status, error_code, private.current_score_snapshot_id() as ready_id,
        (select status from public.score_snapshots where id = ${replacement.snapshotId}) as replacement_status
      from public.score_snapshots where id = ${interrupted.snapshotId}
    `;
      expect(state).toEqual({
        status: 'failed',
        error_code: 'abandoned',
        ready_id: readyId,
        replacement_status: 'building',
      });
    } finally {
      await Promise.all([owner.end({ timeout: 5 }), retry.end({ timeout: 5 })]);
      try {
        if (created.length > 0)
          await sql`delete from public.score_snapshots where id in ${sql(created)}`;
      } finally {
        await sql.end({ timeout: 5 });
      }
    }
  },
);
