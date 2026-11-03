import { http } from 'msw';
import { buildOnlineReport } from '@/test/factories/online-report';
import { onlineReportResponse, SEEDED_ONLINE_REPORT } from '@/test/msw/handlers/online-reports';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { getOnlineReport } from './online-reports.api';

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
