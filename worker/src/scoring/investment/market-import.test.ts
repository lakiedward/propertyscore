import { describe, expect, it } from 'vitest';

import { normalizeMarketRow } from './market-import.ts';

const PLAUSIBLE = {
  area_m2: [12, 400] as [number, number],
  rooms: [1, 10] as [number, number],
  sale_eur_m2: [300, 8000] as [number, number],
  rent_eur_m2: [2, 40] as [number, number],
};

const ROW = {
  source_listing_id: 'X-1',
  transaction: 'sale',
  property_type: 'apartment',
  latitude: '45.7546',
  longitude: '21.2303',
  area_m2: '84',
  rooms: '3',
  price: '189000',
  currency: 'EUR',
  first_seen_on: '2026-08-01',
  last_seen_on: '2026-09-28',
  construction_year: '',
  floor: '2',
};

describe('normalizeMarketRow', () => {
  it('keeps a valid listing in the import contract', () => {
    expect(normalizeMarketRow(ROW, PLAUSIBLE, null)).toEqual({
      row: {
        source_listing_id: 'X-1',
        transaction: 'sale',
        property_type: 'apartment',
        longitude: 21.2303,
        latitude: 45.7546,
        area_m2: 84,
        rooms: 3,
        price: 189000,
        currency: 'EUR',
        price_eur: 189000,
        first_seen_on: '2026-08-01',
        last_seen_on: '2026-09-28',
        construction_year: null,
        floor: 2,
      },
    });
  });

  it('converts RON prices with the given rate', () => {
    const result = normalizeMarketRow(
      { ...ROW, transaction: 'rent', price: '3100', currency: 'RON' },
      PLAUSIBLE,
      4.9768,
    );

    expect(result).toMatchObject({ row: { currency: 'RON', price: 3100, price_eur: 622.89 } });
  });

  it('refuses RON prices without a rate', () => {
    expect(() => normalizeMarketRow({ ...ROW, currency: 'RON' }, PLAUSIBLE, null)).toThrow(
      expect.objectContaining({ code: 'market_rate_required' }),
    );
  });

  it.each([
    [{ latitude: '' }, 'invalid_row'],
    [{ transaction: 'swap' }, 'invalid_row'],
    [{ last_seen_on: '2026-07-01' }, 'invalid_row'],
    [{ rooms: 'trei' }, 'invalid_row'],
    [{ area_m2: '8' }, 'implausible_area'],
    [{ rooms: '14' }, 'implausible_rooms'],
    [{ price: '1000' }, 'implausible_price'],
  ])('rejects %o as %s', (change, code) => {
    expect(normalizeMarketRow({ ...ROW, ...change }, PLAUSIBLE, null)).toEqual({ rejected: code });
  });
});
