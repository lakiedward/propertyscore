import { describe, expect, it } from 'vitest';

import { bandLow, gridAround } from './noise.bands.ts';

describe('gridAround', () => {
  const center = { lon: 21.2257, lat: 45.7537 };

  it('keeps the address in the middle and stays inside the radius', () => {
    const points = gridAround(center, 100, 25);
    expect(points).toContainEqual(center);
    expect(points).toHaveLength(49);
  });

  it('spaces the points by the step in metres', () => {
    const points = gridAround(center, 50, 25);
    const east = points.find((point) => point.lat === center.lat && point.lon > center.lon);
    const metres =
      ((east?.lon ?? 0) - center.lon) * 111_320 * Math.cos((center.lat * Math.PI) / 180);
    expect(metres).toBeCloseTo(25, 3);
  });
});

describe('bandLow', () => {
  it('places a level on its five decibel band', () => {
    expect(bandLow(54.9, 5)).toBe(50);
    expect(bandLow(55, 5)).toBe(55);
    expect(bandLow(68.3, 5)).toBe(65);
  });
});
