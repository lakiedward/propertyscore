import { http, HttpResponse } from 'msw';
import { buildListing } from '@/test/factories/listing';
import { supabaseUrl } from '../supabase-url';

type ListingRow = ReturnType<typeof buildListing>;
type SortKey = 'published_at' | 'id';

const SEEDED_LISTINGS = [
  buildListing({ title: 'Apartament cu 3 camere', price: 125000, verification: 'physical' }),
  buildListing({ title: '3 camere cu balcon', verification: 'smartcheck', smartcheck_score: 74 }),
  buildListing({ title: '2 camere mobilat', transaction: 'rent', price: 450 }),
  buildListing({ title: 'Ciornă de anunț', status: 'draft', published_at: null }),
];

export function listingsResponse(items: ListingRow[], total = items.length, offset = 0) {
  const last = Math.max(offset + items.length - 1, offset);
  return HttpResponse.json(items, {
    headers: { 'Content-Range': `${String(offset)}-${String(last)}/${String(total)}` },
  });
}

function eqValue(params: URLSearchParams, column: string): string | undefined {
  return params.get(column)?.replace(/^eq\./, '');
}

function isSortKey(value: string): value is SortKey {
  return value === 'published_at' || value === 'id';
}

function compareBy(order: string | null) {
  const terms = (order ?? '')
    .split(',')
    .map((term) => term.split('.'))
    .flatMap(([column = '', direction = 'asc']) =>
      isSortKey(column) ? [{ column, descending: direction === 'desc' }] : [],
    );
  return (left: ListingRow, right: ListingRow) => {
    for (const { column, descending } of terms) {
      const result = (left[column] ?? '').localeCompare(right[column] ?? '');
      if (result !== 0) {
        return descending ? -result : result;
      }
    }
    return 0;
  };
}

export const listingHandlers = [
  http.get(supabaseUrl('/rest/v1/listings'), ({ request }) => {
    const params = new URL(request.url).searchParams;
    const status = eqValue(params, 'status');
    const transaction = eqValue(params, 'transaction');
    const offset = Number(params.get('offset') ?? 0);
    const limit = Number(params.get('limit') ?? SEEDED_LISTINGS.length);
    const matching = SEEDED_LISTINGS.filter(
      (item) =>
        (status === undefined || item.status === status) &&
        (transaction === undefined || item.transaction === transaction),
    ).sort(compareBy(params.get('order')));
    return listingsResponse(matching.slice(offset, offset + limit), matching.length, offset);
  }),
];
