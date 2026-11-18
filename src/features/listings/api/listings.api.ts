import { supabase } from '@/lib/supabase/client';
import { toAppError } from '@/lib/supabase/errors';
import { EXPLORER_PRICE_CAP_CURRENCY, type ExplorerSort } from '@/config/listings-explorer';
import type { ExplorerListingFilters, ListingFilters, ListingTransaction } from '../listing.types';

const LISTING_COLUMNS =
  'id, property_type, transaction, title, street_label, city, rooms, area_m2, price, currency, latitude, longitude, verification, smartcheck_score, photo_path' as const;

const MAP_CARD_COLUMNS =
  'id, title, price, currency, latitude, longitude, street_label, city, photo_path' as const;

export const EXPLORER_PAGE_SIZE = 12;

const EXPLORER_ORDER: Readonly<
  Record<ExplorerSort, { column: 'published_at' | 'price' | 'area_m2'; ascending: boolean }>
> = {
  relevance: { column: 'published_at', ascending: false },
  newest: { column: 'published_at', ascending: false },
  priceAsc: { column: 'price', ascending: true },
  priceDesc: { column: 'price', ascending: false },
  area: { column: 'area_m2', ascending: false },
};

export async function getListingMapSummary({
  transaction,
  maxPrice,
}: {
  transaction: ListingTransaction;
  maxPrice: number | undefined;
}) {
  const { data, error } = await supabase.rpc('listing_map_summary', {
    p_transaction: transaction,
    ...(maxPrice === undefined ? {} : { p_max_price_eur: maxPrice }),
  });
  if (error) throw toAppError(error);
  return {
    total: data.reduce((sum, county) => sum + county.listing_count, 0),
    counties: data,
  };
}

export async function getListingMapCard(id: string) {
  const { data, error } = await supabase
    .from('listings')
    .select(MAP_CARD_COLUMNS)
    .eq('id', id)
    .eq('status', 'approved')
    .single();
  if (error) throw toAppError(error);
  return data;
}

export async function listExplorerListings({
  transaction,
  bounds,
  maxPrice,
  sort,
  page,
}: ExplorerListingFilters & { page: number }) {
  const from = page * EXPLORER_PAGE_SIZE;
  const order = EXPLORER_ORDER[sort];
  let query = supabase
    .from('listings')
    .select(LISTING_COLUMNS, { count: 'exact' })
    .eq('status', 'approved')
    .eq('transaction', transaction);
  if (bounds) {
    query = query
      .gte('latitude', bounds.south)
      .lte('latitude', bounds.north)
      .gte('longitude', bounds.west)
      .lte('longitude', bounds.east);
  }
  if (maxPrice !== undefined) {
    query = query.eq('currency', EXPLORER_PRICE_CAP_CURRENCY).lte('price', maxPrice);
  }
  const { data, error, count } = await query
    .order(order.column, { ascending: order.ascending })
    .order('id', { ascending: false })
    .range(from, from + EXPLORER_PAGE_SIZE - 1);
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
