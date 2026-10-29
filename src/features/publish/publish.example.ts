import type { Currency } from '@/i18n/format';

export const PUBLISH_SECTION = {
  steps: 'cum',
} as const;

export const PUBLISH_REDIRECT = `/publish#${PUBLISH_SECTION.steps}`;

export const HERO_LISTING = {
  price: 142000,
  pricePerSquareMetre: 1868,
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
