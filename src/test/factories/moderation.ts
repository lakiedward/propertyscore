import type { QueueListing, ReviewListing } from '@/features/moderation';
import { APARTMENT_DETAILS } from './listing-details';

const OWNER_ID = 'a0000000-0000-4000-8000-000000000003';

let sequence = 0;

export function buildReviewListing(overrides: Partial<ReviewListing> = {}): ReviewListing {
  sequence += 1;
  const id = `e0000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`;
  return {
    id,
    status: 'pending_approval',
    revision_of: null,
    original: null,
    transaction: 'sale',
    title: `Apartament 3 camere, Complex ${String(sequence)}`,
    street_label: 'Str. Gheorghe Lazăr, 12',
    city: 'Timișoara',
    rooms: 3,
    area_m2: 90,
    price: 168000,
    currency: 'EUR',
    floor: 3,
    building_floors: 4,
    year_built: 1985,
    description: 'Apartament luminos, renovat în 2023, cu balcon închis și centrală proprie.',
    latitude: 45.7469,
    longitude: 21.2394,
    ...APARTMENT_DETAILS,
    submitted_at: new Date(Date.UTC(2026, 10, 6, 9, 40) - sequence * 60_000).toISOString(),
    decided_at: null,
    owner: { full_name: 'Ioana Stan' },
    photos: Array.from({ length: 6 }, (_, index) => ({
      id: `f${String(sequence).padStart(3, '0')}0000-0000-4000-8000-${String(index).padStart(12, '0')}`,
      path: `${OWNER_ID}/${id}/photo-${String(index)}.webp`,
      position: index,
      created_at: '2026-11-05T10:00:00.000Z',
    })),
    decisions: [],
    ...overrides,
  };
}

export function toQueueListing(listing: ReviewListing): QueueListing {
  return {
    id: listing.id,
    status: listing.status,
    revision_of: listing.revision_of,
    property_type: listing.property_type,
    transaction: listing.transaction,
    title: listing.title,
    city: listing.city,
    price: listing.price,
    currency: listing.currency,
    area_m2: listing.area_m2,
    photo_path: listing.photos[0]?.path ?? null,
    submitted_at: listing.submitted_at,
    decided_at: listing.decided_at,
  };
}
