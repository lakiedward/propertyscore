import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import { z } from 'zod';

import { WorkerError } from '../../lib/errors.ts';
import type { Logger } from '../../lib/logger.ts';
import {
  artifactUnconfirmed,
  snapshotDigest,
  snapshotFileDigest,
} from '../../snapshot/resume-artifacts.ts';
import type { SnapshotRequest } from '../../snapshot/resume-plan.ts';
import type { StepJournal } from '../../snapshot/resume-steps.ts';
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

export type AdsClientOptions = {
  apiUrl: string;
  apiKey: string;
  sleep?: (milliseconds: number) => Promise<void>;
  pollIntervalMs?: number;
  maxWaitMs?: number;
  logger?: Logger;
  signal?: AbortSignal;
};

export type CamsCheckpoint = {
  journal: StepJournal;
  step: string;
  signal: AbortSignal;
};

type CamsDownloadOptions = AdsClientOptions & {
  sourcesDir: string;
  pollutant: Pollutant;
  month: string;
  checkpoint?: CamsCheckpoint;
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

async function adsJson(options: AdsClientOptions, url: string, body?: unknown): Promise<unknown> {
  const response = await fetch(url, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'PRIVATE-TOKEN': options.apiKey, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    ...(options.signal && {
      signal: AbortSignal.any([options.signal, AbortSignal.timeout(60_000)]),
      redirect: 'error',
    }),
  });
  if (!response.ok) {
    throw new WorkerError('cams_request_failed', `ADS answered ${response.status}`);
  }
  return response.json();
}

async function submitCams(options: CamsDownloadOptions) {
  const submitted = jobSchema.safeParse(
    await adsJson(
      options,
      `${options.apiUrl.replace(/\/$/, '')}/retrieve/v1/processes/${CAMS_DATASET}/execution`,
      {
        inputs: camsRequest(options.pollutant, options.month),
      },
    ),
  );
  if (!submitted.success) throw new WorkerError('cams_request_failed', 'ADS did not return a job');
  options.logger?.info('cams job submitted', {
    pollutant: options.pollutant,
    month: options.month,
  });
  return submitted.data;
}

function camsJobUrl(options: AdsClientOptions, jobId: string) {
  return `${options.apiUrl.replace(/\/$/, '')}/retrieve/v1/jobs/${encodeURIComponent(jobId)}`;
}

async function readCamsStatus(options: AdsClientOptions, jobUrl: string) {
  const polled = statusSchema.safeParse(await adsJson(options, jobUrl));
  if (!polled.success) throw new WorkerError('cams_request_failed', 'ADS job status is unreadable');
  return polled.data.status;
}

function isCamsFailure(status: string) {
  return ['failed', 'rejected', 'dismissed', 'deleted'].includes(status);
}

async function waitForCams(options: AdsClientOptions, jobUrl: string, initialStatus: string) {
  const sleep =
    options.sleep ??
    ((milliseconds: number) => delay(milliseconds, undefined, { signal: options.signal }));
  const deadline = Date.now() + (options.maxWaitMs ?? 3 * 60 * 60 * 1000);
  let status = initialStatus;
  while (status !== 'successful') {
    if (isCamsFailure(status)) return 'failed';
    if (Date.now() > deadline)
      throw new WorkerError('cams_job_timeout', 'ADS job did not finish in time');
    await sleep(options.pollIntervalMs ?? 30_000);
    status = await readCamsStatus(options, jobUrl);
  }
  return 'successful';
}

async function downloadCamsResult(options: AdsClientOptions, jobUrl: string, destination: string) {
  const results = resultsSchema.safeParse(await adsJson(options, `${jobUrl}/results`));
  if (!results.success) throw new WorkerError('cams_request_failed', 'ADS results have no file');
  try {
    return await downloadOnce(results.data.asset.value.href, destination, {
      signal: options.signal,
      trackSource: false,
    });
  } catch {
    options.signal?.throwIfAborted();
    throw new WorkerError('cams_request_failed', 'ADS result file is unavailable');
  }
}

function checkpointPath(directory: string, jobId: string) {
  return join(directory, 'air', 'ads-jobs', `${snapshotDigest(jobId)}.grib`);
}

export async function reconcileCamsRequest(
  options: AdsClientOptions & { sourcesDir: string; signal: AbortSignal },
  request: SnapshotRequest,
) {
  if (request.provider !== 'ads' || request.upstream_id === null) return null;
  const jobUrl = camsJobUrl(options, request.upstream_id);
  const status = await readCamsStatus(options, jobUrl);
  const identity = {
    provider: request.provider,
    upstreamId: request.upstream_id,
    fingerprint: request.fingerprint,
    correlationId: null,
  } as const;
  if (isCamsFailure(status)) return { ...identity, state: 'failed' } as const;
  if (status !== 'successful') return null;
  const file = await downloadCamsResult(
    options,
    jobUrl,
    checkpointPath(options.sourcesDir, request.upstream_id),
  );
  return {
    ...identity,
    state: 'succeeded',
    artifactSha256: await snapshotFileDigest(file, options.signal),
  } as const;
}

async function downloadCheckpointedCams(options: CamsDownloadOptions, checkpoint: CamsCheckpoint) {
  const { journal, signal, step } = checkpoint;
  signal.throwIfAborted();
  const pending = await journal.beginRequest(step, {
    provider: 'ads',
    operationKey: `${options.pollutant}:${options.month}`,
    fingerprint: snapshotDigest(
      JSON.stringify([options.apiUrl, CAMS_DATASET, camsRequest(options.pollutant, options.month)]),
    ),
  });
  signal.throwIfAborted();
  const client = { ...options, signal };
  if (pending.outcome === 'reuse') {
    const file = checkpointPath(options.sourcesDir, pending.upstreamId);
    if (!(await isDownloaded(file))) {
      await downloadCamsResult(client, camsJobUrl(client, pending.upstreamId), file);
    }
    if ((await snapshotFileDigest(file, signal)) !== pending.artifactSha256) artifactUnconfirmed();
    return file;
  }
  if (pending.outcome !== 'submit') artifactUnconfirmed();
  const job = await submitCams(client);
  await journal.acceptRequest(pending.requestId, job.jobID);
  const jobUrl = camsJobUrl(client, job.jobID);
  if ((await waitForCams(client, jobUrl, job.status)) === 'failed') {
    await journal.finishRequest(pending.requestId, 'failed');
    throw new WorkerError('cams_job_failed', 'ADS job ended unsuccessfully');
  }
  const file = await downloadCamsResult(
    client,
    jobUrl,
    checkpointPath(options.sourcesDir, job.jobID),
  );
  await journal.finishRequest(pending.requestId, {
    artifactSha256: await snapshotFileDigest(file, signal),
  });
  return file;
}

export async function downloadCamsMonth(options: CamsDownloadOptions): Promise<string> {
  if (options.checkpoint) return downloadCheckpointedCams(options, options.checkpoint);
  const destination = camsFilePath(options.sourcesDir, options.pollutant, options.month);
  if (await isDownloaded(destination)) return destination;
  const job = await submitCams(options);
  const jobUrl = camsJobUrl(options, job.jobID);
  if ((await waitForCams(options, jobUrl, job.status)) === 'failed') {
    throw new WorkerError('cams_job_failed', 'ADS job ended unsuccessfully');
  }
  return downloadCamsResult(options, jobUrl, destination);
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
