import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer, type ServerResponse } from 'node:http';
import { delimiter, join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { createSnapshotSql, createSql, type Sql } from '../db/sql.ts';
import { createLogger } from '../lib/logger.ts';
import { createValhallaClient } from '../routing/valhalla.ts';
import { runTransitRouting } from '../scoring/accessibility/routing.ts';
import type { ScoreModule } from '../scoring/score-module.ts';
import { cityBoundingBox } from '../sources/osm.ts';
import { limitCoveredCities } from '../test/coverage-fixture.ts';
import { hasOsmium, prepareSourcesDir } from '../test/osm-fixture.ts';
import { writeCategoryScores } from '../scoring/write-category-scores.ts';
import { buildSnapshot, selectModules } from './build-snapshot.ts';
import { startSnapshot } from './snapshot.db.ts';

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

  const localBuild = () => ({
    databaseUrl: databaseUrl ?? '',
    period: '2026-11-01',
    citySlugs: ['sibiu'],
    scoreKeys: [],
    sourcesDir,
    osmExtract: { url: 'https://example.test/romania.osm.pbf', apiKey: null },
    logger: silentLogger,
  });

  async function publishedScores() {
    return [
      ...(await sql<{ snapshot_id: string; cell_id: string; overall: number | null }[]>`
        select snapshot_id, cell_id, overall, categories from private.cell_scores
        where snapshot_id = private.current_score_snapshot_id()
        order by cell_id
      `),
    ];
  }

  async function publishedScoreFixture() {
    const recorded = await publishedScores();
    if (recorded.some((row) => row.overall !== null)) return recorded;
    const ready = await buildSnapshot({ ...localBuild(), modules: [fakeGreenModule] });
    created.push(ready.snapshotId);
    const populated = await publishedScores();
    expect(populated.some((row) => row.overall === 80)).toBe(true);
    return populated;
  }

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
      databaseUrl: databaseUrl ?? '',
      modules: [fakeGreenModule],
      period: '2026-11-01',
      citySlugs: ['sibiu'],
      scoreKeys: [],
      sourcesDir,
      osmExtract: { url: 'https://example.test/romania.osm.pbf', apiKey: null },
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

  it('gives a score module the box around a city coverage area', async () => {
    const [sibiu] = await sql<{ id: string }[]>`select id from public.cities where slug = 'sibiu'`;
    const box = await cityBoundingBox(sql, sibiu?.id ?? '');

    expect(box.west).toBeLessThan(24.12558);
    expect(box.east).toBeGreaterThan(24.12558);
    expect(box.south).toBeLessThan(45.79833);
    expect(box.north).toBeGreaterThan(45.79833);
    expect(box.east - box.west).toBeLessThan(0.2);
  });

  it.skipIf(process.platform === 'win32').each(['scoring', 'both'])(
    'stops a running transit child after losing %s SQL sessions before allowing a replacement',
    async (lostSessions) => {
      const bin = join(sourcesDir, `bin-${lostSessions}`);
      const routePidFile = join(bin, 'route.pid');
      await mkdir(bin);
      await writeFile(
        join(bin, 'python3'),
        [
          '#!/usr/bin/env node',
          "const { writeFileSync } = require('node:fs');",
          `writeFileSync(${JSON.stringify(routePidFile)}, String(process.pid));`,
          'setInterval(() => undefined, 1000);',
        ].join('\n'),
        { mode: 0o755 },
      );
      const published = await publishedScoreFixture();
      const owner = Promise.withResolvers<{ pid: number; snapshotId: string }>();
      const releaseBuild = Promise.withResolvers<undefined>();
      let routeHasStopped = false;
      const retry = createSnapshotSql(databaseUrl ?? '');
      vi.stubEnv('PATH', [bin, process.env.PATH ?? ''].join(delimiter));
      const old = buildSnapshot({
        ...localBuild(),
        modules: [
          {
            key: 'accessibility',
            run: async ({ sql: workerSql, snapshotId, signal, routingScope }) => {
              created.push(snapshotId);
              const [session] = await workerSql<{ pid: number }[]>`select pg_backend_pid() as pid`;
              if (!session) throw new Error('Missing build session');
              owner.resolve({ pid: session.pid, snapshotId });
              try {
                await runTransitRouting({
                  osmPbf: 'unused',
                  gtfs: [],
                  date: '2026-11-01',
                  windowStart: '07:45',
                  windowMinutes: 30,
                  detailDeparture: '08:00',
                  walkSpeedKmh: 4.5,
                  maxMinutes: 90,
                  maxRides: 3,
                  stopWalkMaxMinutes: 11,
                  origins: [],
                  stops: [],
                  destinations: [],
                  withMatrix: true,
                  withItineraries: false,
                  workDir: join(sourcesDir, `disconnect-routing-${lostSessions}`),
                  signal,
                  scope: routingScope,
                });
              } finally {
                routeHasStopped = true;
                await releaseBuild.promise;
              }
              return { sourceDates: {} };
            },
          },
        ],
      }).then(
        () => ({ error: null }),
        (error: unknown) => ({ error }),
      );
      let ownerPid: number | undefined;
      let childPid: number | undefined;
      try {
        const { pid, snapshotId } = await Promise.race([
          owner.promise,
          old.then(({ error }) => {
            throw new Error('Build ended before routing', { cause: error });
          }),
        ]);
        ownerPid = pid;
        await expect.poll(() => readFile(routePidFile, 'utf8')).toMatch(/^\d+$/);
        const routePid = Number(await readFile(routePidFile, 'utf8'));
        childPid = routePid;
        expect(process.kill(routePid, 0)).toBe(true);

        const sessions = await sql<{ pid: number }[]>`
          select pid from private.score_snapshot_lock_holders() holder(pid)
        `;
        expect(sessions).toHaveLength(2);
        const terminate = lostSessions === 'both' ? sessions.map((session) => session.pid) : [pid];
        const terminated = await sql<{ ok: boolean }[]>`
          select pg_terminate_backend(killed.pid, 5000) as ok
          from unnest(${sql.array(terminate)}::integer[]) killed(pid)
        `;
        expect(terminated.every((row) => row.ok)).toBe(true);
        ownerPid = undefined;
        await expect.poll(() => routeHasStopped).toBe(true);
        expect(() => process.kill(routePid, 0)).toThrow(expect.objectContaining({ code: 'ESRCH' }));
        childPid = undefined;
        await expect(startSnapshot(retry, '2026-11-01')).rejects.toMatchObject({
          message:
            lostSessions === 'both' ? 'snapshot_routing_unconfirmed' : 'snapshot_already_building',
        });
        expect(await publishedScores()).toEqual(published);

        releaseBuild.resolve(undefined);
        expect((await old).error).toMatchObject({ code: 'snapshot_connection_lost' });
        const replacement = await startSnapshot(retry, '2026-11-01');
        created.push(replacement.snapshotId);
        const [state] = await sql<{ status: string; error_code: string | null }[]>`
          select status, error_code from public.score_snapshots where id = ${snapshotId}
        `;
        expect(state).toEqual({ status: 'failed', error_code: 'abandoned' });
        expect(await publishedScores()).toEqual(published);
      } finally {
        releaseBuild.resolve(undefined);
        if (childPid !== undefined) {
          try {
            process.kill(childPid, 'SIGKILL');
          } catch (error) {
            expect(error).toMatchObject({ code: 'ESRCH' });
          }
        }
        if (ownerPid !== undefined) await sql`select pg_terminate_backend(${ownerPid}, 5000)`;
        await old;
        await retry.end({ timeout: 5 });
        vi.unstubAllEnvs();
      }
    },
  );

  it.each(['completed', 'unconfirmed'])(
    'stops sending Valhalla requests on disconnect and handles %s in-flight work',
    async (outcome) => {
      const published = await publishedScoreFixture();
      const responses: ServerResponse[] = [];
      const server = createServer((request, response) => {
        request.resume();
        responses.push(response);
      });
      await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
      });
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('Missing test router port');
      const owner = Promise.withResolvers<{
        pid: number;
        snapshotId: string;
        signal: AbortSignal;
      }>();
      let moduleEnded = false;
      const build = buildSnapshot({
        ...localBuild(),
        createRouter: (requestScope) =>
          createValhallaClient(`http://127.0.0.1:${address.port}`, {
            maxMatrixPairs: 1,
            requestScope,
          }),
        modules: [
          {
            key: 'fifteen_minute',
            run: async ({ sql: workerSql, snapshotId, router, signal }) => {
              created.push(snapshotId);
              const [session] = await workerSql<{ pid: number }[]>`select pg_backend_pid() as pid`;
              if (!session || !router || !signal) throw new Error('Missing routing test context');
              owner.resolve({ pid: session.pid, snapshotId, signal });
              const origin = { lng: 24.15, lat: 45.79 };
              const job = {
                costing: 'pedestrian' as const,
                sources: [origin],
                targets: [origin, origin],
              };
              try {
                await Promise.all([router.matrix(job), router.matrix(job)]);
              } finally {
                moduleEnded = true;
              }
              return { sourceDates: {} };
            },
          },
        ],
      }).then(
        () => ({ error: null }),
        (error: unknown) => ({ error }),
      );
      const retry = createSnapshotSql(databaseUrl ?? '');
      const reply = (response: ServerResponse | undefined) => {
        if (!response) throw new Error('Missing in-flight Valhalla request');
        response.end('{"sources_to_targets":[[{"distance":0.5,"time":400}]]}');
      };
      try {
        const { pid, snapshotId, signal } = await Promise.race([
          owner.promise,
          build.then(({ error }) => {
            throw new Error('Build ended before Valhalla', { cause: error });
          }),
        ]);
        await expect.poll(() => responses.length).toBe(2);
        const [terminated] = await sql<{ ok: boolean }[]>`
          select pg_terminate_backend(${pid}, 5000) as ok
        `;
        expect(terminated?.ok).toBe(true);
        await expect.poll(() => signal.aborted).toBe(true);
        reply(responses[0]);
        await expect.poll(() => moduleEnded).toBe(true);
        expect(responses).toHaveLength(2);
        expect(responses[1]?.destroyed).toBe(false);
        await expect(startSnapshot(retry, '2026-11-01')).rejects.toMatchObject({
          message: 'snapshot_already_building',
        });
        expect(await publishedScores()).toEqual(published);

        if (outcome === 'completed') {
          reply(responses[1]);
          expect((await build).error).toMatchObject({ code: 'snapshot_connection_lost' });
          const replacement = await startSnapshot(retry, '2026-11-01');
          created.push(replacement.snapshotId);
          const [state] = await sql<{ error_code: string | null }[]>`
            select error_code from public.score_snapshots where id = ${snapshotId}
          `;
          expect(state?.error_code).toBe('abandoned');
        } else {
          responses[1]?.destroy();
          expect((await build).error).toMatchObject({ code: 'snapshot_routing_unconfirmed' });
          await sql`
            update public.score_snapshots set started_at = now() - interval '13 hours'
            where id = ${snapshotId}
          `;
          await expect(startSnapshot(retry, '2026-11-01')).rejects.toMatchObject({
            message: 'snapshot_routing_unconfirmed',
          });
        }
        expect(responses).toHaveLength(2);
        expect(await publishedScores()).toEqual(published);
      } finally {
        server.closeAllConnections();
        await new Promise<void>((resolve) => server.close(() => resolve()));
        await build;
        await retry.end({ timeout: 5 });
        await sql`
          delete from public.score_snapshots where id in ${sql(created)}
            and routing_pending
        `;
      }
    },
  );

  it('logs the city selection and refuses a partial one before starting a snapshot', async () => {
    const lines: string[] = [];
    const [before] = await sql<
      { count: number }[]
    >`select count(*)::int as count from public.score_snapshots`;
    await expect(
      buildSnapshot({
        databaseUrl: databaseUrl ?? '',
        modules: [fakeGreenModule],
        period: '2026-11-01',
        citySlugs: ['sibiu', 'timisoara'],
        scoreKeys: [],
        sourcesDir,
        osmExtract: { url: 'https://example.test/romania.osm.pbf', apiKey: null },
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
          databaseUrl: databaseUrl ?? '',
          modules: [fakeGreenModule],
          period: '2026-11-01',
          citySlugs: ['sibiu'],
          scoreKeys: [],
          sourcesDir,
          osmExtract: { url: 'https://example.test/romania.osm.pbf', apiKey: null },
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
        databaseUrl: databaseUrl ?? '',
        modules: [failing],
        period: '2026-11-01',
        citySlugs: ['sibiu'],
        scoreKeys: [],
        sourcesDir,
        osmExtract: { url: 'https://example.test/romania.osm.pbf', apiKey: null },
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
