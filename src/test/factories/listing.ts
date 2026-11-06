import type { Tables } from '@/lib/supabase/database.types';

type ListingRow = Pick<
  Tables<'listings'>,
  | 'id'
  | 'status'
  | 'transaction'
  | 'title'
  | 'street_label'
  | 'city'
  | 'rooms'
  | 'area_m2'
  | 'price'
  | 'currency'
  | 'latitude'
  | 'longitude'
  | 'verification'
  | 'smartcheck_score'
  | 'photo_path'
  | 'published_at'
>;

const FIRST_PUBLISHED_AT = Date.UTC(2026, 9, 1, 12);

let sequence = 0;

export function buildListing(overrides: Partial<ListingRow> = {}): ListingRow {
  sequence += 1;
  return {
    id: `b0000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`,
    status: 'approved',
    transaction: 'sale',
    title: `Apartament cu 2 camere ${String(sequence)}`,
    street_label: 'Str. Școlii, 12',
    city: 'Timișoara',
    rooms: 2,
    area_m2: 54,
    price: 97000,
    currency: 'EUR',
    latitude: 45.7512,
    longitude: 21.2368,
    verification: 'none',
    smartcheck_score: null,
    photo_path: null,
    published_at: new Date(FIRST_PUBLISHED_AT - sequence * 60_000).toISOString(),
    ...overrides,
  };
}
