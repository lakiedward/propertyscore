import type { FavoriteListing } from '@/features/listings';

let sequence = 0;

export function buildFavoriteListing(overrides: Partial<FavoriteListing> = {}): FavoriteListing {
  sequence += 1;
  const suffix = String(sequence).padStart(12, '0');
  return {
    listing_id: `f1000000-0000-4000-8000-${suffix}`,
    saved_at: '2026-11-19T10:00:00.000Z',
    is_available: true,
    title: 'Apartament 3 camere, Complex',
    photo_path: `a0000000-0000-4000-8000-000000000001/f1000000-0000-4000-8000-${suffix}/cover.webp`,
    transaction: 'sale',
    price: 142000,
    currency: 'EUR',
    rooms: 3,
    area_m2: 76,
    city: 'Timișoara',
    ...overrides,
  };
}

export function buildUnavailableFavoriteListing(
  overrides: Partial<FavoriteListing> = {},
): FavoriteListing {
  return buildFavoriteListing({
    is_available: false,
    transaction: null,
    price: null,
    currency: null,
    rooms: null,
    area_m2: null,
    city: null,
    ...overrides,
  });
}
