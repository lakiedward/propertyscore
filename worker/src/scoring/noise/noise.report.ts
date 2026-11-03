import type { JsonObject, Sql } from '../../db/sql.ts';
import {
  nearestNoiseSources,
  noiseMapLayers,
  pointNoiseSamples,
  snapshotNoiseCoverage,
  type CityNoiseCoverage,
  type NearestNoiseSource,
} from './noise.db.ts';
import { assessPoint, type NoisePrecision, type PointNoise } from './noise.formula.ts';
import type { NoiseParams } from './noise.params.ts';

type NoiseReportMethod = 'strategic_map' | 'osm_proxy' | 'mixed';

export type NoiseReportBlock = {
  score: number | null;
  precision: NoisePrecision;
  method: NoiseReportMethod | null;
  round: number | null;
  lden: number | null;
  lnight: number | null;
  band: string | null;
  who: NoiseParams['who'];
  per_source: { kind: string; method: string; lden: number | null; lnight: number | null }[];
  sources: {
    kind: string;
    source_class: string;
    name: string | null;
    distance_m: number;
    lden_band: [number, number | null] | null;
  }[];
  map: JsonObject;
  sources_meta: { provider: string; licence: string | null; round: number; indicator: string }[];
};

export function displayBand(level: number, bands: readonly number[]): string {
  const first = bands[0];
  if (first === undefined) return 'all';
  if (level < first) return `below_${String(first)}`;
  for (let index = 1; index < bands.length; index += 1) {
    const upper = bands[index];
    const lower = bands[index - 1];
    if (upper !== undefined && lower !== undefined && level < upper) {
      return `${String(lower)}_${String(upper)}`;
    }
  }
  return `above_${String(bands[bands.length - 1] ?? first)}`;
}

function reportMethod(point: PointNoise): NoiseReportMethod | null {
  const methods = new Set(
    point.sources.filter((source) => source.lden !== null).map((source) => source.method),
  );
  if (methods.size === 0) return point.precision === 'street' ? 'strategic_map' : null;
  if (methods.size > 1) return 'mixed';
  return methods.has('strategic_map') ? 'strategic_map' : 'osm_proxy';
}

export function buildNoiseReportBlock(
  point: PointNoise,
  coverage: CityNoiseCoverage,
  sources: readonly NearestNoiseSource[],
  map: JsonObject,
  params: NoiseParams,
): NoiseReportBlock {
  const usedIds = new Set(point.datasetIds);
  const used = coverage.datasets.filter((dataset) => usedIds.has(dataset.id));
  const rounds = used.map((dataset) => dataset.round);
  const method = reportMethod(point);
  return {
    score: point.score,
    precision: point.precision,
    method: point.score === null ? null : method,
    round: rounds.length === 0 ? null : Math.max(...rounds),
    lden: point.lden === null ? null : Math.round(point.lden),
    lnight: point.lnight === null ? null : Math.round(point.lnight),
    band: point.lden === null ? null : displayBand(point.lden, params.display_bands_db),
    who: params.who,
    per_source: point.sources.map((source) => ({
      kind: source.kind,
      method: source.method,
      lden: source.lden === null ? null : Math.round(source.lden),
      lnight: source.lnight === null ? null : Math.round(source.lnight),
    })),
    sources: sources.map((source) => ({
      kind: source.kind,
      source_class: source.sourceClass,
      name: source.name,
      distance_m: source.distanceM,
      lden_band: source.ldenBand,
    })),
    map,
    sources_meta: used.map((dataset) => ({
      provider: dataset.provider,
      licence: dataset.licence,
      round: dataset.round,
      indicator: dataset.indicator,
    })),
  };
}

export async function assessNoiseAtAddress(
  sql: Sql,
  input: { snapshotId: string; cityId: string; location: { lon: number; lat: number } },
  params: NoiseParams,
): Promise<NoiseReportBlock> {
  const { snapshotId, cityId, location } = input;
  const coverage = await snapshotNoiseCoverage(sql, snapshotId, cityId);
  const samples = await pointNoiseSamples(
    sql,
    snapshotId,
    cityId,
    location,
    params.nearest_radius_m,
  );
  const point = assessPoint(
    samples,
    { hasMaps: coverage.datasets.length > 0, hasProxySources: coverage.sourceCount > 0 },
    params,
  );
  const sources = await nearestNoiseSources(
    sql,
    snapshotId,
    cityId,
    location,
    params.nearest_radius_m,
  );
  const map = await noiseMapLayers(sql, snapshotId, cityId, location, params.map_clip_m);
  return buildNoiseReportBlock(point, coverage, sources, map, params);
}
