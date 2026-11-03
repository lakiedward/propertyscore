import { describe, expect, it } from 'vitest';

import { smoothScores } from './smoothing.ts';

const weights = { cellWeight: 0.6, neighbourWeight: 0.4 };

describe('smoothScores', () => {
  it('blends 60% of the cell with 40% of the mean of its neighbours that have data', () => {
    const scores = new Map<string, number | null>([
      ['a', 80],
      ['b', 40],
      ['c', 60],
      ['d', null],
    ]);
    const pairs = [
      { cell_id: 'a', neighbour_id: 'b' },
      { cell_id: 'a', neighbour_id: 'c' },
      { cell_id: 'a', neighbour_id: 'd' },
      { cell_id: 'b', neighbour_id: 'a' },
    ];
    const smoothed = smoothScores(scores, pairs, weights);
    expect(smoothed.get('a')).toBeCloseTo(68);
    expect(smoothed.get('b')).toBeCloseTo(56);
    expect(smoothed.get('c')).toBe(60);
    expect(smoothed.get('d')).toBeNull();
  });
});
