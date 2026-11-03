import type { AirParams, Pollutant } from './air.params.ts';

export type MonthlySeries = (number | null)[];

export type AirStatus = 'ok' | 'partial' | 'no_data';

export type VerdictCode = 'clean_all_year' | 'winter_peaks' | 'above_limit_most_year' | 'moderate';

export type CalibrationResult = {
  factor: number;
  stationsUsed: number;
  stationMean: number | null;
  modelMean: number | null;
  status: 'calibrated' | 'uncalibrated';
};

export type StationComparison = {
  station: MonthlySeries;
  model: MonthlySeries;
};

const WINTER_MONTHS = [12, 1, 2];
const SUMMER_MONTHS = [6, 7, 8];

function mean(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function present(values: readonly (number | null)[]): number[] {
  return values.filter((value): value is number => value !== null);
}

export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function clampToRange(value: number, [low, high]: readonly [number, number]): number {
  return Math.min(high, Math.max(low, value));
}

export function analysisWindow(period: string, months = 12): string[] {
  const [year, month] = period.split('-').map(Number);
  if (year === undefined || month === undefined || Number.isNaN(year) || Number.isNaN(month)) {
    throw new RangeError(`Invalid period ${period}`);
  }
  const window: string[] = [];
  for (let offset = months; offset >= 1; offset -= 1) {
    const date = new Date(Date.UTC(year, month - 1 - offset, 1));
    window.push(date.toISOString().slice(0, 10));
  }
  return window;
}

export function thresholdScore(
  value: number,
  points: readonly (readonly [number, number])[],
): number {
  const first = points[0];
  const last = points.at(-1);
  if (!first || !last) throw new RangeError('At least one threshold is needed');
  if (value <= first[0]) return first[1];
  if (value >= last[0]) return last[1];
  for (let index = 1; index < points.length; index += 1) {
    const lower = points[index - 1];
    const upper = points[index];
    if (lower && upper && value <= upper[0]) {
      return lower[1] + ((value - lower[0]) / (upper[0] - lower[0])) * (upper[1] - lower[1]);
    }
  }
  return last[1];
}

export function monthlyMean(
  daily: readonly (number | null)[],
  minValidDays: number,
): { mean: number | null; validDays: number } {
  const values = present(daily);
  return { mean: values.length >= minValidDays ? mean(values) : null, validDays: values.length };
}

export function annualMean(monthly: MonthlySeries, minValidMonths: number): number | null {
  const values = present(monthly);
  return values.length >= minValidMonths ? mean(values) : null;
}

export function calibrationFactor(
  stations: readonly StationComparison[],
  minValidMonths: number,
  range: readonly [number, number],
): CalibrationResult {
  const stationAnnuals: number[] = [];
  const modelAnnuals: number[] = [];
  for (const comparison of stations) {
    const paired = comparison.station.flatMap((value, index) => {
      const model = comparison.model[index];
      return value !== null && model !== null && model !== undefined
        ? [[value, model] as const]
        : [];
    });
    if (paired.length < minValidMonths) continue;
    stationAnnuals.push(mean(paired.map(([value]) => value)) ?? 0);
    modelAnnuals.push(mean(paired.map(([, model]) => model)) ?? 0);
  }
  const stationMean = mean(stationAnnuals);
  const modelMean = mean(modelAnnuals);
  if (stationMean === null || modelMean === null || modelMean <= 0) {
    return {
      factor: 1,
      stationsUsed: 0,
      stationMean: null,
      modelMean: null,
      status: 'uncalibrated',
    };
  }
  return {
    factor: clampToRange(stationMean / modelMean, range),
    stationsUsed: stationAnnuals.length,
    stationMean,
    modelMean,
    status: 'calibrated',
  };
}

export function spatialFactors(
  mapValues: readonly (number | null)[],
  range: readonly [number, number],
): (number | null)[] {
  const cityMean = mean(present(mapValues).filter((value) => value >= 0));
  if (cityMean === null || cityMean <= 0) return mapValues.map(() => null);
  return mapValues.map((value) =>
    value === null || value < 0 ? null : clampToRange(value / cityMean, range),
  );
}

export function calibratedSeries(
  model: MonthlySeries,
  factor: number,
  spatialFactor: number | null,
): MonthlySeries {
  return model.map((value) =>
    value === null ? null : roundTo(value * factor * (spatialFactor ?? 1), 1),
  );
}

export function monthsOverLimit(monthly: MonthlySeries, limit: number): number {
  return present(monthly).filter((value) => value > limit).length;
}

function seasonMean(
  monthly: MonthlySeries,
  months: readonly string[],
  season: readonly number[],
): number | null {
  return mean(
    present(
      monthly.map((value, index) => {
        const month = Number(months[index]?.slice(5, 7));
        return season.includes(month) ? value : null;
      }),
    ),
  );
}

export function airVerdict(
  pm25Monthly: MonthlySeries,
  months: readonly string[],
  params: Pick<
    AirParams,
    | 'eu2030_limits'
    | 'most_year_months'
    | 'winter_peak_ratio'
    | 'winter_peak_min_months'
    | 'heavy_winter_pm25'
  >,
): { verdictCode: VerdictCode | null; watchItem: boolean } {
  if (present(pm25Monthly).length === 0) return { verdictCode: null, watchItem: false };
  const over = monthsOverLimit(pm25Monthly, params.eu2030_limits.pm25);
  const winter = seasonMean(pm25Monthly, months, WINTER_MONTHS);
  const summer = seasonMean(pm25Monthly, months, SUMMER_MONTHS);
  const watchItem = winter !== null && winter > params.heavy_winter_pm25;
  if (over === 0) return { verdictCode: 'clean_all_year', watchItem };
  if (over >= params.most_year_months) return { verdictCode: 'above_limit_most_year', watchItem };
  if (
    winter !== null &&
    summer !== null &&
    winter > params.winter_peak_ratio * summer &&
    over >= params.winter_peak_min_months
  ) {
    return { verdictCode: 'winter_peaks', watchItem };
  }
  return { verdictCode: 'moderate', watchItem };
}

export function airScore(
  annual: Record<Pollutant, number | null>,
  params: Pick<AirParams, 'pm25_points' | 'no2_points' | 'weights'>,
): { raw: number | null; status: AirStatus; subScores: Partial<Record<Pollutant, number>> } {
  if (annual.pm25 === null) return { raw: null, status: 'no_data', subScores: {} };
  const pm25 = thresholdScore(annual.pm25, params.pm25_points);
  if (annual.no2 === null || params.weights.no2 === 0) {
    return {
      raw: pm25,
      status: annual.no2 === null ? 'partial' : 'ok',
      subScores: { pm25: Math.round(pm25) },
    };
  }
  const no2 = thresholdScore(annual.no2, params.no2_points);
  const raw =
    (params.weights.pm25 * pm25 + params.weights.no2 * no2) /
    (params.weights.pm25 + params.weights.no2);
  return { raw, status: 'ok', subScores: { pm25: Math.round(pm25), no2: Math.round(no2) } };
}

export function blendWithNeighbours(
  raw: number | null,
  neighbours: readonly (number | null)[],
  blend: number,
): number | null {
  if (raw === null) return null;
  const neighbourMean = mean(present(neighbours));
  if (neighbourMean === null) return raw;
  return (1 - blend) * raw + blend * neighbourMean;
}
