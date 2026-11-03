import { linearPoints, weightedScore } from '../components.ts';
import type { NoiseKind, NoiseParams } from './noise.params.ts';

export type NoiseIndicator = 'lden' | 'lnight';

export type NoiseSample =
  | {
      measure: 'contour';
      kind: NoiseKind;
      indicator: NoiseIndicator;
      datasetId: string;
      dbLow: number | null;
    }
  | {
      measure: 'proxy';
      kind: NoiseKind;
      sourceClass: string;
      distanceM: number;
      buildingsCrossed: number;
    };

type NoiseMethod = 'strategic_map' | 'osm_proxy';

export type NoisePrecision = 'street' | 'estimate' | 'no_data';

type SourceLevel = {
  kind: NoiseKind;
  method: NoiseMethod;
  lden: number | null;
  lnight: number | null;
};

export type PointNoise = {
  score: number | null;
  lden: number | null;
  lnight: number | null;
  precision: NoisePrecision;
  sources: SourceLevel[];
  datasetIds: string[];
};

export type NoiseCoverage = {
  hasMaps: boolean;
  hasProxySources: boolean;
};

export function bandLevel(dbLow: number, bandWidthDb: number): number {
  return dbLow + bandWidthDb / 2;
}

export function proxyLevel(
  refDb: number,
  distanceM: number,
  buildingsCrossed: number,
  params: Pick<NoiseParams, 'proxy_ref_distance_m' | 'screen_db' | 'screen_max_db'>,
): number {
  const distance = Math.max(distanceM, params.proxy_ref_distance_m);
  const spreading = 10 * Math.log10(distance / params.proxy_ref_distance_m);
  const screen = Math.min(buildingsCrossed * params.screen_db, params.screen_max_db);
  return refDb - spreading - screen;
}

export function energySum(levels: readonly number[]): number | null {
  if (levels.length === 0) return null;
  const energy = levels.reduce((sum, level) => sum + 10 ** (level / 10), 0);
  return 10 * Math.log10(energy);
}

export function noiseScore(
  lden: number,
  lnight: number,
  params: Pick<NoiseParams, 'scale_lden' | 'scale_lnight' | 'night_weight'>,
): number {
  const [quietDay, loudDay] = params.scale_lden;
  const [quietNight, loudNight] = params.scale_lnight;
  const score = weightedScore([
    { key: 'day', weight: 1 - params.night_weight, points: linearPoints(lden, loudDay, quietDay) },
    {
      key: 'night',
      weight: params.night_weight,
      points: linearPoints(lnight, loudNight, quietNight),
    },
  ]);
  return score ?? 0;
}

function maxOrNull(values: readonly number[]): number | null {
  return values.length === 0 ? null : Math.max(...values);
}

function contourLevel(
  samples: readonly NoiseSample[],
  kind: NoiseKind,
  indicator: NoiseIndicator,
  params: NoiseParams,
): { mapped: boolean; level: number | null } {
  const contours = samples.filter(
    (sample): sample is Extract<NoiseSample, { measure: 'contour' }> =>
      sample.measure === 'contour' && sample.kind === kind && sample.indicator === indicator,
  );
  const levels = contours.flatMap((sample) =>
    sample.dbLow === null ? [] : [bandLevel(sample.dbLow, params.band_width_db)],
  );
  return { mapped: contours.length > 0, level: maxOrNull(levels) };
}

function proxyKindLevel(
  samples: readonly NoiseSample[],
  kind: NoiseKind,
  params: NoiseParams,
): number | null {
  const levels = samples.flatMap((sample) => {
    if (sample.measure !== 'proxy' || sample.kind !== kind) return [];
    const refDb = params.proxy_ref_db[sample.sourceClass];
    if (refDb === undefined) return [];
    return [proxyLevel(refDb, sample.distanceM, sample.buildingsCrossed, params)];
  });
  return maxOrNull(levels);
}

