import { parseCommand } from './cli.ts';
import { readEnv } from './config/env.ts';
import { createSql } from './db/sql.ts';
import { errorCode } from './lib/errors.ts';
import { createLogger } from './lib/logger.ts';
import { createValhallaClient } from './routing/valhalla.ts';
import { SCORE_MODULES } from './scoring/registry.ts';
import { buildSnapshot } from './snapshot/build-snapshot.ts';

async function main(): Promise<void> {
  const env = readEnv();
  const logger = createLogger(env.LOG_LEVEL, undefined, { service: 'worker' });
  const command = parseCommand(process.argv.slice(2), new Date());
  const sql = createSql(env.DATABASE_URL);
  try {
    const result = await buildSnapshot({
      sql,
      modules: SCORE_MODULES,
      period: command.period,
      citySlugs: command.citySlugs,
      scoreKeys: command.scoreKeys,
      sourcesDir: env.SOURCES_DIR,
      osmExtractUrl: env.OSM_EXTRACT_URL,
      router: env.VALHALLA_URL ? createValhallaClient(env.VALHALLA_URL) : null,
      logger,
    });
    logger.info('build-snapshot done', {
      snapshot_id: result.snapshotId,
      cities: result.cities,
      cells: result.cells,
      scores: result.scores.join(','),
    });
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error: unknown) => {
  const logger = createLogger('error', undefined, { service: 'worker' });
  logger.error('worker failed', {
    code: errorCode(error),
    error: error instanceof Error ? error.message : String(error),
  });
  process.exitCode = 1;
});
