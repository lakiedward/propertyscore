import { http, HttpResponse } from 'msw';
import { buildOnlineReport } from '@/test/factories/online-report';
import { supabaseUrl } from '../supabase-url';

export const SEEDED_ONLINE_REPORT = buildOnlineReport();

export const SEEDED_SHARE_TOKEN = 'a'.repeat(48);

export const CREATED_SHARE_TOKEN = 'b'.repeat(48);

export function onlineReportResponse(report: ReturnType<typeof buildOnlineReport> | null) {
  return HttpResponse.json(report === null ? [] : [report]);
}

export const onlineReportHandlers = [
  http.get(supabaseUrl('/rest/v1/online_reports'), ({ request }) => {
    const id = new URL(request.url).searchParams.get('id')?.replace(/^eq\./, '');
    return onlineReportResponse(id === SEEDED_ONLINE_REPORT.id ? SEEDED_ONLINE_REPORT : null);
  }),
  http.post(supabaseUrl('/rest/v1/rpc/resolve_report_share_link'), async ({ request }) => {
    const body: unknown = await request.json();
    const isValid =
      typeof body === 'object' &&
      body !== null &&
      'p_report_id' in body &&
      'p_token' in body &&
      body.p_report_id === SEEDED_ONLINE_REPORT.id &&
      body.p_token === SEEDED_SHARE_TOKEN;
    return onlineReportResponse(isValid ? SEEDED_ONLINE_REPORT : null);
  }),
  http.get(supabaseUrl('/rest/v1/report_share_links'), () => HttpResponse.json([])),
  http.post(supabaseUrl('/rest/v1/rpc/create_report_share_link'), () =>
    HttpResponse.json(CREATED_SHARE_TOKEN),
  ),
  http.post(
    supabaseUrl('/rest/v1/rpc/revoke_report_share_link'),
    () => new HttpResponse(null, { status: 204 }),
  ),
];
