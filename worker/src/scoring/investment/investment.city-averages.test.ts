import { describe, expect, it } from 'vitest';

import { cityAverageHistoryStart, type CityAverage } from './investment.city-averages.ts';
import {
  buildInvestmentReport,
  EMPTY_CITY_SUMMARY,
  type InvestmentInputs,
  type MarketListing,
} from './investment.formula.ts';
import { parseInvestmentParams } from './investment.params.ts';

const PARAMS = parseInvestmentParams({
  window_days: 90,
  radii_m: [800, 1200, 2000],
  sale_min_count: 20,
  rent_min_count: 12,
  city_min_count: 5,
  rooms_filter_min_count: 12,
  rent_same_rooms_min_count: 8,
  change_min_count: 20,
  outlier_iqr_factor: 1.5,
  histogram_bin_eur_m2: 200,
  histogram_max_bins: 10,
  gone_after_days: 14,
  days_listed_min_count: 10,
  city_buffer_m: 2000,
  duplicate: { distance_m: 75, area_ratio: 0.02, price_ratio: 0.03 },
  plausible: {
    area_m2: [12, 400],
    rooms: [1, 10],
    sale_eur_m2: [300, 8000],
    rent_eur_m2: [2, 40],
  },
});

const SAMPLE_SALE = 'sample_sale_index';
const SAMPLE_RENT = 'sample_rent_report';
const SALE_URL = 'https://example.test/sample-sale-index';
const RENT_URL = 'https://example.test/sample-rent-report';

function average(values: Partial<CityAverage>): CityAverage {
  return {
    source: SAMPLE_SALE,
    period: '2026-09-01',
    transaction: 'sale',
    propertyType: 'apartment',
    roomsMin: null,
    roomsMax: null,
    eurM2: null,
    eurMonth: null,
    sourceUrl: SALE_URL,
    ...values,
  };
}

function rooms(min: number, max: number | null = min): Partial<CityAverage> {
  return { roomsMin: min, roomsMax: max };
}

const SAMPLE_AVERAGES: CityAverage[] = [
  average({ eurM2: 1800 }),
  average({ ...rooms(1), eurM2: 2000 }),
  average({ ...rooms(2), eurM2: 1850 }),
  average({ ...rooms(3), eurM2: 1750 }),
  average({ ...rooms(4, null), eurM2: 1700 }),
  average({ ...rooms(3), period: '2025-09-01', eurM2: 1600 }),
  average({ propertyType: 'house', eurM2: 1400 }),
  average({ source: SAMPLE_RENT, sourceUrl: RENT_URL, transaction: 'rent', eurM2: 9 }),
  average({
    source: SAMPLE_RENT,
    sourceUrl: RENT_URL,
    transaction: 'rent',
    ...rooms(3),
    eurMonth: 560,
  }),
];

function listing(index: number, eurM2: number): MarketListing {
  return {
    id: `l-${String(index).padStart(3, '0')}`,
    source: 'test',
    longitude: 21.2 + index * 0.002,
    latitude: 45.75,
    distanceM: 500,
    areaM2: 70,
    rooms: 3,
    floor: 2,
    constructionYear: 1980,
    priceEur: eurM2 * 70,
    firstSeenOn: '2026-07-15',
    lastSeenOn: '2026-09-28',
  };
}

function inputs(overrides: Partial<InvestmentInputs> = {}): InvestmentInputs {
  return {
    params: PARAMS,
    referenceDate: null,
    declared: { areaM2: 84, rooms: 3, floor: null, constructionYear: null },
    sale: [],
    salePreviousYear: [],
    rent: [],
    city: { sale: EMPTY_CITY_SUMMARY, rent: EMPTY_CITY_SUMMARY },
    sources: [],
    cutoffDate: '2026-10-02',
    cityAverages: SAMPLE_AVERAGES,
    ...overrides,
  };
}

