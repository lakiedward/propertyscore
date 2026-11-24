import { http, HttpResponse } from 'msw';
import { isAppError } from '@/lib/errors';
import { buildReportRow } from '@/test/factories/smart-check-report';
import { postgrestErrorResponse } from '@/test/msw/postgrest-error';
import { SEEDED_REPORT, SEEDED_SHARE_TOKEN } from '@/test/msw/handlers/smart-check';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { getReport, getSharedReport, listMyReports, MY_REPORTS_PAGE_SIZE } from './smart-check.api';

async function caught(promise: Promise<unknown>) {
  return promise.then(
    () => undefined,
    (error: unknown) => error,
  );
}

function reportResponse(row: ReturnType<typeof buildReportRow>) {
  return http.get(supabaseUrl('/rest/v1/online_reports'), () => HttpResponse.json([row]));
}

describe('smart-check.api', () => {
  it('reads a ready report and parses its result', async () => {
    const report = await getReport(SEEDED_REPORT.id);

    expect(report.status).toBe('ready');
    expect(report.result?.city.name).toBe('Timișoara');
    expect(report.result?.unreadableSections).toEqual([]);
  });

  it('returns a report that is not ready without a result', async () => {
    const generating = buildReportRow({ status: 'generating', result: {} });
    server.use(reportResponse(generating));

    await expect(getReport(generating.id)).resolves.toMatchObject({
      status: 'generating',
      result: null,
    });
  });

  it('fails with unknown when a ready result has no summary', async () => {
    const broken = buildReportRow({ result: {} });
    server.use(reportResponse(broken));

    const error = await caught(getReport(broken.id));
    expect(isAppError(error) && error.code).toBe('unknown');
  });

  it('answers not_found for a malformed id or a hidden report', async () => {
    const malformed = await caught(getReport('report-1'));
    const hidden = await caught(getReport(buildReportRow().id));

    expect(isAppError(malformed) && malformed.code).toBe('not_found');
    expect(isAppError(hidden) && hidden.code).toBe('not_found');
  });

  it('reads a shared report only with its token', async () => {
    await expect(getSharedReport(SEEDED_REPORT.id, SEEDED_SHARE_TOKEN)).resolves.toMatchObject({
      id: SEEDED_REPORT.id,
    });
    const wrong = await caught(getSharedReport(SEEDED_REPORT.id, 'b'.repeat(48)));
    const malformed = await caught(getSharedReport(SEEDED_REPORT.id, 'short'));

    expect(isAppError(wrong) && wrong.code).toBe('not_found');
    expect(isAppError(malformed) && malformed.code).toBe('not_found');
  });

  it('lists the own reports one page at a time, newest first', async () => {
    const seen: { search?: URLSearchParams } = {};
    server.use(
      http.get(supabaseUrl('/rest/v1/online_reports'), ({ request }) => {
        seen.search = new URL(request.url).searchParams;
        return HttpResponse.json([], { headers: { 'Content-Range': '*/30' } });
      }),
    );

    await expect(listMyReports(1)).resolves.toEqual({ items: [], total: 30 });
    expect(seen.search?.get('order')).toBe('created_at.desc,id.desc');
    expect(seen.search?.get('offset')).toBe(String(MY_REPORTS_PAGE_SIZE));
  });

  it('turns a failed list into an AppError', async () => {
    server.use(
      http.get(supabaseUrl('/rest/v1/online_reports'), () =>
        postgrestErrorResponse('42501', 'permission denied', 403),
      ),
    );

    const error = await caught(listMyReports());
    expect(isAppError(error) && error.code).toBe('forbidden');
  });
});
