import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import { z } from 'zod';

import { WorkerError } from '../../lib/errors.ts';
import type { Logger } from '../../lib/logger.ts';
import type { RoutingScope } from '../../routing/scope.ts';
import { downloadOnce } from '../../sources/download.ts';
import { isNoData, type RasterGrid } from '../../sources/gdal.ts';
import type { Pollutant } from './air.params.ts';

const ROMANIA_AREA = { north: 48.5, west: 20, south: 43.5, east: 30 } as const;

const CAMS_DATASET = 'cams-europe-air-quality-forecasts';

const CAMS_VARIABLES: Record<Pollutant, string> = {
  pm25: 'particulate_matter_2.5um',
  no2: 'nitrogen_dioxide',
};

const HOURS = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, '0')}:00`);

const jobSchema = z.object({ jobID: z.string().min(1), status: z.string() });
const statusSchema = z.object({ status: z.string() });
const resultsSchema = z.object({ asset: z.object({ value: z.object({ href: z.url() }) }) });

type AdsClientOptions = {
  apiUrl: string;
  apiKey: string;
  sleep?: (milliseconds: number) => Promise<void>;
  pollIntervalMs?: number;
  maxWaitMs?: number;
  logger?: Logger;
  signal?: AbortSignal;
  requestScope?: Pick<RoutingScope, 'run'>;
};

type CamsDownloadOptions = AdsClientOptions & {
  sourcesDir: string;
  pollutant: Pollutant;
  month: string;
};

async function isDownloaded(path: string): Promise<boolean> {
  try {
    const info = await stat(path);
    return info.isFile() && info.size > 0;
  } catch {
    return false;
  }
}

function lastDayOfMonth(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  const last = new Date(Date.UTC(year ?? 0, monthNumber ?? 0, 0));
  return last.toISOString().slice(0, 10);
}

export function camsRequest(pollutant: Pollutant, month: string): Record<string, unknown> {
  return {
    variable: [CAMS_VARIABLES[pollutant]],
    model: ['ensemble'],
    level: ['0'],
    type: ['analysis'],
    date: [`${month}/${lastDayOfMonth(month)}`],
    time: HOURS,
    leadtime_hour: ['0'],
    data_format: 'grib',
    area: [ROMANIA_AREA.north, ROMANIA_AREA.west, ROMANIA_AREA.south, ROMANIA_AREA.east],
  };
}

function camsFilePath(sourcesDir: string, pollutant: Pollutant, month: string): string {
  return join(sourcesDir, 'air', 'cams', month.slice(0, 7), `${pollutant}.grib`);
}

async function adsJson(
  options: AdsClientOptions,
  url: string,
  signal?: AbortSignal,
  body?: unknown,
): Promise<unknown> {
  signal?.throwIfAborted();
  const response = await fetch(url, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'PRIVATE-TOKEN': options.apiKey, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });
  if (!response.ok) {
    throw new WorkerError(
      'cams_request_failed',
      `ADS answered ${response.status} for ${new URL(url).pathname}`,
    );
  }
  return response.json();
}

async function waitForCamsJob(
  options: CamsDownloadOptions,
  signal: AbortSignal,
): Promise<{ jobUrl: string; status: string }> {
  const base = options.apiUrl.replace(/\/$/, '');
  const submitted = jobSchema.safeParse(
    await adsJson(options, `${base}/retrieve/v1/processes/${CAMS_DATASET}/execution`, signal, {
      inputs: camsRequest(options.pollutant, options.month),
    }),
  );
  if (!submitted.success) throw new WorkerError('cams_request_failed', 'ADS did not return a job');
  const jobUrl = `${base}/retrieve/v1/jobs/${encodeURIComponent(submitted.data.jobID)}`;
  options.logger?.info('cams job submitted', {
    pollutant: options.pollutant,
    month: options.month,
  });

  let status = submitted.data.status;
  for (;;) {
    if (
      status === 'successful' ||
      status === 'failed' ||
      status === 'rejected' ||
      status === 'dismissed'
    ) {
      return { jobUrl, status };
    }
    if (status !== 'accepted' && status !== 'running' && status !== 'queued') {
      throw new WorkerError('cams_request_failed', 'ADS job completion is unknown');
    }
    const interval = options.pollIntervalMs ?? 30_000;
    await (options.sleep ? options.sleep(interval) : delay(interval, undefined, { signal }));
    const polled = statusSchema.safeParse(await adsJson(options, jobUrl, signal));
    if (!polled.success)
      throw new WorkerError('cams_request_failed', 'ADS job status is unreadable');
    status = polled.data.status;
  }
}

export async function downloadCamsMonth(options: CamsDownloadOptions): Promise<string> {
  options.signal?.throwIfAborted();
  const destination = camsFilePath(options.sourcesDir, options.pollutant, options.month);
  if (await isDownloaded(destination)) return destination;
  const submitAndWait = async () => {
    const deadline = AbortSignal.timeout(options.maxWaitMs ?? 3 * 60 * 60 * 1000);
    const signal = options.signal ? AbortSignal.any([options.signal, deadline]) : deadline;
    try {
      return await waitForCamsJob(options, signal);
    } catch (error) {
      if (signal.reason === deadline.reason && deadline.aborted) {
        throw new WorkerError('cams_job_timeout', 'ADS job did not finish in time', {
          cause: error,
        });
      }
      throw error;
    }
  };
  const { jobUrl, status } = await (options.requestScope
    ? options.requestScope.run(submitAndWait)
    : submitAndWait());
  if (status !== 'successful') {
    throw new WorkerError('cams_job_failed', `ADS job ended as ${status}`);
  }

  const results = resultsSchema.safeParse(
    await adsJson(options, `${jobUrl}/results`, options.signal),
  );
  if (!results.success) throw new WorkerError('cams_request_failed', 'ADS results have no file');
  return downloadOnce(results.data.asset.value.href, destination, { signal: options.signal });
}

export function bandValidTime(metadata: Record<string, string>): Date {
  const seconds = /\d{9,}/.exec(metadata.GRIB_VALID_TIME ?? '')?.[0];
  if (!seconds) throw new WorkerError('cams_band_time_missing', 'A CAMS band has no valid time');
  return new Date(Number(seconds) * 1000);
}

export function bandUnitFactor(metadata: Record<string, string>): number {
  const unit = (metadata.GRIB_UNIT ?? '').toLowerCase();
  if (unit.includes('kg')) return 1e9;
  if (unit.includes('µg') || unit.includes('ug') || unit.includes('microg')) return 1;
  throw new WorkerError('cams_unit_unknown', `Unknown CAMS unit: ${unit || '(none)'}`);
}

export function camsMonthlyField(
  grid: RasterGrid,
  minValidHours: number,
  minValidDays: number,
): Float32Array {
  const pixels = grid.width * grid.height;
  const days = new Map<string, number[]>();
  grid.bands.forEach((band, index) => {
    const day = bandValidTime(band.metadata).toISOString().slice(0, 10);
    days.set(day, [...(days.get(day) ?? []), index]);
  });
  const factors = grid.bands.map((band) => bandUnitFactor(band.metadata));
  const field = new Float32Array(pixels).fill(Number.NaN);
  for (let pixel = 0; pixel < pixels; pixel += 1) {
    let daySum = 0;
    let validDays = 0;
    for (const bandIndexes of days.values()) {
      let hourSum = 0;
      let validHours = 0;
      for (const bandIndex of bandIndexes) {
        const band = grid.bands[bandIndex];
        const value = band?.values[pixel];
        if (band === undefined || value === undefined || isNoData(value, band.noData)) continue;
        hourSum += value * (factors[bandIndex] ?? 1);
        validHours += 1;
      }
      if (validHours >= minValidHours) {
        daySum += hourSum / validHours;
        validDays += 1;
      }
    }
    if (validDays >= minValidDays) field[pixel] = daySum / validDays;
  }
  return field;
}
