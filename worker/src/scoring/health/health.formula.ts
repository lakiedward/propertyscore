import { linearPoints, weightedScore } from '../components.ts';
import type { CountWithin, HealthParams, WalkLayerParams } from './health.params.ts';

const HEALTH_LAYER_KEYS = ['h1', 'h2', 'h3', 'h4', 'h5'] as const;

type HealthLayerKey = (typeof HEALTH_LAYER_KEYS)[number];

export type WalkAccess = {
  nearestMin: number | null;
  within: Record<CountWithin, number>;
};

export type HealthInputs = {
  pharmacies: WalkAccess | null;
  primaryCare: WalkAccess | null;
  clinics: WalkAccess | null;
  emergencyCarMin: number | null;
  nightPharmacyWalkMin: number | null;
  nightPharmacyCarMin: number | null;
  hasNightPharmacyData: boolean;
};

export type HealthLayer = {
  value: number;
  tMin: number | null;
  n: number | null;
  mode: 'walk' | 'car';
};

export type HealthScore = {
  score: number | null;
  layers: Partial<Record<HealthLayerKey, HealthLayer>>;
  missing: HealthLayerKey[];
};

export function timeDecay(minutes: number, range: { full_at_min: number; zero_at_min: number }) {
  return linearPoints(minutes, range.zero_at_min, range.full_at_min);
}

export function walkLayer(access: WalkAccess | null, params: WalkLayerParams): HealthLayer | null {
  if (access === null) return null;
  const n = access.within[params.count_within_min];
  const nearestPoints =
    access.nearestMin === null ? 0 : timeDecay(access.nearestMin, params.nearest);
  const countPoints = Math.min(1, n / params.count_full_at);
  return {
    value: params.nearest_share * nearestPoints + (1 - params.nearest_share) * countPoints,
    tMin: access.nearestMin,
    n,
    mode: 'walk',
  };
}

export function emergencyLayer(
  carMin: number | null,
  params: HealthParams['layers']['h4'],
): HealthLayer | null {
  if (carMin === null) return null;
  return { value: timeDecay(carMin, params.nearest), tMin: carMin, n: null, mode: 'car' };
}

export function nightPharmacyLayer(
  inputs: Pick<
    HealthInputs,
    'nightPharmacyWalkMin' | 'nightPharmacyCarMin' | 'hasNightPharmacyData'
  >,
  params: HealthParams['layers']['h5'],
): HealthLayer | null {
  if (!inputs.hasNightPharmacyData) return null;
  const walkPoints =
    inputs.nightPharmacyWalkMin === null
      ? 0
      : timeDecay(inputs.nightPharmacyWalkMin, params.nearest);
  const carOnly =
    walkPoints === 0 &&
    inputs.nightPharmacyCarMin !== null &&
    inputs.nightPharmacyCarMin < params.car_only_max_min;
  if (carOnly) {
    return {
      value: params.car_only_points,
      tMin: inputs.nightPharmacyCarMin,
      n: null,
      mode: 'car',
    };
  }
  return { value: walkPoints, tMin: inputs.nightPharmacyWalkMin, n: null, mode: 'walk' };
}

export function computeHealthScore(inputs: HealthInputs, params: HealthParams): HealthScore {
  const computed: Record<HealthLayerKey, HealthLayer | null> = {
    h1: walkLayer(inputs.pharmacies, params.layers.h1),
    h2: walkLayer(inputs.primaryCare, params.layers.h2),
    h3: walkLayer(inputs.clinics, params.layers.h3),
    h4: emergencyLayer(inputs.emergencyCarMin, params.layers.h4),
    h5: nightPharmacyLayer(inputs, params.layers.h5),
  };
  const layers: Partial<Record<HealthLayerKey, HealthLayer>> = {};
  const missing: HealthLayerKey[] = [];
  for (const key of HEALTH_LAYER_KEYS) {
    const layer = computed[key];
    if (layer === null) missing.push(key);
    else layers[key] = layer;
  }
  const score = weightedScore(
    HEALTH_LAYER_KEYS.map((key) => ({
      key,
      weight: params.layers[key].weight,
      points: computed[key]?.value ?? null,
    })),
  );
  return { score, layers, missing };
}
