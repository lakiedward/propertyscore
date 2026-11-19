import { describe, expect, it } from 'vitest';

import { heatColour, heatRaster, type HeatStop } from './heat-grid.ts';

const ramp: readonly HeatStop[] = [
  [30, [200, 100, 80]],
  [60, [220, 200, 150]],
  [90, [210, 240, 220]],
];

const center: [number, number] = [21.2, 45.75];

describe('heatColour', () => {
  it('blends between the two stops around a value and holds the ends', () => {
    expect(heatColour(ramp, 45)).toEqual([210, 150, 115]);
    expect(heatColour(ramp, 10)).toEqual([200, 100, 80]);
    expect(heatColour(ramp, 99)).toEqual([210, 240, 220]);
  });
});

describe('heatRaster', () => {
  const options = {
    center,
    halfWidthM: 500,
    halfHeightM: 250,
    stepM: 50,
    cellSizeM: 175,
    ramp,
    opacity: 0.8,
  };

  it('covers the requested area with one pixel per step, north up', () => {
    const raster = heatRaster([[center[0], center[1], 60]], options);

    expect(raster.width).toBe(20);
    expect(raster.height).toBe(10);
    expect(raster.rgba).toHaveLength(20 * 10 * 4);
    const [topLeft, topRight, bottomRight, bottomLeft] = raster.coordinates;
    expect(topLeft[0]).toBeLessThan(center[0]);
    expect(topLeft[1]).toBeGreaterThan(center[1]);
    expect(topRight[0]).toBeGreaterThan(center[0]);
    expect(bottomRight[1]).toBeLessThan(center[1]);
    expect(bottomLeft[0]).toBe(topLeft[0]);
  });

  it('paints the cell colour near a cell and leaves pixels far from every cell transparent', () => {
    const raster = heatRaster([[center[0], center[1], 60]], options);
    const pixel = (column: number, row: number) =>
      raster.rgba.slice((row * raster.width + column) * 4, (row * raster.width + column) * 4 + 4);

    expect(pixel(10, 5).slice(0, 3)).toEqual([220, 200, 150]);
    expect(pixel(10, 5)[3]).toBeGreaterThan(0);
    expect(pixel(0, 0)[3]).toBe(0);
  });

  it('weights each pixel towards the nearer cell', () => {
    const offset = 300 / (111_195 * Math.cos((center[1] * Math.PI) / 180));
    const raster = heatRaster(
      [
        [center[0] - offset, center[1], 30],
        [center[0] + offset, center[1], 90],
      ],
      options,
    );
    const red = (column: number) => raster.rgba[(5 * raster.width + column) * 4];

    expect(red(4)).toBeLessThan(red(15) ?? 0);
  });
});
