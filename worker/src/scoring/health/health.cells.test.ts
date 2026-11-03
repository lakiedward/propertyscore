import { describe, expect, it } from 'vitest';

import {
  cellAccessFromWalk,
  scoreHealthCell,
  withCar,
  type CellAccess,
  type CityAvailability,
  type DistanceMethods,
} from './health.cells.ts';
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

const everything: CityAvailability = {
  pharmacies: true,
  primaryCare: true,
  clinics: true,
  emergency: true,
  nightPharmacies: true,
};

function access(
  nearestWalkMin: number | null,
  within: [number, number, number],
  nearestCarMin: number | null = null,
): CellAccess {
  return {
    nearestPoiId: nearestWalkMin === null && nearestCarMin === null ? null : 'poi',
    nearestWalkMin,
    nearestCarMin,
    within: { 5: within[0], 10: within[1], 15: within[2] },
  };
}

const straightLine: DistanceMethods = { walk: 'straight_line', car: 'straight_line' };

describe('cellAccessFromWalk and withCar', () => {
  it('turns walking seconds into minutes and keeps the counts', () => {
    expect(
      cellAccessFromWalk({
        cellId: 'c',
        category: 'health_pharmacy',
        tNearestS: 390,
        n5: 1,
        n10: 3,
        n15: 4,
        nearestPoiId: 'p1',
        distanceMethod: 'pedestrian_routing',
      }),
    ).toEqual({
      nearestPoiId: 'p1',
      nearestWalkMin: 6.5,
      nearestCarMin: null,
      within: { 5: 1, 10: 3, 15: 4 },
    });
  });

  it('adds the driving time and falls back to the place reached by car', () => {
    expect(withCar(undefined, { poiId: 'h1', seconds: 840 })).toEqual({
      nearestPoiId: 'h1',
      nearestWalkMin: null,
      nearestCarMin: 14,
      within: { 5: 0, 10: 0, 15: 0 },
    });
    expect(withCar(access(18, [0, 0, 0]), { poiId: 'other', seconds: 300 })).toMatchObject({
      nearestPoiId: 'poi',
      nearestWalkMin: 18,
      nearestCarMin: 5,
    });
  });
});

describe('scoreHealthCell', () => {
  it('scores a cell and keeps the audit trail per layer', () => {
    const result = scoreHealthCell(
      'cell-1',
      {
        pharmacies: access(3, [2, 5, 5]),
        primaryCare: access(6, [0, 1, 3]),
        clinics: access(9, [0, 2, 4]),
        emergency: access(70, [0, 0, 0], 14),
        nightPharmacies: access(18, [0, 0, 0], 5),
      },
      everything,
      params,
      straightLine,
    );
    expect(result.score).toBe(84);
    expect(result.inputs).toMatchObject({
      distance_method: 'straight_line',
      car_distance_method: 'straight_line',
      missing: [],
      h1: { value: 1, t_min: 3, n: 5, mode: 'walk', poi_id: 'poi' },
      h4: { t_min: 14, mode: 'car' },
    });
    expect(result.inputs).not.toHaveProperty('reason');
  });

  it('treats a category the city has no source for as missing, not as zero', () => {
    const result = scoreHealthCell(
      'cell-2',
      {
        pharmacies: access(3, [2, 5, 5]),
        primaryCare: access(null, [0, 0, 0]),
        emergency: access(null, [0, 0, 0], null),
      },
      { ...everything, clinics: false, emergency: false, nightPharmacies: false },
      params,
      straightLine,
    );
    expect(result.inputs.missing).toEqual(['h3', 'h4', 'h5']);
    expect(result.score).toBe(Math.round((100 * 25 * 1) / 50));
  });

  it('gives no score and a reason when nothing is known', () => {
    const result = scoreHealthCell(
      'cell-3',
      {},
      {
        pharmacies: false,
        primaryCare: false,
        clinics: false,
        emergency: false,
        nightPharmacies: false,
      },
      params,
      straightLine,
    );
    expect(result).toMatchObject({ score: null, inputs: { reason: 'no_source_data' } });
  });
});
