import { z } from 'zod';

import type { JsonObject, Sql } from '../db/sql.ts';
import { errorCode } from '../lib/errors.ts';
import type { Logger } from '../lib/logger.ts';
import type { ValhallaClient } from '../routing/valhalla.ts';
import { CATEGORY_KEYS, type CategoryKey } from '../scoring/categories.ts';
import {
  interpolateAddressCategories,
  overallScore,
  type AddressScores,
} from './address-scores.ts';
import { beginReport, completeReport, failReport, type StartedReport } from './report.db.ts';
import type { ReportSection } from './report-section.ts';

const CODES_THAT_KEEP_THE_REPORT = new Set(['report_already_ready', 'report_in_progress']);

export type GenerateReportOptions = {
  sql: Sql;
  reportId: string;
  sections: readonly ReportSection[];
  logger: Logger;
  router?: ValhallaClient | null;
};

const weightsSchema = z.record(z.string(), z.number());

function categoryKey(key: string): CategoryKey | null {
  return CATEGORY_KEYS.find((candidate) => candidate === key) ?? null;
}

async function addressScores(
  sql: Sql,
  started: StartedReport,
  exact: ReadonlyMap<CategoryKey, number>,
): Promise<AddressScores> {
  const categories = await interpolateAddressCategories(sql, started);
  for (const [key, score] of exact) categories[key] = score;
  return { overall: overallScore(categories, weightsSchema.parse(started.weights)), categories };
}

export async function generateReport(options: GenerateReportOptions): Promise<void> {
  const { sql, reportId, logger } = options;
  try {
    const started = await beginReport(sql, reportId);
    const built: JsonObject = {};
    const exact = new Map<CategoryKey, number>();
    for (const section of options.sections) {
      const payload = await section.build({
        ...started,
        reportId,
        sql,
        logger,
        router: options.router ?? null,
      });
      if (payload === null) continue;
      built[section.key] = payload;
      const score = section.addressScore?.(payload) ?? null;
      const key = categoryKey(section.key);
      if (score !== null && key !== null) exact.set(key, score);
    }
    const scores = await addressScores(sql, started, exact);
    await completeReport(sql, reportId, started, built, scores);
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
