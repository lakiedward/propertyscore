import { readFile, writeFile } from 'node:fs/promises';

import type { Sql } from '../db/sql.ts';
import { WorkerError } from '../lib/errors.ts';
import type { Logger } from '../lib/logger.ts';
import { renderPdf } from '../pdf/render-pdf.ts';
import type { StoredReportPdfStorage } from '../report-queue/report-pdf-storage.ts';
import { buildReportDocument } from './build-document.ts';
import {
  reportInputSchema,
  toReportData,
  type ReportData,
  type ReportLocale,
} from './report-data.ts';
import { readReadyReport, readStoredReportPdf } from './report-pdf.db.ts';

export type RenderReportPdfOptions = {
  source: { reportId: string; sql: Sql } | { inputPath: string };
  outputPath: string;
  locale?: ReportLocale;
  chromiumPath?: string;
  logger: Logger;
};

async function readInputFile(path: string): Promise<unknown> {
  const text = await readFile(path, 'utf8').catch((error: unknown) => {
    throw new WorkerError('report_input_unreadable', 'The report input file cannot be read', {
      cause: error,
    });
  });
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    throw new WorkerError('report_input_invalid', 'The report input file is not JSON', {
      cause: error,
    });
  }
}

function parseReportInput(raw: unknown, locale?: ReportLocale): ReportData {
  const parsed = reportInputSchema.safeParse(raw);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new WorkerError('report_input_invalid', `The report cannot be read: ${fields}`);
  }
  return toReportData({ ...parsed.data, locale: locale ?? parsed.data.locale });
}

export type RenderReportOptions = {
  locale?: ReportLocale;
  chromiumPath?: string;
  logger: Logger;
};

async function renderReportData(report: ReportData, chromiumPath?: string): Promise<Buffer> {
  const document = await buildReportDocument(report);
  return renderPdf(document, { executablePath: chromiumPath });
}

export async function renderReportDocument(
  raw: unknown,
  options: RenderReportOptions,
): Promise<{ number: number; pdf: Buffer }> {
  const report = parseReportInput(raw, options.locale);
  if (report.unreadableSections.length > 0) {
    options.logger.warn('report sections left out of the pdf', {
      sections: report.unreadableSections.join(','),
    });
  }
  const pdf = await renderReportData(report, options.chromiumPath);
  return { number: report.number, pdf };
}

export async function renderReportPdf(options: RenderReportPdfOptions): Promise<void> {
  const { source, logger } = options;
  const raw =
    'reportId' in source
      ? await readReadyReport(source.sql, source.reportId)
      : await readInputFile(source.inputPath);
  const { number, pdf } = await renderReportDocument(raw, {
    locale: options.locale,
    chromiumPath: options.chromiumPath,
    logger,
  });
  await writeFile(options.outputPath, pdf);
  logger.info('report pdf written', { report_number: number, bytes: pdf.length });
}

type RefreshReportPdfOptions = Omit<RenderReportOptions, 'locale'> & {
  sql: Sql;
  reportId: string;
  storage: StoredReportPdfStorage;
  renderReport?: typeof renderReportData;
};

export async function refreshReportPdf(options: RefreshReportPdfOptions): Promise<void> {
  const { sql, reportId, storage, chromiumPath, renderReport = renderReportData, logger } = options;
  const { path, input } = await readStoredReportPdf(sql, reportId);
  const report = parseReportInput(input);
  if (report.unreadableSections.length > 0) {
    throw new WorkerError(
      'report_sections_invalid',
      `The stored PDF cannot be replaced: ${report.unreadableSections.join(',')}`,
    );
  }
  const pdf = await renderReport(report, chromiumPath);
  await storage.replace(path, pdf);
  logger.info('stored report pdf refreshed', { report_id: reportId, bytes: pdf.length });
}
