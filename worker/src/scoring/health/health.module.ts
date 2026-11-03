import { join } from 'node:path';

import type { JsonObject } from '../../db/sql.ts';
import { WorkerError } from '../../lib/errors.ts';
import {
  cityBoundingBox,
  downloadOsmExtract,
  extractOsmFeatures,
  osmExtractDate,
  osmSourceRef,
  readOsmFeatures,
} from '../../sources/osm.ts';
import { computeWalkAccess, type WalkAccessTarget } from '../../routing/walk-access.ts';
import type { ScoreModule } from '../score-module.ts';
import { writeCategoryScores } from '../write-category-scores.ts';
import { computeCarAccess, readWalkAccess } from './health.access.ts';
import {
  cellAccessFromWalk,
  scoreHealthCell,
  withCar,
  type AccessKey,
  type CellAccessByCategory,
  type CityAvailability,
} from './health.cells.ts';
import {
  countCityPois,
  emergencyPoiRows,
  healthPoiRows,
  insertPois,
  listCnasProviders,
  listEmergencyHospitals,
  writeHealthCityStats,
} from './health.db.ts';
import { healthParamsSchema, type HealthParams } from './health.params.ts';
import {
  EMERGENCY_CATEGORY,
  HEALTH_OSM_FILTERS,
  mergeCnasProviders,
  NIGHT_PHARMACY_CATEGORY,
  osmHealthPoi,
  type HealthPoi,
} from './health.sources.ts';

const PEDIATRIC_EMERGENCY_CATEGORY = 'health_emergency_pediatric';

const WALK_KEYS: Record<string, AccessKey> = {
  health_pharmacy: 'pharmacies',
  health_primary: 'primaryCare',
  health_clinic: 'clinics',
  [NIGHT_PHARMACY_CATEGORY]: 'nightPharmacies',
};

const CAR_KEYS: Record<string, AccessKey> = {
  [EMERGENCY_CATEGORY]: 'emergency',
  [NIGHT_PHARMACY_CATEGORY]: 'nightPharmacies',
};

function walkTargets(params: HealthParams): WalkAccessTarget[] {
  return Object.keys(WALK_KEYS).map((category) => ({
    key: category,
    poiCategories: [category],
    searchRadiusM: params.search_radius_m,
    maxCandidates: params.max_candidates,
  }));
}

function carTargets(params: HealthParams): WalkAccessTarget[] {
  return Object.keys(CAR_KEYS).map((category) => ({
    key: category,
    poiCategories: [category],
    searchRadiusM: params.car_search_radius_m,
    maxCandidates: params.car_max_candidates,
  }));
}

function hasPois(counts: Record<string, number>, category: string): boolean {
  return (counts[category] ?? 0) > 0;
}

