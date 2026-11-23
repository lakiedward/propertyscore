import type { Sql, SqlQueries } from '../db/sql.ts';
import { WorkerError } from '../lib/errors.ts';

export const REPORT_QUEUE_CHANNEL = 'online_report_queued';

export async function claimNextReport(sql: Sql): Promise<string | null> {
  const [row] = await sql<{ id: string | null }[]>`
    select private.claim_next_online_report() as id
  `;
  return row?.id ?? null;
}

export async function extendReportClaim(sql: Sql, reportId: string): Promise<boolean> {
  const [row] = await sql<{ extended: boolean }[]>`
    select private.extend_online_report_claim(${reportId}) as extended
  `;
  return row?.extended ?? false;
}

export async function reportPdfPath(sql: SqlQueries, reportId: string): Promise<string> {
  const [row] = await sql<{ path: string | null }[]>`
    select private.online_report_pdf_path(${reportId}) as path
  `;
  if (!row?.path) throw new WorkerError('report_not_found', 'No report with this id');
  return row.path;
}

export async function attachReportPdf(
  sql: SqlQueries,
  reportId: string,
  path: string,
): Promise<void> {
  await sql`select private.attach_online_report_pdf(${reportId}, ${path})`;
}
