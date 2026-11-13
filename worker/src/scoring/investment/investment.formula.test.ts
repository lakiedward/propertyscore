import { describe, expect, it } from 'vitest';

import {
  buildInvestmentReport,
  dedupeListings,
  EMPTY_CITY_SUMMARY,
  histogramBins,
  quantile,
  withoutOutliers,
  type CityMarketSummary,
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
  detail_filter_min_count: 12,
  building_period_bounds: [1990, 2010],
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

const DESIGN_SALE_EUR_M2 = [
  1900, 1950, 2000, 2040, 2080, 2095, 2120, 2160, 2200, 2230, 2250, 2270, 2300, 2330, 2360, 2393,
  2420, 2460, 2500, 2550, 2600,
];

function listing(
  index: number,
  values: Partial<MarketListing> & { eurM2?: number },
): MarketListing {
  const areaM2 = values.areaM2 ?? 60 + index;
  const priceEur = values.priceEur ?? (values.eurM2 ?? 2000) * areaM2;
  return {
    id: `l-${String(index).padStart(3, '0')}`,
    source: values.source ?? 'test',
    longitude: values.longitude ?? 21.2 + index * 0.002,
    latitude: values.latitude ?? 45.75,
    distanceM: values.distanceM ?? 500,
    areaM2,
    rooms: values.rooms === undefined ? 3 : values.rooms,
    floor: values.floor === undefined ? 2 : values.floor,
    constructionYear: values.constructionYear === undefined ? 1980 : values.constructionYear,
    priceEur,
    firstSeenOn: values.firstSeenOn ?? '2026-07-15',
    lastSeenOn: values.lastSeenOn ?? '2026-09-28',
  };
}

function city(values: Partial<CityMarketSummary>): CityMarketSummary {
  return { ...EMPTY_CITY_SUMMARY, ...values };
}

function designInputs(overrides: Partial<InvestmentInputs> = {}): InvestmentInputs {
  return {
    params: PARAMS,
    referenceDate: '2026-09-30',
    declared: { areaM2: 84, rooms: 3, floor: null, constructionYear: null },
    sale: DESIGN_SALE_EUR_M2.map((eurM2, index) => listing(index, { eurM2 })),
    salePreviousYear: [],
    rent: Array.from({ length: 12 }, (_, index) =>
      listing(100 + index, {
        priceEur: index < 9 ? 580 + index * 10 : 500,
        areaM2: 80,
        rooms: index < 9 ? 3 : 2,
      }),
    ),
    city: {
      sale: city({
        count: 1000,
        p05EurM2: 1550,
        p25EurM2: 1800,
        p50EurM2: 2010,
        p75EurM2: 2300,
        p95EurM2: 3050,
      }),
      rent: city({ count: 400, p50EurM2: 7.7, p50Eur: 520 }),
    },
    sources: [{ source: 'imobiliare', period: '2026-09-01', scope: 'listings', url: null }],
    cutoffDate: '2026-10-02',
    cityAverages: [],
    ...overrides,
  };
}

describe('quantile', () => {
  it('interpolates like percentile_cont', () => {
    expect(quantile([1, 2, 3, 4], 0.5)).toBe(2.5);
    expect(quantile([10, 20, 30, 40, 50], 0.25)).toBe(20);
    expect(quantile([], 0.5)).toBeNull();
  });
});

describe('buildInvestmentReport', () => {
  it('reproduces the figures of the design for 84 m² and 3 rooms', () => {
    const report = buildInvestmentReport(designInputs());

    expect(report.status).toBe('context');
    expect(report.sale).toMatchObject({
      precision: 'radius',
      radius_m: 800,
      count: 21,
      median_eur_m2: 2250,
      p25_eur_m2: 2100,
      p75_eur_m2: 2390,
      estimate_eur: 189000,
      estimate_low_eur: 176000,
      estimate_high_eur: 201000,
    });
    expect(report.rent).toMatchObject({ basis: 'same_rooms', count: 9, median_eur: 620 });
    expect(report.yield).toEqual({ gross_pct: 3.9, city_gross_pct: 4.6 });
    expect(report.city.median_sale_eur_m2).toBe(2010);
  });

  it('widens the radius until enough listings are found', () => {
    const sale = DESIGN_SALE_EUR_M2.map((eurM2, index) =>
      listing(index, { eurM2, distanceM: index < 10 ? 500 : 1100 }),
    );
    const report = buildInvestmentReport(designInputs({ sale }));

    expect(report.sale).toMatchObject({ radius_m: 1200, count: 21 });
  });

  it('falls back to the city figures without a histogram when the area is sparse', () => {
    const report = buildInvestmentReport(designInputs({ sale: [], rent: [] }));

    expect(report.status).toBe('context');
    expect(report.sale).toMatchObject({
      precision: 'city',
      radius_m: null,
      count: 1000,
      median_eur_m2: 2010,
      estimate_eur: 169000,
    });
    expect(report.rent).toMatchObject({ precision: 'city', basis: 'per_m2', median_eur: 650 });
    expect(report.histogram).toBeNull();
  });

  it('says when there is no market data or too little of it', () => {
    expect(buildInvestmentReport(designInputs({ referenceDate: null }))).toMatchObject({
      status: 'no_data',
      reason: 'no_market_data',
    });
    const sparse = designInputs({
      sale: [],
      city: {
        sale: city({ count: 3, p25EurM2: 1, p50EurM2: 2, p75EurM2: 3 }),
        rent: EMPTY_CITY_SUMMARY,
      },
    });
    expect(buildInvestmentReport(sparse)).toMatchObject({
      status: 'no_data',
      reason: 'insufficient_data',
      sale: null,
    });
  });

  it('shows only the price per square metre without a declared area', () => {
    const report = buildInvestmentReport(
      designInputs({
        declared: { areaM2: null, rooms: null, floor: null, constructionYear: null },
      }),
    );

    expect(report.sale?.estimate_eur).toBeNull();
    expect(report.rent?.basis).toBe('all');
    expect(report.yield.gross_pct).toBe(4);
  });

  it('keeps only the listings with a similar number of rooms when there are enough', () => {
    const sale = [
      ...Array.from({ length: 12 }, (_, index) => listing(index, { eurM2: 2000, rooms: 2 })),
      ...Array.from({ length: 12 }, (_, index) => listing(50 + index, { eurM2: 3000, rooms: 6 })),
    ];
    const report = buildInvestmentReport(
      designInputs({
        sale,
        declared: { areaM2: 50, rooms: 2, floor: null, constructionYear: null },
      }),
    );

    expect(report.sale).toMatchObject({ rooms_filter: [1, 3], count: 12, median_eur_m2: 2000 });
  });

  it('narrows to the same floor group and building period when there are enough', () => {
    const sale = [
      ...Array.from({ length: 12 }, (_, index) =>
        listing(index, { eurM2: 1500, floor: 0, constructionYear: 1975 }),
      ),
      ...Array.from({ length: 12 }, (_, index) =>
        listing(30 + index, { eurM2: 1800, floor: 3, constructionYear: 1978 }),
      ),
      ...Array.from({ length: 12 }, (_, index) =>
        listing(60 + index, { eurM2: 2600, floor: 3, constructionYear: 2018 }),
      ),
    ];
    const report = buildInvestmentReport(
      designInputs({ sale, declared: { areaM2: 60, rooms: 3, floor: 4, constructionYear: 1982 } }),
    );

    expect(report.sale).toMatchObject({
      floor_filter: 'upper',
      period_filter: [null, 1989],
      count: 12,
      median_eur_m2: 1800,
    });
    expect(report.declared).toEqual({ area_m2: 60, rooms: 3, floor: 4, construction_year: 1982 });
  });

  it('does not narrow by floor or period on a formula without those filters', () => {
    const sale = [
      ...Array.from({ length: 12 }, (_, index) => listing(index, { eurM2: 2000, floor: 0 })),
      ...Array.from({ length: 12 }, (_, index) => listing(30 + index, { eurM2: 2000, floor: 3 })),
    ];
    const v1 = parseInvestmentParams({
      ...PARAMS,
      detail_filter_min_count: undefined,
      building_period_bounds: undefined,
    });
    const report = buildInvestmentReport(
      designInputs({
        params: v1,
        sale,
        declared: { areaM2: 60, rooms: 3, floor: 0, constructionYear: 1975 },
      }),
    );

    expect(report.sale).toMatchObject({ floor_filter: null, period_filter: null, count: 24 });
  });

  it('keeps the wider set when too few listings match the declared floor', () => {
    const sale = [
      ...Array.from({ length: 20 }, (_, index) => listing(index, { eurM2: 2000, floor: 3 })),
      ...Array.from({ length: 4 }, (_, index) => listing(40 + index, { eurM2: 2000, floor: 0 })),
    ];
    const report = buildInvestmentReport(
      designInputs({ sale, declared: { areaM2: 60, rooms: 3, floor: 0, constructionYear: null } }),
    );

    expect(report.sale).toMatchObject({ floor_filter: null, period_filter: null, count: 24 });
  });

  it('compares the median with the same area a year earlier', () => {
    const salePreviousYear = DESIGN_SALE_EUR_M2.map((eurM2, index) =>
      listing(200 + index, {
        eurM2: eurM2 / 1.06,
        firstSeenOn: '2025-07-01',
        lastSeenOn: '2025-09-20',
      }),
    );
    const report = buildInvestmentReport(designInputs({ salePreviousYear }));

    expect(report.sale?.change_12m_pct).toBe(6);
  });

  it('measures how long the listings that disappeared stayed online', () => {
    const sale = DESIGN_SALE_EUR_M2.map((eurM2, index) =>
      listing(index, {
        eurM2,
        firstSeenOn: '2026-07-01',
        lastSeenOn: index < 11 ? `2026-08-${String(10 + index).padStart(2, '0')}` : '2026-09-29',
      }),
    );
    const report = buildInvestmentReport(designInputs({ sale }));

    expect(report.sale).toMatchObject({ days_listed: 45 });
  });
});

describe('dedupeListings', () => {
  it('keeps one listing when two sources publish the same apartment', () => {
    const first = listing(1, { eurM2: 2000, areaM2: 70, firstSeenOn: '2026-07-01' });
    const copy = {
      ...first,
      id: 'copy',
      source: 'other',
      priceEur: first.priceEur * 1.01,
      firstSeenOn: '2026-07-05',
    };
    const neighbour = listing(2, { eurM2: 2000, areaM2: 70 });

    expect(
      dedupeListings([copy, first, neighbour], PARAMS.duplicate).map((item) => item.id),
    ).toEqual([first.id, neighbour.id]);
  });
});

describe('withoutOutliers', () => {
  it('drops the prices outside the Tukey fences', () => {
    const listings = [
      ...[2000, 2050, 2100, 2150, 2200].map((eurM2, index) => listing(index, { eurM2 })),
      listing(9, { eurM2: 6000 }),
    ];

    expect(withoutOutliers(listings, 1.5)).toHaveLength(5);
  });
});

describe('histogramBins', () => {
  it('counts the listings in 200 €/m² bins and marks the estimated interval', () => {
    const histogram = histogramBins(
      [1500, 1650, 1700, 1990, 2100, 3100],
      1600,
      2000,
      [1650, 1750],
      PARAMS,
    );

    expect(histogram.bin_eur_m2).toBe(200);
    expect(histogram.bins).toEqual([
      { from: null, to: 1600, count: 1, in_estimate: false },
      { from: 1600, to: 1800, count: 2, in_estimate: true },
      { from: 1800, to: 2000, count: 1, in_estimate: false },
      { from: 2000, to: null, count: 2, in_estimate: false },
    ]);
  });

  it('widens the bins to stay within the maximum count', () => {
    const histogram = histogramBins([], 1000, 5000, [2000, 2200], PARAMS);

    expect(histogram.bin_eur_m2).toBe(600);
    expect(histogram.bins.length).toBeLessThanOrEqual(PARAMS.histogram_max_bins);
  });
});
