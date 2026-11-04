import { http, HttpResponse } from 'msw';
import { AppError } from '@/lib/errors';
import { buildListing } from '@/test/factories/listing';
import { listingsResponse } from '@/test/msw/handlers/listings';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { listListings } from './listings.api';

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

  it('asks for the newest published listings of one transaction, page by page', async () => {
    const requests = recordRequests();

    await listListings({ transaction: 'rent', limit: 6 });

    const [request] = requests;
    const params = new URL(request?.url ?? '').searchParams;
    expect(params.get('status')).toBe('eq.published');
    expect(params.get('transaction')).toBe('eq.rent');
    expect(params.get('order')).toBe('published_at.desc,id.desc');
    expect(params.get('offset')).toBe('0');
    expect(params.get('limit')).toBe('6');
    expect(request?.headers.get('Prefer')).toContain('count=exact');
  });

  it('returns only published listings from the handler', async () => {
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