describe('buildInvestmentReport with city averages', () => {
  it('gives the city figures for the declared rooms, marked as city averages with their source', () => {
    const report = buildInvestmentReport(inputs());

    expect(report).toMatchObject({
      status: 'context',
      reason: null,
      reference_date: '2026-09-30',
      sale: {
        precision: 'city_average',
        property_type: 'apartment',
        rooms: [3, 3],
        average_eur_m2: 1750,
        change_12m_pct: 9,
        estimate_eur: 147000,
        source: { source: SAMPLE_SALE, period: '2026-09-01', url: SALE_URL },
      },
      rent: {
        precision: 'city_average',
        basis: 'same_rooms',
        rooms: [3, 3],
        average_eur: 560,
        average_eur_m2: null,
        source: { source: SAMPLE_RENT, period: '2026-09-01', url: RENT_URL },
      },
      yield: { gross_pct: 4.6, city_gross_pct: 6 },
      histogram: null,
      sources: [
        { source: SAMPLE_SALE, period: '2026-09-01', scope: 'city_average', url: SALE_URL },
        { source: SAMPLE_RENT, period: '2026-09-01', scope: 'city_average', url: RENT_URL },
      ],
    });
  });

  it('uses the open-ended rooms band and the rent per square metre when no figure matches the rooms', () => {
    const report = buildInvestmentReport(
      inputs({ declared: { areaM2: 84, rooms: 5, floor: null, constructionYear: null } }),
    );

    expect(report.sale).toMatchObject({
      rooms: [4, null],
      average_eur_m2: 1700,
      change_12m_pct: null,
      estimate_eur: 143000,
    });
    expect(report.rent).toMatchObject({ basis: 'per_m2', rooms: null, average_eur: 760 });
    expect(report.yield.gross_pct).toBe(6.4);
  });

  it('leaves out the estimate and the monthly rent when the area is not declared', () => {
    const report = buildInvestmentReport(
      inputs({ declared: { areaM2: null, rooms: null, floor: null, constructionYear: null } }),
    );

    expect(report.sale).toMatchObject({ rooms: null, average_eur_m2: 1800, estimate_eur: null });
    expect(report.rent).toMatchObject({ basis: 'per_m2', average_eur: null, average_eur_m2: 9 });
    expect(report.yield).toEqual({ gross_pct: 6, city_gross_pct: 6 });
  });

  it('never shows the figures only listings can give', () => {
    const report = buildInvestmentReport(inputs());

    expect(report.sale).not.toHaveProperty('radius_m');
    expect(report.sale).not.toHaveProperty('p25_eur_m2');
    expect(report.sale).not.toHaveProperty('days_listed');
    expect(report.histogram).toBeNull();
    expect(report.city.days_listed).toBeNull();
  });

  it('ignores averages older than the window before the snapshot', () => {
    expect(buildInvestmentReport(inputs({ cutoffDate: '2027-02-01' }))).toMatchObject({
      status: 'no_data',
      reason: 'no_market_data',
      sale: null,
    });
  });

  it('prefers the listings around the address when there are enough of them', () => {
    const report = buildInvestmentReport(
      inputs({
        referenceDate: '2026-09-30',
        sale: Array.from({ length: 21 }, (_, index) => listing(index, 2000 + index * 10)),
      }),
    );

    expect(report.sale).toMatchObject({ precision: 'radius', count: 21 });
  });

  it('falls back to the city averages when the listings are too few', () => {
    const report = buildInvestmentReport(
      inputs({
        referenceDate: '2026-09-30',
        sale: [listing(1, 2000)],
        sources: [{ source: 'test', period: '2026-09-01', scope: 'listings', url: null }],
      }),
    );

    expect(report).toMatchObject({
      status: 'context',
      sale: { precision: 'city_average' },
      city: { sale_count: 0 },
    });
    expect(report.sources.map((source) => source.scope)).toEqual([
      'listings',
      'city_average',
      'city_average',
    ]);
  });

  it('computes no yield from a sale and a rent of different months', () => {
    const report = buildInvestmentReport(
      inputs({
        cityAverages: SAMPLE_AVERAGES.map((item) =>
          item.transaction === 'rent' ? { ...item, period: '2026-08-01' } : item,
        ),
      }),
    );

    expect(report.rent).toMatchObject({ average_eur: 560 });
    expect(report.yield).toEqual({ gross_pct: null, city_gross_pct: null });
  });

  it('dates a current-month average no later than the snapshot', () => {
    const report = buildInvestmentReport(
      inputs({
        cutoffDate: '2026-09-05',
        declared: { areaM2: 84, rooms: null, floor: null, constructionYear: null },
      }),
    );

    expect(report.reference_date).toBe('2026-09-05');
  });
});

describe('cityAverageHistoryStart', () => {
  it('reaches the month a year before the oldest fresh month, across a leap day', () => {
    expect(cityAverageHistoryStart('2024-05-29', 90)).toBe('2023-02-01');
    expect(cityAverageHistoryStart('2026-10-02', 90)).toBe('2025-07-01');
  });
});
