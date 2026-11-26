import type { Sql, SqlQueries } from '../db/sql.ts';
import { errorCode } from '../lib/errors.ts';
import type { Logger } from '../lib/logger.ts';
import { readReadyReport } from '../report-pdf/report-pdf.db.ts';
import type { ReportLocale } from '../report-pdf/report-data.ts';
import type { ReportPdfStorage } from './report-pdf-storage.ts';

export type RenderReport = (raw: unknown, locale?: ReportLocale) => Promise<Buffer>;

export async function registerNewReportPdf(sql: SqlQueries, reportId: string, path: string) {
  await sql`
    insert into private.online_report_pdf_variants (report_id, locale, storage_path)
    select r.id, variants.locale, case when variants.locale = r.locale then ${path} end
    from public.online_reports r
    cross join (values ('ro'), ('en')) as variants(locale)
    where r.id = ${reportId}
  `;
}

type VariantJob = {
  report_id: string;
  locale: ReportLocale;
  owner_id: string;
};

export async function processNextReportPdfVariant(
  sql: Sql,
  renderReport: RenderReport,
  storage: ReportPdfStorage,
  logger: Logger,
): Promise<boolean> {
  return sql.begin(async (transaction) => {
    const [job] = await transaction<VariantJob[]>`
      select v.report_id, v.locale, r.owner_id
      from private.online_report_pdf_variants v
      join public.online_reports r on r.id = v.report_id
      where v.storage_path is null and v.failed_at is null and r.status = 'ready'
      order by v.requested_at, v.report_id, v.locale
      limit 1
      for update of v skip locked
    `;
    if (!job) return false;

    const { report_id: reportId, locale, owner_id: ownerId } = job;
    const path = `${ownerId}/${reportId}-${locale}.pdf`;
    try {
      const raw = await readReadyReport(transaction, reportId);
      const pdf = await renderReport(raw, locale);
      await storage.upload(path, pdf);
    } catch (error) {
      await transaction`
        update private.online_report_pdf_variants
        set failed_at = clock_timestamp()
        where report_id = ${reportId} and locale = ${locale}
      `;
      logger.error('localized report pdf failed', {
        report_id: reportId,
        locale,
        code: errorCode(error),
      });
      return true;
    }

    await transaction`
      update private.online_report_pdf_variants
      set storage_path = ${path}
      where report_id = ${reportId} and locale = ${locale}
    `;
    return true;
  });
}
