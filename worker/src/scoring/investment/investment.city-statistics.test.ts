import { describe, expect, it } from 'vitest';

import {
  assessCityStatistics,
  cityStatisticsStart,
  saleHistoryStart,
  type CitySaleMonth,
  type CityStatistic,
} from './investment.city-statistics.ts';

const SOURCE_ORDER = ['apartamente_org', 'apartamente_org_index', 'imospot_index'];
const IMOSPOT_URL = 'https://www.imospot.ro/indicele-imospot';
const SALE_PAGE = 'https://apartamente.org/apartamente-de-vanzare/timisoara';
const RENT_PAGE = 'https://apartamente.org/apartamente-de-inchiriat/timisoara';

function statistic(overrides: Partial<CityStatistic>): CityStatistic {
  return {
    source: 'imospot_index',
    period: '2026-11-01',
    zoneSlug: null,
    zoneName: null,
    isNearbyLocality: false,
    transaction: 'sale',
    propertyType: 'apartment',
    roomsMin: null,
    observedOn: null,
    listingCount: null,
    apartmentCount: null,
    medianEur: null,
    medianEurM2: null,
    p25EurM2: null,
    p75EurM2: null,
    medianAreaM2: null,
    sourceUrl: IMOSPOT_URL,
    ...overrides,
  };
}

function locality(slug: string, name: string, overrides: Partial<CityStatistic>): CityStatistic {
  return statistic({ zoneSlug: slug, zoneName: name, isNearbyLocality: true, ...overrides });
}

const IMOSPOT_SALE = statistic({
  listingCount: 952,
  medianEur: 107000,
  medianEurM2: 1984,
  p25EurM2: 1748,
  p75EurM2: 2318,
  medianAreaM2: 53,
});

const PAGE_SALE = statistic({
  source: 'apartamente_org',
  observedOn: '2026-11-18',
  listingCount: 23627,
  apartmentCount: 8755,
  medianEur: 109900,
  medianEurM2: 1984.13,
  sourceUrl: SALE_PAGE,
});

const PAGE_RENT = statistic({
  source: 'apartamente_org',
  transaction: 'rent',
  observedOn: '2026-11-18',
  listingCount: 4210,
  medianEur: 500,
  medianEurM2: 9.52,
  sourceUrl: RENT_PAGE,
});

const TIMISOARA: CityStatistic[] = [
  IMOSPOT_SALE,
  PAGE_SALE,
  PAGE_RENT,
  statistic({
    source: 'apartamente_org',
    roomsMin: 2,
    medianEurM2: 2050,
    p25EurM2: 1800,
    p75EurM2: 2300,
    sourceUrl: SALE_PAGE,
  }),
  locality('dumbravita', 'Dumbrăvița', {
    listingCount: 43,
    medianEurM2: 2310,
    p25EurM2: 2059,
    p75EurM2: 2458,
  }),
  locality('giroc', 'Giroc', {
    listingCount: 171,
    medianEurM2: 1917,
    p25EurM2: 1754,
    p75EurM2: 2128,
  }),
  locality('giroc', 'Giroc', { transaction: 'rent', listingCount: 57, medianEur: 390 }),
];

const HISTORY: CitySaleMonth[] = [
  ['2026-11-01', 1984],
  ['2026-08-01', 1921],
  ['2026-10-01', 1970],
  ['2026-09-01', 1948],
].map(([period, medianEurM2]) => ({
  source: 'imospot_index',
  period: String(period),
  medianEurM2: Number(medianEurM2),
  sourceUrl: IMOSPOT_URL,
}));

function assess(overrides: Partial<Parameters<typeof assessCityStatistics>[0]> = {}) {
  return assessCityStatistics({
    statistics: TIMISOARA,
    history: HISTORY,
    sourceOrder: SOURCE_ORDER,
    cutoffDate: '2026-11-18',
    areaM2: 58,
    ...overrides,
  });
}

