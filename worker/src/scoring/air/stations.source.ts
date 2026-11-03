import { readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

import { asyncBufferFromFile, parquetReadObjects } from 'hyparquet';
import { z } from 'zod';

import { WorkerError } from '../../lib/errors.ts';
import { downloadOnce } from '../../sources/download.ts';
import { monthlyMean } from './air.formula.ts';
import type { Pollutant } from './air.params.ts';

const EEA_STATION_METADATA_URL =
  'https://discomap.eea.europa.eu/map/fme/metadata/PanEuropean_metadata.csv';
const EEA_DOWNLOAD_API_URL = 'https://eeadmz1-downloads-api-appservice.azurewebsites.net';

export type StationDataset = 'eea_e1a' | 'eea_e2a';

const DATASET_NUMBERS: Record<StationDataset, number> = { eea_e2a: 1, eea_e1a: 2 };

const POLLUTANT_NOTATIONS: Record<Pollutant, string> = { pm25: 'PM2.5', no2: 'NO2' };

const POLLUTANT_URIS: Record<string, Pollutant> = {
  'http://dd.eionet.europa.eu/vocabulary/aq/pollutant/6001': 'pm25',
  'http://dd.eionet.europa.eu/vocabulary/aq/pollutant/8': 'no2',
};

const STATION_TYPES = ['traffic', 'background', 'industrial'] as const;
const AREA_TYPES = ['urban', 'suburban', 'rural'] as const;

export type StationRecord = {
  eoi_code: string;
  station_type: (typeof STATION_TYPES)[number];
  area_type: (typeof AREA_TYPES)[number];
  longitude: number;
  latitude: number;
  active_from: string | null;
  active_to: string | null;
};

type SamplingPoint = {
  eoiCode: string;
  pollutant: Pollutant;
};

export type StationMetadata = {
  stations: StationRecord[];
  samplingPoints: Map<string, SamplingPoint>;
};

export type MeasurementRow = {
  samplingPoint: string;
  start: Date;
  value: number;
  aggType: string;
  validity: number;
};

export type MonthValue = {
  mean: number;
  validDays: number;
};

const parquetRowSchema = z.object({
  Samplingpoint: z.string(),
  Start: z.date(),
  Value: z.number().nullable(),
  AggType: z.string(),
  Validity: z.number(),
});

function isOneOf<T extends string>(values: readonly T[], value: string): value is T {
  return values.some((candidate) => candidate === value);
}

function dateOnly(value: string | undefined): string | null {
  const match = /^\d{4}-\d{2}-\d{2}/.exec(value ?? '');
  return match ? match[0] : null;
}

export function parseStationMetadata(text: string, countryCode: string): StationMetadata {
  const [header, ...lines] = text.split(/\r?\n/);
  const columns = (header ?? '').split('\t');
  const column = (name: string) => {
    const index = columns.indexOf(name);
    if (index < 0)
      throw new WorkerError(
        'station_metadata_unreadable',
        `Station metadata has no ${name} column`,
      );
    return index;
  };
  const indexes = {
    country: column('Countrycode'),
    eoiCode: column('AirQualityStationEoICode'),
    samplingPoint: column('SamplingPoint'),
    pollutant: column('AirPollutantCode'),
    begin: column('ObservationDateBegin'),
    end: column('ObservationDateEnd'),
    longitude: column('Longitude'),
    latitude: column('Latitude'),
    stationType: column('AirQualityStationType'),
    area: column('AirQualityStationArea'),
  };

  const stations = new Map<string, StationRecord>();
  const samplingPoints = new Map<string, SamplingPoint>();
  const openStations = new Set<string>();
  for (const line of lines) {
    const cells = line.split('\t');
    if (cells[indexes.country] !== countryCode) continue;
    const pollutant = POLLUTANT_URIS[cells[indexes.pollutant] ?? ''];
    const eoiCode = cells[indexes.eoiCode] ?? '';
    const stationType = cells[indexes.stationType] ?? '';
    const areaType = cells[indexes.area] ?? '';
    const longitude = Number(cells[indexes.longitude]);
    const latitude = Number(cells[indexes.latitude]);
    if (
      !pollutant ||
      !/^[A-Z]{2}[0-9A-Z]{3,10}$/.test(eoiCode) ||
      !isOneOf(STATION_TYPES, stationType) ||
      !isOneOf(AREA_TYPES, areaType) ||
      !Number.isFinite(longitude) ||
      !Number.isFinite(latitude)
    ) {
      continue;
    }
    samplingPoints.set(cells[indexes.samplingPoint] ?? '', { eoiCode, pollutant });
    const begin = dateOnly(cells[indexes.begin]);
    const end = dateOnly(cells[indexes.end]);
    if (end === null) openStations.add(eoiCode);
    const known = stations.get(eoiCode);
    if (!known) {
      stations.set(eoiCode, {
        eoi_code: eoiCode,
        station_type: stationType,
        area_type: areaType,
        longitude,
        latitude,
        active_from: begin,
        active_to: end,
      });
      continue;
    }
    if (begin && (!known.active_from || begin < known.active_from)) known.active_from = begin;
    if (end && (!known.active_to || end > known.active_to)) known.active_to = end;
  }
  for (const eoiCode of openStations) {
    const station = stations.get(eoiCode);
    if (station) station.active_to = null;
  }
  return { stations: [...stations.values()], samplingPoints };
}

export async function downloadStationMetadata(
  sourcesDir: string,
  period: string,
  countryCode: string,
): Promise<StationMetadata> {
  const path = await downloadOnce(
    EEA_STATION_METADATA_URL,
    join(sourcesDir, 'air', 'eea-stations', period.slice(0, 7), 'metadata.tsv'),
  );
  return parseStationMetadata(await readFile(path, 'utf8'), countryCode);
}

export function parseParquetUrlList(text: string): string[] {
  return text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('https://') && line.endsWith('.parquet'));
}

