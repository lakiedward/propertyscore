import { http, HttpResponse } from 'msw';
import { buildSession } from '@/test/factories/auth';
import { supabaseUrl } from '../supabase-url';

const API_VERSION_HEADERS = { 'X-Supabase-Api-Version': '2024-01-01' };

export function authErrorResponse(code: string, status = 400) {
  return HttpResponse.json(
    { code, error_code: code, msg: code, message: code },
    { status, headers: API_VERSION_HEADERS },
  );
}

export const authHandlers = [
  http.post(supabaseUrl('/auth/v1/token'), () => {
    const session = buildSession();
    return HttpResponse.json(session, { headers: API_VERSION_HEADERS });
  }),
  http.post(supabaseUrl('/auth/v1/signup'), () => {
    const session = buildSession();
    return HttpResponse.json(session, { headers: API_VERSION_HEADERS });
  }),
  http.post(supabaseUrl('/auth/v1/logout'), () => new HttpResponse(null, { status: 204 })),
];
