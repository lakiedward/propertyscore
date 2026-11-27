import { join } from 'node:path';

import { parseCommand, type WorkerCommand } from './cli.ts';
import { type Env, readDocumentEnv, readEnv } from './config/env.ts';
import { createSql, type Sql } from './db/sql.ts';
import { errorCauseExit, errorCauseTail, errorCode, WorkerError } from './lib/errors.ts';
import { createLogger, type Logger } from './lib/logger.ts';
import { generateReport } from './report/generate-report.ts';
import { insertReport } from './report/report.db.ts';
import { REPORT_SECTIONS } from './report/sections.ts';
import {
  refreshReportPdf,
  renderReportDocument,
  renderReportPdf,
} from './report-pdf/render-report-pdf.ts';
import { processReport } from './report-queue/process-report.ts';
import { createReportPdfStorage } from './report-queue/report-pdf-storage.ts';
import {
  processNextReportPdfVariant,
  type RenderReport,
} from './report-queue/report-pdf-variants.ts';
import { claimNextReport, REPORT_QUEUE_CHANNEL } from './report-queue/report-queue.db.ts';
import { serveSavedReportWalkRoutes } from './report-queue/saved-report-walk-routes.ts';
import { serveReports } from './report-queue/serve-reports.ts';
import { createWorkSignal } from './report-queue/work-signal.ts';
import { importHealthSources } from './scoring/health/import-health-sources.ts';
import { createValhallaClient, type ValhallaClient } from './routing/valhalla.ts';
import { importAreaStatistics } from './scoring/investment/area-statistics-import.ts';
import { importCityAverages } from './scoring/investment/city-averages-import.ts';
import { readActiveInvestmentParams } from './scoring/investment/investment.db.ts';
import { importMarketListings } from './scoring/investment/market-import.ts';
import { SCORE_MODULES } from './scoring/registry.ts';
import { createEarthquakeCatalog } from './scoring/seismic/earthquake-catalog.ts';
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

function stopOnSignals(logger: Logger): AbortController {
  const controller = new AbortController();
  const stop = (signal: NodeJS.Signals) => {
    logger.info('serve-reports stopping', { signal });
    controller.abort();
  };
  process.once('SIGTERM', stop);
  process.once('SIGINT', stop);
  return controller;
}

function reportStorage(env: Env, command: 'serve-reports' | 'refresh-report-pdf') {
  if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) {
    throw new WorkerError(
      'report_storage_not_configured',
      `${command} needs SUPABASE_URL and SUPABASE_SECRET_KEY`,
    );
  }
  return createReportPdfStorage({
    supabaseUrl: env.SUPABASE_URL,
    secretKey: env.SUPABASE_SECRET_KEY,
  });
}

async function runReportService(sql: Sql, env: Env, logger: Logger): Promise<void> {
  const storage = reportStorage(env, 'serve-reports');
  const renderReport: RenderReport = async (raw, locale) =>
    (await renderReportDocument(raw, { chromiumPath: env.CHROMIUM_PATH, logger, locale })).pdf;
  const work = createWorkSignal();
  const shutdown = stopOnSignals(logger);
  const stop = shutdown.signal;
  const router = reportRouter(env);
  const listener = await sql.listen(REPORT_QUEUE_CHANNEL, () => {
    work.notify();
  });
  logger.info('serve-reports listening', { channel: REPORT_QUEUE_CHANNEL });
  const savedRoutes = router ? serveSavedReportWalkRoutes(sql, router.route, stop, logger) : null;
  try {
    const result = await serveReports({
      claim: () => claimNextReport(sql),
      process: (reportId) =>
        processReport({
          sql,
          reportId,
          sections: REPORT_SECTIONS,
          router,
          earthquakes: createEarthquakeCatalog(),
          renderReport,
          storage,
          logger,
        }),
      processPdfVariant: () => processNextReportPdfVariant(sql, renderReport, storage, logger),
      waitForWork: work.wait,
      stop,
      logger,
    });
    logger.info('serve-reports done', { completed: result.completed, failed: result.failed });
  } finally {
    shutdown.abort();
    await Promise.all([listener.unlisten(), savedRoutes]);
  }
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
        allowPartialCities: command.allowPartialCities,
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
        earthquakes: createEarthquakeCatalog(),
        logger,
      });
      return;
    case 'serve-reports':
      await runReportService(sql, env, logger);
      return;
    case 'render-report-pdf':
      await renderReportPdf({
        source: 'reportId' in command.source ? { ...command.source, sql } : command.source,
        outputPath: command.outputPath,
        chromiumPath: env.CHROMIUM_PATH,
        logger,
      });
      return;
    case 'refresh-report-pdf':
      await refreshReportPdf({
        sql,
        reportId: command.reportId,
        storage: reportStorage(env, command.command),
        chromiumPath: env.CHROMIUM_PATH,
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
        earthquakes: createEarthquakeCatalog(),
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
    case 'import-city-averages': {
      const result = await importCityAverages({
        sql,
        source: command.source,
        filePath: command.filePath,
        eurRonRate: command.eurRonRate,
        params: await readActiveInvestmentParams(sql),
        logger,
      });
      logger.info('import-city-averages done', {
        import_id: result.importId,
        period: result.period,
        accepted: result.accepted,
      });
      return;
    }
    case 'import-market-statistics': {
      if (!env.MARKET_SOURCE_CONTACT) {
        throw new WorkerError(
          'market_source_contact_required',
          'import-market-statistics needs MARKET_SOURCE_CONTACT',
        );
      }
      const results = await importAreaStatistics({
        sql,
        sources: command.sources,
        citySlugs: command.citySlugs,
        contact: env.MARKET_SOURCE_CONTACT,
        period: command.period,
        isRetry: command.isRetry,
        params: await readActiveInvestmentParams(sql),
        logger,
      });
      logger.info('import-market-statistics done', {
        imports: results.filter((result) => result.importId !== null).length,
        accepted: results.reduce((sum, result) => sum + result.accepted, 0),
        requests: results.reduce((sum, result) => sum + result.requests, 0),
      });
      return;
    }
  }
}

async function main(): Promise<void> {
  const command = parseCommand(process.argv.slice(2), new Date());
  if (command.command === 'render-report-pdf' && 'inputPath' in command.source) {
    const documentEnv = readDocumentEnv();
    await renderReportPdf({
      source: command.source,
      outputPath: command.outputPath,
      chromiumPath: documentEnv.CHROMIUM_PATH,
      logger: createLogger(documentEnv.LOG_LEVEL, undefined, { service: 'worker' }),
    });
    return;
  }
  const env = readEnv();
  const logger = createLogger(env.LOG_LEVEL, undefined, { service: 'worker' });
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
