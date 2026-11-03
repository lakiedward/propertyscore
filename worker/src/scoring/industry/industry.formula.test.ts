import { describe, expect, it } from 'vitest';

import {
  distanceFactor,
  emissionClass,
  industryPressure,
  industryScore,
  isTopEmitter,
  pointsLostPerSite,
  siteWeight,
  topEmitterThresholds,
  type IndustryParams,
  type SiteContribution,
} from './industry.formula.ts';

const DECAY: IndustryParams['decay'] = [
  [300, 3],
  [1000, 1],
  [3000, 0.15],
  [5000, 0],
];

const WEIGHTS: Pick<IndustryParams, 'sector_weights' | 'emission_multipliers'> = {
  sector_weights: {
    energy: 1.2,
    metals: 1.3,
    chemicals: 1.3,
    minerals: 1.2,
    waste_water: 0.8,
    paper_wood: 0.9,
    livestock: 0.8,
    food: 0.6,
    other: 0.7,
  },
  emission_multipliers: { none: 0.6, reported: 1, top: 1.5 },
};

function contribution(siteId: string, distanceM: number, weight: number): SiteContribution {
  return { siteId, distanceM, weight, factor: distanceFactor(distanceM, DECAY) };
}

describe('distanceFactor', () => {
  it('follows the piecewise curve of the plan', () => {
    expect(distanceFactor(0, DECAY)).toBe(3);
    expect(distanceFactor(300, DECAY)).toBe(3);
    expect(distanceFactor(650, DECAY)).toBeCloseTo(2);
    expect(distanceFactor(1000, DECAY)).toBe(1);
    expect(distanceFactor(2300, DECAY)).toBeCloseTo(0.4475);
    expect(distanceFactor(3800, DECAY)).toBeCloseTo(0.09);
    expect(distanceFactor(5000, DECAY)).toBe(0);
    expect(distanceFactor(7000, DECAY)).toBe(0);
  });
});

describe('siteWeight', () => {
  it('multiplies the sector weight by the emission class', () => {
    expect(siteWeight('metals', emissionClass(true, false), WEIGHTS)).toBeCloseTo(1.3);
    expect(siteWeight('food', emissionClass(false, false), WEIGHTS)).toBeCloseTo(0.36);
    expect(siteWeight('energy', emissionClass(true, true), WEIGHTS)).toBeCloseTo(1.8);
  });
});

describe('industryScore', () => {
  const designExample = [
    contribution('factory', 2300, siteWeight('metals', 'reported', WEIGHTS)),
    contribution('treatment', 3800, siteWeight('waste_water', 'reported', WEIGHTS)),
    contribution('chp', 4100, siteWeight('energy', 'reported', WEIGHTS)),
  ];

  it('reproduces the design example: three sites between 2.3 and 4.1 km give 90', () => {
    const pressure = industryPressure(designExample);
    expect(pressure).toBeCloseTo(0.735, 2);
    expect(industryScore(pressure, 0.14)).toBe(90);
  });

  it('gives 100 without sites and drops fast under 1 km', () => {
    expect(industryScore(0, 0.14)).toBe(100);
    const at800 = industryScore(industryPressure([contribution('a', 800, 1.3)]), 0.14);
    expect(at800).toBeGreaterThanOrEqual(70);
    expect(at800).toBeLessThanOrEqual(80);
    const twoHeavy = industryScore(
      industryPressure([contribution('a', 400, 1.95), contribution('b', 450, 1.95)]),
      0.14,
    );
    expect(twoHeavy).toBeLessThan(30);
  });

  it('splits the lost points between sites so they add up to 100 minus the score', () => {
    const lost = pointsLostPerSite(designExample, 90);
    expect([...lost.values()].reduce((sum, value) => sum + value, 0)).toBe(10);
    expect(lost.get('factory')).toBeGreaterThan(lost.get('chp') ?? 0);
  });

  it('gives no lost points when the score is 100', () => {
    expect([...pointsLostPerSite([contribution('a', 6000, 1)], 100).values()]).toEqual([0]);
  });
});

describe('top emitters', () => {
  it('marks the facilities in the top share of any listed pollutant', () => {
    const releases = new Map<string, Record<string, number>>([
      ['a', { nox: 100 }],
      ['b', { nox: 50, pm10: 5 }],
      ['c', { nox: 10, pm10: 90 }],
      ['d', { co2: 1_000_000 }],
    ]);
    const thresholds = topEmitterThresholds(releases, ['nox', 'pm10'], 0.1);
    expect(thresholds).toEqual(
      new Map([
        ['nox', 100],
        ['pm10', 90],
      ]),
    );
    expect(isTopEmitter({ nox: 100 }, thresholds)).toBe(true);
    expect(isTopEmitter({ nox: 50, pm10: 5 }, thresholds)).toBe(false);
    expect(isTopEmitter({ pm10: 90 }, thresholds)).toBe(true);
    expect(isTopEmitter({ co2: 1_000_000 }, thresholds)).toBe(false);
  });
});
