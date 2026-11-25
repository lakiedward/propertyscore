import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { createSql, type Sql } from '../db/sql.ts';
import { WorkerError } from '../lib/errors.ts';
import { createLogger } from '../lib/logger.ts';
import { generateReport } from '../report/generate-report.ts';
import type { ReportSection } from '../report/report-section.ts';
import { refreshReportPdf } from '../report-pdf/render-report-pdf.ts';
import { reportInputSchema, type ReportData } from '../report-pdf/report-data.ts';
import { processReport } from './process-report.ts';
import type { ReportPdfStorage, StoredReportPdfStorage } from './report-pdf-storage.ts';
import { claimNextReport, REPORT_QUEUE_CHANNEL } from './report-queue.db.ts';

const silentLogger = createLogger('error', () => undefined);

const databaseUrl = process.env.DATABASE_URL;

const OWNER_ID = 'e0000000-0000-4000-8000-0000000000bb';
const PIATA_MARE = { latitude: 45.7983, longitude: 24.152 };

const greenSection: ReportSection = {
  key: 'green',
  build: ({ citySlug }) => Promise.resolve({ city: citySlug }),
};

function recordingStorage() {
  const uploads: { path: string; bytes: number }[] = [];
  const storage: ReportPdfStorage = {
    upload: (path, pdf) => {
      uploads.push({ path, bytes: pdf.length });
      return Promise.resolve();
    },
  };
  return { storage, uploads };
}

type ReportRow = {
  status: string;
  error_code: string | null;
  pdf_path: string | null;
  claim_expires_at: Date | null;
  generation_attempts: number;
  generated_at: Date | null;
  updated_at: Date;
  result: Record<string, unknown>;
};

