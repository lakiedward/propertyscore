import { rm } from 'node:fs/promises';
import { join } from 'node:path';

import { z } from 'zod';

import { createSnapshotSql, type Sql } from '../db/sql.ts';
import { errorCode, WorkerError } from '../lib/errors.ts';
import type { Logger } from '../lib/logger.ts';
import { RoutingScope } from '../routing/scope.ts';
import type { ValhallaClient, ValhallaRequestScope } from '../routing/valhalla.ts';
import type { CategoryKey } from '../scoring/categories.ts';
import type { ScoreModule } from '../scoring/score-module.ts';
import type { SourceMirror } from '../sources/mirror.ts';
import { downloadOsmExtract, type OsmExtractSource } from '../sources/osm.ts';
import { markResidentialCells } from './residential.ts';
import {
  type CoveredCity,
  failSnapshot,
  finishSnapshot,
  holdSnapshot,
  listCoveredCities,
  markSnapshotRouting,
  prepareCityCells,
  startSnapshot,
} from './snapshot.db.ts';

export type BuildSnapshotOptions = {
  databaseUrl: string;
  modules: readonly ScoreModule[];
  period: string;
  citySlugs: readonly string[];
  scoreKeys: readonly CategoryKey[];
  allowPartialCities?: boolean;
  sourcesDir: string;
  osmExtract: OsmExtractSource;
  sourceMirror?: SourceMirror;
  createRouter?: (scope: ValhallaRequestScope) => ValhallaClient;
  signal?: AbortSignal;
  logger: Logger;
};

export type BuildSnapshotResult = {
  snapshotId: string;
  cities: number;
  cells: number;
  scores: CategoryKey[];
};

const versionParamsSchema = z.looseObject({
  cell_size_m: z.number().int().min(50).max(2000),
  residential_min_share: z.number().min(0).max(1),
});

export function selectModules(
  modules: readonly ScoreModule[],
  scoreKeys: readonly CategoryKey[],
): ScoreModule[] {
  if (scoreKeys.length === 0) return [...modules];
  const unknown = scoreKeys.filter((key) => !modules.some((module) => module.key === key));
  if (unknown.length > 0) {
    throw new WorkerError('score_module_missing', `No score module for: ${unknown.join(', ')}`);
  }
  return modules.filter((module) => scoreKeys.includes(module.key));
}

export async function buildSnapshotOnSignals(
  options: Omit<BuildSnapshotOptions, 'signal'>,
): Promise<BuildSnapshotResult> {
  const shutdown = new AbortController();
  const stop = (signal: NodeJS.Signals) => {
    if (shutdown.signal.aborted) return;
    options.logger.info('build-snapshot stopping', { signal });
    shutdown.abort(new WorkerError('snapshot_stopping', 'Snapshot worker is stopping'));
  };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
  try {
    return await buildSnapshot({ ...options, signal: shutdown.signal });
  } catch (error) {
    if (errorCode(error) === 'snapshot_stopping') {
      options.logger.info('build-snapshot shutdown confirmed');
    }
    throw error;
  } finally {
    process.off('SIGTERM', stop);
    process.off('SIGINT', stop);
  }
}

export async function buildSnapshot(options: BuildSnapshotOptions): Promise<BuildSnapshotResult> {
  options.signal?.throwIfAborted();
  const lifetime = new AbortController();
  const onDisconnect = () =>
    lifetime.abort(
      new WorkerError('snapshot_connection_lost', 'A snapshot database session closed'),
    );
  const sql = createSnapshotSql(options.databaseUrl, onDisconnect);
  const guard = createSnapshotSql(options.databaseUrl, onDisconnect);
  const signal = options.signal
    ? AbortSignal.any([options.signal, lifetime.signal])
    : lifetime.signal;
  const stopScoringSql = () => void sql.end({ timeout: 0 });
  options.signal?.addEventListener('abort', stopScoringSql, { once: true });
  try {
    return await buildSnapshotInSession(sql, guard, signal, options);
  } finally {
    options.signal?.removeEventListener('abort', stopScoringSql);
    await Promise.all([sql.end({ timeout: 5 }), guard.end({ timeout: 5 })]);
  }
}

