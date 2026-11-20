import { http, HttpResponse } from 'msw';
import type { FavoriteListing } from '@/features/listings';
import { supabaseUrl } from '../supabase-url';

export function favoriteIdsResponse(ids: readonly string[]) {
  return http.get(supabaseUrl('/rest/v1/favorite_listings'), () =>
    HttpResponse.json(ids.map((listing_id) => ({ listing_id }))),
  );
}

type FavoriteListBody = {
  p_limit: number;
  p_before_listing_id?: string;
};

export function favoriteListResponse(favorites: readonly FavoriteListing[]) {
  return http.post(supabaseUrl('/rest/v1/rpc/list_my_favorite_listings'), async ({ request }) => {
    const body = (await request.json()) as FavoriteListBody;
    const start = body.p_before_listing_id
      ? favorites.findIndex((favorite) => favorite.listing_id === body.p_before_listing_id) + 1
      : 0;
    const page = favorites.slice(start, start + body.p_limit);
    return HttpResponse.json(
      page.map((favorite) => ({ ...favorite, total_count: favorites.length })),
    );
  });
}

export const favoriteHandlers = [
  favoriteIdsResponse([]),
  favoriteListResponse([]),
  http.post(
    supabaseUrl('/rest/v1/favorite_listings'),
    () => new HttpResponse(null, { status: 201 }),
  ),
  http.delete(
    supabaseUrl('/rest/v1/favorite_listings'),
    () => new HttpResponse(null, { status: 204 }),
  ),
];
