import { AppError } from '@/lib/errors';
import { supabase } from '@/lib/supabase/client';
import { toAppError } from '@/lib/supabase/errors';
import type { DecisionInput, ModerationCounts, ModerationStatus } from '../moderation.types';

const QUEUE_LIMIT = 50;

const QUEUE_COLUMNS =
  'id, status, revision_of, property_type, transaction, title, city, price, currency, area_m2, photo_path, submitted_at, decided_at' as const;

const REVIEW_COLUMNS =
  'id, status, revision_of, transaction, title, street_label, city, latitude, longitude, rooms, area_m2, price, currency, floor, building_floors, year_built, description, property_type, bathrooms, partitioning, comfort, building_type, house_type, land_area_m2, has_basement, has_semibasement, has_attic, interior_condition, heating, cooling, furnishing, pets, is_passive_house, balconies, parking_spaces, utilities, building_services, has_elevator, has_shared_yard, pool, yard, submitted_at, decided_at, owner:profiles!listings_owner_profile_fkey(full_name), photos:listing_photos(id, path, position, created_at), decisions:listing_decisions(id, decision, reasons, message, created_at)' as const;

const EMPTY_COUNTS: ModerationCounts = {
  pending_approval: 0,
  approved: 0,
  rejected: 0,
  blocked: 0,
};

export async function getModerationCounts(): Promise<ModerationCounts> {
  const { data, error } = await supabase.rpc('listing_moderation_counts');
  if (error) throw toAppError(error);
  const counts = { ...EMPTY_COUNTS };
  for (const row of data) {
    if (row.status !== 'draft') {
      counts[row.status] = row.total;
    }
  }
  return counts;
}

export async function listModerationQueue(status: ModerationStatus) {
  const { data, error, count } = await supabase
    .from('listings')
    .select(QUEUE_COLUMNS, { count: 'exact' })
    .eq('status', status)
    .order(status === 'pending_approval' ? 'submitted_at' : 'decided_at', {
      ascending: false,
      nullsFirst: false,
    })
    .order('id', { ascending: false })
    .range(0, QUEUE_LIMIT - 1);
  if (error) throw toAppError(error);
  return { items: data, total: count ?? data.length };
}

export async function getModerationListing(id: string) {
  const { data, error } = await supabase
    .from('listings')
    .select(REVIEW_COLUMNS)
    .eq('id', id)
    .neq('status', 'draft')
    .order('position', { referencedTable: 'listing_photos', ascending: true })
    .order('created_at', { referencedTable: 'listing_decisions', ascending: false })
    .maybeSingle();
  if (error) throw toAppError(error);
  if (!data) throw new AppError('not_found', `Listing ${id} is not in moderation`);
  return {
    ...data,
    original: data.revision_of ? await getPublishedListing(data.revision_of) : null,
  };
}

async function getPublishedListing(id: string) {
  const { data, error } = await supabase
    .from('listings')
    .select(REVIEW_COLUMNS)
    .eq('id', id)
    .order('position', { referencedTable: 'listing_photos', ascending: true })
    .maybeSingle();
  if (error) throw toAppError(error);
  return data;
}

export async function decideListing({ listingId, decision, reasons, message }: DecisionInput) {
  const { data, error } = await supabase.rpc('decide_listing', {
    p_listing_id: listingId,
    p_decision: decision,
    p_reasons: reasons,
    p_message: message ?? '',
  });
  if (error) throw toAppError(error);
  return data;
}
