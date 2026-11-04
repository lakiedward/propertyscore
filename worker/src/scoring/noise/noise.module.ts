import { join } from 'node:path';

import type { JsonObject } from '../../db/sql.ts';
import {
  cityBoundingBox,
  downloadOsmExtract,
  extractOsmFeatures,
  osmExtractDate,
  osmSourceRef,
  readOsmFeatures,
} from '../../sources/osm.ts';
import type { ScoreModule } from '../score-module.ts';
import { writeCategoryScores, type CellCategoryScore } from '../write-category-scores.ts';
import {
  cellNoiseSamples,
  freezeNoiseDatasets,
  pruneNoiseBuildings,
  replaceNoiseBuildings,
  replaceNoiseSources,
  writeNoiseStats,
  type BuildingRow,
  type CellSample,
  type CityNoiseCoverage,
  type NoiseSourceRow,
} from './noise.db.ts';
import { assessCell, assessPoint, type CellNoise, type NoiseCoverage } from './noise.formula.ts';
import { parseNoiseParams, type NoiseParams } from './noise.params.ts';
import {
  classifyNoiseSource,
  isBuildingFootprint,
  NOISE_BUILDING_FILTERS,
  NOISE_SOURCE_FILTERS,
} from './noise.osm.ts';

async function* buildingRows(path: string): AsyncGenerator<BuildingRow> {
  for await (const feature of readOsmFeatures(path)) {
    if (isBuildingFootprint(feature)) yield { geometry: feature.geometry };
  }
}

async function readNoiseSources(path: string): Promise<NoiseSourceRow[]> {
  const rows: NoiseSourceRow[] = [];
  for await (const feature of readOsmFeatures(path)) {
    const source = classifyNoiseSource(feature);
    if (source !== null) rows.push({ ...source, sourceRef: osmSourceRef(feature.id) });
  }
  return rows;
}

function cellNoiseInputs(cell: CellNoise): JsonObject {
  if (cell.score === null) {
    return { reason: 'no_source_data', dataset_ids: cell.datasetIds };
  }
  return {
    lden: cell.lden,
    lnight: cell.lnight,
    precision: cell.precision,
    dataset_ids: cell.datasetIds,
    points: cell.points.map((point) => ({
      score: point.score,
      lden: point.lden,
      lnight: point.lnight,
      sources: point.sources.map((source) => ({
        kind: source.kind,
        method: source.method,
        lden: source.lden,
        lnight: source.lnight,
      })),
    })),
  };
}

export function scoreCells(
  cellIds: readonly string[],
  samples: readonly CellSample[],
  coverage: NoiseCoverage,
  params: NoiseParams,
): CellCategoryScore[] {
  const byPoint = new Map<string, CellSample['sample'][]>();
  for (const { cellId, pointIndex, sample } of samples) {
    const key = `${cellId}:${String(pointIndex)}`;
    const list = byPoint.get(key);
    if (list) list.push(sample);
    else byPoint.set(key, [sample]);
  }
  return cellIds.map((cellId) => {
    const points = Array.from({ length: 7 }, (_, pointIndex) =>
      assessPoint(byPoint.get(`${cellId}:${String(pointIndex)}`) ?? [], coverage, params),
    );
    const cell = assessCell(points);
    return { cellId, score: cell.score, inputs: cellNoiseInputs(cell) };
  });
}

function cityStats(coverage: CityNoiseCoverage, rows: readonly CellCategoryScore[]): JsonObject {
  const precisions = rows.map((row) => row.inputs.precision);
  const rounds = [...new Set(coverage.datasets.map((dataset) => dataset.round))].sort();
  return {
    method:
      coverage.datasets.length === 0
        ? coverage.sourceCount === 0
          ? 'no_data'
          : 'osm_proxy'
        : 'strategic_map',
    rounds,
    datasets: coverage.datasets.map((dataset) => ({
      id: dataset.id,
      source_type: dataset.sourceType,
      indicator: dataset.indicator,
      round: dataset.round,
    })),
    sources: coverage.sourceCount,
    street_cells: precisions.filter((precision) => precision === 'street').length,
    estimate_cells: precisions.filter((precision) => precision === 'estimate').length,
    no_data_cells: rows.filter((row) => row.score === null).length,
  };
}

export const noiseModule: ScoreModule = {
  key: 'noise',
  run: async (context) => {
    const params = parseNoiseParams(context.params);
    const { sql, snapshotId, logger } = context;
    await pruneNoiseBuildings(sql);
    const extractPath = await downloadOsmExtract(
      context.osmExtract,
      context.sourcesDir,
      context.period,
    );
    const osmDate = await osmExtractDate(extractPath, context.period);

    const stats: Record<string, JsonObject> = {};
    const rounds = new Set<number>();
    for (const city of context.cities) {
      const bbox = await cityBoundingBox(sql, city.id);
      const workDir = join(context.sourcesDir, 'work', context.period, city.slug);
      const sourcesPath = await extractOsmFeatures({
        extractPath,
        bbox,
        filters: NOISE_SOURCE_FILTERS,
        geometryTypes: ['linestring'],
        workDir,
        name: 'noise-sources',
      });
      const sources = await replaceNoiseSources(
        sql,
        snapshotId,
        city.id,
        await readNoiseSources(sourcesPath),
      );
      const buildingsPath = await extractOsmFeatures({
        extractPath,
        bbox,
        filters: NOISE_BUILDING_FILTERS,
        geometryTypes: ['polygon'],
        workDir,
        name: 'noise-buildings',
      });
      const buildings = await replaceNoiseBuildings(
        sql,
        snapshotId,
        city.id,
        buildingRows(buildingsPath),
      );

      const coverage = await freezeNoiseDatasets(sql, snapshotId, city.id);
      for (const dataset of coverage.datasets) rounds.add(dataset.round);
      const { cellIds, samples } = await cellNoiseSamples(
        sql,
        snapshotId,
        city.id,
        params.sample_offset_m,
        params.nearest_radius_m,
      );
      const rows = scoreCells(
        cellIds,
        samples,
        { hasMaps: coverage.datasets.length > 0, hasProxySources: coverage.sourceCount > 0 },
        params,
      );
      await writeCategoryScores(sql, snapshotId, 'noise', rows);
      stats[city.slug] = cityStats(coverage, rows);
      logger.info('noise city scored', {
        snapshot_id: snapshotId,
        city: city.slug,
        sources,
        buildings,
        datasets: coverage.datasets.length,
        cells: rows.length,
      });
    }

    await writeNoiseStats(sql, snapshotId, stats);
    const sourceDates: Record<string, string> = { osm: osmDate };
    if (rounds.size > 0) sourceDates.noise = String(Math.max(...rounds));
    return { sourceDates };
  },
};
