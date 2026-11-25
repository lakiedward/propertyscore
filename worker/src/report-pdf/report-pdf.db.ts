import type { SqlQueries } from '../db/sql.ts';
import { WorkerError } from '../lib/errors.ts';

type ReportRow = {
  number: string;
  address_text: string;
  latitude: number;
  longitude: number;
  generated_at: Date | null;
  locale: string;
  status: string;
  result: unknown;
  pdf_path: string | null;
};

type ReadyReportRow = ReportRow & { generated_at: Date };

async function readReadyReportRow(sql: SqlQueries, reportId: string): Promise<ReadyReportRow> {
  const [row] = await sql<ReportRow[]>`
    select number, address_text, latitude, longitude, generated_at, locale, status, result, pdf_path
    from public.online_reports
    where id = ${reportId}
  `;
  if (!row) throw new WorkerError('report_not_found', 'No report with this id');
  if (row.status !== 'ready' || row.generated_at === null) {
    throw new WorkerError('report_not_ready', 'Only a ready report can be rendered as a PDF');
  }
  return { ...row, generated_at: row.generated_at };
}

function toReportInput(row: ReadyReportRow) {
  return {
    number: Number(row.number),
    address_text: row.address_text,
    latitude: row.latitude,
    longitude: row.longitude,
    generated_at: row.generated_at.toISOString(),
    locale: row.locale,
    result: row.result,
  };
}

export async function readReadyReport(sql: SqlQueries, reportId: string): Promise<unknown> {
  return toReportInput(await readReadyReportRow(sql, reportId));
}

export async function readStoredReportPdf(sql: SqlQueries, reportId: string) {
  const row = await readReadyReportRow(sql, reportId);
  if (row.pdf_path === null) {
    throw new WorkerError('report_pdf_not_stored', 'The ready report has no stored PDF to replace');
  }
  return { path: row.pdf_path, input: toReportInput(row) };
}
