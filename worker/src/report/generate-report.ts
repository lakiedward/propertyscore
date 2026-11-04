import type { JsonObject, Sql } from '../db/sql.ts';
import { errorCode } from '../lib/errors.ts';
import type { Logger } from '../lib/logger.ts';
import type { ValhallaClient } from '../routing/valhalla.ts';
import { beginReport, completeReport, failReport } from './report.db.ts';
import type { ReportSection } from './report-section.ts';

const CODES_THAT_KEEP_THE_REPORT = new Set(['report_already_ready', 'report_in_progress']);

export type GenerateReportOptions = {
  sql: Sql;
  reportId: string;
  sections: readonly ReportSection[];
  logger: Logger;
  router?: ValhallaClient | null;
};

export async function generateReport(options: GenerateReportOptions): Promise<void> {
  const { sql, reportId, logger } = options;
  try {
    const started = await beginReport(sql, reportId);
    const built: JsonObject = {};
    for (const section of options.sections) {
      const payload = await section.build({
        ...started,
        reportId,
        sql,
        logger,
        router: options.router ?? null,
      });
      if (payload !== null) built[section.key] = payload;
    }
    await completeReport(sql, reportId, started, built);
    logger.info('report ready', {
      report_id: reportId,
      snapshot_id: started.snapshotId,
      sections: Object.keys(built).join(','),
    });
  } catch (error) {
    const code = errorCode(error);
    if (!CODES_THAT_KEEP_THE_REPORT.has(code)) await failReport(sql, reportId, code);
    throw error;
  }
}
