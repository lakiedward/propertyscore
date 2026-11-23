import { describe, expect, it } from 'vitest';
import { multipliedOverBase, noiseBandRaster, NOISE_BANDS } from './noise-bands';

const GRID = { center: [21.18, 45.73] as [number, number], columns: 3, rows: 3, step_m: 20 };

describe('noiseBandRaster', () => {
  it('draws nothing below the first band', () => {
    const raster = noiseBandRaster({ ...GRID, levels: Array<number>(9).fill(52) });
    expect(raster.width).toBe(15);
    expect(raster.height).toBe(15);
    expect(raster.rgba.every((value) => value === 0)).toBe(true);
  });

  it('fills a loud grid with the top band multiplied over the base map', () => {
    const raster = noiseBandRaster({ ...GRID, levels: Array<number>(9).fill(72) });
    const top = NOISE_BANDS.at(-1);
    const [red, green, blue] = multipliedOverBase(top ? top[1] : [0, 0, 0]);
    expect(Array.from(raster.rgba.slice(0, 4))).toEqual([red, green, blue, 255]);
  });

  it('frames the raster around the address', () => {
    const { coordinates } = noiseBandRaster({ ...GRID, levels: Array<number>(9).fill(60) });
    expect(coordinates[0][0]).toBeLessThan(GRID.center[0]);
    expect(coordinates[0][1]).toBeGreaterThan(GRID.center[1]);
    expect(coordinates[2][0]).toBeGreaterThan(GRID.center[0]);
    expect(coordinates[2][1]).toBeLessThan(GRID.center[1]);
  });
});
