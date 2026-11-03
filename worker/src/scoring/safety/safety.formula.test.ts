import { describe, expect, it } from 'vitest';

import {
  finalScore,
  kernelSum,
  largestRemainder,
  momentScore,
  saturate,
  scoreAtPoint,
  smooth,
  typePoints,
  waterfall,
} from './safety.formula.ts';
import { v1Params } from './safety.test-params.ts';

const params = v1Params({ k: 4, night_offset: -8 });

function sumRows(rows: readonly { points: number }[]): number {
  return rows.reduce((sum, row) => sum + row.points, 0);
}

describe('kernelSum', () => {
  it('counts an element fully at 0 m, about 37% at the radius and 2% at twice the radius', () => {
    const police = params.types.police;
    expect(kernelSum([{ distanceM: 0, nightState: 'unknown' }], police, 'day')).toBe(1);
    expect(kernelSum([{ distanceM: 600, nightState: 'unknown' }], police, 'day')).toBeCloseTo(
      Math.exp(-1),
    );
    expect(kernelSum([{ distanceM: 1200, nightState: 'unknown' }], police, 'day')).toBeCloseTo(
      Math.exp(-4),
    );
  });

  it('weighs shops at night by whether they are open at 23:00', () => {
    const shop = params.types.shop;
    const at0 = (nightState: 'open' | 'closed' | 'unknown') => [{ distanceM: 0, nightState }];
    expect(kernelSum(at0('open'), shop, 'night')).toBe(1);
    expect(kernelSum(at0('closed'), shop, 'night')).toBe(0);
    expect(kernelSum(at0('unknown'), shop, 'night')).toBe(0.25);
    expect(kernelSum(at0('closed'), shop, 'day')).toBe(1);
  });
});

describe('saturate', () => {
  it('grows almost linearly at first and never passes the cap', () => {
    expect(saturate(0.01, 6)).toBeCloseTo(0.01, 4);
    expect(saturate(200, 6)).toBeCloseTo(6);
    expect(saturate(1000, 6)).toBeLessThanOrEqual(6);
  });
});

describe('typePoints', () => {
  it('reproduces a police station at the address with k = 4', () => {
    const features = [{ distanceM: 0, nightState: 'unknown' as const }];
    const expected = 4 * 2.2 * 1.5 * (1 - Math.exp(-1 / 1.5));
    expect(typePoints(features, params.types.police, 'day', params.k)).toBeCloseTo(expected);
    expect(typePoints(features, params.types.police, 'day', params.k)).toBeCloseTo(6.42, 2);
  });

  it('keeps 200 lamps on a boulevard from adding more than the cap allows', () => {
    const lamps = Array.from({ length: 200 }, () => ({
      distanceM: 10,
      nightState: 'unknown' as const,
    }));
    const capped = params.k * params.types.lighting.weight_night * params.types.lighting.cap;
    expect(typePoints(lamps, params.types.lighting, 'night', params.k)).toBeCloseTo(capped, 1);
  });
});

describe('momentScore', () => {
  it('starts at 50 by day and 50 + the night offset at night with nothing around', () => {
    expect(momentScore({}, params, 'day').score).toBe(50);
    expect(momentScore({}, params, 'night').score).toBe(42);
  });

  it('turns a bar from a plus by day into a minus at night', () => {
    const inputs = { bar: [{ distanceM: 20, nightState: 'unknown' as const }] };
    expect(momentScore(inputs, params, 'day').score).toBeGreaterThan(50);
    expect(momentScore(inputs, params, 'night').score).toBeLessThan(42);
  });

  it('leaves an excluded type out instead of counting it as zero', () => {
    const inputs = { lighting: [{ distanceM: 5, nightState: 'unknown' as const }] };
    const result = momentScore(inputs, params, 'night', new Set(['lighting']));
    expect(result.contributions.some((row) => row.type === 'lighting')).toBe(false);
    expect(result.score).toBe(42);
  });

  it('clamps to 0–100 and reports the nearest element and the count in the radius', () => {
    const many = Array.from({ length: 30 }, () => ({
      distanceM: 0,
      nightState: 'unknown' as const,
    }));
    const loud = momentScore(
      { police: many, diplomatic: many, nonstop: many },
      v1Params({ k: 40 }),
      'day',
    );
    expect(loud.score).toBe(100);
    expect(loud.raw).toBeGreaterThan(100);
    const police = momentScore(
      {
        police: [
          { distanceM: 370.4, nightState: 'unknown' },
          { distanceM: 900, nightState: 'unknown' },
        ],
      },
      params,
      'day',
    ).contributions.find((row) => row.type === 'police');
    expect(police).toMatchObject({ count: 1, nearestM: 370 });
  });
});

