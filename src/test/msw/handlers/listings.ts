import { http, HttpResponse } from 'msw';
import { buildListing } from '@/test/factories/listing';
import { supabaseUrl } from '../supabase-url';

type ListingRow = ReturnType<typeof buildListing>;
type SortKey = 'published_at' | 'id' | 'price' | 'area_m2';

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

function withinRange(
  params: URLSearchParams,
  column: 'latitude' | 'longitude' | 'price',
  value: number,
) {
  return params.getAll(column).every((filter) => {
    const dot = filter.indexOf('.');
    const operator = filter.slice(0, dot);
    const limit = Number(filter.slice(dot + 1));
    if (operator === 'gte') {
      return value >= limit;
    }
    if (operator === 'lte') {
      return value <= limit;
    }
    return true;
  });
}

function isSortKey(value: string): value is SortKey {
  return value === 'published_at' || value === 'id' || value === 'price' || value === 'area_m2';
}

function compareValues(left: string | number | null, right: string | number | null): number {
  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }
  return String(left ?? '').localeCompare(String(right ?? ''));
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
      const result = compareValues(left[column], right[column]);
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
    const currency = eqValue(params, 'currency');
    const offset = Number(params.get('offset') ?? 0);
    const limit = Number(params.get('limit') ?? SEEDED_LISTINGS.length);
    const matching = SEEDED_LISTINGS.filter(
      (item) =>
        (status === undefined || item.status === status) &&
        (transaction === undefined || item.transaction === transaction) &&
        (currency === undefined || item.currency === currency) &&
        withinRange(params, 'price', item.price) &&
        withinRange(params, 'latitude', item.latitude) &&
        withinRange(params, 'longitude', item.longitude),
    ).sort(compareBy(params.get('order')));
    return listingsResponse(matching.slice(offset, offset + limit), matching.length, offset);
  }),
];

const ROMANIA_REGIONS_FIXTURE = {
  outline: [
    [
      [
        [20, 43],
        [30, 43],
        [30, 49],
        [20, 49],
        [20, 43],
      ],
    ],
  ],
  regions: [
    {
      id: 'timis',
      name: 'Timiș',
      coordinates: [
        [
          [
            [20.5, 45.2],
            [22.5, 45.2],
            [22.5, 46.2],
            [20.5, 46.2],
            [20.5, 45.2],
          ],
        ],
      ],
    },
    {
      id: 'bucuresti',
      name: 'București',
      coordinates: [
        [
          [
            [25.9, 44.3],
            [26.3, 44.3],
            [26.3, 44.6],
            [25.9, 44.6],
            [25.9, 44.3],
          ],
        ],
      ],
    },
  ],
};

export const geoHandlers = [
  http.get('*/geo/romania-regions.json', () => HttpResponse.json(ROMANIA_REGIONS_FIXTURE)),
];
