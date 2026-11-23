import { http, HttpResponse } from 'msw';
import { buildReportRow, toMyReportRow } from '@/test/factories/smart-check-report';
import { supabaseUrl } from '../supabase-url';

export const SEEDED_REPORT = buildReportRow();

export const SEEDED_SHARE_TOKEN = 'a'.repeat(48);

function idFilter(request: Request) {
  return new URL(request.url).searchParams.get('id')?.replace(/^eq\./u, '');
}

export const smartCheckHandlers = [
  http.get(supabaseUrl('/rest/v1/online_reports'), ({ request }) => {
    const id = idFilter(request);
    if (id !== undefined) {
      return HttpResponse.json(id === SEEDED_REPORT.id ? [SEEDED_REPORT] : []);
    }
    return HttpResponse.json([toMyReportRow(SEEDED_REPORT)], {
      headers: { 'Content-Range': '0-0/1' },
    });
  }),
  http.post(supabaseUrl('/rest/v1/rpc/resolve_report_share_link'), async ({ request }) => {
    const body: unknown = await request.json();
    const isValid =
      typeof body === 'object' &&
      body !== null &&
      'p_report_id' in body &&
      'p_token' in body &&
      body.p_report_id === SEEDED_REPORT.id &&
      body.p_token === SEEDED_SHARE_TOKEN;
    return HttpResponse.json(isValid ? [SEEDED_REPORT] : []);
  }),
];
