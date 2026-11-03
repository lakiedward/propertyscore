import { describe, expect, it } from 'vitest';

import {
  computeHealthScore,
  emergencyLayer,
  nightPharmacyLayer,
  timeDecay,
  walkLayer,
  type HealthInputs,
  type WalkAccess,
} from './health.formula.ts';
import { healthParamsSchema } from './health.params.ts';

const params = healthParamsSchema.parse({
  walk_speed_kmh: 4.8,
  walk_detour_factor: 1.3,
  car_speed_kmh: 30,
  car_detour_factor: 1.4,
  osm_cnas_match_radius_m: 50,
  search_radius_m: 2500,
  max_candidates: 12,
  car_search_radius_m: 30000,
  car_max_candidates: 3,
  layers: {
    h1: {
      weight: 25,
      nearest: { full_at_min: 3, zero_at_min: 15 },
      nearest_share: 0.6,
      count_within_min: 10,
      count_full_at: 4,
    },
    h2: {
      weight: 25,
      nearest: { full_at_min: 5, zero_at_min: 20 },
      nearest_share: 0.6,
      count_within_min: 15,
      count_full_at: 5,
    },
    h3: {
      weight: 15,
      nearest: { full_at_min: 8, zero_at_min: 25 },
      nearest_share: 0.5,
      count_within_min: 15,
      count_full_at: 3,
    },
    h4: { weight: 25, nearest: { full_at_min: 8, zero_at_min: 30 } },
    h5: {
      weight: 10,
      nearest: { full_at_min: 10, zero_at_min: 30 },
      car_only_points: 0.5,
      car_only_max_min: 10,
    },
  },
});

function access(nearestMin: number | null, n5: number, n10: number, n15: number): WalkAccess {
  return { nearestMin, within: { 5: n5, 10: n10, 15: n15 } };
}

const designExample: HealthInputs = {
  pharmacies: access(3, 2, 5, 5),
  primaryCare: access(6, 0, 1, 3),
  clinics: access(9, 0, 2, 4),
  emergencyCarMin: 14,
  nightPharmacyWalkMin: 18,
  nightPharmacyCarMin: 5,
  hasNightPharmacyData: true,
};

describe('timeDecay', () => {
  it('is full up to the first threshold, empty from the second and linear between', () => {
    expect(timeDecay(2, { full_at_min: 3, zero_at_min: 15 })).toBe(1);
    expect(timeDecay(9, { full_at_min: 3, zero_at_min: 15 })).toBeCloseTo(0.5);
    expect(timeDecay(20, { full_at_min: 3, zero_at_min: 15 })).toBe(0);
  });
});

describe('walkLayer', () => {
  it('mixes the nearest place and the count within the configured minutes', () => {
    const layer = walkLayer(access(6, 0, 1, 3), params.layers.h2);
    expect(layer?.value).toBeCloseTo(0.8, 2);
    expect(layer).toMatchObject({ tMin: 6, n: 3, mode: 'walk' });
  });

  it('scores zero places in reach as zero, not as missing data', () => {
    expect(walkLayer(access(null, 0, 0, 0), params.layers.h1)).toEqual({
      value: 0,
      tMin: null,
      n: 0,
      mode: 'walk',
    });
  });

  it('caps the count part once the reference number is reached', () => {
    expect(walkLayer(access(1, 9, 20, 30), params.layers.h1)?.value).toBe(1);
  });

  it('has no value without data', () => {
    expect(walkLayer(null, params.layers.h1)).toBeNull();
  });
});

describe('emergencyLayer', () => {
  it('decays with the car time to the nearest emergency unit', () => {
    expect(emergencyLayer(14, params.layers.h4)?.value).toBeCloseTo(0.727, 3);
    expect(emergencyLayer(35, params.layers.h4)?.value).toBe(0);
    expect(emergencyLayer(null, params.layers.h4)).toBeNull();
  });
});

describe('nightPharmacyLayer', () => {
  it('uses the walking time when a night pharmacy is in walking reach', () => {
    expect(
      nightPharmacyLayer(
        { nightPharmacyWalkMin: 18, nightPharmacyCarMin: 4, hasNightPharmacyData: true },
        params.layers.h5,
      ),
    ).toMatchObject({ value: 0.6, tMin: 18, mode: 'walk' });
  });

  it('gives the car-only points when the walk is too long but the drive is short', () => {
    expect(
      nightPharmacyLayer(
        { nightPharmacyWalkMin: 40, nightPharmacyCarMin: 7, hasNightPharmacyData: true },
        params.layers.h5,
      ),
    ).toEqual({ value: 0.5, tMin: 7, n: null, mode: 'car' });
  });

  it('scores zero when neither the walk nor the drive is short enough', () => {
    expect(
      nightPharmacyLayer(
        { nightPharmacyWalkMin: null, nightPharmacyCarMin: 12, hasNightPharmacyData: true },
        params.layers.h5,
      )?.value,
    ).toBe(0);
  });

  it('has no value when the city has no known night pharmacy', () => {
    expect(
      nightPharmacyLayer(
        { nightPharmacyWalkMin: null, nightPharmacyCarMin: null, hasNightPharmacyData: false },
        params.layers.h5,
      ),
    ).toBeNull();
  });
});

describe('computeHealthScore', () => {
  it('reproduces the worked example of the plan', () => {
    const result = computeHealthScore(designExample, params);
    expect(result.score).toBe(84);
    expect(result.missing).toEqual([]);
    expect(result.layers.h1?.value).toBe(1);
    expect(result.layers.h3?.value).toBeCloseTo(0.97, 2);
  });

  it('leaves out layers without data and renormalises the weights', () => {
    const result = computeHealthScore(
      { ...designExample, clinics: null, emergencyCarMin: null },
      params,
    );
    expect(result.missing).toEqual(['h3', 'h4']);
    expect(result.score).toBe(Math.round((100 * (25 * 1 + 25 * 0.8 + 10 * 0.6)) / 60));
  });

  it('has no score when no layer has data', () => {
    expect(
      computeHealthScore(
        {
          pharmacies: null,
          primaryCare: null,
          clinics: null,
          emergencyCarMin: null,
          nightPharmacyWalkMin: null,
          nightPharmacyCarMin: null,
          hasNightPharmacyData: false,
        },
        params,
      ),
    ).toEqual({ score: null, layers: {}, missing: ['h1', 'h2', 'h3', 'h4', 'h5'] });
  });
});
