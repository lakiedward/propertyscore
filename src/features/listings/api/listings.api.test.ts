import { http, HttpResponse } from 'msw';
import { AppError } from '@/lib/errors';
import { buildListing } from '@/test/factories/listing';
import { listingsResponse } from '@/test/msw/handlers/listings';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { listExplorerListings, listListings, listMapPoints } from './listings.api';

function recordRequests() {
  const requests: Request[] = [];
  server.events.on('request:start', ({ request }) => {
    requests.push(request);
  });
  return requests;
}

describe('listListings', () => {
  afterEach(() => {
    server.events.removeAllListeners();
  });

  it('asks for the newest approved listings of one transaction, page by page', async () => {
    const requests = recordRequests();

    await listListings({ transaction: 'rent', limit: 6 });

    const [request] = requests;
    const params = new URL(request?.url ?? '').searchParams;
    expect(params.get('status')).toBe('eq.approved');
    expect(params.get('transaction')).toBe('eq.rent');
    expect(params.get('order')).toBe('published_at.desc,id.desc');
    expect(params.get('offset')).toBe('0');
    expect(params.get('limit')).toBe('6');
    expect(request?.headers.get('Prefer')).toContain('count=exact');
  });

  it('returns only approved listings from the handler', async () => {
    const { items } = await listListings({ transaction: 'sale', limit: 6 });

    expect(items.map((item) => item.title)).toEqual([
      'Apartament cu 3 camere',
      '3 camere cu balcon',
    ]);
  });

  it('takes the total from Content-Range when there are more listings than one page', async () => {
    const page = [buildListing(), buildListing()];
    server.use(http.get(supabaseUrl('/rest/v1/listings'), () => listingsResponse(page, 40)));

    const result = await listListings({ transaction: 'sale', limit: 2 });

    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(40);
  });

  it('maps a permission error to a forbidden AppError', async () => {
    server.use(
      http.get(supabaseUrl('/rest/v1/listings'), () =>
        HttpResponse.json(
          {
            code: '42501',
            message: 'permission denied for table listings',
            details: null,
            hint: null,
          },
          { status: 403 },
        ),
      ),
    );

    const error: unknown = await listListings({ transaction: 'sale', limit: 6 }).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe('forbidden');
  });
});

const TIMISOARA = { west: 21.1, south: 45.7, east: 21.35, north: 45.8 };

describe('listMapPoints', () => {
  afterEach(() => {
    server.events.removeAllListeners();
  });

  it('asks only for the columns a pin needs, for the approved listings of one transaction', async () => {
    const requests = recordRequests();

    const points = await listMapPoints('sale');

    const params = new URL(requests[0]?.url ?? '').searchParams;
    expect(params.get('select')).toBe(
      'id,title,price,currency,latitude,longitude,street_label,city,photo_path',
    );
    expect(params.get('status')).toBe('eq.approved');
    expect(params.get('transaction')).toBe('eq.sale');
    expect(points.map((point) => point.title)).toEqual([
      'Apartament cu 3 camere',
      '3 camere cu balcon',
    ]);
  });
});

describe('listExplorerListings', () => {
  afterEach(() => {
    server.events.removeAllListeners();
  });

  it('filters by the visible map area and asks for one page of twelve', async () => {
    const requests = recordRequests();

    const result = await listExplorerListings({
      transaction: 'sale',
      bounds: TIMISOARA,
      maxPrice: undefined,
      sort: 'relevance',
      page: 1,
    });

    const params = new URL(requests[0]?.url ?? '').searchParams;
    expect(params.getAll('latitude')).toEqual(['gte.45.7', 'lte.45.8']);
    expect(params.getAll('longitude')).toEqual(['gte.21.1', 'lte.21.35']);
    expect(params.get('order')).toBe('published_at.desc,id.desc');
    expect(params.get('offset')).toBe('12');
    expect(params.get('limit')).toBe('12');
    expect(result.total).toBe(2);
  });

  it('asks for every listing of the transaction when no area is given', async () => {
    const requests = recordRequests();

    await listExplorerListings({
      transaction: 'sale',
      bounds: undefined,
      maxPrice: undefined,
      sort: 'relevance',
      page: 0,
    });

    const params = new URL(requests[0]?.url ?? '').searchParams;
    expect(params.has('latitude')).toBe(false);
    expect(params.has('longitude')).toBe(false);
  });

  it('keeps only listings in euro up to the maximum price', async () => {
    const requests = recordRequests();

    const result = await listExplorerListings({
      transaction: 'sale',
      bounds: undefined,
      maxPrice: 100_000,
      sort: 'priceAsc',
      page: 0,
    });

    const params = new URL(requests[0]?.url ?? '').searchParams;
    expect(params.get('currency')).toBe('eq.EUR');
    expect(params.get('price')).toBe('lte.100000');
    expect(params.get('order')).toBe('price.asc,id.desc');
    expect(result.items.map((item) => item.price)).toEqual([97000]);
  });

  it('sorts by floor area, largest first', async () => {
    const requests = recordRequests();

    await listExplorerListings({
      transaction: 'rent',
      bounds: undefined,
      maxPrice: undefined,
      sort: 'area',
      page: 0,
    });

    expect(new URL(requests[0]?.url ?? '').searchParams.get('order')).toBe('area_m2.desc,id.desc');
  });

  it('returns nothing for an area without listings', async () => {
    const result = await listExplorerListings({
      transaction: 'sale',
      bounds: { west: 26, south: 44.3, east: 26.2, north: 44.5 },
      maxPrice: undefined,
      sort: 'relevance',
      page: 0,
    });

    expect(result).toEqual({ items: [], total: 0 });
  });
});
