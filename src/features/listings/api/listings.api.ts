import { supabase } from '@/lib/supabase/client';
import { toAppError } from '@/lib/supabase/errors';
import type { ListingFilters, ListingsInBoundsFilters, ListingTransaction } from '../listing.types';

const LISTING_COLUMNS =
  'id, property_type, transaction, title, street_label, city, rooms, area_m2, price, currency, latitude, longitude, verification, smartcheck_score, photo_path' as const;

const MAP_POINT_COLUMNS = 'id, title, price, currency, latitude, longitude' as const;

const MAP_POINTS_LIMIT = 2000;

export const LISTINGS_IN_BOUNDS_PAGE_SIZE = 20;

export async function listMapPoints(transaction: ListingTransaction) {
  const { data, error } = await supabase
    .from('listings')
    .select(MAP_POINT_COLUMNS)
    .eq('status', 'approved')
    .eq('transaction', transaction)
    .order('published_at', { ascending: false })
    .order('id', { ascending: false })
    .range(0, MAP_POINTS_LIMIT - 1);
  if (error) throw toAppError(error);
  return data;
}

export async function listListingsInBounds({
  transaction,
  bounds,
  page,
}: ListingsInBoundsFilters & { page: number }) {
  const from = page * LISTINGS_IN_BOUNDS_PAGE_SIZE;
  const { data, error, count } = await supabase
    .from('listings')
    .select(LISTING_COLUMNS, { count: 'exact' })
    .eq('status', 'approved')
    .eq('transaction', transaction)
    .gte('latitude', bounds.south)
    .lte('latitude', bounds.north)
    .gte('longitude', bounds.west)
    .lte('longitude', bounds.east)
    .order('published_at', { ascending: false })
    .order('id', { ascending: false })
    .range(from, from + LISTINGS_IN_BOUNDS_PAGE_SIZE - 1);
  if (error) throw toAppError(error);
  return { items: data, total: count ?? data.length };
}

export async function listListings({ transaction, limit }: ListingFilters) {
  const { data, error, count } = await supabase
    .from('listings')
    .select(LISTING_COLUMNS, { count: 'exact' })
    .eq('status', 'approved')
    .eq('transaction', transaction)
    .order('published_at', { ascending: false })
    .order('id', { ascending: false })
    .range(0, limit - 1);
  if (error) throw toAppError(error);
  return { items: data, total: count ?? data.length };
}
