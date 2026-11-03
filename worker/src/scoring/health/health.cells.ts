import type { JsonObject } from '../../db/sql.ts';
import type { CellCategoryScore } from '../write-category-scores.ts';
import type { CarDistanceMethod, NearestByCar, WalkAccessRecord } from './health.access.ts';
import { computeHealthScore, type HealthInputs, type WalkAccess } from './health.formula.ts';
import type { HealthParams } from './health.params.ts';

export type CellAccess = {
  nearestPoiId: string | null;
  nearestWalkMin: number | null;
  nearestCarMin: number | null;
  within: WalkAccess['within'];
};

export type CellAccessByCategory = {
  pharmacies?: CellAccess;
  primaryCare?: CellAccess;
  clinics?: CellAccess;
  emergency?: CellAccess;
  nightPharmacies?: CellAccess;
};

export type AccessKey = keyof CellAccessByCategory;

export type CityAvailability = Record<AccessKey, boolean>;

export type DistanceMethods = {
  walk: WalkAccessRecord['distanceMethod'];
  car: CarDistanceMethod;
};

const NO_COUNTS: WalkAccess['within'] = { 5: 0, 10: 0, 15: 0 };

export function cellAccessFromWalk(record: WalkAccessRecord): CellAccess {
  return {
    nearestPoiId: record.nearestPoiId,
    nearestWalkMin: record.tNearestS === null ? null : record.tNearestS / 60,
    nearestCarMin: null,
    within: { 5: record.n5, 10: record.n10, 15: record.n15 },
  };
}

export function withCar(access: CellAccess | undefined, car: NearestByCar | undefined): CellAccess {
  const base = access ?? {
    nearestPoiId: null,
    nearestWalkMin: null,
    nearestCarMin: null,
    within: NO_COUNTS,
  };
  if (!car) return base;
  return {
    ...base,
    nearestPoiId: base.nearestPoiId ?? car.poiId,
    nearestCarMin: car.seconds / 60,
  };
}

function walkAccess(access: CellAccess | undefined, isAvailable: boolean): WalkAccess | null {
  if (!isAvailable || access === undefined) return null;
  return { nearestMin: access.nearestWalkMin, within: access.within };
}

function healthInputs(access: CellAccessByCategory, availability: CityAvailability): HealthInputs {
  return {
    pharmacies: walkAccess(access.pharmacies, availability.pharmacies),
    primaryCare: walkAccess(access.primaryCare, availability.primaryCare),
    clinics: walkAccess(access.clinics, availability.clinics),
    emergencyCarMin: availability.emergency ? (access.emergency?.nearestCarMin ?? null) : null,
    nightPharmacyWalkMin: access.nightPharmacies?.nearestWalkMin ?? null,
    nightPharmacyCarMin: access.nightPharmacies?.nearestCarMin ?? null,
    hasNightPharmacyData: availability.nightPharmacies && access.nightPharmacies !== undefined,
  };
}

const LAYER_ACCESS: Record<string, AccessKey> = {
  h1: 'pharmacies',
  h2: 'primaryCare',
  h3: 'clinics',
  h4: 'emergency',
  h5: 'nightPharmacies',
};

function roundMinutes(minutes: number | null): number | null {
  return minutes === null ? null : Math.round(minutes * 10) / 10;
}

export function scoreHealthCell(
  cellId: string,
  access: CellAccessByCategory,
  availability: CityAvailability,
  params: HealthParams,
  methods: DistanceMethods,
): CellCategoryScore {
  const result = computeHealthScore(healthInputs(access, availability), params);
  const inputs: JsonObject = {
    distance_method: methods.walk,
    car_distance_method: methods.car,
    missing: result.missing,
  };
  for (const [key, layer] of Object.entries(result.layers)) {
    const accessKey = LAYER_ACCESS[key];
    inputs[key] = {
      value: Math.round(layer.value * 1000) / 1000,
      t_min: roundMinutes(layer.tMin),
      n: layer.n,
      mode: layer.mode,
      poi_id: accessKey === undefined ? null : (access[accessKey]?.nearestPoiId ?? null),
    };
  }
  if (result.score === null) inputs.reason = 'no_source_data';
  return { cellId, score: result.score, inputs };
}
