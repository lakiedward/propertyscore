import { supabase } from '@/lib/supabase/client';
import { toAppError } from '@/lib/supabase/errors';
import type { BookableProperty, BookingRequest } from '../inspection.types';

const BOOKED_INSPECTION_COLUMNS =
  'id, number, status, starts_at, ends_at, access_name, access_phone, price, currency, property:properties(address_text, latitude, longitude, property_type, area_m2, floor, building_floors, city:cities(name))' as const;

export async function listInspectionCities() {
  const { data, error } = await supabase.rpc('inspection_cities');
  if (error) throw toAppError(error);
  return data;
}

export async function listMyBookableProperties() {
  const { data, error } = await supabase.rpc('my_bookable_properties');
  if (error) throw toAppError(error);
  const rows: readonly BookableProperty[] = data;
  return rows;
}

export async function listInspectionSlots(cityId: string, from: string, to: string) {
  const { data, error } = await supabase.rpc('inspection_slots', {
    p_city_id: cityId,
    p_from: from,
    p_to: to,
  });
  if (error) throw toAppError(error);
  return data;
}

export async function bookInspection(request: BookingRequest) {
  const { data, error } = await supabase
    .rpc('book_inspection', {
      p_property_id: request.propertyId ?? undefined,
      p_listing_id: request.listingId ?? undefined,
      p_address_text: request.addressText,
      p_city_id: request.cityId,
      p_latitude: request.latitude,
      p_longitude: request.longitude,
      p_property_type: request.propertyType,
      p_area_m2: request.areaM2,
      p_year_built: request.yearBuilt ?? undefined,
      p_floor: request.floor ?? undefined,
      p_building_floors: request.buildingFloors ?? undefined,
      p_starts_at: request.startsAt,
      p_access_mode: request.accessMode,
      p_access_name: request.accessName ?? undefined,
      p_access_phone: request.accessPhone ?? undefined,
      p_access_tags: [...request.accessTags],
      p_access_notes: request.accessNotes ?? undefined,
      p_payment_method: request.paymentMethod,
    })
    .single();
  if (error) throw toAppError(error);
  return data;
}

export async function getBookedInspection(id: string) {
  const { data, error } = await supabase
    .from('inspections')
    .select(BOOKED_INSPECTION_COLUMNS)
    .eq('id', id)
    .single();
  if (error) throw toAppError(error);
  return data;
}
