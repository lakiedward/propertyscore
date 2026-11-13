import { Constants, type Enums } from '@/lib/supabase/database.types';

export type ListingPropertyType = Enums<'listing_property_type'>;
export type ListingHeating = Enums<'listing_heating'>;
export type ListingUtility = Enums<'listing_utility'>;

const ENUMS = Constants.public.Enums;

export const PROPERTY_TYPES = ENUMS.listing_property_type;
export const PARTITIONINGS = ENUMS.listing_partitioning;
export const COMFORTS = ENUMS.listing_comfort;
export const BUILDING_TYPES = ENUMS.listing_building_type;
export const HOUSE_TYPES = ENUMS.listing_house_type;
export const INTERIOR_CONDITIONS = ENUMS.listing_interior_condition;
export const HEATINGS = ENUMS.listing_heating;
export const COOLINGS = ENUMS.listing_cooling;
export const FURNISHINGS = ENUMS.listing_furnishing;
export const PETS = ENUMS.listing_pets;
export const UTILITIES = ENUMS.listing_utility;
export const BUILDING_SERVICES = ENUMS.listing_building_service;
export const POOLS = ENUMS.listing_pool;
export const YARDS = ENUMS.listing_yard;

const LOWEST_FLOOR = -1;
const HIGHEST_FLOOR = 40;
export const MAX_BATHROOM_CHOICE = 4;

const APARTMENT_UTILITIES: readonly ListingUtility[] = ['water', 'sewerage', 'gas'];

export function heatingsFor(type: ListingPropertyType): readonly ListingHeating[] {
  return HEATINGS.filter((heating) =>
    type === 'apartment' ? heating !== 'solar_panels' : heating !== 'building_boiler',
  );
}

export function utilitiesFor(type: ListingPropertyType): readonly ListingUtility[] {
  return type === 'apartment' ? APARTMENT_UTILITIES : UTILITIES;
}

export function floorChoices(): number[] {
  return Array.from(
    { length: HIGHEST_FLOOR - LOWEST_FLOOR + 1 },
    (_, index) => LOWEST_FLOOR + index,
  );
}
