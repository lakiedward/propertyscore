import { describe, expect, it } from 'vitest';

import { gridAround } from './noise.heat.ts';

describe('gridAround', () => {
  const center = { lon: 21.2257, lat: 45.7537 };

  it('keeps the address in the middle and stays inside the radius', () => {
    const { half, cells } = gridAround(center, 100, 25);
    expect(half).toBe(4);
    expect(cells).toHaveLength(49);
    expect(cells).toContainEqual({ ...center, index: 4 * 9 + 4 });
  });

  it('numbers the cells row by row from the north-west corner', () => {
    const { cells } = gridAround(center, 50, 25);
    const first = cells[0];
    expect(first?.index).toBe(2);
    expect(first?.lat).toBeGreaterThan(center.lat);
    expect(first?.lon).toBeCloseTo(center.lon, 9);
  });

  it('spaces the cells by the step in metres', () => {
    const { cells } = gridAround(center, 50, 25);
    const east = cells.find((cell) => cell.lat === center.lat && cell.lon > center.lon);
    const metres =
      ((east?.lon ?? 0) - center.lon) * 111_320 * Math.cos((center.lat * Math.PI) / 180);
    expect(metres).toBeCloseTo(25, 3);
  });
});
