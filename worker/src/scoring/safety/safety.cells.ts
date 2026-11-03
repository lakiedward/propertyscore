import type { JsonObject } from '../../db/sql.ts';
import type { FeatureDistance, SafetyInputs } from './safety.formula.ts';
import { finalScore, momentScore, smooth } from './safety.formula.ts';
import type { NightState, SafetyParams, SafetyType } from './safety.params.ts';
import { SAFETY_TYPES } from './safety.params.ts';

export type CellDistances = {
  cellId: string;
  type: SafetyType;
  distances: readonly number[];
  nightStates: readonly NightState[];
};

export type CellPlacement = {
  cellId: string;
  neighbourIds: readonly string[];
  isResidential: boolean | null;
};

export type CellSafety = {
  cellId: string;
  isResidential: boolean | null;
  isLivedIn: boolean;
  score: number;
  day: number;
  night: number;
  dayRaw: number;
  nightRaw: number;
  layers: JsonObject;
};

export type CityCoverage = {
  slug: string;
  lighting: number;
  streetKm: number;
};

export function reachByType(params: SafetyParams): Record<string, number> {
  return Object.fromEntries(
    SAFETY_TYPES.map((type) => [
      type,
      Math.round(params.types[type].radius_m * params.reach_factor),
    ]),
  );
}

export function groupCellInputs(
  rows: readonly CellDistances[],
  params: SafetyParams,
): Map<string, SafetyInputs> {
  const byCell = new Map<string, SafetyInputs>();
  for (const row of rows) {
    const factor = params.types[row.type].walking ? params.walk_detour_factor : 1;
    const features: FeatureDistance[] = row.distances.map((distance, index) => ({
      distanceM: distance * factor,
      nightState: row.nightStates[index] ?? 'unknown',
    }));
    const inputs = byCell.get(row.cellId) ?? {};
    inputs[row.type] = features;
    byCell.set(row.cellId, inputs);
  }
  return byCell;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function scoreCells(
  cells: readonly CellPlacement[],
  inputsByCell: ReadonlyMap<string, SafetyInputs>,
  params: SafetyParams,
  excluded: ReadonlySet<SafetyType>,
): CellSafety[] {
  const raw = new Map(
    cells.map((cell) => {
      const inputs = inputsByCell.get(cell.cellId) ?? {};
      return [
        cell.cellId,
        {
          day: momentScore(inputs, params, 'day', excluded),
          night: momentScore(inputs, params, 'night', excluded),
        },
      ];
    }),
  );
  return cells.map((cell) => {
    const own = raw.get(cell.cellId);
    if (!own) throw new RangeError(`cell ${cell.cellId} was not scored`);
    const neighbours = cell.neighbourIds.flatMap((id) => {
      const neighbour = raw.get(id);
      return neighbour ? [neighbour] : [];
    });
    const day = Math.round(
      smooth(
        own.day.score,
        neighbours.map((neighbour) => neighbour.day.score),
        params.smoothing,
      ),
    );
    const night = Math.round(
      smooth(
        own.night.score,
        neighbours.map((neighbour) => neighbour.night.score),
        params.smoothing,
      ),
    );
    const byType: JsonObject = {};
    for (const contribution of own.day.contributions) {
      const nightContribution = own.night.contributions.find(
        (row) => row.type === contribution.type,
      );
      byType[contribution.type] = {
        day: round1(contribution.points),
        night: round1(nightContribution?.points ?? 0),
        count: contribution.count,
        nearest_m: contribution.nearestM,
      };
    }
    return {
      cellId: cell.cellId,
      isResidential: cell.isResidential,
      isLivedIn: own.day.contributions.some(
        (row) => params.calibration.lived_in_types.includes(row.type) && row.count > 0,
      ),
      score: finalScore(day, night, params.moment_weights),
      day,
      night,
      dayRaw: own.day.raw,
      nightRaw: own.night.raw,
      layers: { day, night, by_type: byType },
    };
  });
}

export function percentile(values: readonly number[], fraction: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * fraction;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const low = sorted[lower] ?? 0;
  const high = sorted[upper] ?? low;
  return low + (high - low) * (position - lower);
}

export function lightingExcludedCities(
  coverage: readonly CityCoverage[],
  ratio: number,
): Set<string> {
  const densities = coverage
    .filter((city) => city.streetKm > 0)
    .map((city) => ({ slug: city.slug, density: city.lighting / city.streetKm }));
  const p90 = percentile(
    densities.map((city) => city.density),
    0.9,
  );
  if (p90 === null || p90 === 0) return new Set();
  return new Set(densities.filter((city) => city.density < ratio * p90).map((city) => city.slug));
}

export type Calibration = {
  k: number;
  cells: number;
  median_day: number | null;
  p90_day: number | null;
  k_for_median: number | null;
  k_for_p90: number | null;
};

export function calibrate(cells: readonly CellSafety[], params: SafetyParams): Calibration {
  const points = cells
    .filter((cell) => cell.isResidential ?? cell.isLivedIn)
    .map((cell) => (cell.dayRaw - params.start) / params.k);
  const median = percentile(points, 0.5);
  const p90 = percentile(points, 0.9);
  const proposal = (value: number | null, target: number) =>
    value !== null && value > 0 ? Math.round((100 * (target - params.start)) / value) / 100 : null;
  return {
    k: params.k,
    cells: points.length,
    median_day: median === null ? null : round1(params.start + params.k * median),
    p90_day: p90 === null ? null : round1(params.start + params.k * p90),
    k_for_median: proposal(median, params.calibration.median_day),
    k_for_p90: proposal(p90, params.calibration.p90_day),
  };
}
