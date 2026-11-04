import { join } from 'node:path';

import type { JsonObject } from '../../db/sql.ts';
import { WorkerError } from '../../lib/errors.ts';
import {
  computeWalkAccess,
  refreshCityCategoryStats,
  type WalkAccessTarget,
} from '../../routing/walk-access.ts';
import {
  cityBoundingBox,
  downloadOsmExtract,
  extractOsmFeatures,
  osmExtractDate,
  osmSourceRef,
  readOsmFeatures,
} from '../../sources/osm.ts';
import type { ScoreContext, ScoreModule } from '../score-module.ts';
import { listNeighbourPairs, smoothScores } from '../smoothing.ts';
import type { CellCategoryScore } from '../write-category-scores.ts';
import { writeCategoryScores } from '../write-category-scores.ts';
import {
  type CityCategoryStat,
  insertPoiRows,
  listCellIds,
  listCityCategoryStats,
  listWalkAccess,
  type WalkAccessRecord,
  writeCityStats,
} from './fifteen-minute.db.ts';
import { type CategoryAccess, fifteenMinuteScore } from './fifteen-minute.formula.ts';
import {
  type FifteenMinuteParams,
  fifteenMinuteParamsSchema,
  poiCategoriesFor,
  poiCategoryOf,
} from './fifteen-minute.params.ts';
import {
  buildMatchers,
  osmiumFilters,
  type PoiRow,
  poiRowsFromFeature,
} from './fifteen-minute.pois.ts';

type City = ScoreContext['cities'][number];

export function parseFifteenMinuteParams(value: unknown): FifteenMinuteParams {
  const parsed = fifteenMinuteParamsSchema.safeParse(value);
  if (!parsed.success) {
    throw new WorkerError('invalid_fifteen_minute_params', 'params.fifteen_minute is invalid');
  }
  return parsed.data;
}

export function walkTargets(
  params: FifteenMinuteParams,
): (WalkAccessTarget & { minPoiCount: number })[] {
  return params.categories.map((category) => ({
    key: poiCategoryOf(category.key),
    poiCategories: poiCategoriesFor(category),
    searchRadiusM: params.search_radius_m,
    maxCandidates: Math.max(params.max_candidates, category.enough),
    minPoiCount: params.min_city_coverage,
  }));
}

export function cellScoreRows(
  cellIds: readonly string[],
  records: readonly WalkAccessRecord[],
  stats: readonly CityCategoryStat[],
  params: FifteenMinuteParams,
  smooth: (scores: ReadonlyMap<string, number | null>) => Map<string, number | null>,
): CellCategoryScore[] {
  const covered = new Set(
    params.categories
      .filter((category) =>
        stats.some((stat) => stat.category === poiCategoryOf(category.key) && stat.is_covered),
      )
      .map((category) => category.key),
  );
  const keyByPoiCategory = new Map(
    params.categories.map((category) => [poiCategoryOf(category.key), category.key]),
  );
  const byCell = new Map<string, Map<string, CategoryAccess>>();
  const methods = new Map<string, string>();
  for (const record of records) {
    const key = keyByPoiCategory.get(record.category);
    if (!key) continue;
    const access = byCell.get(record.cell_id) ?? new Map<string, CategoryAccess>();
    access.set(key, {
      key,
      tNearestS: record.t_nearest_s,
      n5: record.n5,
      n10: record.n10,
      n15: record.n15,
    });
    byCell.set(record.cell_id, access);
    methods.set(record.cell_id, record.distance_method);
  }

  const results = new Map(
    cellIds.map((cellId) => [
      cellId,
      fifteenMinuteScore(byCell.get(cellId) ?? new Map(), covered, params),
    ]),
  );
  const raw = new Map([...results].map(([cellId, result]) => [cellId, result.score]));
  const smoothed = smooth(raw);

  return cellIds.map((cellId) => {
    const result = results.get(cellId);
    if (!result || covered.size === 0) {
      return { cellId, score: null, inputs: { reason: 'no_source_data' } };
    }
    const inputs: JsonObject = {
      raw_score: result.score,
      covered: result.covered,
      total: result.total,
      distance_method: methods.get(cellId) ?? 'pedestrian_routing',
      categories: result.categories,
    };
    return { cellId, score: smoothed.get(cellId) ?? null, inputs };
  });
}

