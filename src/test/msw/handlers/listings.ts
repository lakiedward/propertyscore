import { http, HttpResponse } from 'msw';
import { buildListing } from '@/test/factories/listing';
import { supabaseUrl } from '../supabase-url';

const SEEDED_LISTINGS = [
  buildListing({ title: 'Apartament cu 3 camere', price: 125000, verification: 'physical' }),
  buildListing({ title: '3 camere cu balcon', verification: 'smartcheck', smartcheck_score: 74 }),
  buildListing({ title: '2 camere mobilat', transaction: 'rent', price: 450 }),
];

export function listingsResponse(items: ReturnType<typeof buildListing>[]) {
  return HttpResponse.json(items, {
    headers: {
      'Content-Range': `0-${String(Math.max(items.length - 1, 0))}/${String(items.length)}`,
    },
  });
}

export const listingHandlers = [
  http.get(supabaseUrl('/rest/v1/listings'), ({ request }) => {
    const transaction = new URL(request.url).searchParams.get('transaction')?.replace('eq.', '');
    return listingsResponse(SEEDED_LISTINGS.filter((item) => item.transaction === transaction));
  }),
];
