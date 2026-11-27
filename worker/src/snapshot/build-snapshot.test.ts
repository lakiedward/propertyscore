import { fork } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer, type ServerResponse } from 'node:http';
import { delimiter, join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { createSnapshotSql, createSql, type Sql } from '../db/sql.ts';
import { createLogger } from '../lib/logger.ts';
import { createValhallaClient } from '../routing/valhalla.ts';
import { runTransitRouting } from '../scoring/accessibility/routing.ts';
import { createCamsJobVerifier, downloadCamsMonth } from '../scoring/air/cams.source.ts';
import type { ScoreModule } from '../scoring/score-module.ts';
import { cityBoundingBox } from '../sources/osm.ts';
import { limitCoveredCities } from '../test/coverage-fixture.ts';
import { hasOsmium, prepareSourcesDir } from '../test/osm-fixture.ts';
import { writeCategoryScores } from '../scoring/write-category-scores.ts';
import { buildSnapshot, selectModules } from './build-snapshot.ts';
import { recoverSnapshot } from './recover-snapshot.ts';
import { recordSnapshotExecution, trackCamsAttempts } from './recovery.db.ts';
import { startSnapshot } from './snapshot.db.ts';

const silentLogger = createLogger('error', () => undefined);

async function listenTestRouter(server: ReturnType<typeof createServer>): Promise<string> {
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing test router port');
  return `http://127.0.0.1:${address.port}`;
}

function processRunning(pid: number): boolean {
  try {
    return process.kill(pid, 0);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ESRCH') return false;
    throw error;
  }
}

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

  async function snapshotSessionCount() {
    const [row] = await sql<{ active: number }[]>`
      select count(*)::int as active from private.score_snapshot_lock_holders()
    `;
    return row?.active;
  }

  function launchWorker(env: NodeJS.ProcessEnv, args: readonly string[] = []) {
    const entry =
      args.length > 0
        ? new URL('../main.ts', import.meta.url)
        : new URL('../test/snapshot-shutdown-worker.ts', import.meta.url);
    const worker = fork(entry, [...args], {
      env: {
        PATH: process.env.PATH,
        DATABASE_URL: databaseUrl,
        SOURCES_DIR: sourcesDir,
        OSM_EXTRACT_URL: 'https://example.test/romania.osm.pbf',
        SNAPSHOT_TEST_SOURCES_DIR: sourcesDir,
        SNAPSHOT_TEST_ROUTER_URL: 'http://127.0.0.1:1',
        ...env,
      },
      execArgv: [],
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    });
    let stdout = '';
    let stderr = '';
    worker.stdout?.setEncoding('utf8');
    worker.stdout?.on('data', (chunk: string) => {
      stdout += chunk;
    });
    worker.stderr?.setEncoding('utf8');
    worker.stderr?.on('data', (chunk: string) => {
      stderr += chunk;
    });
    const exited = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>(
      (resolve, reject) => {
        worker.once('error', reject);
        worker.once('close', (code, signal) => resolve({ code, signal }));
      },
    );
    const earlyExit = () =>
      exited.then(({ code, signal }) => {
        throw new Error(`Worker exited before the test: ${code ?? signal ?? 'unknown'} ${stderr}`);
      });
    return {
      worker,
      exited,
      earlyExit,
      shutdownConfirmed: () => stdout.includes('build-snapshot shutdown confirmed'),
    };
  }

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
      const routerUrl = await listenTestRouter(server);
      const owner = Promise.withResolvers<{
        pid: number;
        snapshotId: string;
        signal: AbortSignal;
      }>();
      let moduleEnded = false;
      const build = buildSnapshot({
        ...localBuild(),
        createRouter: (requestScope) =>
          createValhallaClient(routerUrl, {
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

  it('does not release the guard unless all evidence matches the same execution', async () => {
    const published = await publishedScoreFixture();
    const owner = createSnapshotSql(databaseUrl ?? '');
    const registry = {
      endpoint: 'http://127.0.0.1:1',
      fenceAndCheck: vi.fn().mockResolvedValue(false),
    };
    const cams = createCamsJobVerifier('http://127.0.0.1:2', 'test-key');
    const camsTerminal = vi.spyOn(cams, 'isTerminal').mockResolvedValue(false);
    const replicaStopped = vi.fn().mockResolvedValue(false);
    try {
      const { snapshotId } = await startSnapshot(owner, '2026-11-01');
      created.push(snapshotId);
      const recover = () => recoverSnapshot({ sql, snapshotId, replicaStopped, registry, cams });
      await expect(recover()).resolves.toBe('busy');
      expect(replicaStopped).not.toHaveBeenCalled();
      await owner.end({ timeout: 5 });
      await expect(recover()).resolves.toBe('execution_unconfirmed');
      const ledgerId = 'ca3e8efb-ba90-4367-9b67-e4d79dabdfa6';
      await recordSnapshotExecution(sql, snapshotId, 'replica-1', registry.endpoint, ledgerId);
      await sql`update public.score_snapshots set routing_pending = true where id = ${snapshotId}`;
      const recordJob = await trackCamsAttempts(sql, snapshotId)(cams.endpoint);

      await expect(recover()).resolves.toBe('replica_unconfirmed');
      expect(replicaStopped).toHaveBeenCalledWith('replica-1', snapshotId, expect.any(AbortSignal));
      expect(registry.fenceAndCheck).not.toHaveBeenCalled();
      replicaStopped.mockResolvedValue(true);
      await expect(recover()).resolves.toBe('valhalla_unconfirmed');
      expect(registry.fenceAndCheck).toHaveBeenCalledWith(
        snapshotId,
        ledgerId,
        expect.any(AbortSignal),
      );
      expect(camsTerminal).not.toHaveBeenCalled();
      registry.fenceAndCheck.mockResolvedValue(true);
      await expect(recover()).resolves.toBe('cams_unconfirmed');
      expect(camsTerminal).not.toHaveBeenCalled();
      await recordJob('job-1');
      await expect(recover()).resolves.toBe('cams_unconfirmed');
      expect(camsTerminal).toHaveBeenCalledWith('job-1', expect.any(AbortSignal));
      expect(await publishedScores()).toEqual(published);
      camsTerminal.mockResolvedValue(true);
      await expect(recover()).resolves.toBe('recovered');
      await expect(recover()).resolves.toBe('execution_unconfirmed');
      const [abandoned] = await sql`
        select status, routing_pending, error_code from public.score_snapshots where id = ${snapshotId}
      `;
      expect(abandoned).toEqual({
        status: 'failed',
        routing_pending: false,
        error_code: 'abandoned',
      });
      expect(await publishedScores()).toEqual(published);
    } finally {
      await owner.end({ timeout: 5 });
    }
  });

  it.each(['timeout', 'lost submission', 'terminal failure'])(
    'releases the CAMS guard only on confirmed completion (%s)',
    async (outcome) => {
      const published = await publishedScoreFixture();
      const accepted: string[] = [];
      const server = createServer((request, response) => {
        if (request.method === 'POST') {
          request.resume();
          accepted.push('job-1');
          if (outcome === 'lost submission') {
            response.destroy();
            return;
          }
          response.end(
            JSON.stringify({
              jobID: 'job-1',
              status: outcome === 'terminal failure' ? 'dismissed' : 'accepted',
            }),
          );
        } else {
          response.end(JSON.stringify({ status: 'running' }));
        }
      });
      const apiUrl = await listenTestRouter(server);
      const retry = createSnapshotSql(databaseUrl ?? '');
      let candidate: string | undefined;
      try {
        const build = buildSnapshot({
          ...localBuild(),
          modules: [
            {
              key: 'air',
              run: async ({ snapshotId, routingScope, signal }) => {
                candidate = snapshotId;
                created.push(snapshotId);
                await downloadCamsMonth({
                  apiUrl,
                  apiKey: 'test-key',
                  sourcesDir,
                  pollutant: 'pm25',
                  month: '2026-11-01',
                  maxWaitMs: 500,
                  pollIntervalMs: 10,
                  signal,
                  requestScope: routingScope,
                });
                return { sourceDates: {} };
              },
            },
          ],
        });
        if (outcome === 'terminal failure') {
          await expect(build).rejects.toMatchObject({ code: 'cams_job_failed' });
        } else {
          await expect(build).rejects.toMatchObject({
            code: 'snapshot_routing_unconfirmed',
            ...(outcome === 'timeout' ? { cause: { code: 'cams_job_timeout' } } : {}),
          });
        }
        expect(accepted).toEqual(['job-1']);
        if (!candidate) throw new Error('Missing CAMS candidate');
        const terminal = outcome === 'terminal failure';
        const [state] = await sql<{ status: string; routing_pending: boolean }[]>`
          update public.score_snapshots set started_at = now() - interval '13 hours'
          where id = ${candidate}
          returning status, routing_pending
        `;
        expect(state).toEqual({
          status: terminal ? 'failed' : 'building',
          routing_pending: !terminal,
        });
        if (terminal) {
          const replacement = await startSnapshot(retry, '2026-11-01');
          created.push(replacement.snapshotId);
        } else {
          await expect(startSnapshot(retry, '2026-11-01')).rejects.toMatchObject({
            message: 'snapshot_routing_unconfirmed',
          });
        }
        expect(await publishedScores()).toEqual(published);
      } finally {
        server.closeAllConnections();
        await new Promise<void>((resolve) => server.close(() => resolve()));
        await retry.end({ timeout: 5 });
        if (candidate) await sql`delete from public.score_snapshots where id = ${candidate}`;
      }
    },
  );

  it.skipIf(process.platform === 'win32').each(['confirmed', 'expired', 'killed'])(
    'allows takeover only after confirmed shutdown (%s)',
    async (outcome) => {
      const published = await publishedScoreFixture();
      const graceful = outcome !== 'killed';
      const bin = join(sourcesDir, `shutdown-bin-${outcome}`);
      const pidFile = join(bin, 'r5.pid');
      await mkdir(bin, { recursive: true });
      await writeFile(
        join(bin, 'python3'),
        `#!/usr/bin/env node\nrequire('node:fs').writeFileSync(${JSON.stringify(pidFile)}, String(process.pid));\nsetInterval(() => undefined, 1000);\n`,
        { mode: 0o755 },
      );
      const finishRouting = Promise.withResolvers<undefined>();
      let computing = false;
      let clientDisconnected = false;
      let requests = 0;
      const server = createServer((request, response) => {
        requests += 1;
        request.resume();
        response.on('close', () => {
          clientDisconnected = true;
        });
        computing = true;
        void finishRouting.promise.then(() => {
          computing = false;
          if (!response.destroyed)
            response.end('{"sources_to_targets":[[{"distance":0.5,"time":400}]]}');
        });
      });
      const routerUrl = await listenTestRouter(server);
      const { worker, exited, earlyExit, shutdownConfirmed } = launchWorker({
        PATH: [bin, process.env.PATH ?? ''].join(delimiter),
        SNAPSHOT_TEST_ROUTER_URL: routerUrl,
        SNAPSHOT_TEST_R5: graceful ? '1' : undefined,
      });
      let snapshotId: string | undefined;
      worker.on('message', (message: unknown) => {
        if (typeof message === 'string') {
          snapshotId = message;
          created.push(message);
        }
      });
      const retry = createSnapshotSql(databaseUrl ?? '');
      let childPid: number | undefined;
      try {
        await Promise.race([expect.poll(() => computing).toBe(true), earlyExit()]);
        if (!snapshotId) throw new Error('Missing interrupted snapshot ID');
        await expect(startSnapshot(retry, '2026-11-01')).rejects.toMatchObject({
          message: 'snapshot_already_building',
        });
        if (graceful) {
          await expect.poll(() => readFile(pidFile, 'utf8')).toMatch(/^\d+$/);
          const pid = Number(await readFile(pidFile, 'utf8'));
          childPid = pid;
          expect(processRunning(pid)).toBe(true);
          expect(worker.kill('SIGTERM')).toBe(true);
          await expect.poll(() => processRunning(pid)).toBe(false);
          await expect.poll(snapshotSessionCount).toBe(1);
          expect(computing).toBe(true);
          expect(clientDisconnected).toBe(false);
          await expect(startSnapshot(retry, '2026-11-01')).rejects.toMatchObject({
            message: 'snapshot_already_building',
          });
          if (outcome === 'confirmed') {
            finishRouting.resolve(undefined);
            expect(await exited).toEqual({ code: 1, signal: null });
            expect(shutdownConfirmed()).toBe(true);
            expect(requests).toBe(1);
            expect(computing).toBe(false);
            const replacement = await startSnapshot(retry, '2026-11-01');
            created.push(replacement.snapshotId);
            const [state] = await sql<{ status: string; routing_pending: boolean }[]>`
              select status, routing_pending from public.score_snapshots where id = ${snapshotId}
            `;
            expect(state).toEqual({ status: 'failed', routing_pending: false });
            expect(await publishedScores()).toEqual(published);
            return;
          }
          expect(await Promise.race([exited.then(() => 'exited'), delay(150, 'deadline')])).toBe(
            'deadline',
          );
        }
        expect(worker.kill('SIGKILL')).toBe(true);
        expect(await exited).toEqual({ code: null, signal: 'SIGKILL' });
        expect(shutdownConfirmed()).toBe(false);
        await expect.poll(() => clientDisconnected).toBe(true);
        expect(computing).toBe(true);
        await expect.poll(snapshotSessionCount).toBe(0);
        await expect(startSnapshot(retry, '2026-11-01')).rejects.toMatchObject({
          message: 'snapshot_routing_unconfirmed',
        });
        finishRouting.resolve(undefined);
        await expect.poll(() => computing).toBe(false);
        await expect(startSnapshot(retry, '2026-11-01')).rejects.toMatchObject({
          message: 'snapshot_routing_unconfirmed',
        });
        expect(requests).toBe(1);
        expect(await publishedScores()).toEqual(published);
      } finally {
        worker.kill('SIGKILL');
        if (childPid !== undefined && processRunning(childPid)) process.kill(childPid, 'SIGKILL');
        finishRouting.resolve(undefined);
        server.closeAllConnections();
        await new Promise<void>((resolve) => server.close(() => resolve()));
        await exited;
        await retry.end({ timeout: 5 });
        if (snapshotId) await sql`delete from public.score_snapshots where id = ${snapshotId}`;
      }
    },
  );

  it.skipIf(process.platform === 'win32').each(['SIGTERM', 'both SQL sessions'])(
    'stops osmium and preserves the published scores after %s',
    async (interruption) => {
      const published = await publishedScoreFixture();
      const bin = join(sourcesDir, `osmium-${interruption}`);
      const pidFile = join(bin, 'osmium.pid');
      const commands = join(bin, 'commands');
      await mkdir(bin, { recursive: true });
      await writeFile(
        join(bin, 'osmium'),
        `#!/usr/bin/env node\nconst fs = require('node:fs');\nfs.appendFileSync(${JSON.stringify(commands)}, process.argv[2] + '\\n');\nfs.writeFileSync(${JSON.stringify(pidFile)}, String(process.pid));\nsetInterval(() => undefined, 1000);\n`,
        { mode: 0o755 },
      );
      const { worker, exited, earlyExit, shutdownConfirmed } = launchWorker(
        { PATH: [bin, process.env.PATH ?? ''].join(delimiter) },
        ['build-snapshot', '--period', '2026-11', '--city', 'sibiu'],
      );
      let childPid: number | undefined;
      let snapshotId: string | undefined;
      const retry = createSnapshotSql(databaseUrl ?? '');
      try {
        await Promise.race([
          expect.poll(() => readFile(pidFile, 'utf8'), { timeout: 5000 }).toMatch(/^\d+$/),
          earlyExit(),
        ]);
        const pid = Number(await readFile(pidFile, 'utf8'));
        childPid = pid;
        expect(processRunning(pid)).toBe(true);
        const [active] = await sql<{ id: string; routing_pending: boolean }[]>`
          select id, routing_pending from public.score_snapshots where status = 'building'
        `;
        if (!active) throw new Error('Missing interrupted snapshot');
        snapshotId = active.id;
        expect(active.routing_pending).toBe(true);
        if (interruption === 'SIGTERM') {
          expect(worker.kill('SIGTERM')).toBe(true);
        } else {
          expect(worker.kill('SIGSTOP')).toBe(true);
          const terminated = await sql<{ ok: boolean }[]>`
            select pg_terminate_backend(holder.pid, 5000) as ok
            from private.score_snapshot_lock_holders() holder(pid)
          `;
          expect(terminated).toEqual([{ ok: true }, { ok: true }]);
          expect(processRunning(pid)).toBe(true);
          await expect(startSnapshot(retry, '2026-11-01')).rejects.toMatchObject({
            message: 'snapshot_routing_unconfirmed',
          });
          expect(worker.kill('SIGCONT')).toBe(true);
        }
        expect(await exited).toEqual({ code: 1, signal: null });
        expect(shutdownConfirmed()).toBe(interruption === 'SIGTERM');
        expect(processRunning(pid)).toBe(false);
        expect(await readFile(commands, 'utf8')).toBe('extract\n');
        const replacement = await startSnapshot(retry, '2026-11-01');
        created.push(replacement.snapshotId);
        expect(await publishedScores()).toEqual(published);
      } finally {
        worker.kill('SIGKILL');
        if (childPid !== undefined && processRunning(childPid)) process.kill(childPid, 'SIGKILL');
        await exited;
        await retry.end({ timeout: 5 });
        if (snapshotId) await sql`delete from public.score_snapshots where id = ${snapshotId}`;
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
