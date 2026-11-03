import { http, HttpResponse } from 'msw';
import { buildOnlineReport } from '@/test/factories/online-report';
import {
  CREATED_SHARE_TOKEN,
  onlineReportResponse,
  SEEDED_ONLINE_REPORT,
  SEEDED_SHARE_TOKEN,
} from '@/test/msw/handlers/online-reports';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import {
  createReportShareLink,
  getActiveShareLink,
  getOnlineReport,
  getSharedOnlineReport,
} from './online-reports.api';

function serveReport(report: ReturnType<typeof buildOnlineReport>) {
  server.use(http.get(supabaseUrl('/rest/v1/online_reports'), () => onlineReportResponse(report)));
}

describe('getOnlineReport', () => {
  it('returns a ready report with its parsed result', async () => {
    const report = await getOnlineReport(SEEDED_ONLINE_REPORT.id);

    expect(report.status).toBe('ready');
    expect(report.result?.city.name).toBe('Timișoara');
    expect(report.result?.categories.green.score).toBe(84);
  });

  it('gives no result while the report is not ready', async () => {
    const generating = buildOnlineReport({ status: 'generating', result: {} });
    serveReport(generating);

    const report = await getOnlineReport(generating.id);

    expect(report.status).toBe('generating');
    expect(report.result).toBeNull();
  });

  it('answers not found for a missing or hidden report and for an id that is not a uuid', async () => {
    await expect(getOnlineReport('d0000000-0000-4000-8000-999999999999')).rejects.toMatchObject({
      code: 'not_found',
    });
    await expect(getOnlineReport('42')).rejects.toMatchObject({ code: 'not_found' });
  });

  it('refuses a ready report whose result does not match the schema', async () => {
    const broken = buildOnlineReport({ result: { schema_version: 2 } });
    serveReport(broken);

    await expect(getOnlineReport(broken.id)).rejects.toMatchObject({ code: 'unknown' });
  });
});

describe('getSharedOnlineReport', () => {
  it('opens a ready report with a valid share token', async () => {
    const report = await getSharedOnlineReport(SEEDED_ONLINE_REPORT.id, SEEDED_SHARE_TOKEN);

    expect(report.id).toBe(SEEDED_ONLINE_REPORT.id);
    expect(report.result?.categories.green.score).toBe(84);
  });

  it('answers not found for a token that does not open the report or is malformed', async () => {
    await expect(
      getSharedOnlineReport(SEEDED_ONLINE_REPORT.id, 'c'.repeat(48)),
    ).rejects.toMatchObject({ code: 'not_found' });
    await expect(getSharedOnlineReport(SEEDED_ONLINE_REPORT.id, 'short')).rejects.toMatchObject({
      code: 'not_found',
    });
  });
});

describe('createReportShareLink', () => {
  it('returns the new token', async () => {
    await expect(
      createReportShareLink({ reportId: SEEDED_ONLINE_REPORT.id, expiresInDays: 30 }),
    ).resolves.toBe(CREATED_SHARE_TOKEN);
  });
});

describe('getActiveShareLink', () => {
  it('gives no link when the active one has expired', async () => {
    server.use(
      http.get(supabaseUrl('/rest/v1/report_share_links'), () =>
        HttpResponse.json([
          { id: 'l1', created_at: '2026-10-01T10:00:00Z', expires_at: '2026-10-08T10:00:00Z' },
        ]),
      ),
    );

    await expect(getActiveShareLink(SEEDED_ONLINE_REPORT.id)).resolves.toBeNull();
  });
});
