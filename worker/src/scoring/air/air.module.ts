import { readEnv } from '../../config/env.ts';
import type { JsonObject } from '../../db/sql.ts';
import { WorkerError } from '../../lib/errors.ts';
import type { ScoreModule } from '../score-module.ts';
import { writeCategoryScores, type CellCategoryScore } from '../write-category-scores.ts';
import {
  listCalibrationStations,
  listCellNeighbours,
  listCityCells,
  upsertAirStations,
  writeAirCityStats,
  writeCellAir,
  writeCityCalibration,
  writeStationMonths,
  type CellAirRow,
} from './air.db.ts';
import {
  airScore,
  airVerdict,
  analysisWindow,
  annualMean,
  blendWithNeighbours,
  calibratedSeries,
  calibrationFactor,
  monthsOverLimit,
  roundTo,
  spatialFactors,
  type CalibrationResult,
  type MonthlySeries,
} from './air.formula.ts';
import { airParamsSchema, POLLUTANTS, type Pollutant } from './air.params.ts';
import {
  createAirSources,
  type AirConfig,
  type AirSources,
  type ModelField,
} from './air.sources.ts';

type ScoreContext = Parameters<ScoreModule['run']>[0];

type CellResult = {
  row: CellAirRow;
  raw: number | null;
  status: string;
  calibrated: Record<Pollutant, boolean>;
};

