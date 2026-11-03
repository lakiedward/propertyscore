import { describe, expect, it } from 'vitest';

import { linearPoints, weightedScore } from './components.ts';

describe('linearPoints', () => {
  it('rises from zeroAt to fullAt and clamps outside', () => {
    expect(linearPoints(0, 0, 0.3)).toBe(0);
    expect(linearPoints(0.15, 0, 0.3)).toBeCloseTo(0.5);
    expect(linearPoints(0.6, 0, 0.3)).toBe(1);
    expect(linearPoints(-1, 0, 0.3)).toBe(0);
  });

  it('falls when the full value is the smaller one, as for walking distances', () => {
    expect(linearPoints(300, 1200, 300)).toBe(1);
    expect(linearPoints(720, 1200, 300)).toBeCloseTo(0.5333, 3);
    expect(linearPoints(1500, 1200, 300)).toBe(0);
  });

  it('rejects an empty range', () => {
    expect(() => linearPoints(1, 5, 5)).toThrow(RangeError);
  });
});

describe('weightedScore', () => {
  it('averages the components that have data, on a 0-100 scale', () => {
    expect(
      weightedScore([
        { key: 'c1', weight: 35, points: 0.61 },
        { key: 'c2', weight: 15, points: 0.8 },
        { key: 'c3', weight: 25, points: 0.53 },
        { key: 'c4', weight: 15, points: 1 },
        { key: 'c5', weight: 10, points: null },
      ]),
    ).toBe(68);
  });

  it('returns null when no component has data', () => {
    expect(weightedScore([{ key: 'c1', weight: 10, points: null }])).toBeNull();
    expect(weightedScore([])).toBeNull();
  });

  it('ignores components with a zero weight', () => {
    expect(
      weightedScore([
        { key: 'c1', weight: 0, points: 0 },
        { key: 'c2', weight: 10, points: 0.5 },
      ]),
    ).toBe(50);
  });
});
