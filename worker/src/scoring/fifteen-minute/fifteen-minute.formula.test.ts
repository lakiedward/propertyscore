import { describe, expect, it } from 'vitest';

import { testParams } from './fifteen-minute.fixtures.ts';
import {
  type CategoryAccess,
  categoryPoints,
  fifteenMinuteScore,
  proximity,
} from './fifteen-minute.formula.ts';

const params = testParams();

function access(key: string, tNearestS: number | null, n15: number): CategoryAccess {
  return { key, tNearestS, n5: 0, n10: 0, n15 };
}

describe('proximity', () => {
  it('is full up to 5 minutes, 0.75 at 10, 0.5 at 15 and zero beyond', () => {
    expect(proximity(3, params.proximity)).toBe(1);
    expect(proximity(5, params.proximity)).toBe(1);
    expect(proximity(10, params.proximity)).toBeCloseTo(0.75);
    expect(proximity(15, params.proximity)).toBeCloseTo(0.5);
    expect(proximity(15.1, params.proximity)).toBe(0);
  });
});

describe('categoryPoints', () => {
  it('weighs 70% the nearest point and 30% the choice up to the enough count', () => {
    expect(categoryPoints(access('supermarket', 600, 2), 3, params)).toBeCloseTo(0.725);
    expect(categoryPoints(access('supermarket', 120, 9), 3, params)).toBe(1);
    expect(categoryPoints(access('supermarket', null, 0), 3, params)).toBe(0);
  });
});

describe('fifteenMinuteScore', () => {
  const small = testParams({
    categories: [
      {
        key: 'supermarket',
        group: 'shops',
        osm: ['shop=supermarket'],
        poi_categories: [],
        exclude: [],
        weight: 6,
        enough: 3,
      },
      {
        key: 'pharmacy',
        group: 'pharmacies',
        osm: ['amenity=pharmacy'],
        poi_categories: [],
        exclude: [],
        weight: 4,
        enough: 2,
      },
      {
        key: 'cinema_theatre',
        group: 'culture',
        osm: ['amenity=cinema'],
        poi_categories: [],
        exclude: [],
        weight: 1,
        enough: 1,
      },
    ],
  });

  it('averages the categories the city has data for and counts those within 15 minutes', () => {
    const measured = new Map([
      ['supermarket', access('supermarket', 300, 3)],
      ['pharmacy', access('pharmacy', null, 0)],
      ['cinema_theatre', access('cinema_theatre', 200, 1)],
    ]);
    const result = fifteenMinuteScore(measured, new Set(['supermarket', 'pharmacy']), small);
    expect(result.score).toBe(60);
    expect(result.covered).toBe(1);
    expect(result.total).toBe(2);
    expect(result.categories.supermarket).toEqual({ t1_min: 5, n5: 0, n10: 0, n15: 3, s: 1 });
    expect(result.categories.cinema_theatre?.s).toBeNull();
  });

  it('has no score when the city has data for no category', () => {
    expect(fifteenMinuteScore(new Map(), new Set(), small).score).toBeNull();
  });
});