function sourceLevel(
  samples: readonly NoiseSample[],
  kind: NoiseKind,
  params: NoiseParams,
): SourceLevel | null {
  const day = contourLevel(samples, kind, 'lden', params);
  const night = contourLevel(samples, kind, 'lnight', params);
  const method: NoiseMethod = day.mapped ? 'strategic_map' : 'osm_proxy';
  const lden = day.mapped ? day.level : proxyKindLevel(samples, kind, params);
  if (!day.mapped && !night.mapped && lden === null) return null;
  const lnight = night.mapped
    ? night.level
    : lden === null
      ? null
      : lden - params.proxy_night_offset_db;
  return { kind, method, lden, lnight };
}

function belowMappedLevel(indicator: NoiseIndicator, params: NoiseParams): number {
  return indicator === 'lden'
    ? params.below_mapped_db
    : params.below_mapped_db - params.proxy_night_offset_db;
}

function totalLevel(
  sources: readonly SourceLevel[],
  indicator: NoiseIndicator,
  params: NoiseParams,
): number {
  const levels = sources.flatMap((source) => {
    const level = source[indicator];
    if (level === null) return [];
    const penalty = params.intermittent_kinds.includes(source.kind)
      ? params.intermittent_penalty_db
      : 0;
    return [level + penalty];
  });
  const floor = belowMappedLevel(indicator, params);
  const sum = energySum(levels);
  return sum === null ? floor : Math.max(sum, floor);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function assessPoint(
  samples: readonly NoiseSample[],
  coverage: NoiseCoverage,
  params: NoiseParams,
): PointNoise {
  const datasetIds = [
    ...new Set(
      samples.flatMap((sample) => (sample.measure === 'contour' ? [sample.datasetId] : [])),
    ),
  ].sort();
  if (!coverage.hasMaps && !coverage.hasProxySources) {
    return { score: null, lden: null, lnight: null, precision: 'no_data', sources: [], datasetIds };
  }

  const hasAggregate = samples.some(
    (sample) => sample.measure === 'contour' && sample.kind === 'aggregate',
  );
  const kinds = [...new Set(samples.map((sample) => sample.kind))].filter((kind) =>
    hasAggregate ? kind === 'aggregate' : kind !== 'aggregate',
  );
  const sources = kinds
    .map((kind) => sourceLevel(samples, kind, params))
    .filter((source): source is SourceLevel => source !== null);

  const lden = totalLevel(sources, 'lden', params);
  const lnight = totalLevel(sources, 'lnight', params);
  const usesProxy = sources.some((source) => source.method === 'osm_proxy' && source.lden !== null);
  const precision: NoisePrecision = usesProxy || !coverage.hasMaps ? 'estimate' : 'street';

  return {
    score: noiseScore(lden, lnight, params),
    lden: round1(lden),
    lnight: round1(lnight),
    precision,
    sources: sources.map((source) => ({
      ...source,
      lden: source.lden === null ? null : round1(source.lden),
      lnight: source.lnight === null ? null : round1(source.lnight),
    })),
    datasetIds,
  };
}

export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const upper = sorted[middle] ?? 0;
  if (sorted.length % 2 === 1) return upper;
  const lower = sorted[middle - 1] ?? upper;
  return (lower + upper) / 2;
}

export type CellNoise = {
  score: number | null;
  lden: number | null;
  lnight: number | null;
  precision: NoisePrecision;
  points: PointNoise[];
  datasetIds: string[];
};

export function assessCell(points: readonly PointNoise[]): CellNoise {
  const scored = points.filter((point) => point.score !== null);
  const datasetIds = [...new Set(points.flatMap((point) => point.datasetIds))].sort();
  if (scored.length === 0) {
    return {
      score: null,
      lden: null,
      lnight: null,
      precision: 'no_data',
      points: [...points],
      datasetIds,
    };
  }
  const score = median(scored.map((point) => point.score ?? 0));
  const lden = median(scored.flatMap((point) => (point.lden === null ? [] : [point.lden])));
  const lnight = median(scored.flatMap((point) => (point.lnight === null ? [] : [point.lnight])));
  return {
    score: score === null ? null : Math.round(score),
    lden: lden === null ? null : round1(lden),
    lnight: lnight === null ? null : round1(lnight),
    precision: scored.some((point) => point.precision === 'estimate') ? 'estimate' : 'street',
    points: [...points],
    datasetIds,
  };
}
