import { describe, expect, it } from 'vitest';

import {
  airScore,
  airVerdict,
  analysisWindow,
  annualMean,
  blendWithNeighbours,
  calibratedSeries,
  calibrationFactor,
  monthlyMean,
  monthsOverLimit,
  spatialFactors,
  thresholdScore,
} from './air.formula.ts';
import { airParamsSchema } from './air.params.ts';

const params = airParamsSchema.parse({
  pm25_points: [
    [5, 100],
    [10, 80],
    [15, 60],
    [25, 20],
    [35, 0],
  ],
  no2_points: [
    [10, 100],
    [20, 80],
    [30, 50],
    [40, 20],
    [50, 0],
  ],
  weights: { pm25: 0.7, no2: 0.3 },
  eu2030_limits: { pm25: 10, no2: 20 },
  calibration_factor_range: [0.7, 1.5],
  spatial_factor_range: [0.6, 1.6],
  calibration_station_areas: ['urban'],
  min_valid_hours_per_day: 18,
  min_valid_days: 20,
  min_valid_months: 9,
  winter_peak_ratio: 1.6,
  winter_peak_min_months: 2,
  most_year_months: 7,
  heavy_winter_pm25: 20,
  neighbour_blend: 0.4,
});

const months = analysisWindow('2026-10-01');
const designSeries = [11, 16, 22, 24, 19, 13, 9, 8, 7, 8, 8, 10];

describe('analysisWindow', () => {
  it('covers the 12 full months before the snapshot period, oldest first', () => {
    expect(months).toHaveLength(12);
    expect(months[0]).toBe('2025-10-01');
    expect(months[11]).toBe('2026-09-01');
  });
});

describe('thresholdScore', () => {
  it('interpolates between the WHO and EU thresholds and clamps outside them', () => {
    expect(thresholdScore(3, params.pm25_points)).toBe(100);
    expect(thresholdScore(13, params.pm25_points)).toBeCloseTo(68);
    expect(thresholdScore(25, params.pm25_points)).toBe(20);
    expect(thresholdScore(80, params.pm25_points)).toBe(0);
    expect(thresholdScore(18, params.no2_points)).toBeCloseTo(84);
  });
});

describe('airScore', () => {
  it('reproduces the worked example of the plan: PM2.5 13 and NO2 18 give 73', () => {
    const result = airScore({ pm25: 13, no2: 18 }, params);
    expect(Math.round(result.raw ?? -1)).toBe(73);
    expect(result).toMatchObject({ status: 'ok', subScores: { pm25: 68, no2: 84 } });
  });

  it('uses PM2.5 alone when NO2 has no data', () => {
    const result = airScore({ pm25: 13, no2: null }, params);
    expect(Math.round(result.raw ?? -1)).toBe(68);
    expect(result.status).toBe('partial');
  });

  it('has no score without PM2.5', () => {
    expect(airScore({ pm25: null, no2: 18 }, params)).toEqual({
      raw: null,
      status: 'no_data',
      subScores: {},
    });
  });
});

describe('monthly and annual means', () => {
  it('needs enough valid days for a month and enough valid months for a year', () => {
    expect(monthlyMean([...Array<number>(20).fill(10), null], 20)).toEqual({
      mean: 10,
      validDays: 20,
    });
    expect(monthlyMean([...Array<number>(19).fill(10), null], 20)).toEqual({
      mean: null,
      validDays: 19,
    });
    expect(annualMean(designSeries, 9)).toBeCloseTo(12.92, 2);
    expect(annualMean([...designSeries.slice(0, 8), null, null, null, null], 9)).toBeNull();
  });
});

describe('calibrationFactor', () => {
  it('scales the model to the mean of the stations with enough paired months', () => {
    const model = Array<number>(12).fill(10);
    const result = calibrationFactor(
      [
        { station: Array<number>(12).fill(12), model },
        { station: Array<number>(12).fill(14), model },
        { station: [...Array<number>(8).fill(100), null, null, null, null], model },
      ],
      9,
      params.calibration_factor_range,
    );
    expect(result).toMatchObject({
      stationsUsed: 2,
      stationMean: 13,
      modelMean: 10,
      status: 'calibrated',
    });
    expect(result.factor).toBeCloseTo(1.3);
  });

  it('limits the factor and falls back to 1 without stations', () => {
    const model = Array<number>(12).fill(10);
    expect(
      calibrationFactor(
        [{ station: Array<number>(12).fill(40), model }],
        9,
        params.calibration_factor_range,
      ).factor,
    ).toBe(1.5);
    expect(calibrationFactor([], 9, params.calibration_factor_range)).toEqual({
      factor: 1,
      stationsUsed: 0,
      stationMean: null,
      modelMean: null,
      status: 'uncalibrated',
    });
  });
});

describe('spatialFactors', () => {
  it('divides each cell by the city mean of the 1 km map and limits the ratio', () => {
    expect(spatialFactors([10, 20, 30, null], params.spatial_factor_range)).toEqual([
      0.6,
      1,
      1.5,
      null,
    ]);
    expect(spatialFactors([null, null], params.spatial_factor_range)).toEqual([null, null]);
  });
});

describe('calibratedSeries', () => {
  it('applies both factors and keeps missing months empty', () => {
    expect(calibratedSeries([10, null, 5], 1.2, 0.9)).toEqual([10.8, null, 5.4]);
    expect(calibratedSeries([10], 1.2, null)).toEqual([12]);
  });
});

describe('airVerdict', () => {
  it('flags the winter peak of the design series and the heavy winter', () => {
    expect(monthsOverLimit(designSeries, 10)).toBe(6);
    expect(airVerdict(designSeries, months, params)).toEqual({
      verdictCode: 'winter_peaks',
      watchItem: true,
    });
  });

  it('separates a clean year, a year mostly over the limit and a flat moderate year', () => {
    expect(airVerdict(Array<number>(12).fill(8), months, params)).toEqual({
      verdictCode: 'clean_all_year',
      watchItem: false,
    });
    expect(airVerdict(Array<number>(12).fill(22), months, params)).toEqual({
      verdictCode: 'above_limit_most_year',
      watchItem: true,
    });
    expect(airVerdict([12, 12, 12, 9, 9, 9, 9, 9, 9, 9, 9, 9], months, params).verdictCode).toBe(
      'moderate',
    );
    expect(airVerdict(Array<null>(12).fill(null), months, params)).toEqual({
      verdictCode: null,
      watchItem: false,
    });
  });
});

describe('blendWithNeighbours', () => {
  it('mixes 60% of the cell with 40% of the neighbours that have data', () => {
    expect(blendWithNeighbours(70, [80, null, 60], 0.4)).toBeCloseTo(70);
    expect(blendWithNeighbours(50, [100], 0.4)).toBeCloseTo(70);
    expect(blendWithNeighbours(50, [null], 0.4)).toBe(50);
    expect(blendWithNeighbours(null, [100], 0.4)).toBeNull();
  });
});
