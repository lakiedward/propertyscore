import { describe, expect, it } from 'vitest';

import { barycentricWeights, interpolateCategories, overallScore } from './address-scores.ts';

const SIZE = 175;
const WIDTH = SIZE * Math.sqrt(3);
const A = { x: 0, y: 0 };
const B = { x: WIDTH, y: 0 };
const C = { x: WIDTH / 2, y: 1.5 * SIZE };

describe('barycentricWeights', () => {
  it('gives the whole weight to the cell when the address is at its centre', () => {
    expect(barycentricWeights(A, [A, B, C])).toEqual([1, 0, 0]);
  });

  it('splits the weight between two cells on their shared edge', () => {
    const [a, b, c] = barycentricWeights({ x: WIDTH / 2, y: 0 }, [A, B, C]);
    expect(a).toBeCloseTo(0.5);
    expect(b).toBeCloseTo(0.5);
    expect(c).toBeCloseTo(0);
  });

  it('shares the weight evenly at the corner where three cells meet', () => {
    const corner = { x: WIDTH / 2, y: SIZE / 2 };
    for (const weight of barycentricWeights(corner, [A, B, C])) expect(weight).toBeCloseTo(1 / 3);
  });

  it('falls back to equal weights with fewer than three cells', () => {
    expect(barycentricWeights(A, [A, B])).toEqual([0.5, 0.5]);
  });
});

describe('interpolateCategories', () => {
  const cells = [
    { center: A, categories: { green: 70, noise: 60, air: null } },
    { center: B, categories: { green: 60, noise: null, air: null } },
    { center: C, categories: { green: 40, noise: 80, air: null } },
  ];

  it('gives the same score on both sides of a cell edge', () => {
    const onEdge = interpolateCategories(cells, [0.5, 0.5, 0]);
    expect(onEdge.green).toBe(65);
  });

  it('leaves out a cell without a score and keeps the others in proportion', () => {
    expect(interpolateCategories(cells, [0.5, 0.25, 0.25]).noise).toBe(67);
  });

  it('keeps a category empty when no cell has it', () => {
    expect(interpolateCategories(cells, [1, 0, 0]).air).toBeNull();
  });
});

describe('overallScore', () => {
  it('weights the categories like the snapshot and skips the empty ones', () => {
    const categories = {
      safety: 80,
      accessibility: null,
      fifteen_minute: null,
      green: 60,
      noise: null,
      air: null,
      industry: null,
      education: null,
      health: null,
    };
    expect(overallScore(categories, { safety: 15, green: 5, noise: 10 })).toBe(75);
  });
});
