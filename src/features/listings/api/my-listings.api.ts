import { AppError } from '@/lib/errors';
import { supabase } from '@/lib/supabase/client';
import { toAppError } from '@/lib/supabase/errors';
import type { ListingWrite } from '../listing-form.schemas';
import { parseEwkbPoint } from '../listing.utils';

const MY_LISTINGS_LIMIT = 50;

const MY_LISTING_ROW_COLUMNS =
  'id, status, transaction, title, city, price, currency, area_m2, photo_path, updated_at, decisions:listing_decisions(id, decision, message, created_at)' as const;

const MY_LISTING_COLUMNS =
  'id, owner_id, status, transaction, title, street_label, city, rooms, area_m2, price, currency, floor, building_floors, year_built, description, latitude, longitude, photos:listing_photos(id, path, position, created_at), decisions:listing_decisions(id, decision, reasons, message, created_at)' as const;

export async function listMyListings(ownerId: string) {
  const { data, error, count } = await supabase
    .from('listings')
    .select(MY_LISTING_ROW_COLUMNS, { count: 'exact' })
    .eq('owner_id', ownerId)
    .order('updated_at', { ascending: false })
    .order('id', { ascending: false })
    .order('created_at', { referencedTable: 'listing_decisions', ascending: false })
    .limit(1, { referencedTable: 'listing_decisions' })
    .range(0, MY_LISTINGS_LIMIT - 1);
  if (error) throw toAppError(error);
  return { items: data, total: count ?? data.length };
}

export async function getMyListing(id: string, ownerId: string) {
  const { data, error } = await supabase
    .from('listings')
    .select(MY_LISTING_COLUMNS)
    .eq('id', id)
    .eq('owner_id', ownerId)
    .order('position', { referencedTable: 'listing_photos', ascending: true })
    .order('created_at', { referencedTable: 'listing_photos', ascending: true })
    .order('created_at', { referencedTable: 'listing_decisions', ascending: false })
    .maybeSingle();
  if (error) throw toAppError(error);
  if (!data) throw new AppError('not_found', `Listing ${id} is not one of yours`);
  return data;
}

export async function createListing(values: ListingWrite) {
  const { data, error } = await supabase.from('listings').insert(values).select('id').single();
  if (error) throw toAppError(error);
  return data;
}

export async function updateListing({ id, values }: { id: string; values: ListingWrite }) {
  const { data, error } = await supabase
    .from('listings')
    .update(values)
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) throw toAppError(error);
  if (!data) {
    throw new AppError('validation', 'The listing can no longer be edited', {
      reason: 'listing_invalid_transition',
    });
  }
  return data;
}

export async function submitListing(id: string) {
  const { data, error } = await supabase.rpc('submit_listing', { p_listing_id: id });
  if (error) throw toAppError(error);
  return data;
}

export async function listCities() {
  const { data, error } = await supabase
    .from('cities')
    .select('id, name, center')
    .order('position', { ascending: true });
  if (error) throw toAppError(error);
  return data.flatMap((city) => {
    const center = typeof city.center === 'string' ? parseEwkbPoint(city.center) : null;
    return center ? [{ id: city.id, name: city.name, center }] : [];
  });
}

export async function addListingPhotoRow(photo: {
  listingId: string;
  path: string;
  position: number;
}) {
  const { data, error } = await supabase
    .from('listing_photos')
    .insert({ listing_id: photo.listingId, path: photo.path, position: photo.position })
    .select('id, path, position, created_at')
    .single();
  if (error) throw toAppError(error);
  return data;
}

export async function removeListingPhotoRow(id: string) {
  const { error } = await supabase.from('listing_photos').delete().eq('id', id);
  if (error) throw toAppError(error);
}