describe('assessCityStatistics', () => {
  it('takes the asking price of the city from the source that gives its typical interval', () => {
    const market = assess();

    expect(market?.sale).toEqual({
      precision: 'city_statistics',
      property_type: 'apartment',
      price_kind: 'asking',
      count: 952,
      median_eur_m2: 1984,
      p25_eur_m2: 1748,
      p75_eur_m2: 2318,
      typical: { area_m2: 53, price_eur: 107000 },
      estimate_eur: 115000,
      estimate_low_eur: 101000,
      estimate_high_eur: 134000,
      source: {
        source: 'imospot_index',
        period: '2026-11-01',
        observed_on: null,
        url: IMOSPOT_URL,
      },
    });
    expect(market?.referenceDate).toBe('2026-11-18');
  });

  it('estimates the rent for the declared area and the gross yield of the city', () => {
    const market = assess();

    expect(market?.rent).toEqual({
      precision: 'city_statistics',
      property_type: 'apartment',
      price_kind: 'asking',
      count: 4210,
      basis: 'per_m2',
      median_eur: 500,
      median_eur_m2: 9.52,
      estimate_eur: 550,
      source: {
        source: 'apartamente_org',
        period: '2026-11-01',
        observed_on: '2026-11-18',
        url: RENT_PAGE,
      },
    });
    expect(market?.grossYieldPct).toBe(5.8);
  });

  it('lists the localities next to the city, the busiest first', () => {
    const market = assess();

    expect(market?.nearby.map((place) => [place.name, place.median_eur_m2, place.count])).toEqual([
      ['Giroc', 1917, 171],
      ['Dumbrăvița', 2310, 43],
    ]);
    expect(market?.nearby[0]).toMatchObject({ slug: 'giroc', p25_eur_m2: 1754, p75_eur_m2: 2128 });
  });

  it('orders the months of the sale source and cites every source once', () => {
    const market = assess();

    expect(market?.history).toEqual({
      source: 'imospot_index',
      url: IMOSPOT_URL,
      months: [
        { period: '2026-08-01', median_eur_m2: 1921 },
        { period: '2026-09-01', median_eur_m2: 1948 },
        { period: '2026-10-01', median_eur_m2: 1970 },
        { period: '2026-11-01', median_eur_m2: 1984 },
      ],
    });
    expect(market?.sources.map((source) => source.url)).toEqual([IMOSPOT_URL, RENT_PAGE]);
  });

  it('shows no history from a single month', () => {
    expect(assess({ history: HISTORY.slice(0, 1) })?.history).toBeNull();
  });

  it('keeps the median without an interval when no source publishes one', () => {
    const market = assess({ statistics: [PAGE_SALE, PAGE_RENT], history: [] });

    expect(market?.sale).toMatchObject({
      count: 23627,
      median_eur_m2: 1984,
      p25_eur_m2: null,
      p75_eur_m2: null,
      typical: null,
      estimate_eur: 115000,
      estimate_low_eur: null,
      estimate_high_eur: null,
      source: { source: 'apartamente_org', observed_on: '2026-11-18' },
    });
    expect(market?.nearby).toEqual([]);
  });

  it('gives the figures per square metre without an estimate when no area was declared', () => {
    const market = assess({ areaM2: null });

    expect(market?.sale).toMatchObject({ median_eur_m2: 1984, estimate_eur: null });
    expect(market?.rent).toMatchObject({ median_eur_m2: 9.52, estimate_eur: null });
    expect(market?.grossYieldPct).toBe(5.8);
  });

  it('derives the rent per square metre from the median rent and the median area', () => {
    const market = assess({
      statistics: [
        IMOSPOT_SALE,
        statistic({ transaction: 'rent', listingCount: 57, medianEur: 390, medianAreaM2: 52 }),
      ],
    });

    expect(market?.rent).toMatchObject({ basis: 'per_m2', median_eur_m2: 7.5, estimate_eur: 435 });
    expect(market?.grossYieldPct).toBe(4.5);
  });

  it('computes no yield from a rent known only as a monthly median', () => {
    const market = assess({
      statistics: [IMOSPOT_SALE, statistic({ transaction: 'rent', medianEur: 390 })],
    });

    expect(market?.rent).toMatchObject({ basis: 'all', median_eur: 390, estimate_eur: null });
    expect(market?.grossYieldPct).toBeNull();
  });

  it('has nothing to say without a sale figure for the whole city', () => {
    expect(assess({ statistics: [PAGE_RENT, ...TIMISOARA.slice(3)] })).toBeNull();
  });
});

describe('the months a report reads', () => {
  it('reads the statistics of the window and a year of history', () => {
    expect(cityStatisticsStart('2026-11-18', 90)).toBe('2026-08-01');
    expect(saleHistoryStart('2026-11-18')).toBe('2025-11-01');
  });
});