describe.skipIf(!databaseUrl)('processReport against the local database', () => {
  let sql: Sql;
  let previousReady: string | undefined;
  let hadSibiuCells = false;
  let snapshotId = '';

  async function orderReport(addressText: string): Promise<string> {
    return sql.begin(async (transaction) => {
      await transaction`set local role authenticated`;
      await transaction`
        select set_config(
          'request.jwt.claims',
          ${JSON.stringify({ sub: OWNER_ID, role: 'authenticated', user_roles: ['user'] })},
          true
        )
      `;
      const [row] = await transaction<{ id: string }[]>`
        select public.create_online_report(
          ${addressText}, ${PIATA_MARE.latitude}, ${PIATA_MARE.longitude}
        ) as id
      `;
      return row?.id ?? '';
    });
  }

  async function readReport(reportId: string): Promise<ReportRow | undefined> {
    const [row] = await sql<ReportRow[]>`
      select status, error_code, pdf_path, claim_expires_at, generation_attempts,
        generated_at, updated_at, result
      from public.online_reports where id = ${reportId}
    `;
    return row;
  }

  beforeAll(async () => {
    sql = createSql(databaseUrl ?? '');
    const [ready] = await sql<{ id: string }[]>`
      select id from public.score_snapshots where status = 'ready'
    `;
    previousReady = ready?.id;
    const [cells] = await sql<{ has_cells: boolean }[]>`
      select exists (
        select 1 from private.grid_cells g
        join public.cities c on c.id = g.city_id
        where c.slug = 'sibiu' and g.size_m = 175
      ) as has_cells
    `;
    hadSibiuCells = cells?.has_cells ?? false;

    await sql`insert into auth.users (id, email) values (${OWNER_ID}, 'queue-owner@example.test')`;
    await sql`insert into public.smartcheck_unlimited_accounts (user_id) values (${OWNER_ID})`;
    const [started] = await sql<{ id: string }[]>`
      select private.start_score_snapshot('2026-11-01') as id
    `;
    snapshotId = started?.id ?? '';
    await sql`
      select private.build_grid_cells(c.id, 175), private.seed_cell_scores(${snapshotId}, c.id)
      from public.cities c where c.slug = 'sibiu'
    `;
    await sql`
      update private.cell_scores set categories = '{"green": 70, "noise": 50}'
      where snapshot_id = ${snapshotId}
    `;
    await sql`select private.compute_overall_scores(${snapshotId})`;
    await sql`select private.compute_snapshot_stats(${snapshotId})`;
    await sql`select private.publish_score_snapshot(${snapshotId}, '{"osm": "2026-10-31"}')`;
  });

  afterAll(async () => {
    await sql`delete from public.online_reports where owner_id = ${OWNER_ID}`;
    await sql`delete from auth.users where id = ${OWNER_ID}`;
    await sql`delete from public.score_snapshots where id = ${snapshotId}`;
    if (!hadSibiuCells) {
      await sql`
        delete from private.grid_cells
        where city_id = (select id from public.cities where slug = 'sibiu')
      `;
    }
    if (previousReady) {
      await sql`update public.score_snapshots set status = 'ready' where id = ${previousReady}`;
    }
    await sql.end({ timeout: 5 });
  });

  it('takes a report ordered through the RPC to ready with its PDF stored and linked', async () => {
    const announced: string[] = [];
    const listener = await sql.listen(REPORT_QUEUE_CHANNEL, (payload) => announced.push(payload));
    const reportId = await orderReport('Piața Mare 1, Sibiu');
    await vi.waitFor(() => {
      expect(announced).toContain(reportId);
    });
    await listener.unlisten();

    expect(await claimNextReport(sql)).toBe(reportId);
    const { storage, uploads } = recordingStorage();
    const renderReport = vi.fn((raw: unknown) => {
      expect(raw).toMatchObject({ address_text: 'Piața Mare 1, Sibiu' });
      return Promise.resolve(Buffer.from('%PDF-1.7 report'));
    });

    await processReport({
      sql,
      reportId,
      sections: [greenSection],
      renderReport,
      storage,
      logger: silentLogger,
    });

    const expectedPath = `${OWNER_ID}/${reportId}.pdf`;
    expect(uploads).toEqual([{ path: expectedPath, bytes: 15 }]);
    expect(await readReport(reportId)).toMatchObject({
      status: 'ready',
      error_code: null,
      pdf_path: expectedPath,
      claim_expires_at: null,
      generation_attempts: 1,
      result: { green: { city: 'sibiu' } },
    });
    expect(await claimNextReport(sql)).toBeNull();
  });

  it('replaces the PDF from the saved result even when a section has no data', async () => {
    const reportId = await orderReport('Adresă sintetică pentru PDF, Sibiu');
    expect(await claimNextReport(sql)).toBe(reportId);
    const originalPdf = Buffer.from('%PDF-1.7 original');
    const updatedPdf = Buffer.from('%PDF-1.7 updated');
    const storage = {
      upload: vi.fn<ReportPdfStorage['upload']>().mockResolvedValue(undefined),
      replace: vi.fn<StoredReportPdfStorage['replace']>().mockResolvedValue(undefined),
    };
    await processReport({
      sql,
      reportId,
      sections: [
        { key: 'green', build: () => Promise.resolve({ schema_version: 1, status: 'no_data' }) },
        { key: 'questions', build: () => Promise.resolve({ schema_version: 1, status: 'legacy' }) },
      ],
      renderReport: () => Promise.resolve(originalPdf),
      storage,
      logger: silentLogger,
    });
    const saved = await readReport(reportId);
    const path = `${OWNER_ID}/${reportId}.pdf`;
    expect(saved).toMatchObject({ status: 'ready', pdf_path: path });
    expect(storage.upload).toHaveBeenCalledExactlyOnceWith(path, originalPdf);

    const renderReport = vi.fn<(_: ReportData) => Promise<Buffer>>(() =>
      Promise.resolve(updatedPdf),
    );
    await refreshReportPdf({ sql, reportId, storage, renderReport, logger: silentLogger });

    const summary = reportInputSchema.shape.result.parse(saved?.result);
    const rendered = renderReport.mock.calls[0]?.[0];
    expect(renderReport).toHaveBeenCalledTimes(1);
    expect(rendered?.zone).toEqual(summary.zone);
    expect(rendered?.categories).toEqual(summary.categories);
    expect(rendered?.sections.green).toBeNull();
    expect(storage.replace).toHaveBeenCalledExactlyOnceWith(path, updatedPdf);
    expect(await readReport(reportId)).toEqual(saved);
  });

  it('does not replace an existing PDF when a rendered section of its result is unreadable', async () => {
    const reportId = await orderReport('Adresă sintetică cu date invalide, Sibiu');
    expect(await claimNextReport(sql)).toBe(reportId);
    const { storage: generationStorage } = recordingStorage();
    await processReport({
      sql,
      reportId,
      sections: [greenSection],
      renderReport: () => Promise.resolve(Buffer.from('%PDF-1.7 old')),
      storage: generationStorage,
      logger: silentLogger,
    });
    const saved = await readReport(reportId);
    const storage = { replace: vi.fn<StoredReportPdfStorage['replace']>() };
    const renderReport = vi.fn(() => Promise.resolve(Buffer.from('%PDF-1.7')));

    await expect(
      refreshReportPdf({ sql, reportId, storage, renderReport, logger: silentLogger }),
    ).rejects.toMatchObject({ code: 'report_sections_invalid' });
    expect(renderReport).not.toHaveBeenCalled();
    expect(storage.replace).not.toHaveBeenCalled();
    expect(await readReport(reportId)).toEqual(saved);
  });

  it('does not render or upload when the report has no stored PDF', async () => {
    const reportId = await orderReport('Adresă sintetică fără PDF, Sibiu');
    expect(await claimNextReport(sql)).toBe(reportId);
    await generateReport({ sql, reportId, sections: [greenSection], logger: silentLogger });
    const storage = { replace: vi.fn<StoredReportPdfStorage['replace']>() };
    const renderReport = vi.fn(() => Promise.resolve(Buffer.from('%PDF-1.7')));

    await expect(
      refreshReportPdf({ sql, reportId, storage, renderReport, logger: silentLogger }),
    ).rejects.toMatchObject({ code: 'report_pdf_not_stored' });
    expect(renderReport).not.toHaveBeenCalled();
    expect(storage.replace).not.toHaveBeenCalled();
  });

  it('marks the report failed with the PDF code and keeps nothing of the result when the PDF cannot be made', async () => {
    const reportId = await orderReport('Piața Mare 2, Sibiu');
    expect(await claimNextReport(sql)).toBe(reportId);
    const { storage, uploads } = recordingStorage();
    const renderReport = vi.fn(() =>
      Promise.reject(new WorkerError('pdf_render_failed', 'Chromium crashed')),
    );

    await expect(
      processReport({
        sql,
        reportId,
        sections: [greenSection],
        renderReport,
        storage,
        logger: silentLogger,
      }),
    ).rejects.toMatchObject({ code: 'pdf_render_failed' });

    expect(renderReport).toHaveBeenCalledTimes(2);
    expect(uploads).toEqual([]);
    expect(await readReport(reportId)).toMatchObject({
      status: 'failed',
      error_code: 'pdf_render_failed',
      pdf_path: null,
      result: {},
    });
    expect(await claimNextReport(sql)).toBeNull();
  });

  it('takes back a report whose worker died during generation and finishes it', async () => {
    const reportId = await orderReport('Piața Mare 3, Sibiu');
    expect(await claimNextReport(sql)).toBe(reportId);
    await sql`select private.begin_online_report(${reportId})`;
    expect(await claimNextReport(sql)).toBeNull();

    await sql.begin(async (transaction) => {
      await transaction`set local session_replication_role = replica`;
      await transaction`
        update public.online_reports
        set claim_expires_at = now() - interval '1 minute', updated_at = now() - interval '16 minutes'
        where id = ${reportId}
      `;
    });

    expect(await claimNextReport(sql)).toBe(reportId);
    const { storage } = recordingStorage();
    await processReport({
      sql,
      reportId,
      sections: [greenSection],
      renderReport: () => Promise.resolve(Buffer.from('%PDF-1.7')),
      storage,
      logger: silentLogger,
    });

    expect(await readReport(reportId)).toMatchObject({
      status: 'ready',
      pdf_path: `${OWNER_ID}/${reportId}.pdf`,
      generation_attempts: 2,
    });
  });
});
