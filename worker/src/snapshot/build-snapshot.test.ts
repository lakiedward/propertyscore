import { rm } from 'node:fs/promises';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createSql, type Sql } from '../db/sql.ts';
import { createLogger } from '../lib/logger.ts';
import type { ScoreModule } from '../scoring/score-module.ts';
import { cityBoundingBox } from '../sources/osm.ts';
import { hasOsmium, prepareSourcesDir } from '../test/osm-fixture.ts';
import { writeCategoryScores } from '../scoring/write-category-scores.ts';
import { buildSnapshot, selectModules } from './build-snapshot.ts';

const silentLogger = createLogger('error', () => undefined);

const fakeGreenModule: ScoreModule = {
  key: 'green',
  run: async ({ sql, snapshotId }) => {
    const cells = await sql<{ cell_id: string; position: number }[]>`
      select cell_id, (row_number() over (order by cell_id))::integer as position
      from private.cell_scores
      where snapshot_id = ${snapshotId}
    `;
    await writeCategoryScores(
      sql,
      snapshotId,
      'green',
      cells.map((cell) => ({
        cellId: cell.cell_id,
        score: cell.position % 2 === 0 ? 80 : null,
        inputs: { share_500: 0.2 },
      })),
    );
    return { sourceDates: { osm: '2026-11-01' } };
  },
};

describe('selectModules', () => {
  const air: ScoreModule = { key: 'air', run: () => Promise.resolve({ sourceDates: {} }) };

  it('runs every module when no score is named', () => {
    expect(selectModules([fakeGreenModule, air], [])).toEqual([fakeGreenModule, air]);
  });

  it('keeps only the named scores and refuses a score without a module', () => {
    expect(selectModules([fakeGreenModule, air], ['air'])).toEqual([air]);
    expect(() => selectModules([air], ['green'])).toThrow(
      expect.objectContaining({ code: 'score_module_missing' }),
    );
  });
});

const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!databaseUrl || !hasOsmium())('buildSnapshot against the local database', () => {
  let sql: Sql;
  let previousReady: string | undefined;
  let hadSibiuCells = false;
  let sourcesDir = '';
  const created: string[] = [];

  beforeAll(async () => {
    sql = createSql(databaseUrl ?? '');
    sourcesDir = await prepareSourcesDir('sibiu.osm', '2026-11-01');
    const [ready] = await sql<{ id: string }[]>`
      select id from public.score_snapshots where status = 'ready'
    `;
    previousReady = ready?.id;
    const [cells] = await sql<{ has_cells: boolean }[]>`
      select exists (
        select 1 from private.grid_cells g
        join public.cities c on c.id = g.city_id
        where c.slug = 'sibiu'
      ) as has_cells
    `;
    hadSibiuCells = cells?.has_cells ?? false;
  });

  afterAll(async () => {
    if (created.length > 0) {
      await sql`delete from public.score_snapshots where id in ${sql(created)}`;
    }
    if (!hadSibiuCells) {
      await sql`
        delete from private.grid_cells
        where city_id = (select id from public.cities where slug = 'sibiu')
      `;
    }
    if (previousReady) {
      await sql`
        update public.score_snapshots set status = 'ready' where id = ${previousReady}
      `;
    }
    await sql.end({ timeout: 5 });
    await rm(sourcesDir, { recursive: true, force: true });
  });

  it('publishes a snapshot with the module scores, zone scores and city stats', async () => {
    const result = await buildSnapshot({
      sql,
      modules: [fakeGreenModule],
      period: '2026-11-01',
      citySlugs: ['sibiu'],
      scoreKeys: [],
      sourcesDir,
      osmExtractUrl: 'https://example.test/romania.osm.pbf',
      router: null,
      logger: silentLogger,
    });
    created.push(result.snapshotId);

    expect(result).toMatchObject({ cities: 1, scores: ['green'] });
    expect(result.cells).toBeGreaterThan(500);

    const [snapshot] = await sql<
      { status: string; source_dates: Record<string, string>; sibiu: Record<string, unknown> }[]
    >`
      select status, source_dates, stats -> 'cities' -> 'sibiu' as sibiu
      from public.score_snapshots
      where id = ${result.snapshotId}
    `;
    expect(snapshot?.status).toBe('ready');
    expect(snapshot?.source_dates).toEqual({ osm: '2026-11-01' });
    expect(snapshot?.sibiu).toMatchObject({
      cells: result.cells,
      categories: { green: { avg: 80, no_data: Math.ceil(result.cells / 2) } },
    });
    const residentialCells = Number(snapshot?.sibiu.residential_cells);
    expect(residentialCells).toBeGreaterThan(10);
    expect(residentialCells).toBeLessThan(result.cells / 4);

    const overall = await sql<{ overall: number | null; green: number | null }[]>`
      select overall, (categories ->> 'green')::int as green
      from private.cell_scores
      where snapshot_id = ${result.snapshotId}
    `;
    expect(overall.every((row) => row.overall === row.green)).toBe(true);
  });

  it('gives a score module the box around a city coverage area', async () => {
    const [sibiu] = await sql<{ id: string }[]>`select id from public.cities where slug = 'sibiu'`;
    const box = await cityBoundingBox(sql, sibiu?.id ?? '');

    expect(box.west).toBeLessThan(24.12558);
    expect(box.east).toBeGreaterThan(24.12558);
    expect(box.south).toBeLessThan(45.79833);
    expect(box.north).toBeGreaterThan(45.79833);
    expect(box.east - box.west).toBeLessThan(0.2);
  });

  it('marks the snapshot failed with the module error code', async () => {
    const failing: ScoreModule = {
      key: 'air',
      run: () => Promise.reject(Object.assign(new Error('source_missing'), { code: 'P0001' })),
    };

    await expect(
      buildSnapshot({
        sql,
        modules: [failing],
        period: '2026-11-01',
        citySlugs: ['sibiu'],
        scoreKeys: [],
        sourcesDir,
        osmExtractUrl: 'https://example.test/romania.osm.pbf',
        router: null,
        logger: silentLogger,
      }),
    ).rejects.toThrow('source_missing');

    const [failed] = await sql<{ id: string; error_code: string }[]>`
      select id, error_code from public.score_snapshots
      where status = 'failed'
      order by created_at desc
      limit 1
    `;
    if (failed) created.push(failed.id);
    expect(failed?.error_code).toBe('source_missing');
  });
});
