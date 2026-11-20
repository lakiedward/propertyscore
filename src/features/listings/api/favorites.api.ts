import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';
import { toAppError } from '@/lib/supabase/errors';

type FavoriteRpcRow =
  Database['public']['Functions']['list_my_favorite_listings']['Returns'][number];

type NullableFavoriteColumn =
  'photo_path' | 'transaction' | 'price' | 'currency' | 'rooms' | 'area_m2' | 'city';

type FavoriteRow = Omit<FavoriteRpcRow, NullableFavoriteColumn> & {
  [Column in NullableFavoriteColumn]: FavoriteRpcRow[Column] | null;
};

export type FavoriteListing = Omit<FavoriteRow, 'total_count'>;

export const FAVORITES_PAGE_SIZE = 24;

const UNIQUE_VIOLATION = '23505';

export async function listFavoriteListingIds() {
  const { data, error } = await supabase.from('favorite_listings').select('listing_id');
  if (error) throw toAppError(error);
  return data.map((row) => row.listing_id);
}

export async function listMyFavoriteListings(page = 0) {
  const { data, error } = await supabase.rpc('list_my_favorite_listings', {
    p_limit: FAVORITES_PAGE_SIZE,
    p_offset: page * FAVORITES_PAGE_SIZE,
  });
  if (error) throw toAppError(error);
  const rows: readonly FavoriteRow[] = data;
  const total = rows[0]?.total_count ?? 0;
  return {
    items: rows,
    total,
    hasMore: (page + 1) * FAVORITES_PAGE_SIZE < total,
  };
}

export async function addFavoriteListing(listingId: string) {
  const { error } = await supabase.from('favorite_listings').insert({ listing_id: listingId });
  if (error && error.code !== UNIQUE_VIOLATION) throw toAppError(error);
}

export async function removeFavoriteListing(listingId: string) {
  const { error } = await supabase.from('favorite_listings').delete().eq('listing_id', listingId);
  if (error) throw toAppError(error);
}
