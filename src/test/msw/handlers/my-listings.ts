import { http, HttpResponse } from 'msw';
import type { MyListing } from '@/features/listings';
import { buildMyListing, toMyListingRow } from '@/test/factories/my-listing';
import { supabaseUrl } from '../supabase-url';

export const SEEDED_MY_LISTINGS: MyListing[] = [
  buildMyListing({
    status: 'rejected',
    title: 'Studio, Dâmbovița',
    decisions: [
      {
        id: 'c3000000-0000-4000-8000-000000000001',
        decision: 'rejected',
        reasons: ['photos'],
        message: 'Adaugă fotografii cu baia și bucătăria.',
        created_at: '2026-11-05T10:05:00.000Z',
      },
    ],
  }),
  buildMyListing({
    status: 'blocked',
    title: 'Apartament 3 camere, Lipovei',
    decisions: [
      {
        id: 'c3000000-0000-4000-8000-000000000002',
        decision: 'blocked',
        reasons: ['duplicate'],
        message: 'Locuința este deja publicată într-un alt anunț.',
        created_at: '2026-11-04T16:40:00.000Z',
      },
    ],
  }),
];

const CITY_TIMISOARA = {
  id: 'c4000000-0000-4000-8000-000000000001',
  name: 'Timișoara',
  center: '0101000020E610000052616C21C8393540AA2B9FE579E04640',
};

export function myListingsResponse(listings: readonly MyListing[]) {
  return http.get(supabaseUrl('/rest/v1/listings'), ({ request }) => {
    const params = new URL(request.url).searchParams;
    const select = params.get('select') ?? '';
    if (!params.has('owner_id')) {
      return undefined;
    }
    if (select.includes('photos')) {
      const id = params.get('id')?.replace(/^eq\./, '');
      return HttpResponse.json(listings.filter((listing) => listing.id === id));
    }
    const rows = listings.map((listing) => toMyListingRow(listing));
    const last = Math.max(rows.length - 1, 0);
    return HttpResponse.json(rows, {
      headers: { 'Content-Range': `0-${String(last)}/${String(rows.length)}` },
    });
  });
}

export const myListingHandlers = [
  myListingsResponse(SEEDED_MY_LISTINGS),
  http.get(supabaseUrl('/rest/v1/cities'), () => HttpResponse.json([CITY_TIMISOARA])),
  http.patch(supabaseUrl('/rest/v1/listings'), ({ request }) => {
    const id = new URL(request.url).searchParams.get('id')?.replace(/^eq\./, '');
    return HttpResponse.json(id ? [{ id }] : []);
  }),
  http.post(supabaseUrl('/rest/v1/listings'), () =>
    HttpResponse.json({ id: 'c1000000-0000-4000-8000-000000009999' }),
  ),
  http.post(supabaseUrl('/rest/v1/rpc/submit_listing'), ({ request }) =>
    HttpResponse.json({ id: new URL(request.url).pathname, status: 'pending_approval' }),
  ),
];
