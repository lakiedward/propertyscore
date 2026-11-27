import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { createSql } from '../db/sql.ts';

const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)('snapshot admission against the local database', () => {
  it('serializes admission with an old worker recording an unconfirmed ADS timeout', async () => {
    const sql = createSql(databaseUrl ?? '');
    const readyId = randomUUID();
    const cellId = randomUUID();
    let previousReady: string | undefined;
    let legacyId: string | undefined;
    const readActiveScores = () => sql`
      select s.id, s.stats, cs.overall, cs.categories
      from public.score_snapshots s
      join private.cell_scores cs on cs.snapshot_id = s.id
      where s.id = private.current_score_snapshot_id()
      order by cs.cell_id
    `;

    try {
      await sql.begin(async (transaction) => {
        const [previous] = await transaction<{ id: string }[]>`
          update public.score_snapshots set status = 'superseded' where status = 'ready' returning id
        `;
        previousReady = previous?.id;
        await transaction`
          insert into public.score_snapshots (id, scoring_version_id, period, status, finished_at, stats)
          select ${readyId}, id, '2099-01-01', 'ready', now(), '{"cities":{"timisoara":{"overall":{"scored":1}}}}'
          from public.scoring_versions where kind = 'online' and is_active
        `;
        await transaction`
          insert into private.grid_cells (id, city_id, cell_key, size_m, center, geometry)
          select ${cellId}, id, '175:999999:999999', 175,
            'SRID=4326;POINT(21.20 45.75)', 'SRID=4326;POLYGON((21.19 45.74,21.21 45.74,21.21 45.76,21.19 45.76,21.19 45.74))'
          from public.cities where slug = 'timisoara'
        `;
        await transaction`
          insert into private.cell_scores (snapshot_id, cell_id, overall, categories)
          values (${readyId}, ${cellId}, 70, '{"green":70}')
        `;
        const [legacy] = await transaction<{ id: string }[]>`
          select private.start_score_snapshot('2099-02-01') as id
        `;
        legacyId = legacy?.id;
      });
      if (!legacyId) throw new Error('Legacy snapshot did not start');
      const candidateId = legacyId;

      const active = await readActiveScores();
      expect(active).toEqual([
        {
          id: readyId,
          overall: 70,
          categories: { green: 70 },
          stats: { cities: { timisoara: { overall: { scored: 1 } } } },
        },
      ]);
      const expectStartRejected = async (message: string) => {
        await expect(sql`select private.start_score_snapshot('2099-03-01')`).rejects.toMatchObject({
          code: 'P0001',
          message,
        });
        await expect(
          sql`select private.start_score_snapshot('2099-03-01', true)`,
        ).rejects.toMatchObject({ code: 'P0001', message });
      };

      await sql.begin(async (failure) => {
        await failure`select private.fail_score_snapshot(${candidateId}, 'cams_job_timeout')`;
        expect(
          await sql`
          select status, routing_pending from public.score_snapshots where id = ${candidateId}
        `,
        ).toEqual([{ status: 'building', routing_pending: false }]);
        await expectStartRejected('snapshot_already_building');
        expect(await readActiveScores()).toEqual(active);
      });

      await expectStartRejected('snapshot_routing_unconfirmed');
      expect(
        await sql`
        select status, error_code, routing_pending from public.score_snapshots where id = ${candidateId}
      `,
      ).toEqual([{ status: 'failed', error_code: 'cams_job_timeout', routing_pending: true }]);
      expect(await readActiveScores()).toEqual(active);
    } finally {
      try {
        await sql.begin(async (transaction) => {
          await transaction`delete from public.score_snapshots where id in (${readyId}, ${legacyId ?? readyId})`;
          await transaction`delete from private.grid_cells where id = ${cellId}`;
          if (previousReady) {
            await transaction`update public.score_snapshots set status = 'ready' where id = ${previousReady}`;
          }
        });
      } finally {
        await sql.end({ timeout: 5 });
      }
    }
  });
});
