import { describe, expect, it } from 'vitest';

import { scoreGreen, type GreenFormulaParams } from './green.formula.ts';

const params: GreenFormulaParams = {
  shareCap: 0.3,
  smallFullM: 300,
  smallZeroM: 1200,
  largeFullM: 1000,
  largeZeroM: 3000,
  canopyCap: 0.25,
  weights: { c1: 35, c2: 15, c3: 25, c4: 15, c5: 10 },
};

describe('scoreGreen', () => {
  it('reproduces the worked example of the plan', () => {
    const result = scoreGreen(
      { shareNear: 0.184, shareWide: 0.241, smallWalkM: 720, largeWalkM: 720, canopy: null },
      params,
    );

    expect(result.score).toBe(69);
    expect(result.components.map((component) => component.points)).toEqual([
      expect.closeTo(0.613, 3),
      expect.closeTo(0.803, 3),
      expect.closeTo(0.533, 3),
      1,
      null,
    ]);
  });

  it('caps the share and the distances at full points', () => {
    const result = scoreGreen(
      { shareNear: 0.6, shareWide: 0.45, smallWalkM: 0, largeWalkM: 500, canopy: null },
      params,
    );

    expect(result.score).toBe(100);
  });

  it('gives no access points when no park of that size exists', () => {
    const result = scoreGreen(
      { shareNear: 0, shareWide: 0, smallWalkM: null, largeWalkM: null, canopy: null },
      params,
    );

    expect(result.score).toBe(0);
    expect(result.components[2]).toMatchObject({ key: 'c3', value: null, points: 0 });
  });

  it('has no score when no component has data', () => {
    const result = scoreGreen(
      { shareNear: null, shareWide: null, smallWalkM: null, largeWalkM: null, canopy: null },
      { ...params, weights: { c1: 35, c2: 15, c3: 0, c4: 0, c5: 10 } },
    );

    expect(result.score).toBeNull();
  });
});
