import type { Tables } from '@/lib/supabase/database.types';

type BookedInspection = Pick<
  Tables<'inspections'>,
  | 'id'
  | 'number'
  | 'status'
  | 'starts_at'
  | 'ends_at'
  | 'access_name'
  | 'access_phone'
  | 'price'
  | 'currency'
> & {
  property: Pick<
    Tables<'properties'>,
    | 'address_text'
    | 'latitude'
    | 'longitude'
    | 'property_type'
    | 'area_m2'
    | 'floor'
    | 'building_floors'
  > & { city: Pick<Tables<'cities'>, 'name'> };
};

export function buildBookedInspection(overrides: Partial<BookedInspection> = {}): BookedInspection {
  return {
    id: 'd1000000-0000-4000-8000-000000000099',
    number: 1099,
    status: 'scheduled',
    starts_at: '2026-12-03T07:30:00.000Z',
    ends_at: '2026-12-03T09:30:00.000Z',
    access_name: 'Ion Țurcanu',
    access_phone: '+40722000003',
    price: 500,
    currency: 'RON',
    property: {
      address_text: 'Str. Școlii 12, ap. 7',
      latitude: 45.7558,
      longitude: 21.229,
      property_type: 'apartment',
      area_m2: 64,
      floor: 3,
      building_floors: 8,
      city: { name: 'Timișoara' },
    },
    ...overrides,
  };
}
