import { extname, join } from 'node:path';

import { WorkerError } from '../../lib/errors.ts';
import type { Logger } from '../../lib/logger.ts';
import { downloadOnce } from '../../sources/download.ts';
import {
  readRaster,
  sampleBilinear,
  sampleRasterAtPoints,
  type GeoPoint,
  type RasterGrid,
} from '../../sources/gdal.ts';
import type { AirParams, Pollutant } from './air.params.ts';
import { camsMonthlyField, downloadCamsMonth } from './cams.source.ts';
import {
  dailyMeans,
  downloadStationFile,
  downloadStationMetadata,
  listStationFiles,
  monthlyFromDaily,
  readMeasurementRows,
  type StationDataset,
  type StationRecord,
} from './stations.source.ts';

const COUNTRY_CODE = 'RO';

const STATION_DATASETS: readonly StationDataset[] = ['eea_e1a', 'eea_e2a'];

export type AirConfig = {
  adsApiUrl: string;
  adsApiKey: string | undefined;
  eeaMapYear: string | undefined;
  eeaMapUrls: Partial<Record<Pollutant, string>>;
};

export type ModelField = (point: GeoPoint) => number | null;

export type StationMonth = {
  eoiCode: string;
  pollutant: Pollutant;
  month: string;
  mean: number;
  validDays: number;
  source: StationDataset;
};

export type AirSources = {
  modelField: (pollutant: Pollutant, month: string) => Promise<ModelField>;
  stations: () => Promise<{ stations: StationRecord[]; months: StationMonth[] }>;
  mapValues: (
    pollutant: Pollutant,
    points: readonly GeoPoint[],
  ) => Promise<(number | null)[] | null>;
  mapYear: string | null;
};

type SourceContext = {
  sourcesDir: string;
  period: string;
  logger: Logger;
};

function fieldSampler(grid: Omit<RasterGrid, 'bands'>, field: Float32Array): ModelField {
  return (point) => sampleBilinear(grid, field, point);
}

export function pickStationMonths(candidates: readonly StationMonth[]): StationMonth[] {
  const chosen = new Map<string, StationMonth>();
  for (const candidate of candidates) {
    const key = `${candidate.eoiCode}|${candidate.pollutant}|${candidate.month}`;
    const known = chosen.get(key);
    if (!known || (known.source === 'eea_e2a' && candidate.source === 'eea_e1a'))
      chosen.set(key, candidate);
  }
  return [...chosen.values()];
}

export function createAirSources(
  context: SourceContext,
  config: AirConfig,
  params: AirParams,
  months: readonly string[],
): AirSources {
  const { sourcesDir, period, logger } = context;
  const workDir = join(sourcesDir, 'air', 'work');
  const windowStart = months[0] ?? period;
  const windowEnd = period;

  return {
    mapYear: config.eeaMapYear ?? null,

    async modelField(pollutant, month) {
      if (!config.adsApiKey) throw new WorkerError('ads_api_key_missing', 'ADS_API_KEY is not set');
      const path = await downloadCamsMonth({
        apiUrl: config.adsApiUrl,
        apiKey: config.adsApiKey,
        sourcesDir,
        pollutant,
        month,
        logger,
      });
      const grid = await readRaster(path, workDir);
      const field = camsMonthlyField(grid, params.min_valid_hours_per_day, params.min_valid_days);
      return fieldSampler(grid, field);
    },

    async stations() {
      const metadata = await downloadStationMetadata(sourcesDir, period, COUNTRY_CODE);
      const candidates: StationMonth[] = [];
      const start = new Date(`${windowStart}T00:00:00Z`);
      const end = new Date(`${windowEnd}T00:00:00Z`);
      for (const dataset of STATION_DATASETS) {
        const urls = await listStationFiles({
          dataset,
          countryCode: COUNTRY_CODE,
          pollutants: ['pm25', 'no2'],
          start: windowStart,
          end: windowEnd,
        });
        const dailyByStation = new Map<string, Map<string, number>[]>();
        for (const url of urls) {
          const path = await downloadStationFile(url, sourcesDir, period, dataset);
          const rows = await readMeasurementRows(path, start, end);
          const bySamplingPoint = Map.groupBy(rows, (row) => row.samplingPoint);
          for (const [samplingPoint, pointRows] of bySamplingPoint) {
            const point = metadata.samplingPoints.get(samplingPoint);
            if (!point) continue;
            const key = `${point.eoiCode}|${point.pollutant}`;
            dailyByStation.set(key, [
              ...(dailyByStation.get(key) ?? []),
              dailyMeans(pointRows, params.min_valid_hours_per_day),
            ]);
          }
        }
        for (const [key, daily] of dailyByStation) {
          const [eoiCode = '', pollutant] = key.split('|');
          if (pollutant !== 'pm25' && pollutant !== 'no2') continue;
          for (const [month, value] of monthlyFromDaily(daily, months, params.min_valid_days)) {
            candidates.push({
              eoiCode,
              pollutant,
              month,
              mean: value.mean,
              validDays: value.validDays,
              source: dataset,
            });
          }
        }
        logger.info('air stations read', { dataset, files: urls.length });
      }
      return { stations: metadata.stations, months: pickStationMonths(candidates) };
    },

    async mapValues(pollutant, points) {
      const url = config.eeaMapUrls[pollutant];
      if (!url || !config.eeaMapYear) return null;
      const extension = extname(new URL(url).pathname) || '.tif';
      const path = await downloadOnce(
        url,
        join(sourcesDir, 'air', 'eea-maps', config.eeaMapYear, `${pollutant}${extension}`),
      );
      return sampleRasterAtPoints(path, points);
    },
  };
}
