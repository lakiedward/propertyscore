import { join } from 'node:path';

import { z } from 'zod';

import type { JsonObject } from '../../db/sql.ts';
import { WorkerError } from '../../lib/errors.ts';
import type { ValhallaClient } from '../../routing/valhalla.ts';
import {
  type DistanceMethod,
  type RoutedCell,
  walkCellCandidates,
} from '../../routing/walk-access.ts';
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
  listParkWalkCandidates,
  measureGreenCells,
  mergeGreenAreas,
  type ParkCandidate,
  type ParkSize,
  saveGreenAmenities,
  saveGreenSources,
  writeGreenCityStats,
  type GreenAmenityRow,
  type GreenCellMeasure,
  type GreenSourceRow,
} from './green.db.ts';
import { scoreGreen, type GreenFormulaParams } from './green.formula.ts';
import { classifyGreenFeature, GREEN_OSM_FILTERS } from './green.osm.ts';

const weight = z.number().min(0);

const greenParamsSchema = z.object({
  radii_m: z.array(z.number().int().positive()).min(1),
  near_radius_m: z.number().int().positive(),
  wide_radius_m: z.number().int().positive(),
  share_cap: z.number().positive().max(1),
  small_min_ha: z.number().positive(),
  small_full_m: z.number().min(0),
  small_zero_m: z.number().positive(),
  large_min_ha: z.number().positive(),
  large_full_m: z.number().min(0),
  large_zero_m: z.number().positive(),
  canopy_cap: z.number().positive().max(1),
  min_polygon_ha: z.number().min(0),
  walk_detour_factor: z.number().min(1),
  weights: z.object({ c1: weight, c2: weight, c3: weight, c4: weight, c5: weight }),
});

type GreenParams = z.infer<typeof greenParamsSchema>;

const BATCH_SIZE = 500;

const PARK_WALK_CANDIDATES = 5;

type ParkWalk = { green_area_id: string | null; walk_m: number | null };

type GreenCellWalks = {
  small: ParkWalk;
  large: ParkWalk;
  distanceMethod: DistanceMethod;
};

export function parseGreenParams(value: unknown): GreenParams {
  const parsed = greenParamsSchema.safeParse(value);
  if (!parsed.success) {
    throw new WorkerError('invalid_green_params', 'params.green does not match the schema');
  }
  const params = parsed.data;
  for (const radius of [params.near_radius_m, params.wide_radius_m]) {
    if (!params.radii_m.includes(radius)) {
      throw new WorkerError('invalid_green_params', 'near and wide radii must be in radii_m');
    }
  }
  return params;
}

function formulaParams(params: GreenParams): GreenFormulaParams {
  return {
    shareCap: params.share_cap,
    smallFullM: params.small_full_m,
    smallZeroM: params.small_zero_m,
    largeFullM: params.large_full_m,
    largeZeroM: params.large_zero_m,
    canopyCap: params.canopy_cap,
    weights: params.weights,
  };
}

function walkMeters(distanceM: number | null, detour: number): number | null {
  return distanceM === null ? null : Math.round(distanceM * detour);
}

function straightLineWalks(measure: GreenCellMeasure, params: GreenParams): GreenCellWalks {
  return {
    small: {
      green_area_id: measure.nearest_small_id,
      walk_m: walkMeters(measure.nearest_small_m, params.walk_detour_factor),
    },
    large: {
      green_area_id: measure.nearest_large_id,
      walk_m: walkMeters(measure.nearest_large_m, params.walk_detour_factor),
    },
    distanceMethod: 'straight_line',
  };
}

function nearestWalkedPark(cell: RoutedCell<ParkCandidate>, size: ParkSize): ParkWalk {
  let nearest: ParkWalk = { green_area_id: null, walk_m: null };
  for (const candidate of cell.routed) {
    if (candidate.key !== size || !candidate.leg) continue;
    if (nearest.walk_m === null || candidate.leg.meters < nearest.walk_m) {
      nearest = { green_area_id: candidate.poi_id, walk_m: Math.round(candidate.leg.meters) };
    }
  }
  return nearest;
}

export function routedWalks(cell: RoutedCell<ParkCandidate>): GreenCellWalks {
  return {
    small: nearestWalkedPark(cell, 'small'),
    large: nearestWalkedPark(cell, 'large'),
    distanceMethod: 'pedestrian_routing',
  };
}

