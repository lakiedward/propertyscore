import type {
  Moment,
  NightState,
  SafetyParams,
  SafetyType,
  SafetyTypeParams,
} from './safety.params.ts';
import { SAFETY_TYPES } from './safety.params.ts';

export type FeatureDistance = {
  distanceM: number;
  nightState: NightState;
};

export type SafetyInputs = Partial<Record<SafetyType, readonly FeatureDistance[]>>;

type TypeContribution = {
  type: SafetyType;
  points: number;
  count: number;
  nearestM: number | null;
};

export type MomentResult = {
  moment: Moment;
  raw: number;
  score: number;
  offset: number;
  contributions: TypeContribution[];
};

type WaterfallRow = {
  key: 'start' | 'night_offset' | 'far_types' | 'limit' | SafetyType;
  points: number;
};

export type Waterfall = {
  rows: WaterfallRow[];
  farTypes: SafetyType[];
  total: number;
};

const SIGNIFICANT_POINTS = 0.5;

export function kernelSum(
  features: readonly FeatureDistance[],
  type: SafetyTypeParams,
  moment: Moment,
): number {
  const radius2 = type.radius_m * type.radius_m;
  return features.reduce((sum, feature) => {
    const activity = moment === 'night' ? type.night_activity[feature.nightState] : 1;
    return sum + activity * Math.exp(-(feature.distanceM * feature.distanceM) / radius2);
  }, 0);
}

export function saturate(value: number, cap: number): number {
  return cap * (1 - Math.exp(-value / cap));
}

export function typePoints(
  features: readonly FeatureDistance[],
  type: SafetyTypeParams,
  moment: Moment,
  k: number,
): number {
  const weight = moment === 'day' ? type.weight_day : type.weight_night;
  return k * weight * saturate(kernelSum(features, type, moment), type.cap);
}

function clamp(value: number): number {
  return Math.min(100, Math.max(0, value));
}

export function momentScore(
  inputs: SafetyInputs,
  params: SafetyParams,
  moment: Moment,
  excluded: ReadonlySet<SafetyType> = new Set(),
): MomentResult {
  const offset = moment === 'night' ? params.night_offset : 0;
  const contributions: TypeContribution[] = [];
  for (const type of SAFETY_TYPES) {
    if (excluded.has(type)) continue;
    const features = inputs[type] ?? [];
    const typeParams = params.types[type];
    const nearest = features.reduce<number | null>(
      (min, feature) => (min === null || feature.distanceM < min ? feature.distanceM : min),
      null,
    );
    contributions.push({
      type,
      points: typePoints(features, typeParams, moment, params.k),
      count: features.filter((feature) => feature.distanceM <= typeParams.radius_m).length,
      nearestM: nearest === null ? null : Math.round(nearest),
    });
  }
  const raw = params.start + offset + contributions.reduce((sum, row) => sum + row.points, 0);
  return { moment, raw, score: clamp(raw), offset, contributions };
}

export function smooth(
  own: number,
  neighbours: readonly number[],
  smoothing: SafetyParams['smoothing'],
): number {
  if (neighbours.length === 0) return own;
  const mean = neighbours.reduce((sum, value) => sum + value, 0) / neighbours.length;
  return clamp(smoothing.self * own + smoothing.neighbours * mean);
}

export function finalScore(
  day: number,
  night: number,
  weights: SafetyParams['moment_weights'],
): number {
  const total = weights.day + weights.night;
  return Math.round((weights.day * day + weights.night * night) / total);
}

export function largestRemainder(values: readonly number[], total: number): number[] {
  const rounded = values.map((value) => Math.floor(value));
  let gap = total - rounded.reduce((sum, value) => sum + value, 0);
  const order = values
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  if (order.length === 0) return rounded;
  for (let step = 0; gap !== 0; step += 1) {
    const position = gap > 0 ? step % order.length : order.length - 1 - (step % order.length);
    const entry = order[position];
    if (!entry) break;
    const current = rounded[entry.index] ?? 0;
    rounded[entry.index] = current + Math.sign(gap);
    gap -= Math.sign(gap);
  }
  return rounded;
}

export function waterfall(result: MomentResult, start: number): Waterfall {
  const total = Math.round(result.score);
  const significant = result.contributions.filter(
    (row) => Math.abs(row.points) >= SIGNIFICANT_POINTS,
  );
  const far = result.contributions.filter((row) => Math.abs(row.points) < SIGNIFICANT_POINTS);
  const fixed: WaterfallRow[] = [{ key: 'start', points: Math.round(start) }];
  if (result.moment === 'night' && Math.round(result.offset) !== 0) {
    fixed.push({ key: 'night_offset', points: Math.round(result.offset) });
  }
  const limit = Math.round(result.score - result.raw);
  const fixedSum = fixed.reduce((sum, row) => sum + row.points, 0) + limit;
  const farPoints = far.reduce((sum, row) => sum + row.points, 0);
  const rounded = largestRemainder(
    [...significant.map((row) => row.points), farPoints],
    total - fixedSum,
  );
  const rows: WaterfallRow[] = [
    ...fixed,
    ...significant.map((row, index) => ({ key: row.type, points: rounded[index] ?? 0 })),
  ];
  const farRounded = rounded[significant.length] ?? 0;
  if (farRounded !== 0) rows.push({ key: 'far_types', points: farRounded });
  if (limit !== 0) rows.push({ key: 'limit', points: limit });
  return { rows, farTypes: far.map((row) => row.type), total };
}

type MomentSummary = {
  score: number;
  waterfall: Waterfall;
  contributions: TypeContribution[];
};

export type PointSafety = {
  score: number;
  day: MomentSummary;
  night: MomentSummary;
  excludedTypes: SafetyType[];
};

function summarize(result: MomentResult, start: number): MomentSummary {
  return {
    score: Math.round(result.score),
    waterfall: waterfall(result, start),
    contributions: result.contributions,
  };
}

export function scoreAtPoint(
  inputs: SafetyInputs,
  params: SafetyParams,
  excluded: ReadonlySet<SafetyType> = new Set(),
): PointSafety {
  const day = momentScore(inputs, params, 'day', excluded);
  const night = momentScore(inputs, params, 'night', excluded);
  return {
    score: finalScore(Math.round(day.score), Math.round(night.score), params.moment_weights),
    day: summarize(day, params.start),
    night: summarize(night, params.start),
    excludedTypes: [...excluded],
  };
}