async function buildSnapshotInSession(
  sql: Sql,
  guard: Sql,
  signal: AbortSignal,
  options: BuildSnapshotOptions,
): Promise<BuildSnapshotResult> {
  const { logger } = options;
  const modules = selectModules(options.modules, options.scoreKeys);
  const cities = await selectCities(sql, logger, options);

  signal.throwIfAborted();
  const version = await startSnapshot(sql, options.period);
  const workDir = join(options.sourcesDir, 'work', version.snapshotId);
  const log = (message: string, fields = {}) =>
    logger.info(message, { snapshot_id: version.snapshotId, ...fields });
  const trackWork = version.lockOwnerPid !== null;
  const protect = async () => {
    if (trackWork) await markSnapshotRouting(guard, version.snapshotId, true);
  };
  const release = async () => {
    if (trackWork) await releaseSnapshotRouting(guard, options.databaseUrl, version.snapshotId);
  };

  try {
    await holdSnapshot(guard, version);
    signal.throwIfAborted();
    const params = versionParamsSchema.safeParse(version.params);
    if (!params.success) {
      throw new WorkerError(
        'invalid_version_params',
        'cell_size_m or residential_min_share is missing',
      );
    }
    const cellSizeM = params.data.cell_size_m;
    const cells = await withSnapshotWork(signal, protect, release, async () => {
      const extractPath = await downloadOsmExtract(
        options.osmExtract,
        options.sourcesDir,
        version.period,
        signal,
      );
      let count = 0;
      for (const city of cities) {
        signal.throwIfAborted();
        const seeded = await prepareCityCells(sql, version.snapshotId, city.id, cellSizeM);
        signal.throwIfAborted();
        const residential = await markResidentialCells({
          sql,
          snapshotId: version.snapshotId,
          city,
          extractPath,
          workDir,
          minShare: params.data.residential_min_share,
          signal,
        });
        count += seeded;
        log('city cells ready', { city: city.slug, cells: seeded, residential_cells: residential });
      }
      return count;
    });

    const sourceDates: Record<string, string> = {};
    for (const module of modules) {
      signal.throwIfAborted();
      log('score started', { score: module.key });
      const result = await withSnapshotWork(signal, protect, release, (routing) =>
        module.run({
          sql,
          snapshotId: version.snapshotId,
          period: version.period,
          cellSizeM,
          cities,
          params: version.params[module.key],
          sourcesDir: options.sourcesDir,
          osmExtract: options.osmExtract,
          sourceMirror: options.sourceMirror,
          router: options.createRouter?.(routing) ?? null,
          logger,
          signal,
          routingScope: routing,
        }),
      );
      Object.assign(sourceDates, result.sourceDates);
      log('score finished', { score: module.key });
    }

    signal.throwIfAborted();
    await finishSnapshot(sql, version.snapshotId, sourceDates);
    log('snapshot ready', { cities: cities.length, cells });
    return {
      snapshotId: version.snapshotId,
      cities: cities.length,
      cells,
      scores: modules.map((module) => module.key),
    };
  } catch (error) {
    const abortReason: unknown = signal.reason;
    const reported =
      errorCode(error) === 'snapshot_routing_unconfirmed' ? error : (abortReason ?? error);
    const code = errorCode(reported);
    logger.error('snapshot failed', { snapshot_id: version.snapshotId, code });
    if (!signal.aborted && code !== 'snapshot_routing_unconfirmed') {
      await failSnapshot(sql, version.snapshotId, code);
    }
    throw reported;
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

async function withSnapshotWork<T>(
  signal: AbortSignal,
  protect: () => Promise<void>,
  release: () => Promise<void>,
  run: (routing: RoutingScope) => Promise<T>,
): Promise<T> {
  const routing = new RoutingScope(signal, protect);
  try {
    return await routing.runLocal(() => run(routing));
  } finally {
    await routing.drain();
    if (routing.guardRecorded) await release();
  }
}

async function releaseSnapshotRouting(guard: Sql, databaseUrl: string, snapshotId: string) {
  try {
    await markSnapshotRouting(guard, snapshotId, false);
  } catch {
    const cleanup = createSnapshotSql(databaseUrl);
    try {
      await markSnapshotRouting(cleanup, snapshotId, false);
    } catch (error) {
      throw new WorkerError(
        'snapshot_routing_unconfirmed',
        'Cannot clear the snapshot routing guard after routing ended',
        { cause: error },
      );
    } finally {
      await cleanup.end({ timeout: 5 });
    }
  }
}

async function selectCities(
  sql: Sql,
  logger: Logger,
  options: Pick<BuildSnapshotOptions, 'citySlugs' | 'allowPartialCities'>,
): Promise<CoveredCity[]> {
  const covered = await listCoveredCities(sql, []);
  const cities =
    options.citySlugs.length === 0
      ? covered
      : covered.filter((city) => options.citySlugs.includes(city.slug));
  const selected = new Set(cities.map((city) => city.slug));
  const missing = covered.filter((city) => !selected.has(city.slug)).map((city) => city.slug);
  const unknown = options.citySlugs.filter((slug) => !selected.has(slug));
  const fields = {
    city_filter: options.citySlugs.length === 0 ? 'all' : options.citySlugs.join(','),
    covered_cities: covered.length,
    selected_cities: cities.length,
    selected: cities.map((city) => city.slug).join(','),
    missing: missing.join(','),
    unknown: unknown.join(','),
  };
  logger.info('snapshot cities selected', fields);
  if (cities.length === 0) {
    throw new WorkerError('no_covered_cities', 'No covered city matches the request');
  }
  if ((missing.length > 0 || unknown.length > 0) && !options.allowPartialCities) {
    throw new WorkerError(
      'snapshot_partial_city_selection',
      `Selected ${cities.length} of ${covered.length} covered cities; pass --allow-partial for a local partial run`,
    );
  }
  if (missing.length > 0) logger.warn('snapshot partial city selection', fields);
  return cities;
}