async function importCityPois(
  context: ScoreContext,
  city: City,
  params: FifteenMinuteParams,
  extractPath: string,
): Promise<number> {
  const bbox = await cityBoundingBox(context.sql, city.id);
  const exported = await extractOsmFeatures({
    extractPath,
    bbox,
    filters: osmiumFilters(params.categories),
    geometryTypes: ['point', 'polygon'],
    workDir: join(context.sourcesDir, 'work', context.snapshotId, 'fifteen_minute'),
    name: city.slug,
  });
  const matchers = buildMatchers(params.categories);
  let inserted = 0;
  let pending: PoiRow[] = [];
  for await (const feature of readOsmFeatures(exported)) {
    pending.push(...poiRowsFromFeature(feature, osmSourceRef(feature.id), matchers));
    if (pending.length >= 1000) {
      inserted += await insertPoiRows(context.sql, context.snapshotId, city.id, pending);
      pending = [];
    }
  }
  inserted += await insertPoiRows(context.sql, context.snapshotId, city.id, pending);
  return inserted;
}

function cityStatsJson(
  stats: readonly CityCategoryStat[],
  params: FifteenMinuteParams,
): JsonObject {
  const byCategory: JsonObject = {};
  const excluded: string[] = [];
  for (const category of params.categories) {
    const stat = stats.find((entry) => entry.category === poiCategoryOf(category.key));
    byCategory[category.key] = {
      poi_count: stat?.poi_count ?? 0,
      is_covered: stat?.is_covered ?? false,
      avg_t_nearest_s: stat?.avg_t_nearest_s ?? null,
      share_within_15:
        stat?.share_within_15 === null || !stat ? null : Number(stat.share_within_15),
    };
    if (!stat?.is_covered) excluded.push(category.key);
  }
  return { categories: byCategory, excluded };
}

export const fifteenMinuteModule: ScoreModule = {
  key: 'fifteen_minute',
  async run(context) {
    const params = parseFifteenMinuteParams(context.params);
    const { sql, snapshotId, logger, router } = context;
    const extractPath = await downloadOsmExtract(
      context.osmExtract,
      context.sourcesDir,
      context.period,
    );
    const targets = walkTargets(params);
    const poiCategories = targets.map((target) => target.key);

    for (const city of context.cities) {
      const pois = await importCityPois(context, city, params, extractPath);
      const accessRows = await computeWalkAccess({
        sql,
        router,
        snapshotId,
        cityId: city.id,
        walkSpeedKmh: params.walk_speed_kmh,
        walkDetourFactor: params.walk_detour_factor,
        targets,
      });
      await refreshCityCategoryStats(sql, snapshotId, city.id, targets);
      const [cellIds, records, stats, pairs] = await Promise.all([
        listCellIds(sql, snapshotId, city.id),
        listWalkAccess(sql, snapshotId, city.id, poiCategories),
        listCityCategoryStats(sql, snapshotId, city.id, poiCategories),
        listNeighbourPairs(sql, city.id, context.cellSizeM),
      ]);
      const rows = cellScoreRows(cellIds, records, stats, params, (scores) =>
        smoothScores(scores, pairs, {
          cellWeight: params.smoothing.cell_weight,
          neighbourWeight: params.smoothing.neighbour_weight,
        }),
      );
      const written = await writeCategoryScores(sql, snapshotId, 'fifteen_minute', rows);
      await writeCityStats(sql, snapshotId, city.slug, cityStatsJson(stats, params));
      logger.info('fifteen_minute city done', {
        snapshot_id: snapshotId,
        city: city.slug,
        pois,
        access_rows: accessRows,
        cells: written,
        routing: router ? 'pedestrian_routing' : 'straight_line',
      });
    }

    const sourceDates: Record<string, string> = {
      osm: await osmExtractDate(extractPath, context.period),
    };
    const graphDate = router ? await router.tilesetDate() : null;
    if (graphDate) sourceDates.walk_routing = graphDate;
    return { sourceDates };
  },
};
