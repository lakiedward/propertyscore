import { describe, expect, it } from 'vitest';

import { airSection, monthsFrom } from './air.report.ts';

const params = {
  pm25_points: [
    [5, 100],
    [35, 0],
  ] as [number, number][],
  no2_points: [
    [10, 100],
    [60, 0],
  ] as [number, number][],
  weights: { pm25: 0.7, no2: 0.3 },
  eu2030_limits: { pm25: 10, no2: 20 },
  calibration_factor_range: [0.5, 2] as [number, number],
  spatial_factor_range: [0.5, 2] as [number, number],
  calibration_station_areas: ['urban' as const],
  min_valid_hours_per_day: 18,
  min_valid_days: 20,
  min_valid_months: 9,
  winter_peak_ratio: 1.5,
  winter_peak_min_months: 2,
  most_year_months: 8,
  heavy_winter_pm25: 25,
  neighbour_blend: 0.3,
};

describe('monthsFrom', () => {
  it('lists the months of the window across a year boundary', () => {
    expect(monthsFrom('2025-11-01', 4)).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
  });
});

describe('airSection', () => {
  it('freezes the monthly series, the limits and the city average', () => {
    const section = airSection({
      score: 73,
      inputs: { status: 'ok', calibrated: { pm25: true, no2: false } },
      row: {
        period_start: '2025-11-01',
        pm25_monthly: [18.26, null],
        no2_monthly: [21.04, 19.96],
        pm25_annual: 14.2,
        no2_annual: 20.5,
        pm25_months_over_eu2030: 5,
        no2_months_over_eu2030: 6,
        spatial_method: 'eea_1km',
        sub_scores: { pm25: 70, no2: 80 },
        verdict_code: 'winter_peaks',
        watch_item: false,
        city_pm25_annual: 15.1,
        city_no2_annual: null,
      },
      params,
    });

    expect(section).toMatchObject({
      status: 'scored',
      months: ['2025-11', '2025-12'],
      pm25_monthly: [18.3, null],
      no2_monthly: [21, 20],
      months_over_limit: { pm25: 5, no2: 6 },
      limits: { pm25: 10, no2: 20 },
      city_avg: { pm25: 15.1, no2: null },
    });
  });

  it('marks a cell without a score as no data', () => {
    const section = airSection({
      score: null,
      inputs: { status: 'no_data', calibrated: { pm25: false, no2: false } },
      row: {
        period_start: '2025-11-01',
        pm25_monthly: [],
        no2_monthly: [],
        pm25_annual: null,
        no2_annual: null,
        pm25_months_over_eu2030: null,
        no2_months_over_eu2030: null,
        spatial_method: 'cams_10km',
        sub_scores: {},
        verdict_code: null,
        watch_item: false,
        city_pm25_annual: null,
        city_no2_annual: null,
      },
      params,
    });

    expect(section.status).toBe('no_data');
  });
});
