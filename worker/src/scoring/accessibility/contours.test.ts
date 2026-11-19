import { describe, expect, it } from 'vitest';

import { contourPolygons, signedArea, simplifyRing } from './contours.ts';

function grid(rows: number[][]) {
  return { columns: rows[0]?.length ?? 0, rows: rows.length, values: rows.flat() };
}

describe('contourPolygons', () => {
  it('draws one counter-clockwise ring around the cells within the threshold', () => {
    const polygons = contourPolygons(
      grid([
        [60, 60, 60, 60],
        [60, 10, 10, 60],
        [60, 10, 10, 60],
        [60, 60, 60, 60],
      ]),
      30,
      { simplify: 0, minArea: 0 },
    );

    expect(polygons).toHaveLength(1);
    const [outer] = polygons[0] ?? [];
    expect(signedArea(outer ?? [])).toBeGreaterThan(0);
    for (const [column, row] of outer ?? []) {
      expect(column).toBeGreaterThanOrEqual(0.5);
      expect(column).toBeLessThanOrEqual(2.5);
      expect(row).toBeGreaterThanOrEqual(0.5);
      expect(row).toBeLessThanOrEqual(2.5);
    }
  });

  it('keeps an unreachable pocket as a clockwise hole of its ring', () => {
    const polygons = contourPolygons(
      grid([
        [10, 10, 10, 10, 10],
        [10, 10, 10, 10, 10],
        [10, 10, 90, 10, 10],
        [10, 10, 10, 10, 10],
        [10, 10, 10, 10, 10],
      ]),
      30,
      { simplify: 0, minArea: 0 },
    );

    expect(polygons).toHaveLength(1);
    const [outer, hole] = polygons[0] ?? [];
    expect(signedArea(outer ?? [])).toBeGreaterThan(0);
    expect(signedArea(hole ?? [])).toBeLessThan(0);
  });

  it('closes rings at the edge of the grid and drops rings smaller than the minimum', () => {
    const values = grid([
      [10, 10, 60, 60, 60],
      [10, 10, 60, 60, 60],
      [60, 60, 60, 60, 10],
    ]);

    expect(contourPolygons(values, 30, { simplify: 0, minArea: 0 })).toHaveLength(2);
    expect(contourPolygons(values, 30, { simplify: 0, minArea: 1 })).toHaveLength(1);
  });
});

describe('simplifyRing', () => {
  it('drops the points that lie on a straight side', () => {
    const square: [number, number][] = [
      [0, 0],
      [1, 0],
      [2, 0],
      [2, 1],
      [2, 2],
      [1, 2],
      [0, 2],
      [0, 1],
    ];

    expect(simplifyRing(square, 0.1)).toHaveLength(4);
  });
});
