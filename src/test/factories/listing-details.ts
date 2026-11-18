import type { ListingDetailField } from '@/config/listing-details';
import type { Tables } from '@/lib/supabase/database.types';

type ListingDetails = Pick<Tables<'listings'>, ListingDetailField>;

export const APARTMENT_DETAILS: ListingDetails = {
  property_type: 'apartment',
  bathrooms: 1,
  partitioning: 'semi_detached',
  comfort: 'first',
  building_type: 'apartment_block',
  house_type: null,
  land_area_m2: null,
  has_basement: false,
  has_semibasement: false,
  has_attic: false,
  interior_condition: 'good',
  heating: 'own_boiler',
  cooling: null,
  furnishing: 'furnished',
  pets: null,
  is_passive_house: false,
  balconies: 1,
  parking_spaces: null,
  utilities: ['water', 'gas'],
  building_services: [],
  has_elevator: true,
  has_shared_yard: false,
  pool: null,
  yard: null,
};
