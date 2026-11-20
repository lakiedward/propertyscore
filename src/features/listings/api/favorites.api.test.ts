import { http, HttpResponse } from 'msw';
import { isAppError } from '@/lib/errors';
import { buildFavoriteListing } from '@/test/factories/favorite-listing';
import { favoriteIdsResponse, favoriteListResponse } from '@/test/msw/handlers/favorites';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import {
  addFavoriteListing,
  FAVORITES_PAGE_SIZE,
  listFavoriteListingIds,
  listMyFavoriteListings,
} from './favorites.api';

const LISTING_ID = 'f3000000-0000-4000-8000-000000000001';

function postgrestError(code: string, message: string, status: number) {
  return HttpResponse.json({ code, message, details: null, hint: null }, { status });
}

describe('favorites.api', () => {
  it('lists the ids of the saved listings', async () => {
    server.use(favoriteIdsResponse([LISTING_ID]));

    await expect(listFavoriteListingIds()).resolves.toEqual([LISTING_ID]);
  });

  it('pages the saved listings and says when more remain', async () => {
    const favorites = Array.from({ length: FAVORITES_PAGE_SIZE + 2 }, () => buildFavoriteListing());
    server.use(favoriteListResponse(favorites));

    const first = await listMyFavoriteListings(0);
    const second = await listMyFavoriteListings(1);

    expect(first.items).toHaveLength(FAVORITES_PAGE_SIZE);
    expect(first.total).toBe(FAVORITES_PAGE_SIZE + 2);
    expect(first.hasMore).toBe(true);
    expect(second.items).toHaveLength(2);
    expect(second.hasMore).toBe(false);
  });

  it('returns an empty page when nothing is saved', async () => {
    await expect(listMyFavoriteListings(0)).resolves.toEqual({
      items: [],
      total: 0,
      hasMore: false,
    });
  });

  it('treats a listing saved twice as saved', async () => {
    server.use(
      http.post(supabaseUrl('/rest/v1/favorite_listings'), () =>
        postgrestError('23505', 'duplicate key value', 409),
      ),
    );

    await expect(addFavoriteListing(LISTING_ID)).resolves.toBeUndefined();
  });

  it('turns the limit into its reason', async () => {
    server.use(
      http.post(supabaseUrl('/rest/v1/favorite_listings'), () =>
        postgrestError('P0001', 'favorite_limit_reached', 400),
      ),
    );

    const error: unknown = await addFavoriteListing(LISTING_ID).catch((caught: unknown) => caught);

    expect(isAppError(error) && error.reason).toBe('favorite_limit_reached');
  });
});
