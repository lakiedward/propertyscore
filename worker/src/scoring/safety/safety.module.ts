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
import type { ScoreModule } from '../score-module.ts';
import { writeCategoryScores } from '../write-category-scores.ts';
import {
  calibrate,
  type CellSafety,
  type CityCoverage,
  groupCellInputs,
  lightingExcludedCities,
  reachByType,
  scoreCells,
} from './safety.cells.ts';
import {
  classifySafetyFeature,
  isStreet,
  SAFETY_OSM_FILTERS,
  STREET_OSM_FILTER,
} from './safety.classify.ts';
import {
  clearSafetyFeatures,
  insertSafetyFeatures,
  listCellInputs,
  listCellNeighbours,
  type SafetyFeatureRow,
  writeSafetyLayers,
  writeSafetyStats,
} from './safety.db.ts';
import { lineLengthKm } from './safety.geometry.ts';
import { type SafetyParams, safetyParamsSchema, type SafetyType } from './safety.params.ts';

const INSERT_BATCH = 1000;

type CityImport = CityCoverage & {
  cityId: string;
  features: Partial<Record<SafetyType, number>>;
  total: number;
};

function parseParams(value: unknown): SafetyParams {
  const parsed = safetyParamsSchema.safeParse(value);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join('.') || 'safety').join(', ');
    throw new WorkerError('invalid_safety_params', `Invalid params.safety: ${fields}`);
  }
  return parsed.data;
}

export const safetyModule: ScoreModule = {
  key: 'safety',
  run: async (context) => {
    const { sql, snapshotId, logger } = context;
    const params = parseParams(context.params);
    const extract = await downloadOsmExtract(
      context.osmExtractUrl,
      context.sourcesDir,
      context.period,
    );
    const osmDate = await osmExtractDate(extract, context.period);
    const nightRule = { minute: params.night_check_minute, minOpenNights: params.min_open_nights };

    const imports: CityImport[] = [];
    for (const city of context.cities) {
      const exported = await extractOsmFeatures({
        extractPath: extract,
        bbox: await cityBoundingBox(sql, city.id),
        filters: [...SAFETY_OSM_FILTERS, STREET_OSM_FILTER],
        geometryTypes: ['point', 'linestring', 'polygon'],
        workDir: join(context.sourcesDir, 'work', snapshotId, 'safety'),
        name: city.slug,
      });
      await clearSafetyFeatures(sql, snapshotId, city.id);
      const counts: Partial<Record<SafetyType, number>> = {};
      let streetKm = 0;
      let total = 0;
      let pending: SafetyFeatureRow[] = [];
      for await (const feature of readOsmFeatures(exported)) {
        if (isStreet(feature.properties, feature.geometry.type)) {
          streetKm += lineLengthKm(feature.geometry);
        }
        for (const match of classifySafetyFeature(
          feature.properties,
          feature.geometry.type,
          nightRule,
        )) {
          pending.push({
            sourceRef: osmSourceRef(feature.id),
            type: match.type,
            name: feature.properties.name ?? null,
            geometry: feature.geometry,
            nightState: match.nightState,
          });
          counts[match.type] = (counts[match.type] ?? 0) + 1;
        }
        if (pending.length >= INSERT_BATCH) {
          total += await insertSafetyFeatures(sql, snapshotId, city.id, pending);
          pending = [];
        }
      }
      total += await insertSafetyFeatures(sql, snapshotId, city.id, pending);
      imports.push({
        cityId: city.id,
        slug: city.slug,
        lighting: counts.lighting ?? 0,
        streetKm,
        features: counts,
        total,
      });
      logger.info('safety features imported', {
        snapshot_id: snapshotId,
        city: city.slug,
        features: total,
      });
    }

    const noLighting = lightingExcludedCities(imports, params.lighting_coverage_ratio);
    const reach = reachByType(params);
    const scored: CellSafety[] = [];
    const cityStats: JsonObject = {};

    for (const city of imports) {
      const excluded = new Set<SafetyType>(noLighting.has(city.slug) ? ['lighting'] : []);
      const placements = await listCellNeighbours(sql, snapshotId, city.cityId);
      const reason = city.total === 0 ? 'no_source_data' : null;
      const cells = reason
        ? []
        : scoreCells(
            placements.map((row) => ({
              cellId: row.cell_id,
              neighbourIds: row.neighbour_ids,
              isResidential: row.is_residential,
            })),
            groupCellInputs(
              (await listCellInputs(sql, snapshotId, city.cityId, reach)).map((row) => ({
                cellId: row.cell_id,
                type: row.feature_type,
                distances: row.distances,
                nightStates: row.night_states,
              })),
              params,
            ),
            params,
            excluded,
          );
      scored.push(...cells);

      const distanceMethod = 'straight_line';
      await writeCategoryScores(
        sql,
        snapshotId,
        'safety',
        reason
          ? placements.map((row) => ({ cellId: row.cell_id, score: null, inputs: { reason } }))
          : cells.map((cell) => ({
              cellId: cell.cellId,
              score: cell.score,
              inputs: {
                day: cell.day,
                night: cell.night,
                day_unsmoothed: Math.round(cell.dayRaw * 10) / 10,
                night_unsmoothed: Math.round(cell.nightRaw * 10) / 10,
                distance_method: distanceMethod,
                excluded_types: [...excluded],
              },
            })),
      );
      await writeSafetyLayers(
        sql,
        snapshotId,
        cells.map((cell) => ({ cellId: cell.cellId, layers: cell.layers })),
      );

      cityStats[city.slug] = {
        features: city.features,
        street_km: Math.round(city.streetKm * 10) / 10,
        lighting_per_km:
          city.streetKm > 0 ? Math.round((100 * city.lighting) / city.streetKm) / 100 : null,
        excluded_types: [...excluded],
        lighting_coverage_compared_with: imports.map((other) => other.slug),
        distance_method: distanceMethod,
        ...(reason ? { reason } : {}),
      };
      logger.info('safety cells scored', {
        snapshot_id: snapshotId,
        city: city.slug,
        cells: cells.length,
      });
    }

    await writeSafetyStats(sql, snapshotId, cityStats, calibrate(scored, params));
    return { sourceDates: { osm: osmDate } };
  },
};
