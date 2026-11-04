import { join } from 'node:path';

import { parseCommand, type WorkerCommand } from './cli.ts';
import { type Env, readEnv } from './config/env.ts';
import { createSql, type Sql } from './db/sql.ts';
import { errorCauseExit, errorCauseTail, errorCode } from './lib/errors.ts';
import { createLogger, type Logger } from './lib/logger.ts';
import { generateReport } from './report/generate-report.ts';
import { insertReport } from './report/report.db.ts';
import { REPORT_SECTIONS } from './report/sections.ts';
import { importHealthSources } from './scoring/health/import-health-sources.ts';
import { createValhallaClient, type ValhallaClient } from './routing/valhalla.ts';
import { readActiveInvestmentParams } from './scoring/investment/investment.db.ts';
import { importMarketListings } from './scoring/investment/market-import.ts';
import { SCORE_MODULES } from './scoring/registry.ts';
import { buildSnapshot } from './snapshot/build-snapshot.ts';
import type { SourceMirror } from './sources/mirror.ts';
import type { OsmExtractSource } from './sources/osm.ts';

function osmExtractSource(env: Env): OsmExtractSource {
  return { url: env.OSM_EXTRACT_URL, apiKey: env.OSM_EXTRACT_API_KEY ?? null };
}

function sourceMirror(env: Env): SourceMirror | undefined {
  if (!env.SOURCE_MIRROR_URL) return undefined;
  return { url: env.SOURCE_MIRROR_URL, apiKey: env.OSM_EXTRACT_API_KEY ?? null };
}

function reportRouter(env: Env): ValhallaClient | null {
  return env.VALHALLA_URL ? createValhallaClient(env.VALHALLA_URL) : null;
}

async function runCommand(
  command: WorkerCommand,
  sql: Sql,
  env: Env,
  logger: Logger,
): Promise<void> {
  switch (command.command) {
    case 'build-snapshot': {
      const result = await buildSnapshot({
        sql,
        modules: SCORE_MODULES,
        period: command.period,
        citySlugs: command.citySlugs,
        scoreKeys: command.scoreKeys,
        sourcesDir: env.SOURCES_DIR,
        osmExtract: osmExtractSource(env),
        sourceMirror: sourceMirror(env),
        router: reportRouter(env),
        logger,
      });
      logger.info('build-snapshot done', {
        snapshot_id: result.snapshotId,
        cities: result.cities,
        cells: result.cells,
        scores: result.scores.join(','),
      });
      return;
    }
    case 'generate-report':
      await generateReport({
        sql,
        reportId: command.reportId,
        sections: REPORT_SECTIONS,
        router: reportRouter(env),
        logger,
      });
      return;
    case 'create-report': {
      const reportId = await insertReport(sql, command);
      logger.info('report created', { report_id: reportId });
      await generateReport({
        sql,
        reportId,
        sections: REPORT_SECTIONS,
        router: reportRouter(env),
        logger,
      });
      return;
    }
    case 'import-health-sources': {
      const result = await importHealthSources({
        sql,
        dir: command.dir ?? join(env.SOURCES_DIR, 'health'),
        citySlugs: command.citySlugs,
        validFrom: command.validFrom,
        period: command.period,
        sourcesDir: env.SOURCES_DIR,
        osmExtract: osmExtractSource(env),
        logger,
      });
      logger.info('import-health-sources done', {
        cnas_lists: result.cnasLists,
        cnas_providers: result.cnasProviders,
        emergency_cities: result.emergencyCities,
      });
      return;
    }
    case 'import-market-listings': {
      const result = await importMarketListings({
        sql,
        source: command.source,
        period: command.period,
        filePath: command.filePath,
        eurRonRate: command.eurRonRate,
        params: await readActiveInvestmentParams(sql),
        logger,
      });
      logger.info('import-market-listings done', {
        import_id: result.importId,
        accepted: result.accepted,
      });
      return;
    }
  }
}

async function main(): Promise<void> {
  const env = readEnv();
  const logger = createLogger(env.LOG_LEVEL, undefined, { service: 'worker' });
  const command = parseCommand(process.argv.slice(2), new Date());
  const sql = createSql(env.DATABASE_URL);
  try {
    await runCommand(command, sql, env, logger);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

function exitAfterOutput(code: number): void {
  process.stdout.write('', () => process.exit(code));
}

main().then(
  () => {
    exitAfterOutput(0);
  },
  (error: unknown) => {
    const logger = createLogger('error', undefined, { service: 'worker' });
    logger.error('worker failed', {
      code: errorCode(error),
      error: error instanceof Error ? error.message : String(error),
      cause: errorCauseTail(error),
      cause_exit: errorCauseExit(error),
    });
    exitAfterOutput(1);
  },
);
