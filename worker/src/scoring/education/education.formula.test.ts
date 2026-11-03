import { describe, expect, it } from 'vitest';

import {
  countWithin,
  distancePoints,
  educationScore,
  levelAccess,
  nearestTwo,
  type ReachableUnit,
} from './education.formula.ts';

const LEVELS = {
  kindergarten: { full_min: 8, zero_min: 20, weight: 30 },
  school: { full_min: 10, zero_min: 25, weight: 45 },
  high_school: { full_min: 15, zero_min: 35, weight: 25 },
};

function unit(institutionId: string, minutes: number, entity = institutionId): ReachableUnit {
  return { institutionId, entity, minutes };
}

describe('distancePoints', () => {
  it('is full up to full_min, falls linearly and reaches zero at zero_min', () => {
    expect(distancePoints(6, LEVELS.school)).toBe(1);
    expect(distancePoints(13, LEVELS.school)).toBeCloseTo(0.8);
    expect(distancePoints(25, LEVELS.school)).toBe(0);
    expect(distancePoints(40, LEVELS.school)).toBe(0);
  });

  it('gives nothing when no unit is reachable', () => {
    expect(distancePoints(null, LEVELS.school)).toBe(0);
  });
});

describe('nearestTwo', () => {
  it('takes the second choice from another legal entity', () => {
    const { first, second } = nearestTwo([
      unit('a', 5, 'school-1'),
      unit('b', 7, 'school-1'),
      unit('c', 12, 'school-2'),
    ]);
    expect(first?.institutionId).toBe('a');
    expect(second?.institutionId).toBe('c');
  });

  it('has no second choice when every unit belongs to one entity', () => {
    expect(nearestTwo([unit('a', 5, 'e'), unit('b', 6, 'e')]).second).toBeNull();
    expect(nearestTwo([])).toEqual({ first: null, second: null });
  });
});

describe('educationScore', () => {
  it('reproduces the worked example of the plan (92)', () => {
    const access = {
      kindergarten: levelAccess([unit('k1', 4), unit('k2', 7)], LEVELS.kindergarten, 0.25),
      school: levelAccess([unit('s1', 6), unit('s2', 13)], LEVELS.school, 0.25),
      high_school: levelAccess([unit('h1', 18), unit('h2', 24)], LEVELS.high_school, 0.25),
    };
    expect(access.school.points).toBeCloseTo(0.95);
    expect(access.high_school.points).toBeCloseTo(0.775);
    expect(educationScore(access, LEVELS)).toBe(92);
  });

  it('drops to 83 when the high schools are 26 and 30 minutes away', () => {
    const access = {
      kindergarten: levelAccess([unit('k1', 4), unit('k2', 7)], LEVELS.kindergarten, 0.25),
      school: levelAccess([unit('s1', 6), unit('s2', 13)], LEVELS.school, 0.25),
      high_school: levelAccess([unit('h1', 26), unit('h2', 30)], LEVELS.high_school, 0.25),
    };
    expect(educationScore(access, LEVELS)).toBe(83);
  });

  it('scores a missing level as zero instead of skipping it', () => {
    const access = {
      kindergarten: levelAccess([], LEVELS.kindergarten, 0.25),
      school: levelAccess([unit('s1', 5), unit('s2', 6)], LEVELS.school, 0.25),
      high_school: levelAccess([], LEVELS.high_school, 0.25),
    };
    expect(access.kindergarten).toEqual({ t1: null, t2: null, points: 0 });
    expect(educationScore(access, LEVELS)).toBe(45);
  });
});

describe('countWithin', () => {
  it('counts each unit once, at its nearest level', () => {
    expect(
      countWithin(
        [unit('a', 4), unit('a', 4), unit('b', 9), unit('c', 14), unit('d', 20)],
        [5, 10, 15],
      ),
    ).toEqual({ m5: 1, m10: 2, m15: 3 });
  });
});
