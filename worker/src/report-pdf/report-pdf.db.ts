import type { Sql } from '../db/sql.ts';
import { WorkerError } from '../lib/errors.ts';

export async function readReadyReport(sql: Sql, reportId: string): Promise<unknown> {
  const [row] = await sql<
    {
      number: string;
      address_text: string;
      latitude: number;
      longitude: number;
      generated_at: Date | null;
      status: string;
      result: unknown;
    }[]
  >`
    select number, address_text, latitude, longitude, generated_at, status, result
    from public.online_reports
    where id = ${reportId}
  `;
  if (!row) throw new WorkerError('report_not_found', 'No report with this id');
  if (row.status !== 'ready' || row.generated_at === null) {
    throw new WorkerError('report_not_ready', 'Only a ready report can be rendered as a PDF');
  }
  return {
    number: Number(row.number),
    address_text: row.address_text,
    latitude: row.latitude,
    longitude: row.longitude,
    generated_at: row.generated_at.toISOString(),
    result: row.result,
  };
}
