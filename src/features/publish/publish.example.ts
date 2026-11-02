import livingThumb from '@/assets/publish/hero-living-160.webp';
import livingCard from '@/assets/publish/hero-living-640.webp';
import windowThumb from '@/assets/publish/inspection-window-160.webp';
import bedroomThumb from '@/assets/publish/room-bedroom-160.webp';
import { PUBLISH_SECTION } from '@/components/layout/site-navigation';
import type { LngLat } from '@/components/map/map.config';
import type { Currency } from '@/i18n/format';

export const PUBLISH_REDIRECT = `/publish#${PUBLISH_SECTION.steps}`;

export const HERO_LISTING = {
  price: 142000,
  currency: 'EUR',
  surface: 76,
  rooms: 3,
  floor: 2,
  floors: 4,
  year: 1984,
  morePhotos: 10,
  progress: 83,
} as const satisfies Record<string, number | Currency>;

export const TIER_LISTING = {
  price: 98000,
  currency: 'EUR',
  rooms: 2,
  surface: 58,
  zoneScore: 86,
  conditionScore: 8.6,
} as const satisfies Record<string, number | Currency>;

export const PUBLISHING_COST = { amount: 0, currency: 'RON' } as const satisfies {
  amount: number;
  currency: Currency;
};

export const EXAMPLE_LOCATION: { center: LngLat; zoom: number } = {
  center: [21.2365, 45.747],
  zoom: 14.4,
};

export const PHOTO_TILES = {
  living: { src: livingThumb, width: 160, height: 90 },
  bedroom: { src: bedroomThumb, width: 160, height: 90 },
  window: { src: windowThumb, width: 160, height: 107 },
} as const;

export const TIER_PHOTO = { src: livingCard, width: 640, height: 360 } as const;

export const HERO_PRICE_PER_SQUARE_METRE = Math.round(HERO_LISTING.price / HERO_LISTING.surface);
