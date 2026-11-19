import { describe, expect, it } from 'vitest';

import type { PointSafety } from './safety.formula.ts';
import { smoothedAddressScore, walkedLandmarks } from './safety.report.ts';
import { v1Params } from './safety.test-params.ts';

const params = v1Params();

const landmark = (id: string, type: 'police' | 'fire_station' | 'nonstop', distance: number) => ({
  id,
  feature_type: type,
  name: id,
  longitude: 21.2,
  latitude: 45.75,
  distance_m: distance,
});

const walked = (id: string, type: 'police' | 'fire_station', meters: number | null) => ({
  key: type,
  poi_id: id,
  name: id,
  night_state: 'unknown' as const,
  lng: 21.21,
  lat: 45.76,
  straight_m: 100,
  leg: meters === null ? null : { seconds: Math.round(meters / 1.25), meters },
});

describe('walkedLandmarks', () => {
  it('shows the police and fire station nearest on foot and keeps the other landmarks straight', () => {
    const landmarks = walkedLandmarks(
      [landmark('police-a', 'police', 200), landmark('shop', 'nonstop', 300)],
      {
        cellId: 'address',
        routed: [walked('police-a', 'police', 520), walked('police-b', 'police', 410)],
      },
      params,
    );

    expect(landmarks).toEqual([
      landmark('shop', 'nonstop', 300),
      {
        id: 'police-b',
        feature_type: 'police',
        name: 'police-b',
        longitude: 21.21,
        latitude: 45.76,
        distance_m: 410,
      },
    ]);
  });

  it('falls back to the straight line times the detour factor without a walked route', () => {
    const landmarks = walkedLandmarks(
      [landmark('fire', 'fire_station', 500), landmark('police', 'police', 300)],
      { cellId: 'address', routed: [walked('police', 'police', null)] },
      params,
    );

    expect(landmarks.map((row) => [row.id, row.distance_m])).toEqual([
      ['police', 300 * params.walk_detour_factor],
      ['fire', 500 * params.walk_detour_factor],
    ]);
  });
});

describe('smoothedAddressScore', () => {
  const moment = (rawScore: number) => ({
    score: Math.round(rawScore),
    rawScore,
    waterfall: { rows: [], farTypes: [], total: 0 },
    contributions: [],
  });
  const point: PointSafety = {
    score: 0,
    day: moment(80),
    night: moment(60),
    excludedTypes: [],
  };

  it('blends the address with the raw scores of the neighbouring cells like the snapshot does', () => {
    const params = v1Params();
    const neighbours = [
      { day_unsmoothed: 60, night_unsmoothed: 40 },
      { day_unsmoothed: 60, night_unsmoothed: 40 },
    ];
    const day = Math.round(params.smoothing.self * 80 + params.smoothing.neighbours * 60);
    const night = Math.round(params.smoothing.self * 60 + params.smoothing.neighbours * 40);
    const weights = params.moment_weights;
    expect(smoothedAddressScore(point, neighbours, params)).toBe(
      Math.round((weights.day * day + weights.night * night) / (weights.day + weights.night)),
    );
  });

  it('keeps the address score when no neighbour has raw scores', () => {
    const params = v1Params();
    const weights = params.moment_weights;
    expect(smoothedAddressScore(point, [{ reason: 'no_data' }], params)).toBe(
      Math.round((weights.day * 80 + weights.night * 60) / (weights.day + weights.night)),
    );
  });
});
