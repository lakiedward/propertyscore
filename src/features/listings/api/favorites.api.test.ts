import { http, HttpResponse } from 'msw';
import { isAppError } from '@/lib/errors';
import { buildFavoriteListing } from '@/test/factories/favorite-listing';
import { favoriteIdsResponse, favoriteListResponse } from '@/test/msw/handlers/favorites';
import { postgrestErrorResponse } from '@/test/msw/postgrest-error';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import {
  addFavoriteListing,
  FAVORITE_LIMIT,
  FAVORITES_PAGE_SIZE,
  listFavoriteListingIds,
  listMyFavoriteListings,
  removeFavoriteListing,
} from './favorites.api';

const LISTING_ID = 'f3000000-0000-4000-8000-000000000001';

async function caught(promise: Promise<unknown>) {
  return promise.then(
    () => undefined,
    (error: unknown) => error,
  );
}

describe('favorites.api', () => {
  it('lists the ids of the saved listings within the limit', async () => {
    let limit: string | null = null;
    server.use(
      http.get(supabaseUrl('/rest/v1/favorite_listings'), ({ request }) => {
        limit = new URL(request.url).searchParams.get('limit');
        return HttpResponse.json([{ listing_id: LISTING_ID }]);
      }),
    );

    await expect(listFavoriteListingIds()).resolves.toEqual([LISTING_ID]);
    expect(limit).toBe(String(FAVORITE_LIMIT));
  });

  it('turns a failed id list into an AppError', async () => {
    server.use(
      http.get(supabaseUrl('/rest/v1/favorite_listings'), () =>
        postgrestErrorResponse('XX000', 'boom', 500),
      ),
    );

    expect(isAppError(await caught(listFavoriteListingIds()))).toBe(true);
  });

  it('pages the saved listings after the last one of the previous page', async () => {
    const favorites = Array.from({ length: FAVORITES_PAGE_SIZE + 2 }, () => buildFavoriteListing());
    server.use(favoriteListResponse(favorites));

    const first = await listMyFavoriteListings(null);
    expect(first.items).toHaveLength(FAVORITES_PAGE_SIZE);
    expect(first.total).toBe(FAVORITES_PAGE_SIZE + 2);
    const last = favorites[FAVORITES_PAGE_SIZE - 1];
    expect(first.nextCursor).toEqual({ savedAt: last?.saved_at, listingId: last?.listing_id });

    const second = await listMyFavoriteListings(first.nextCursor);
    expect(second.items.map((item) => item.listing_id)).toEqual(
      favorites.slice(FAVORITES_PAGE_SIZE).map((favorite) => favorite.listing_id),
    );
    expect(second.nextCursor).toBeNull();
  });

  it('returns an empty page when nothing is saved', async () => {
    await expect(listMyFavoriteListings(null)).resolves.toEqual({
      items: [],
      total: 0,
      nextCursor: null,
    });
  });

  it('turns a failed page into an AppError', async () => {
    server.use(
      http.post(supabaseUrl('/rest/v1/rpc/list_my_favorite_listings'), () =>
        postgrestErrorResponse('XX000', 'boom', 500),
      ),
    );

    expect(isAppError(await caught(listMyFavoriteListings(null)))).toBe(true);
  });

  it('treats a listing saved twice as saved', async () => {
    server.use(
      http.post(supabaseUrl('/rest/v1/favorite_listings'), () =>
        postgrestErrorResponse('23505', 'duplicate key value', 409),
      ),
    );

    await expect(addFavoriteListing(LISTING_ID)).resolves.toBeUndefined();
  });

  it('turns the limit into its reason', async () => {
    server.use(
      http.post(supabaseUrl('/rest/v1/favorite_listings'), () =>
        postgrestErrorResponse('P0001', 'favorite_limit_reached', 400),
      ),
    );

    const error = await caught(addFavoriteListing(LISTING_ID));

    expect(isAppError(error) && error.reason).toBe('favorite_limit_reached');
  });

  it('removes the favourite of one listing', async () => {
    let filter: string | null = null;
    server.use(
      http.delete(supabaseUrl('/rest/v1/favorite_listings'), ({ request }) => {
        filter = new URL(request.url).searchParams.get('listing_id');
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await removeFavoriteListing(LISTING_ID);

    expect(filter).toBe(`eq.${LISTING_ID}`);
  });

  it('turns a failed removal into an AppError', async () => {
    server.use(
      http.delete(supabaseUrl('/rest/v1/favorite_listings'), () =>
        postgrestErrorResponse('42501', 'permission denied', 403),
      ),
    );

    const error = await caught(removeFavoriteListing(LISTING_ID));

    expect(isAppError(error) && error.code).toBe('forbidden');
  });

  it('uses the ids handler from the shared mocks', async () => {
    server.use(favoriteIdsResponse([LISTING_ID]));

    await expect(listFavoriteListingIds()).resolves.toEqual([LISTING_ID]);
  });
});