export async function listStationFiles(options: {
  dataset: StationDataset;
  countryCode: string;
  pollutants: readonly Pollutant[];
  start: string;
  end: string;
}): Promise<string[]> {
  const response = await fetch(`${EEA_DOWNLOAD_API_URL}/ParquetFile/urls`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      countries: [options.countryCode],
      cities: [],
      pollutants: options.pollutants.map((pollutant) => POLLUTANT_NOTATIONS[pollutant]),
      dataset: DATASET_NUMBERS[options.dataset],
      dateTimeStart: `${options.start}T00:00:00Z`,
      dateTimeEnd: `${options.end}T00:00:00Z`,
    }),
  });
  if (!response.ok)
    throw new WorkerError(
      'station_list_failed',
      `EEA download service answered ${response.status}`,
    );
  return parseParquetUrlList(await response.text());
}

export async function downloadStationFile(
  url: string,
  sourcesDir: string,
  period: string,
  dataset: StationDataset,
): Promise<string> {
  return downloadOnce(
    url,
    join(
      sourcesDir,
      'air',
      'eea-stations',
      period.slice(0, 7),
      dataset,
      basename(new URL(url).pathname),
    ),
  );
}

export async function readMeasurementRows(
  path: string,
  start: Date,
  end: Date,
): Promise<MeasurementRow[]> {
  const file = await asyncBufferFromFile(path);
  const rows = await parquetReadObjects({
    file,
    columns: ['Samplingpoint', 'Start', 'Value', 'AggType', 'Validity'],
  });
  const measurements: MeasurementRow[] = [];
  for (const row of rows) {
    const parsed = parquetRowSchema.safeParse(row);
    if (!parsed.success || parsed.data.Value === null) continue;
    if (parsed.data.Start < start || parsed.data.Start >= end) continue;
    measurements.push({
      samplingPoint: parsed.data.Samplingpoint.replace(/^[A-Z]{2}\//, ''),
      start: parsed.data.Start,
      value: parsed.data.Value,
      aggType: parsed.data.AggType,
      validity: parsed.data.Validity,
    });
  }
  return measurements;
}

export function dailyMeans(
  rows: readonly MeasurementRow[],
  minValidHours: number,
): Map<string, number> {
  const hours = new Map<string, number[]>();
  const days = new Map<string, number>();
  for (const row of rows) {
    if (row.validity < 1 || row.value < 0) continue;
    const day = row.start.toISOString().slice(0, 10);
    if (row.aggType === 'day') days.set(day, row.value);
    else if (row.aggType === 'hour') hours.set(day, [...(hours.get(day) ?? []), row.value]);
  }
  for (const [day, values] of hours) {
    if (days.has(day) || values.length < minValidHours) continue;
    days.set(day, values.reduce((sum, value) => sum + value, 0) / values.length);
  }
  return days;
}

export function monthlyFromDaily(
  dailyBySamplingPoint: readonly Map<string, number>[],
  months: readonly string[],
  minValidDays: number,
): Map<string, MonthValue> {
  const perDay = new Map<string, number[]>();
  for (const daily of dailyBySamplingPoint) {
    for (const [day, value] of daily) perDay.set(day, [...(perDay.get(day) ?? []), value]);
  }
  const result = new Map<string, MonthValue>();
  for (const month of months) {
    const prefix = month.slice(0, 7);
    const values = [...perDay.entries()]
      .filter(([day]) => day.startsWith(prefix))
      .map(([, values]) => values.reduce((sum, value) => sum + value, 0) / values.length);
    const { mean, validDays } = monthlyMean(values, minValidDays);
    if (mean !== null) result.set(month, { mean, validDays });
  }
  return result;
}
