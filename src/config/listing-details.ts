export const LISTING_DETAIL_FIELDS = [
  'property_type',
  'bathrooms',
  'partitioning',
  'comfort',
  'building_type',
  'house_type',
  'land_area_m2',
  'has_basement',
  'has_semibasement',
  'has_attic',
  'interior_condition',
  'heating',
  'cooling',
  'furnishing',
  'pets',
  'is_passive_house',
  'balconies',
  'parking_spaces',
  'utilities',
  'building_services',
  'has_elevator',
  'has_shared_yard',
  'pool',
  'yard',
] as const;

export type ListingDetailField = (typeof LISTING_DETAIL_FIELDS)[number];

export const LISTING_DETAIL_SELECT =
  'property_type, bathrooms, partitioning, comfort, building_type, house_type, land_area_m2, has_basement, has_semibasement, has_attic, interior_condition, heating, cooling, furnishing, pets, is_passive_house, balconies, parking_spaces, utilities, building_services, has_elevator, has_shared_yard, pool, yard' as const;
