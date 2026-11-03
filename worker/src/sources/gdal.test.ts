import { execFileSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  isNoData,
  parseLocationValues,
  readRaster,
  sampleBilinear,
  sampleRasterAtPoints,
} from './gdal.ts';

function hasGdal(): boolean {
  try {
    execFileSync('gdalinfo', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const grid = { width: 3, height: 2, originX: 24, originY: 46, pixelWidth: 0.5, pixelHeight: -0.5 };

describe('sampleBilinear', () => {
  const values = Float32Array.from([1, 2, 3, 4, 5, 6]);

  it('returns the pixel value at a pixel centre and interpolates between centres', () => {
    expect(sampleBilinear(grid, values, { lon: 24.25, lat: 45.75 })).toBeCloseTo(1);
    expect(sampleBilinear(grid, values, { lon: 24.5, lat: 45.5 })).toBeCloseTo(3);
    expect(sampleBilinear(grid, values, { lon: 25.25, lat: 45.25 })).toBeCloseTo(6);
  });

  it('has no value outside the pixel centres or next to a missing pixel', () => {
    expect(sampleBilinear(grid, values, { lon: 24.1, lat: 45.75 })).toBeNull();
    expect(
      sampleBilinear(grid, Float32Array.from([1, 2, 3, 4, Number.NaN, 6]), {
        lon: 24.5,
        lat: 45.5,
      }),
    ).toBeNull();
  });
});

describe('parseLocationValues', () => {
  it('maps empty lines and the no-data value to null', () => {
    expect(parseLocationValues('1\n-9999\n\n6\n', 4, -9999)).toEqual([1, null, null, 6]);
    expect(isNoData(Number.NaN, null)).toBe(true);
  });

  it('refuses an answer with a different number of points', () => {
    expect(() => parseLocationValues('1\n', 2, null)).toThrow(
      expect.objectContaining({ code: 'gdal_location_mismatch' }),
    );
  });
});

describe.skipIf(!hasGdal())('GDAL rasters', () => {
  let dir: string;
  let raster: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'gdal-test-'));
    const ascii = join(dir, 'grid.asc');
    await writeFile(
      ascii,
      [
        'ncols 3',
        'nrows 2',
        'xllcorner 24.0',
        'yllcorner 45.0',
        'cellsize 0.5',
        'NODATA_value -9999',
        '1 2 3',
        '4 -9999 6',
        '',
      ].join('\n'),
    );
    raster = join(dir, 'grid.tif');
    execFileSync('gdal_translate', ['-q', '-a_srs', 'EPSG:4326', ascii, raster]);
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('reads the grid, its geotransform and its no-data value', async () => {
    const grid = await readRaster(raster, join(dir, 'work'));
    expect(grid).toMatchObject({
      width: 3,
      height: 2,
      originX: 24,
      originY: 46,
      pixelWidth: 0.5,
      pixelHeight: -0.5,
    });
    expect(grid.bands).toHaveLength(1);
    expect(Array.from(grid.bands[0]?.values ?? [])).toEqual([1, 2, 3, 4, -9999, 6]);
    expect(grid.bands[0]?.noData).toBe(-9999);
  });

  it('samples the pixel under each point and leaves points outside empty', async () => {
    await expect(
      sampleRasterAtPoints(raster, [
        { lon: 24.1, lat: 45.9 },
        { lon: 24.6, lat: 45.2 },
        { lon: 30, lat: 30 },
        { lon: 25.2, lat: 45.1 },
      ]),
    ).resolves.toEqual([1, null, null, 6]);
  });
});
