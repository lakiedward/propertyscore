import type { JsonObject, Sql } from '../db/sql.ts';
import { errorCode } from '../lib/errors.ts';
import type { Logger } from '../lib/logger.ts';
import { beginReport, completeReport, failReport } from './report.db.ts';
import type { ReportSection } from './report-section.ts';

export type GenerateReportOptions = {
  sql: Sql;
  reportId: string;
  sections: readonly ReportSection[];
  logger: Logger;
};

export async function generateReport(options: GenerateReportOptions): Promise<void> {
  const { sql, reportId, logger } = options;
  try {
    const started = await beginReport(sql, reportId);
    const built: JsonObject = {};
    for (const section of options.sections) {
      const payload = await section.build({ ...started, sql, logger });
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
    if (code !== 'report_already_ready') await failReport(sql, reportId, code);
    throw error;
  }
}