function periodEnd(period: string): string {
  const date = new Date(`${period}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function average(values: readonly (number | null)[]): number | null {
  const present = values.filter((value): value is number => value !== null);
  if (present.length === 0) return null;
  return roundTo(present.reduce((sum, value) => sum + value, 0) / present.length, 2);
}

function airConfigFromEnv(): AirConfig {
  const env = readEnv();
  return {
    adsApiUrl: env.ADS_API_URL,
    adsApiKey: env.ADS_API_KEY,
    eeaMapYear: env.AIR_EEA_MAP_YEAR,
    eeaMapUrls: { pm25: env.AIR_EEA_PM25_MAP_URL, no2: env.AIR_EEA_NO2_MAP_URL },
  };
}

export async function runAir(
  context: ScoreContext,
  sourcesFor: (
    params: ReturnType<typeof airParamsSchema.parse>,
    months: readonly string[],
  ) => AirSources,
): Promise<{ sourceDates: Record<string, string> }> {
  const { sql, snapshotId, logger } = context;
  const parsed = airParamsSchema.safeParse(context.params);
  if (!parsed.success)
    throw new WorkerError('invalid_air_params', 'params.air is missing or invalid');
  const params = parsed.data;
  const months = analysisWindow(context.period);
  const sources = sourcesFor(params, months);

  const fields: Record<Pollutant, ModelField[]> = { pm25: [], no2: [] };
  for (const pollutant of POLLUTANTS) {
    for (const month of months) fields[pollutant].push(await sources.modelField(pollutant, month));
  }
  logger.info('air model ready', { snapshot_id: snapshotId, months: months.length });

  const stationData = await sources.stations();
  const stationIds = await upsertAirStations(sql, stationData.stations);
  const stationMonths = await writeStationMonths(
    sql,
    stationData.months.flatMap((month) => {
      const stationId = stationIds.get(month.eoiCode);
      if (!stationId) return [];
      return [
        {
          station_id: stationId,
          pollutant: month.pollutant,
          month: month.month,
          mean: month.mean,
          valid_days: month.validDays,
          source: month.source,
        },
      ];
    }),
  );
  logger.info('air stations stored', {
    snapshot_id: snapshotId,
    stations: stationIds.size,
    months: stationMonths,
  });

  const modelSeries = (pollutant: Pollutant, point: { lon: number; lat: number }): MonthlySeries =>
    fields[pollutant].map((field) => field(point));

  for (const city of context.cities) {
    const cells = await listCityCells(sql, snapshotId, city.id);
    const stations = await listCalibrationStations(
      sql,
      city.id,
      params.calibration_station_areas,
      months,
    );

    const calibration = {} as Record<Pollutant, CalibrationResult>;
    const spatial = {} as Record<Pollutant, (number | null)[]>;
    for (const pollutant of POLLUTANTS) {
      calibration[pollutant] = calibrationFactor(
        stations.map((station) => ({
          station: months.map((month) => station.months[pollutant].get(month) ?? null),
          model: modelSeries(pollutant, station),
        })),
        params.min_valid_months,
        params.calibration_factor_range,
      );
      await writeCityCalibration(sql, snapshotId, city.id, pollutant, calibration[pollutant]);
      const mapValues = await sources.mapValues(pollutant, cells);
      spatial[pollutant] = mapValues
        ? spatialFactors(mapValues, params.spatial_factor_range)
        : cells.map(() => null);
    }

    const results = new Map<string, CellResult>();
    cells.forEach((cell, index) => {
      const series = {} as Record<Pollutant, MonthlySeries>;
      const annual = {} as Record<Pollutant, number | null>;
      for (const pollutant of POLLUTANTS) {
        series[pollutant] = calibratedSeries(
          modelSeries(pollutant, cell),
          calibration[pollutant].factor,
          spatial[pollutant][index] ?? null,
        );
        const mean = annualMean(series[pollutant], params.min_valid_months);
        annual[pollutant] = mean === null ? null : roundTo(mean, 2);
      }
      const score = airScore(annual, params);
      const verdict = airVerdict(series.pm25, months, params);
      results.set(cell.cellId, {
        raw: score.raw,
        status: score.status,
        calibrated: {
          pm25: calibration.pm25.status === 'calibrated',
          no2: calibration.no2.status === 'calibrated',
        },
        row: {
          cell_id: cell.cellId,
          period_start: months[0] ?? context.period,
          period_end: periodEnd(context.period),
          pm25_monthly: series.pm25,
          no2_monthly: series.no2,
          pm25_annual: annual.pm25,
          no2_annual: annual.no2,
          pm25_valid_months: series.pm25.filter((value) => value !== null).length,
          no2_valid_months: series.no2.filter((value) => value !== null).length,
          pm25_months_over_eu2030:
            annual.pm25 === null ? null : monthsOverLimit(series.pm25, params.eu2030_limits.pm25),
          no2_months_over_eu2030:
            annual.no2 === null ? null : monthsOverLimit(series.no2, params.eu2030_limits.no2),
          spatial_method: spatial.pm25[index] === null ? 'cams_10km' : 'eea_1km',
          sub_scores: score.subScores,
          score_raw: score.raw === null ? null : Math.round(score.raw),
          score_display: null,
          verdict_code: verdict.verdictCode,
          watch_item: verdict.watchItem,
        },
      });
    });

    const neighbours = await listCellNeighbours(sql, city.id, context.cellSizeM);
    const categoryRows: CellCategoryScore[] = [];
    for (const [cellId, result] of results) {
      const display = blendWithNeighbours(
        result.raw,
        (neighbours.get(cellId) ?? []).map((neighbourId) => results.get(neighbourId)?.raw ?? null),
        params.neighbour_blend,
      );
      result.row.score_display = display === null ? null : Math.round(display);
      const inputs: JsonObject = {
        status: result.status,
        pm25_annual: result.row.pm25_annual,
        no2_annual: result.row.no2_annual,
        sub_scores: result.row.sub_scores,
        score_raw: result.row.score_raw,
        spatial_method: result.row.spatial_method,
        calibrated: result.calibrated,
      };
      if (display === null) inputs.reason = 'no_source_data';
      categoryRows.push({ cellId, score: result.row.score_display, inputs });
    }

    const rows = [...results.values()].map((result) => result.row);
    await writeCellAir(sql, snapshotId, rows);
    await writeCategoryScores(sql, snapshotId, 'air', categoryRows);
    await writeAirCityStats(sql, snapshotId, city.slug, {
      cells: rows.length,
      scored: rows.filter((row) => row.score_display !== null).length,
      no_data: rows.filter((row) => row.score_display === null).length,
      pm25_annual_mean: average(rows.map((row) => row.pm25_annual)),
      no2_annual_mean: average(rows.map((row) => row.no2_annual)),
      calibration: {
        pm25: {
          status: calibration.pm25.status,
          factor: roundTo(calibration.pm25.factor, 3),
          stations: calibration.pm25.stationsUsed,
        },
        no2: {
          status: calibration.no2.status,
          factor: roundTo(calibration.no2.factor, 3),
          stations: calibration.no2.stationsUsed,
        },
      },
    });
    logger.info('air city done', { snapshot_id: snapshotId, city: city.slug, cells: rows.length });
  }

  const window = `${months[0]?.slice(0, 7) ?? ''}/${months.at(-1)?.slice(0, 7) ?? ''}`;
  const sourceDates: Record<string, string> = { cams: window, eea_stations: window };
  if (sources.mapYear) sourceDates.eea_air_map = sources.mapYear;
  return { sourceDates };
}

export const airModule: ScoreModule = {
  key: 'air',
  run: (context) => {
    const config = airConfigFromEnv();
    return runAir(context, (params, months) => createAirSources(context, config, params, months));
  },
};
