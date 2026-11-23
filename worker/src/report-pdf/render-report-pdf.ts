import { readFile, writeFile } from 'node:fs/promises';

import type { Sql } from '../db/sql.ts';
import { WorkerError } from '../lib/errors.ts';
import type { Logger } from '../lib/logger.ts';
import { renderPdf } from '../pdf/render-pdf.ts';
import { buildReportDocument } from './build-document.ts';
import { reportInputSchema, toReportData, type ReportData } from './report-data.ts';
import { readReadyReport } from './report-pdf.db.ts';

export type RenderReportPdfOptions = {
  source: { reportId: string; sql: Sql } | { inputPath: string };
  outputPath: string;
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

function parseReportInput(raw: unknown): ReportData {
  const parsed = reportInputSchema.safeParse(raw);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new WorkerError('report_input_invalid', `The report cannot be read: ${fields}`);
  }
  return toReportData(parsed.data);
}

export type RenderReportOptions = {
  chromiumPath?: string;
  logger: Logger;
};

export async function renderReportDocument(
  raw: unknown,
  options: RenderReportOptions,
): Promise<{ number: number; pdf: Buffer }> {
  const report = parseReportInput(raw);
  if (report.unreadableSections.length > 0) {
    options.logger.warn('report sections left out of the pdf', {
      sections: report.unreadableSections.join(','),
    });
  }
  const document = await buildReportDocument(report);
  const pdf = await renderPdf(document, { executablePath: options.chromiumPath });
  return { number: report.number, pdf };
}

export async function renderReportPdf(options: RenderReportPdfOptions): Promise<void> {
  const { source, logger } = options;
  const raw =
    'reportId' in source
      ? await readReadyReport(source.sql, source.reportId)
      : await readInputFile(source.inputPath);
  const { number, pdf } = await renderReportDocument(raw, {
    chromiumPath: options.chromiumPath,
    logger,
  });
  await writeFile(options.outputPath, pdf);
  logger.info('report pdf written', { report_number: number, bytes: pdf.length });
}