async function walkToParks(
  context: Parameters<ScoreModule['run']>[0],
  router: ValhallaClient,
  cityId: string,
  params: GreenParams,
): Promise<Map<string, GreenCellWalks>> {
  const cells = await listParkWalkCandidates(context.sql, context.snapshotId, cityId, [
    {
      key: 'small',
      minHa: params.small_min_ha,
      searchRadiusM: params.small_zero_m,
      maxCandidates: PARK_WALK_CANDIDATES,
    },
    {
      key: 'large',
      minHa: params.large_min_ha,
      searchRadiusM: params.large_zero_m,
      maxCandidates: PARK_WALK_CANDIDATES,
    },
  ]);
  const routed = await walkCellCandidates(router, cells);
  return new Map(routed.map((cell) => [cell.cellId, routedWalks(cell)]));
}

export function scoreGreenCell(
  measure: GreenCellMeasure,
  params: GreenParams,
  walks: GreenCellWalks = straightLineWalks(measure, params),
): CellCategoryScore {
  const share = (radius: number) => measure.shares[String(radius)] ?? null;
  const result = scoreGreen(
    {
      shareNear: share(params.near_radius_m),
      shareWide: share(params.wide_radius_m),
      smallWalkM: walks.small.walk_m,
      largeWalkM: walks.large.walk_m,
      canopy: null,
    },
    formulaParams(params),
  );
  const components: JsonObject = {};
  for (const component of result.components) components[component.key] = component.points;
  return {
    cellId: measure.cell_id,
    score: result.score,
    inputs: {
      share: measure.shares,
      nearest_small: walks.small,
      nearest_large: walks.large,
      distance_method: walks.distanceMethod,
      canopy: null,
      components,
    },
  };
}

async function importCity(
  context: Parameters<ScoreModule['run']>[0],
  extractPath: string,
  city: { id: string; slug: string },
): Promise<number> {
  const { sql, snapshotId } = context;
  const exported = await extractOsmFeatures({
    extractPath,
    bbox: await cityBoundingBox(sql, city.id),
    filters: GREEN_OSM_FILTERS,
    geometryTypes: ['point', 'polygon'],
    workDir: join(context.sourcesDir, 'work', snapshotId),
    name: `${city.slug}-green`,
  });

  let areas: GreenSourceRow[] = [];
  let amenities: GreenAmenityRow[] = [];
  let publicAreas = 0;
  for await (const feature of readOsmFeatures(exported)) {
    const kind = classifyGreenFeature(feature.properties);
    if (!kind) continue;
    const base = {
      source_ref: osmSourceRef(feature.id),
      name: feature.properties.name ?? null,
      geojson: JSON.stringify(feature.geometry),
    };
    if (kind.type === 'amenity') {
      amenities.push({ ...base, category: kind.amenity });
    } else if (feature.geometry.type !== 'Point') {
      areas.push({ ...base, kind: kind.kind, is_public: kind.isPublic });
      if (kind.isPublic) publicAreas += 1;
    }
    if (areas.length >= BATCH_SIZE) {
      await saveGreenSources(sql, snapshotId, city.id, areas);
      areas = [];
    }
    if (amenities.length >= BATCH_SIZE) {
      await saveGreenAmenities(sql, snapshotId, city.id, amenities);
      amenities = [];
    }
  }
  await saveGreenSources(sql, snapshotId, city.id, areas);
  await saveGreenAmenities(sql, snapshotId, city.id, amenities);
  return publicAreas;
}

export const greenModule: ScoreModule = {
  key: 'green',
  run: async (context) => {
    const params = parseGreenParams(context.params);
    const extractPath = await downloadOsmExtract(
      context.osmExtractUrl,
      context.sourcesDir,
      context.period,
    );

    for (const city of context.cities) {
      const publicAreas = await importCity(context, extractPath, city);
      const merged = await mergeGreenAreas(
        context.sql,
        context.snapshotId,
        city.id,
        params.min_polygon_ha,
      );
      const measures = await measureGreenCells(context.sql, context.snapshotId, city.id, {
        radiiM: params.radii_m,
        smallMinHa: params.small_min_ha,
        largeMinHa: params.large_min_ha,
      });
      const walks =
        publicAreas > 0 && context.router
          ? await walkToParks(context, context.router, city.id, params)
          : null;
      const rows =
        publicAreas === 0
          ? measures.map((measure) => ({
              cellId: measure.cell_id,
              score: null,
              inputs: { reason: 'no_source_data' },
            }))
          : measures.map((measure) => scoreGreenCell(measure, params, walks?.get(measure.cell_id)));
      await writeCategoryScores(context.sql, context.snapshotId, 'green', rows);
      await writeGreenCityStats(context.sql, context.snapshotId, city, params.near_radius_m);
      context.logger.info('green city scored', {
        snapshot_id: context.snapshotId,
        city: city.slug,
        green_areas: merged,
        cells: rows.length,
        distance_method: walks ? 'pedestrian_routing' : 'straight_line',
      });
    }

    return { sourceDates: { osm: await osmExtractDate(extractPath, context.period) } };
  },
};