describe('smooth and finalScore', () => {
  it('mixes 60% of the cell with 40% of its neighbours', () => {
    expect(smooth(80, [60, 60, 60, 60, 60, 60], params.smoothing)).toBeCloseTo(72);
    expect(smooth(80, [], params.smoothing)).toBe(80);
  });

  it('averages day and night with the version weights', () => {
    expect(finalScore(78, 70, params.moment_weights)).toBe(74);
    expect(finalScore(78, 70, { day: 0.6, night: 0.4 })).toBe(75);
  });
});

describe('largestRemainder', () => {
  it('rounds so the parts add up to the total', () => {
    expect(largestRemainder([3.6, 2.6, 1.8], 8)).toEqual([4, 2, 2]);
    expect(largestRemainder([3.4, -1.4], 2)).toEqual([3, -1]);
    expect(largestRemainder([0.2, 0.2], 1)).toEqual([1, 0]);
  });
});

describe('waterfall', () => {
  const inputs = {
    police: [{ distanceM: 370, nightState: 'unknown' as const }],
    nonstop: [{ distanceM: 60, nightState: 'open' as const }],
    lighting: Array.from({ length: 12 }, (_, index) => ({
      distanceM: 10 + index * 8,
      nightState: 'unknown' as const,
    })),
    shop: Array.from({ length: 8 }, (_, index) => ({
      distanceM: 30 + index * 15,
      nightState: index % 2 === 0 ? ('open' as const) : ('closed' as const),
    })),
    bar: [{ distanceM: 90, nightState: 'unknown' as const }],
    park: [{ distanceM: 240, nightState: 'unknown' as const }],
    fire_station: [{ distanceM: 2300, nightState: 'unknown' as const }],
  };

  it('has rows that add up exactly to the displayed score, by day and at night', () => {
    const point = scoreAtPoint(inputs, params);
    for (const moment of [point.day, point.night]) {
      expect(sumRows(moment.waterfall.rows)).toBe(moment.score);
      expect(moment.waterfall.total).toBe(moment.score);
    }
    expect(point.night.waterfall.rows[1]).toEqual({ key: 'night_offset', points: -8 });
    expect(point.score).toBe(finalScore(point.day.score, point.night.score, params.moment_weights));
  });

  it('lists the types too far away to count and keeps them out of the rows', () => {
    const day = scoreAtPoint(inputs, params).day.waterfall;
    expect(day.farTypes).toContain('fire_station');
    expect(day.farTypes).toContain('diplomatic');
    expect(day.rows.some((row) => row.key === 'fire_station')).toBe(false);
  });

  it('adds a limit row when the score hits 100', () => {
    const many = Array.from({ length: 30 }, () => ({
      distanceM: 0,
      nightState: 'unknown' as const,
    }));
    const strong = v1Params({ k: 40 });
    const result = momentScore({ police: many, diplomatic: many }, strong, 'day');
    const rows = waterfall(result, strong.start).rows;
    expect(rows.at(-1)?.key).toBe('limit');
    expect(sumRows(rows)).toBe(100);
  });
});
