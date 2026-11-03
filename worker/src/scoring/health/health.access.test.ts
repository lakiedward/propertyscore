import { describe, expect, it } from 'vitest';

import { nearestByCar, straightLineCarLeg } from './health.access.ts';

describe('straightLineCarLeg', () => {
  it('stretches the straight line by the detour factor and drives it at the set speed', () => {
    expect(straightLineCarLeg(5000, 30, 1.4)).toEqual({ meters: 7000, seconds: 840 });
  });
});

describe('nearestByCar', () => {
  it('keeps the fastest reachable place per category', () => {
    const candidates = [
      { key: 'health_emergency', poi_id: 'a', lng: 0, lat: 0, straight_m: 900 },
      { key: 'health_emergency', poi_id: 'b', lng: 0, lat: 0, straight_m: 1200 },
      { key: 'health_pharmacy_night', poi_id: 'c', lng: 0, lat: 0, straight_m: 300 },
      { key: 'health_pharmacy_night', poi_id: 'd', lng: 0, lat: 0, straight_m: 400 },
    ];
    const nearest = nearestByCar(candidates, [
      { seconds: 600, meters: 3000 },
      { seconds: 420, meters: 3500 },
      null,
      { seconds: 200, meters: 900 },
    ]);
    expect(Object.fromEntries(nearest)).toEqual({
      health_emergency: { poiId: 'b', seconds: 420 },
      health_pharmacy_night: { poiId: 'd', seconds: 200 },
    });
  });

  it('is empty when no place can be reached', () => {
    expect(nearestByCar([], []).size).toBe(0);
  });
});
