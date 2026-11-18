import type { InvestmentParams } from './investment.params.ts';

export type AreaStatisticRow = {
  city: string;
  zone_slug: string | null;
  zone_name: string | null;
  transaction: 'sale' | 'rent';
  property_type: 'apartment';
  rooms_min: number | null;
  rooms_max: number | null;
  observed_on: string | null;
  listing_count: number | null;
  apartment_count: number | null;
  median_eur: number | null;
  p25_eur: number | null;
  p75_eur: number | null;
  median_eur_m2: number | null;
  p25_eur_m2: number | null;
  p75_eur_m2: number | null;
  source_url: string;
};

export type CoveredCity = { slug: string; name: string };

export type AreaStatisticRejection =
  'no_figures' | 'implausible_price' | 'invalid_interval' | 'invalid_zone';

const ZONE_SLUG_MAX_LENGTH = 80;
const ZONE_NAME_MAX_LENGTH = 120;

export function placeKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function parseRomanianNumber(text: string): number | null {
  const digits = text
    .replace(/[^\d.,-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  if (digits === '') return null;
  const value = Number(digits);
  return Number.isFinite(value) ? value : null;
}

export function parsePositiveNumber(text: string): number | null {
  if (text.trim() === '') return null;
  const value = Number(text);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function parseRoomsBand(text: string): { min: number; max: number | null } | null {
  const match = /^(\d{1,2})(\+?)(?:\s+camer[ăe])?$/.exec(text.trim());
  if (!match) return null;
  const rooms = Number(match[1]);
  return { min: rooms, max: match[2] === '+' ? null : rooms };
}

function isInside(value: number | null, [low, high]: readonly [number, number]): boolean {
  return value === null || (value >= low && value <= high);
}

function isOrdered(low: number | null, high: number | null): boolean {
  return (low === null) === (high === null) && (low === null || high === null || low <= high);
}

export function checkAreaStatistic(
  row: AreaStatisticRow,
  plausible: InvestmentParams['plausible'],
): AreaStatisticRejection | null {
  if (row.median_eur === null && row.median_eur_m2 === null) return 'no_figures';
  if (
    row.zone_slug !== null &&
    (row.zone_slug === '' ||
      row.zone_slug.length > ZONE_SLUG_MAX_LENGTH ||
      row.zone_name === null ||
      row.zone_name === '' ||
      row.zone_name.length > ZONE_NAME_MAX_LENGTH)
  ) {
    return 'invalid_zone';
  }
  if (!isOrdered(row.p25_eur, row.p75_eur) || !isOrdered(row.p25_eur_m2, row.p75_eur_m2)) {
    return 'invalid_interval';
  }
  const perM2Range = row.transaction === 'sale' ? plausible.sale_eur_m2 : plausible.rent_eur_m2;
  const totalRange: [number, number] = [
    perM2Range[0] * plausible.area_m2[0],
    perM2Range[1] * plausible.area_m2[1],
  ];
  const perM2 = [row.median_eur_m2, row.p25_eur_m2, row.p75_eur_m2];
  const totals = [row.median_eur, row.p25_eur, row.p75_eur];
  if (
    perM2.some((value) => !isInside(value, perM2Range)) ||
    totals.some((value) => !isInside(value, totalRange))
  ) {
    return 'implausible_price';
  }
  return null;
}

export function areaStatisticKey(row: AreaStatisticRow): string {
  return [
    row.city,
    row.zone_slug ?? '',
    row.transaction,
    String(row.rooms_min),
    String(row.rooms_max),
  ].join('|');
}
