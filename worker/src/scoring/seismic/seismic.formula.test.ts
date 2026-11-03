import { describe, expect, it } from 'vitest';

import { hazardLevel, roundAcceleration } from './seismic.formula.ts';

const LEVELS = {
  levels: [
    [0.1, 'low'],
    [0.2, 'moderate'],
    [0.3, 'high'],
  ] as [number, 'low' | 'moderate' | 'high'][],
  top_level: 'very_high' as const,
};

describe('hazardLevel', () => {
  it('reads the design example: Timișoara at 0,20 g is moderate', () => {
    expect(hazardLevel(0.2, LEVELS)).toBe('moderate');
  });

  it('puts each threshold in its own band', () => {
    expect(hazardLevel(0.1, LEVELS)).toBe('low');
    expect(hazardLevel(0.15, LEVELS)).toBe('moderate');
    expect(hazardLevel(0.25, LEVELS)).toBe('high');
    expect(hazardLevel(0.3, LEVELS)).toBe('high');
  });

  it('uses the top level above the last threshold', () => {
    expect(hazardLevel(0.35, LEVELS)).toBe('very_high');
  });
});

describe('roundAcceleration', () => {
  it('keeps two decimals', () => {
    expect(roundAcceleration(0.1500000001)).toBe(0.15);
  });
});