export const healthModule: ScoreModule = {
  key: 'health',
  run: async (context) => {
    const parsed = healthParamsSchema.safeParse(context.params);
    if (!parsed.success) {
      throw new WorkerError('invalid_health_params', 'params.health does not match the schema');
    }
    const params = parsed.data;
    const { sql, snapshotId, logger } = context;
    const extractPath = await downloadOsmExtract(
      context.osmExtractUrl,
      context.sourcesDir,
      context.period,
    );
    const cityStats: Record<string, JsonObject> = {};
    const cnasDates: string[] = [];
    const emergencyDates: string[] = [];

    for (const city of context.cities) {
      const exported = await extractOsmFeatures({
        extractPath,
        bbox: await cityBoundingBox(sql, city.id),
        filters: HEALTH_OSM_FILTERS,
        geometryTypes: ['point', 'polygon'],
        workDir: join(context.sourcesDir, 'work', context.period, city.slug),
        name: 'health',
      });
      const osmPois: HealthPoi[] = [];
      for await (const feature of readOsmFeatures(exported)) {
        const poi = osmHealthPoi({ ...feature, sourceRef: osmSourceRef(feature.id) });
        if (poi) osmPois.push(poi);
      }

      const cnas = await listCnasProviders(sql, city.id, context.period);
      if (cnas.listDate) cnasDates.push(cnas.listDate);
      const merged = mergeCnasProviders(osmPois, cnas.providers, params.osm_cnas_match_radius_m);

      const hospitals = await listEmergencyHospitals(sql, city.id, context.period);
      for (const hospital of hospitals) emergencyDates.push(hospital.validFrom);

      await insertPois(sql, snapshotId, city.id, [
        ...healthPoiRows(merged.pois, NIGHT_PHARMACY_CATEGORY),
        ...emergencyPoiRows(hospitals, EMERGENCY_CATEGORY, PEDIATRIC_EMERGENCY_CATEGORY),
      ]);

      const counts = await countCityPois(sql, snapshotId, city.id, [
        ...Object.keys(WALK_KEYS),
        EMERGENCY_CATEGORY,
        PEDIATRIC_EMERGENCY_CATEGORY,
        'health_hospital',
        'health_dentist',
      ]);
      const availability: CityAvailability = {
        pharmacies: hasPois(counts, 'health_pharmacy'),
        primaryCare: hasPois(counts, 'health_primary'),
        clinics: hasPois(counts, 'health_clinic'),
        emergency: hasPois(counts, EMERGENCY_CATEGORY),
        nightPharmacies: hasPois(counts, NIGHT_PHARMACY_CATEGORY),
      };

      await computeWalkAccess({
        sql,
        router: context.router,
        snapshotId,
        cityId: city.id,
        walkSpeedKmh: params.walk_speed_kmh,
        walkDetourFactor: params.walk_detour_factor,
        targets: walkTargets(params),
      });
      const access = new Map<string, CellAccessByCategory>();
      let walkMethod: 'pedestrian_routing' | 'straight_line' = context.router
        ? 'pedestrian_routing'
        : 'straight_line';
      for (const record of await readWalkAccess(sql, snapshotId, city.id, Object.keys(WALK_KEYS))) {
        const key = WALK_KEYS[record.category];
        if (key === undefined) continue;
        walkMethod = record.distanceMethod;
        const cell = access.get(record.cellId) ?? {};
        cell[key] = cellAccessFromWalk(record);
        access.set(record.cellId, cell);
      }
      const carAccess = await computeCarAccess({
        sql,
        router: context.router,
        snapshotId,
        cityId: city.id,
        targets: carTargets(params),
        carSpeedKmh: params.car_speed_kmh,
        carDetourFactor: params.car_detour_factor,
      });
      for (const [cellId, nearest] of carAccess) {
        const cell = access.get(cellId) ?? {};
        for (const [category, car] of nearest) {
          const key = CAR_KEYS[category];
          if (key !== undefined) cell[key] = withCar(cell[key], car);
        }
        access.set(cellId, cell);
      }
      const methods = {
        walk: walkMethod,
        car: context.router ? ('car_routing' as const) : ('straight_line' as const),
      };

      const rows = [...access.entries()].map(([cellId, cellAccess]) =>
        scoreHealthCell(cellId, cellAccess, availability, params, methods),
      );
      const written = await writeCategoryScores(sql, snapshotId, 'health', rows);

      cityStats[city.slug] = {
        pois: counts,
        cnas_list_date: cnas.listDate,
        cnas_matched: merged.cnasMatched,
        cnas_added: merged.cnasAdded,
        cnas_without_location: merged.cnasWithoutLocation,
        emergency_hospitals: hospitals.length,
        distance_method: methods.walk,
        car_distance_method: methods.car,
      };
      logger.info('health scored', {
        snapshot_id: snapshotId,
        city: city.slug,
        cells: written,
        pois: merged.pois.length,
      });
    }

    await writeHealthCityStats(sql, snapshotId, cityStats);

    const sourceDates: Record<string, string> = {
      osm: await osmExtractDate(extractPath, context.period),
    };
    const oldestCnas = cnasDates.sort()[0];
    if (oldestCnas) sourceDates.cnas = oldestCnas;
    const newestEmergency = emergencyDates.sort().at(-1);
    if (newestEmergency) sourceDates.ms_upu = newestEmergency;
    return { sourceDates };
  },
};
