import { randomUUID } from 'node:crypto';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { createSnapshotResumeConnection, createSql, type Sql } from '../db/sql.ts';
import { createLogger } from '../lib/logger.ts';
import type { ScoreModule } from '../scoring/score-module.ts';
import { downloadCamsMonth } from '../scoring/air/cams.source.ts';
import { listStationFiles } from '../scoring/air/stations.source.ts';
import { downloadOnce, SourceUnavailableError } from '../sources/download.ts';
import { cityBoundingBox, osmExtractPath } from '../sources/osm.ts';
import { limitCoveredCities } from '../test/coverage-fixture.ts';
import { hasOsmium, prepareSourcesDir } from '../test/osm-fixture.ts';
import { writeCategoryScores } from '../scoring/write-category-scores.ts';
import { buildCheckpointedSnapshot } from './build-checkpointed-snapshot.ts';
import { buildSnapshot, selectModules } from './build-snapshot.ts';
import { readSnapshotProgress, readSnapshotRequests } from './resume-journal.ts';

const silentLogger = createLogger('error', () => undefined);

const fakeGreenModule: ScoreModule = {
  key: 'green',
  run: async ({ sql, snapshotId, cellSizeM }) => {
    const cells = await sql<{ cell_id: string; position: number }[]>`
      with reference as (
        select private.find_grid_cell(d.location, ${cellSizeM}) as cell_id
        from private.key_destinations d
        join public.cities c on c.id = d.city_id
        where c.slug = 'sibiu' and d.kind = 'station' and d.is_active
      )
      select cs.cell_id, (row_number() over (order by (cs.cell_id = r.cell_id) desc, cs.cell_id) - 1)::integer as position
      from private.cell_scores cs cross join reference r
      where cs.snapshot_id = ${snapshotId}
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
  let restoreCoverage: (() => Promise<void>) | undefined;
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
    restoreCoverage = await limitCoveredCities(sql, 'sibiu');
  });

  afterAll(async () => {
    await restoreCoverage?.();
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
      osmExtract: { url: 'https://example.test/romania.osm.pbf', apiKey: null },
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
      categories: { green: { avg: 80, no_data: Math.floor(result.cells / 2) } },
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

  it('resumes a real local snapshot without rerunning its grid, cached route or accepted ADS job', async () => {
    const database = databaseUrl ?? '';
    const [active] = await sql<
      { id: string | null }[]
    >`select private.current_score_snapshot_id() as id`;
    if (!active?.id) {
      const [ready] = await sql<{ id: string }[]>`
        insert into public.score_snapshots (scoring_version_id, period, status, finished_at)
        select id, '2026-10-01', 'ready', now()
        from public.scoring_versions where kind = 'online' and is_active
        returning id
      `;
      if (!ready) throw new Error('Missing ready fixture');
      created.push(ready.id);
      if (active) active.id = ready.id;
    }
    const ledgerId = randomUUID();
    const replicaId = 'test-replica';
    const runs = new Set<string>();
    const routingRequests: string[] = [];
    let adsSubmissions = 0;
    let sourceReads = 0;
    let stationReads = 0;
    const stationFile = 'https://sources.example.test/station.parquet';
    let observation = 'active';
    const period = '2026-11-01';
    const extract = await readFile(osmExtractPath(sourcesDir, period));
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string, init?: RequestInit): Response => {
        const url = new URL(input);
        if (url.hostname === 'sources.example.test') {
          sourceReads++;
          if (url.pathname === '/missing') return new Response(null, { status: 404 });
          if (url.href === stationFile) return new Response('test-station');
          return new Response(extract);
        }
        if (url.hostname === 'eeadmz1-downloads-api-appservice.azurewebsites.net') {
          stationReads++;
          return new Response(stationFile);
        }
        if (url.hostname === 'observer.example.test') {
          return Response.json({
            run_id: url.pathname.split('/')[2],
            replica_id: replicaId,
            state: observation,
            children_stopped: observation === 'stopped',
            restart_excluded: observation === 'stopped',
          });
        }
        if (url.hostname === 'valhalla.example.test') {
          const [, , runId, action] = url.pathname.split('/');
          if (!runId) throw new Error('Missing run');
          if (init?.method === 'PUT') {
            if (action !== 'fence') runs.add(runId);
            return Response.json({
              run_id: runId,
              ledger_id: ledgerId,
              state: action === 'fence' ? 'drained' : 'idle',
              admission: action === 'fence' ? 'fenced' : 'open',
              queued: 0,
              running: 0,
            });
          }
          routingRequests.push(new Headers(init?.headers).get('x-propertyscore-request') ?? '');
          expect(new Headers(init?.headers).get('x-valhalla-ledger')).toBe(ledgerId);
          return Response.json({
            trip: { summary: { length: 0.1, time: 12 }, legs: [{ shape: 'test-polyline' }] },
          });
        }
        if (url.hostname === 'ads.example.test') {
          if (url.pathname.endsWith('/execution')) {
            adsSubmissions++;
            return Response.json({ jobID: 'accepted-ads-job', status: 'accepted' });
          }
          if (url.pathname.endsWith('/results')) {
            return Response.json({ asset: { value: { href: 'https://ads.example.test/asset' } } });
          }
          if (url.pathname === '/asset') return new Response('test-cams-raster');
          return observation === 'stopped'
            ? Response.json({ status: 'successful' })
            : new Response(null, { status: 503 });
        }
        throw new Error('Unexpected test fixture endpoint');
      }),
    );

    const green = vi.fn(fakeGreenModule.run);
    const air: ScoreModule = {
      key: 'air',
      async run(context) {
        const route = {
          origin: { lat: 45.79, lng: 24.12 },
          destination: { lat: 45.8, lng: 24.13 },
          costing: 'auto' as const,
        };
        expect(
          await Promise.all([context.router?.route(route), context.router?.route(route)]),
        ).toEqual(
          Array.from({ length: 2 }, () => ({
            meters: 100,
            seconds: 12,
            polyline6: 'test-polyline',
          })),
        );
        expect(context.camsCheckpoint).toBeDefined();
        expect(
          await listStationFiles({
            dataset: 'eea_e1a',
            countryCode: 'RO',
            pollutants: ['pm25'],
            start: '2026-10-01',
            end: period,
          }),
        ).toEqual([stationFile]);
        const stationPath = join(context.sourcesDir, 'station.parquet');
        await expect(
          Promise.all([
            downloadOnce(stationFile, stationPath),
            downloadOnce(stationFile, stationPath),
          ]),
        ).resolves.toEqual([stationPath, stationPath]);
        await expect(
          downloadOnce('https://sources.example.test/missing', join(context.sourcesDir, 'missing')),
        ).rejects.toBeInstanceOf(SourceUnavailableError);
        const file = await downloadCamsMonth({
          apiUrl: 'https://ads.example.test/api',
          apiKey: 'test-key',
          pollutant: 'pm25',
          month: '2026-10-01',
          sourcesDir: context.sourcesDir,
          checkpoint: context.camsCheckpoint,
          sleep: () => Promise.resolve(),
        });
        expect(await readFile(file, 'utf8')).toBe('test-cams-raster');
        return { sourceDates: { cams: '2026-10-01' } };
      },
    };
    const settings = {
      SNAPSHOT_SESSION_DATABASE_URL: database,
      SNAPSHOT_INPUT_REVISION: 'a'.repeat(64),
      SNAPSHOT_REPLICA_ID: replicaId,
      SNAPSHOT_VALHALLA_URL: 'https://valhalla.example.test',
      SNAPSHOT_VALHALLA_CONTROL_TOKEN: 'c'.repeat(64),
      SNAPSHOT_VALHALLA_ROUTING_TOKEN: 'r'.repeat(64),
      SNAPSHOT_REPLICA_INSPECTOR_URL: 'https://observer.example.test',
      SNAPSHOT_REPLICA_INSPECTOR_TOKEN: 'o'.repeat(32),
    };
    const options = {
      modules: [{ ...fakeGreenModule, run: green }, air],
      period,
      citySlugs: [],
      scoreKeys: [],
      sourcesDir,
      sourceConfiguration: [],
      settings,
      osmExtract: { url: 'https://sources.example.test/osm.pbf', apiKey: null },
      ads: { apiUrl: 'https://ads.example.test/api', apiKey: 'test-key' },
      signal: new AbortController().signal,
      logger: silentLogger,
    };
    const run = async (resumeId: string | null) => {
      const connection = createSnapshotResumeConnection(database, () => undefined);
      try {
        return await buildCheckpointedSnapshot({ ...options, resumeId, sql: connection });
      } finally {
        await connection.end({ timeout: 0 });
      }
    };

    try {
      await expect(run(null)).rejects.toMatchObject({ code: 'cams_request_failed' });
      const [interrupted] = await sql<{ id: string }[]>`
        select id from public.score_snapshots where status = 'building'
      `;
      if (!interrupted) throw new Error('Missing interrupted snapshot');
      created.push(interrupted.id);
      expect(await sql`select private.current_score_snapshot_id() as id`).toEqual([active]);
      await expect(run(interrupted.id)).rejects.toMatchObject({
        code: 'snapshot_stop_unconfirmed',
      });
      expect(runs.size).toBe(1);

      observation = 'stopped';
      const resumed = await run(interrupted.id);
      expect(resumed).toMatchObject({ snapshotId: interrupted.id, scores: ['green', 'air'] });
      const progress = await readSnapshotProgress(sql, interrupted.id);
      expect(progress).toMatchObject({
        snapshot_status: 'ready',
        routing_pending: false,
        requests: { accepted: 0, failed: 1, succeeded: 5 },
      });
      expect(progress?.generations).toHaveLength(2);
      expect(progress?.steps.map((step) => step.completed_by)).toEqual([
        progress?.generations[0]?.id,
        progress?.generations[0]?.id,
        progress?.generations[0]?.id,
        progress?.generations[1]?.id,
      ]);
      const requests = await readSnapshotRequests(sql, interrupted.id, null);
      expect(routingRequests).toEqual([
        requests.find((request) => request.provider === 'valhalla')?.id,
      ]);
      expect(adsSubmissions).toBe(1);
      expect(sourceReads).toBe(3);
      expect(stationReads).toBe(1);
      expect(requests.find(({ step_key }) => step_key === 'source:osm')).toMatchObject({
        step_key: 'source:osm',
        state: 'succeeded',
        artifact_sha256: expect.stringMatching(/^[a-f0-9]{64}$/) as unknown,
      });
      expect(green).toHaveBeenCalledOnce();
      expect(await sql`select private.current_score_snapshot_id() as id`).toEqual([
        { id: interrupted.id },
      ]);
    } finally {
      vi.unstubAllGlobals();
    }
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

  it('logs the city selection and refuses a partial one before starting a snapshot', async () => {
    const lines: string[] = [];
    const [before] = await sql<
      { count: number }[]
    >`select count(*)::int as count from public.score_snapshots`;
    await expect(
      buildSnapshot({
        sql,
        modules: [fakeGreenModule],
        period: '2026-11-01',
        citySlugs: ['sibiu', 'timisoara'],
        scoreKeys: [],
        sourcesDir,
        osmExtract: { url: 'https://example.test/romania.osm.pbf', apiKey: null },
        router: null,
        logger: createLogger('info', (line) => lines.push(line)),
      }),
    ).rejects.toMatchObject({ code: 'snapshot_partial_city_selection' });
    const [after] = await sql<
      { count: number }[]
    >`select count(*)::int as count from public.score_snapshots`;
    expect(after?.count).toBe(before?.count);
    expect(lines.map((line) => JSON.parse(line) as Record<string, unknown>)).toContainEqual(
      expect.objectContaining({
        message: 'snapshot cities selected',
        city_filter: 'sibiu,timisoara',
        selected: 'sibiu',
        unknown: 'timisoara',
      }),
    );
  });

  it('refuses a selection that leaves out a covered city before starting a snapshot', async () => {
    const lines: string[] = [];
    await sql`update public.cities set has_online_coverage = true where slug = 'timisoara'`;
    try {
      const [before] = await sql<
        { count: number }[]
      >`select count(*)::int as count from public.score_snapshots`;
      await expect(
        buildSnapshot({
          sql,
          modules: [fakeGreenModule],
          period: '2026-11-01',
          citySlugs: ['sibiu'],
          scoreKeys: [],
          sourcesDir,
          osmExtract: { url: 'https://example.test/romania.osm.pbf', apiKey: null },
          router: null,
          logger: createLogger('info', (line) => lines.push(line)),
        }),
      ).rejects.toMatchObject({ code: 'snapshot_partial_city_selection' });
      const [after] = await sql<
        { count: number }[]
      >`select count(*)::int as count from public.score_snapshots`;
      expect(after?.count).toBe(before?.count);
      expect(lines.map((line) => JSON.parse(line) as Record<string, unknown>)).toContainEqual(
        expect.objectContaining({
          message: 'snapshot cities selected',
          city_filter: 'sibiu',
          covered_cities: 2,
          selected_cities: 1,
          selected: 'sibiu',
          missing: 'timisoara',
          unknown: '',
        }),
      );
    } finally {
      await sql`update public.cities set has_online_coverage = false where slug = 'timisoara'`;
    }
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
        osmExtract: { url: 'https://example.test/romania.osm.pbf', apiKey: null },
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
