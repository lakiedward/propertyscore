import type { MyListing, MyListingRow } from '@/features/listings';
import { TEST_USER_ID } from './auth';
import { APARTMENT_DETAILS } from './listing-details';

const OWNER_ID = TEST_USER_ID;

let sequence = 0;

export function buildMyListing(overrides: Partial<MyListing> = {}): MyListing {
  sequence += 1;
  const id = `c1000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`;
  return {
    id,
    owner_id: OWNER_ID,
    status: 'draft',
    revision_of: null,
    transaction: 'rent',
    title: `Studio, Dâmbovița ${String(sequence)}`,
    street_label: 'Calea Dâmbovița, 18',
    city: 'Timișoara',
    rooms: 1,
    area_m2: 28,
    price: 380,
    currency: 'EUR',
    floor: 0,
    building_floors: 4,
    year_built: 1990,
    description: 'Studio la parter, intrare separată.',
    latitude: 45.7395,
    longitude: 21.2019,
    ...APARTMENT_DETAILS,
    photos: Array.from({ length: 5 }, (_, index) => ({
      id: `c2${String(sequence).padStart(6, '0')}-0000-4000-8000-${String(index).padStart(12, '0')}`,
      path: `${OWNER_ID}/${id}/photo-${String(index)}.webp`,
      position: index,
      created_at: '2026-11-05T10:00:00.000Z',
    })),
    decisions: [],
    ...overrides,
  };
}

export function toMyListingRow(
  listing: MyListing,
  updatedAt = '2026-11-06T10:00:00.000Z',
  revision: MyListingRow['revision'] = null,
): MyListingRow {
  return {
    revision,
    id: listing.id,
    status: listing.status,
    property_type: listing.property_type,
    transaction: listing.transaction,
    title: listing.title,
    street_label: listing.street_label,
    city: listing.city,
    rooms: listing.rooms,
    floor: listing.floor,
    building_floors: listing.building_floors,
    price: listing.price,
    currency: listing.currency,
    area_m2: listing.area_m2,
    photo_path: listing.photos[0]?.path ?? null,
    updated_at: updatedAt,
    decisions: listing.decisions.slice(0, 1).map(({ id, decision, message, created_at }) => ({
      id,
      decision,
      message,
      created_at,
    })),
  };
}
