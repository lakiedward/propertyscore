import { http, HttpResponse } from 'msw';
import { buildProfile } from '@/test/factories/profile';
import { supabaseUrl } from '../supabase-url';

export const profileHandlers = [
  http.get(supabaseUrl('/rest/v1/profiles'), () => HttpResponse.json(buildProfile())),
  http.patch(supabaseUrl('/rest/v1/profiles'), async ({ request }) => {
    const body: unknown = await request.json();
    const locale =
      typeof body === 'object' && body !== null && 'locale' in body && body.locale === 'en'
        ? 'en'
        : 'ro';
    return HttpResponse.json(buildProfile({ locale }));
  }),
];
