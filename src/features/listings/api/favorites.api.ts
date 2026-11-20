import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';
import { toAppError } from '@/lib/supabase/errors';

type FavoriteRpcRow =
  Database['public']['Functions']['list_my_favorite_listings']['Returns'][number];

type NullableFavoriteColumn =
  'title' | 'photo_path' | 'transaction' | 'price' | 'currency' | 'rooms' | 'area_m2' | 'city';

type FavoriteRow = Omit<FavoriteRpcRow, NullableFavoriteColumn> & {
  [Column in NullableFavoriteColumn]: FavoriteRpcRow[Column] | null;
};

export type FavoriteListing = Omit<FavoriteRow, 'total_count'>;

export type FavoriteCursor = {
  savedAt: string;
  listingId: string;
};

export const FAVORITES_PAGE_SIZE = 24;

export const FAVORITE_LIMIT = 500;

const FAVORITE_ID_COLUMNS = 'listing_id' as const;

const UNIQUE_VIOLATION = '23505';

export async function listFavoriteListingIds() {
  const { data, error } = await supabase
    .from('favorite_listings')
    .select(FAVORITE_ID_COLUMNS)
    .range(0, FAVORITE_LIMIT - 1);
  if (error) throw toAppError(error);
  return data.map((row) => row.listing_id);
}

export async function listMyFavoriteListings(cursor: FavoriteCursor | null) {
  const { data, error } = await supabase.rpc('list_my_favorite_listings', {
    p_limit: FAVORITES_PAGE_SIZE,
    ...(cursor ? { p_before_saved_at: cursor.savedAt, p_before_listing_id: cursor.listingId } : {}),
  });
  if (error) throw toAppError(error);
  const rows: readonly FavoriteRow[] = data;
  const last = rows.at(-1);
  return {
    items: rows,
    total: rows[0]?.total_count ?? 0,
    nextCursor:
      last && rows.length === FAVORITES_PAGE_SIZE
        ? { savedAt: last.saved_at, listingId: last.listing_id }
        : null,
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
