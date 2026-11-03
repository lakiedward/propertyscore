import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import type { RasterGrid } from '../../sources/gdal.ts';
import {
  bandUnitFactor,
  bandValidTime,
  camsMonthlyField,
  camsRequest,
  downloadCamsMonth,
} from './cams.source.ts';

function hourlyBand(time: string, values: number[], unit = '[kg/(m^3)]') {
  return {
    values: Float32Array.from(values),
    noData: 9999,
    metadata: { GRIB_VALID_TIME: String(Date.parse(time) / 1000), GRIB_UNIT: unit },
  };
}

describe('camsRequest', () => {
  it('asks for the hourly ensemble analysis of one month over Romania', () => {
    expect(camsRequest('pm25', '2026-02-01')).toMatchObject({
      variable: ['particulate_matter_2.5um'],
      model: ['ensemble'],
      type: ['analysis'],
      leadtime_hour: ['0'],
      date: ['2026-02-01/2026-02-28'],
      data_format: 'grib',
      area: [48.5, 20, 43.5, 30],
    });
    expect(camsRequest('no2', '2026-01-01').time).toHaveLength(24);
  });
});

describe('band metadata', () => {
  it('reads the valid time with or without the unit suffix', () => {
    expect(bandValidTime({ GRIB_VALID_TIME: '1767225600' }).toISOString()).toBe(
      '2026-01-01T00:00:00.000Z',
    );
    expect(bandValidTime({ GRIB_VALID_TIME: '  1767225600 sec UTC' }).toISOString()).toBe(
      '2026-01-01T00:00:00.000Z',
    );
    expect(() => bandValidTime({})).toThrow(
      expect.objectContaining({ code: 'cams_band_time_missing' }),
    );
  });

  it('converts kg/m³ to µg/m³ and refuses an unknown unit', () => {
    expect(bandUnitFactor({ GRIB_UNIT: '[kg/(m^3)]' })).toBe(1e9);
    expect(bandUnitFactor({ GRIB_UNIT: 'µg m-3' })).toBe(1);
    expect(() => bandUnitFactor({ GRIB_UNIT: 'ppb' })).toThrow(
      expect.objectContaining({ code: 'cams_unit_unknown' }),
    );
  });
});

describe('camsMonthlyField', () => {
  it('averages the hours of each valid day, then the valid days of the month', () => {
    const grid: RasterGrid = {
      width: 2,
      height: 1,
      originX: 20,
      originY: 48.5,
      pixelWidth: 0.1,
      pixelHeight: -0.1,
      bands: [
        hourlyBand('2026-01-01T00:00:00Z', [10e-9, 9999]),
        hourlyBand('2026-01-01T01:00:00Z', [20e-9, 9999]),
        hourlyBand('2026-01-02T00:00:00Z', [30e-9, 5e-9]),
        hourlyBand('2026-01-02T01:00:00Z', [30e-9, 5e-9]),
      ],
    };
    const field = camsMonthlyField(grid, 2, 2);
    expect(field[0]).toBeCloseTo(22.5);
    expect(Number.isNaN(field[1])).toBe(true);
    expect(camsMonthlyField(grid, 2, 1)[1]).toBeCloseTo(5);
  });
});

describe('downloadCamsMonth', () => {
  let dir: string | undefined;

  afterEach(async () => {
    vi.unstubAllGlobals();
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('submits the request, waits for the job and downloads the result once', async () => {
    dir = await mkdtemp(join(tmpdir(), 'cams-test-'));
    const calls: string[] = [];
    const statuses = ['running', 'successful'];
    vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
      calls.push(`${init?.method ?? 'GET'} ${url}`);
      if (url.endsWith('/execution'))
        return Promise.resolve(Response.json({ jobID: 'job-1', status: 'accepted' }));
      if (url.endsWith('/jobs/job-1'))
        return Promise.resolve(Response.json({ status: statuses.shift() }));
      if (url.endsWith('/results')) {
        return Promise.resolve(
          Response.json({ asset: { value: { href: 'https://files.example.test/out.grib' } } }),
        );
      }
      return Promise.resolve(new Response('GRIB'));
    });
    const options = {
      apiUrl: 'https://ads.example.test/api',
      apiKey: 'test-key',
      sleep: () => Promise.resolve(),
      sourcesDir: dir,
      pollutant: 'pm25' as const,
      month: '2026-01-01',
    };

    const path = await downloadCamsMonth(options);
    expect(path).toBe(join(dir, 'air', 'cams', '2026-01', 'pm25.grib'));
    expect(await readFile(path, 'utf8')).toBe('GRIB');
    expect(calls).toEqual([
      'POST https://ads.example.test/api/retrieve/v1/processes/cams-europe-air-quality-forecasts/execution',
      'GET https://ads.example.test/api/retrieve/v1/jobs/job-1',
      'GET https://ads.example.test/api/retrieve/v1/jobs/job-1',
      'GET https://ads.example.test/api/retrieve/v1/jobs/job-1/results',
      'GET https://files.example.test/out.grib',
    ]);

    await downloadCamsMonth(options);
    expect(calls).toHaveLength(5);
  });

  it('stops with the job state when ADS rejects the request', async () => {
    dir = await mkdtemp(join(tmpdir(), 'cams-test-'));
    vi.stubGlobal('fetch', () =>
      Promise.resolve(Response.json({ jobID: 'job-2', status: 'rejected' })),
    );
    await expect(
      downloadCamsMonth({
        apiUrl: 'https://ads.example.test/api',
        apiKey: 'test-key',
        sourcesDir: dir,
        pollutant: 'no2',
        month: '2026-01-01',
      }),
    ).rejects.toThrow(expect.objectContaining({ code: 'cams_job_failed' }));
  });
});
