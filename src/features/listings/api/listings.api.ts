import { supabase } from '@/lib/supabase/client';
import { toAppError } from '@/lib/supabase/errors';
import type { ListingFilters } from '../listing.types';

const LISTING_COLUMNS =
  'id, transaction, title, street_label, city, rooms, area_m2, price, currency, latitude, longitude, verification, smartcheck_score, photo_path' as const;

export async function listListings({ transaction, limit }: ListingFilters) {
  const { data, error, count } = await supabase
    .from('listings')
    .select(LISTING_COLUMNS, { count: 'exact' })
    .eq('status', 'published')
    .eq('transaction', transaction)
    .order('published_at', { ascending: false })
    .range(0, limit - 1);
  if (error) throw toAppError(error);
  return { items: data, total: count ?? data.length };
}
