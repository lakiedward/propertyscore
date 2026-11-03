import { http, HttpResponse } from 'msw';
import { buildOnlineReport } from '@/test/factories/online-report';
import { supabaseUrl } from '../supabase-url';

export const SEEDED_ONLINE_REPORT = buildOnlineReport();

export function onlineReportResponse(report: ReturnType<typeof buildOnlineReport> | null) {
  return HttpResponse.json(report === null ? [] : [report]);
}

export const onlineReportHandlers = [
  http.get(supabaseUrl('/rest/v1/online_reports'), ({ request }) => {
    const id = new URL(request.url).searchParams.get('id')?.replace(/^eq\./, '');
    return onlineReportResponse(id === SEEDED_ONLINE_REPORT.id ? SEEDED_ONLINE_REPORT : null);
  }),
];
