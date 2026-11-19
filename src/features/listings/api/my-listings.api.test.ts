import { http, HttpResponse } from 'msw';
import { TEST_USER_ID } from '@/test/factories/auth';
import { buildMyListing } from '@/test/factories/my-listing';
import { myListingsResponse } from '@/test/msw/handlers/my-listings';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { toListingFormValues, toListingWrite } from '../listing-form.schemas';
import {
  addListingPhotoRow,
  getMyListing,
  listCities,
  listMyListings,
  MY_LISTINGS_PAGE_SIZE,
  removeListingPhotoRow,
  reorderListingPhotos,
  updateListing,
} from './my-listings.api';

function recordRequests() {
  const requests: Request[] = [];
  server.events.on('request:start', ({ request }) => {
    requests.push(request.clone());
  });
  return requests;
}

describe('my-listings.api', () => {
  afterEach(() => {
    server.events.removeAllListeners();
  });

  describe('listMyListings', () => {
    it('asks for the owner’s own listings, newest change first, one page at a time', async () => {
      const requests = recordRequests();

      await listMyListings(TEST_USER_ID, 1);

      const params = new URL(requests[0]?.url ?? '').searchParams;
      expect(params.get('owner_id')).toBe(`eq.${TEST_USER_ID}`);
      expect(params.get('revision_of')).toBe('is.null');
      expect(params.get('order')).toBe('updated_at.desc,id.desc');
      expect(params.get('offset')).toBe(String(MY_LISTINGS_PAGE_SIZE));
      expect(params.get('limit')).toBe(String(MY_LISTINGS_PAGE_SIZE));
    });

    it('attaches the open changes only to the published listing they belong to', async () => {
      const published = buildMyListing({ status: 'approved' });
      const revision = buildMyListing({ status: 'pending_approval', revision_of: published.id });
      const draft = buildMyListing({ status: 'draft' });
      server.use(myListingsResponse([published, revision, draft]));

      const { items, hasMore } = await listMyListings(TEST_USER_ID);

      expect(items.find((item) => item.id === published.id)?.revision?.id).toBe(revision.id);
      expect(items.find((item) => item.id === draft.id)?.revision).toBeNull();
      expect(hasMore).toBe(false);
    });

    it('does not ask for changes when nothing is published', async () => {
      server.use(myListingsResponse([buildMyListing({ status: 'draft' })]));
      const requests = recordRequests();

      await listMyListings(TEST_USER_ID);

      expect(requests).toHaveLength(1);
    });
  });

  describe('getMyListing', () => {
    it('reports a listing the owner cannot see as not found', async () => {
      server.use(myListingsResponse([]));

      await expect(
        getMyListing('c1000000-0000-4000-8000-999999999999', TEST_USER_ID),
      ).rejects.toMatchObject({ code: 'not_found' });
    });
  });

  describe('updateListing', () => {
    it('reports a listing that can no longer be edited', async () => {
      server.use(http.patch(supabaseUrl('/rest/v1/listings'), () => HttpResponse.json([])));
      const listing = buildMyListing();

      await expect(
        updateListing({
          id: listing.id,
          values: toListingWrite(toListingFormValues(listing)),
        }),
      ).rejects.toMatchObject({ code: 'validation', reason: 'listing_invalid_transition' });
    });
  });

  describe('listCities', () => {
    it('keeps only the cities whose centre can be read', async () => {
      server.use(
        http.get(supabaseUrl('/rest/v1/cities'), () =>
          HttpResponse.json([
            {
              id: 'c4000000-0000-4000-8000-000000000001',
              name: 'Timișoara',
              center: '0101000020E610000052616C21C8393540AA2B9FE579E04640',
            },
            { id: 'c4000000-0000-4000-8000-000000000002', name: 'Fără centru', center: 'zz' },
          ]),
        ),
      );

      const cities = await listCities();

      expect(cities.map((city) => city.name)).toEqual(['Timișoara']);
      expect(cities[0]?.center[0]).toBeCloseTo(21.2257, 3);
    });
  });

  describe('photo rows', () => {
    it('saves a new photo at the given position', async () => {
      let body: unknown;
      server.use(
        http.post(supabaseUrl('/rest/v1/listing_photos'), async ({ request }) => {
          body = await request.json();
          return HttpResponse.json({
            id: 'p1',
            path: 'a/b/c.webp',
            position: 3,
            created_at: '2026-11-05T10:00:00.000Z',
          });
        }),
      );

      await addListingPhotoRow({ listingId: 'b', path: 'a/b/c.webp', position: 3 });

      expect(body).toEqual({ listing_id: 'b', path: 'a/b/c.webp', position: 3 });
    });

    it('sends the whole new order of the photos', async () => {
      let body: unknown;
      server.use(
        http.post(supabaseUrl('/rest/v1/rpc/reorder_listing_photos'), async ({ request }) => {
          body = await request.json();
          return new HttpResponse(null, { status: 204 });
        }),
      );

      await reorderListingPhotos({ listingId: 'b', photoIds: ['p2', 'p1'] });

      expect(body).toEqual({ p_listing_id: 'b', p_photo_ids: ['p2', 'p1'] });
    });

    it('reports a photo that could not be removed', async () => {
      server.use(http.delete(supabaseUrl('/rest/v1/listing_photos'), () => HttpResponse.json([])));

      await expect(removeListingPhotoRow('p1')).rejects.toMatchObject({
        code: 'validation',
        reason: 'listing_invalid_transition',
      });
    });

    it('removes a photo the listing still has', async () => {
      server.use(
        http.delete(supabaseUrl('/rest/v1/listing_photos'), () =>
          HttpResponse.json([{ id: 'p1' }]),
        ),
      );

      await expect(removeListingPhotoRow('p1')).resolves.toBeUndefined();
    });
  });
});
