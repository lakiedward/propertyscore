import type { Sql } from '../db/sql.ts';
import { errorCode } from '../lib/errors.ts';
import type { Logger } from '../lib/logger.ts';
import { generateReport } from '../report/generate-report.ts';
import type { ReportSection } from '../report/report-section.ts';
import { readReadyReport } from '../report-pdf/report-pdf.db.ts';
import type { ValhallaClient } from '../routing/valhalla.ts';
import type { EarthquakeCatalog } from '../scoring/seismic/earthquake-catalog.ts';
import { startLeaseRenewal } from './lease-renewal.ts';
import type { ReportPdfStorage } from './report-pdf-storage.ts';
import { registerNewReportPdf, type RenderReport } from './report-pdf-variants.ts';
import { attachReportPdf, extendReportClaim, reportPdfPath } from './report-queue.db.ts';

const LEASE_RENEWAL_MS = 5 * 60_000;

const PDF_ATTEMPTS = 2;

export type ProcessReportOptions = {
  sql: Sql;
  reportId: string;
  sections: readonly ReportSection[];
  renderReport: RenderReport;
  storage: ReportPdfStorage;
  logger: Logger;
  router?: ValhallaClient | null;
  earthquakes?: EarthquakeCatalog | null;
  leaseRenewalMs?: number;
};

async function withAttempts<T>(
  attempts: number,
  logger: Logger,
  reportId: string,
  run: () => Promise<T>,
): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      if (attempt >= attempts) throw error;
      logger.warn('report pdf attempt failed', {
        report_id: reportId,
        attempt,
        code: errorCode(error),
      });
    }
  }
}

export async function processReport(options: ProcessReportOptions): Promise<void> {
  const { sql, reportId, logger } = options;
  const lease = startLeaseRenewal(
    reportId,
    () => extendReportClaim(sql, reportId),
    options.leaseRenewalMs ?? LEASE_RENEWAL_MS,
    logger,
  );
  try {
    await generateReport({
      sql,
      reportId,
      sections: options.sections,
      router: options.router ?? null,
      earthquakes: options.earthquakes ?? null,
      logger,
      deliver: async (transaction) => {
        lease.stop();
        const raw = await readReadyReport(transaction, reportId);
        const path = await reportPdfPath(transaction, reportId);
        const bytes = await withAttempts(PDF_ATTEMPTS, logger, reportId, async () => {
          const pdf = await options.renderReport(raw);
          await options.storage.upload(path, pdf);
          return pdf.length;
        });
        await attachReportPdf(transaction, reportId, path);
        await registerNewReportPdf(transaction, reportId, path);
        logger.info('report pdf stored', { report_id: reportId, bytes });
      },
    });
  } finally {
    lease.stop();
  }
}
