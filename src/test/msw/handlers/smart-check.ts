import { http, HttpResponse } from 'msw';
import {
  buildReportRow,
  toMyReportRow,
  toSharedReportRow,
} from '@/test/factories/smart-check-report';
import { supabaseUrl } from '../supabase-url';

export const SEEDED_REPORT = buildReportRow();

export const SEEDED_SHARE_TOKEN = 'a'.repeat(48);

export const CREATED_SHARE_TOKEN = 'b'.repeat(48);

export const SIGNED_PDF_URL = 'https://files.example.test/smartcheck.pdf';

function isSharedRequest(body: unknown, reportKey: string, tokenKey: string) {
  if (typeof body !== 'object' || body === null) return false;
  const fields = new Map<string, unknown>(Object.entries(body));
  return fields.get(reportKey) === SEEDED_REPORT.id && fields.get(tokenKey) === SEEDED_SHARE_TOKEN;
}

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
    return HttpResponse.json(
      isSharedRequest(body, 'p_report_id', 'p_token') ? [toSharedReportRow(SEEDED_REPORT)] : [],
    );
  }),
  http.get(supabaseUrl('/rest/v1/report_share_links'), () => HttpResponse.json([])),
  http.post(supabaseUrl('/rest/v1/rpc/create_report_share_link'), () =>
    HttpResponse.json(CREATED_SHARE_TOKEN),
  ),
  http.post(
    supabaseUrl('/rest/v1/rpc/revoke_report_share_link'),
    () => new HttpResponse(null, { status: 204 }),
  ),
  http.post(supabaseUrl('/storage/v1/object/sign/online-report-pdfs/*'), () =>
    HttpResponse.json({ signedURL: '/object/sign/online-report-pdfs/report.pdf?token=signed' }),
  ),
  http.post(supabaseUrl('/functions/v1/shared-report-pdf'), async ({ request }) => {
    const body: unknown = await request.json();
    return isSharedRequest(body, 'reportId', 'token')
      ? HttpResponse.json({ url: SIGNED_PDF_URL })
      : HttpResponse.json({ error: 'not_found' }, { status: 404 });
  }),
];
