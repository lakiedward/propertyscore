import { rm } from 'node:fs/promises';
import { join } from 'node:path';

import { z } from 'zod';

import { createSnapshotSql, type Sql } from '../db/sql.ts';
import { errorCode, WorkerError } from '../lib/errors.ts';
import type { Logger } from '../lib/logger.ts';
import type { ValhallaClient } from '../routing/valhalla.ts';
import type { CategoryKey } from '../scoring/categories.ts';
import type { ScoreModule } from '../scoring/score-module.ts';
import type { SourceMirror } from '../sources/mirror.ts';
import { downloadOsmExtract, type OsmExtractSource } from '../sources/osm.ts';
import { markResidentialCells } from './residential.ts';
import {
  type CoveredCity,
  failSnapshot,
  finishSnapshot,
  listCoveredCities,
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
  router: ValhallaClient | null;
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

export async function buildSnapshot(options: BuildSnapshotOptions): Promise<BuildSnapshotResult> {
  const sql = createSnapshotSql(options.databaseUrl);
  try {
    return await buildSnapshotInSession(sql, options);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function buildSnapshotInSession(
  sql: Sql,
  options: BuildSnapshotOptions,
): Promise<BuildSnapshotResult> {
  const { logger } = options;
  const modules = selectModules(options.modules, options.scoreKeys);
  const cities = await selectCities(sql, logger, options);

  const version = await startSnapshot(sql, options.period);
  const workDir = join(options.sourcesDir, 'work', version.snapshotId);
  const log = (message: string, fields = {}) =>
    logger.info(message, { snapshot_id: version.snapshotId, ...fields });

  try {
    const params = versionParamsSchema.safeParse(version.params);
    if (!params.success) {
      throw new WorkerError(
        'invalid_version_params',
        'cell_size_m or residential_min_share is missing',
      );
    }
    const cellSizeM = params.data.cell_size_m;
    const extractPath = await downloadOsmExtract(
      options.osmExtract,
      options.sourcesDir,
      version.period,
    );

    let cells = 0;
    for (const city of cities) {
      const seeded = await prepareCityCells(sql, version.snapshotId, city.id, cellSizeM);
      const residential = await markResidentialCells({
        sql,
        snapshotId: version.snapshotId,
        city,
        extractPath,
        workDir,
        minShare: params.data.residential_min_share,
      });
      cells += seeded;
      log('city cells ready', { city: city.slug, cells: seeded, residential_cells: residential });
    }

    const sourceDates: Record<string, string> = {};
    for (const module of modules) {
      log('score started', { score: module.key });
      const result = await module.run({
        sql,
        snapshotId: version.snapshotId,
        period: version.period,
        cellSizeM,
        cities,
        params: version.params[module.key],
        sourcesDir: options.sourcesDir,
        osmExtract: options.osmExtract,
        sourceMirror: options.sourceMirror,
        router: options.router,
        logger,
      });
      Object.assign(sourceDates, result.sourceDates);
      log('score finished', { score: module.key });
    }

    await finishSnapshot(sql, version.snapshotId, sourceDates);
    log('snapshot ready', { cities: cities.length, cells });
    return {
      snapshotId: version.snapshotId,
      cities: cities.length,
      cells,
      scores: modules.map((module) => module.key),
    };
  } catch (error) {
    const code = errorCode(error);
    logger.error('snapshot failed', { snapshot_id: version.snapshotId, code });
    await failSnapshot(sql, version.snapshotId, code);
    throw error;
  } finally {
    await rm(workDir, { recursive: true, force: true });
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
