import { join } from 'node:path';

import type { JsonObject } from '../../db/sql.ts';
import { WorkerError } from '../../lib/errors.ts';
import { mapWithConcurrency } from '../../lib/concurrency.ts';
import { legsFromOrigin, type Candidate, type DistanceMethod } from '../../routing/walk-access.ts';
import {
  cityBoundingBox,
  downloadOsmExtract,
  extractOsmFeatures,
  osmExtractDate,
  readOsmFeatures,
} from '../../sources/osm.ts';
import { createLazyGeocoder, loadCityGeocoder } from '../../geocoding/city-geocoder.ts';
import type { CoveredCity } from '../../snapshot/snapshot.db.ts';
import type { ScoreContext, ScoreModule } from '../score-module.ts';
import { listNeighbourPairs, smoothScores } from '../smoothing.ts';
import { writeCategoryScores, type CellCategoryScore } from '../write-category-scores.ts';
import {
  copyEducationPois,
  listCandidates,
  listCityCells,
  upsertInstitutions,
  writeEducationStats,
  type EducationCandidate,
} from './education.db.ts';
import {
  countWithin,
  educationScore,
  levelAccess,
  type LevelAccess,
  type ReachableUnit,
} from './education.formula.ts';
import { matchInstitutions, matchSummary, placeUnmatched } from './education.match.ts';
import { EDUCATION_OSM_FILTERS, toEducationUnit, type OsmEducationUnit } from './education.osm.ts';
import {
  educationParamsSchema,
  SCORED_LEVEL_CATEGORY,
  SCORED_LEVELS,
  type EducationParams,
  type ScoredLevel,
} from './education.params.ts';
import { loadRegister } from './education.register.ts';
import type { RegisterRow } from './education.siiir.ts';

type LevelCandidate = EducationCandidate & { level: ScoredLevel };

type CellCandidates = { lng: number; lat: number; candidates: LevelCandidate[] };

type CellResult = {
  cellId: string;
  raw: number | null;
  inputs: JsonObject;
};

function parseParams(params: unknown): EducationParams {
  const parsed = educationParamsSchema.safeParse(params);
  if (!parsed.success) {
    throw new WorkerError('invalid_education_params', 'params.education does not match the schema');
  }
  return parsed.data;
}

async function readCityUnits(
  context: ScoreContext,
  city: CoveredCity,
  extractPath: string,
): Promise<OsmEducationUnit[]> {
  const exported = await extractOsmFeatures({
    extractPath,
    bbox: await cityBoundingBox(context.sql, city.id),
    filters: EDUCATION_OSM_FILTERS,
    geometryTypes: ['point', 'polygon'],
    workDir: join(context.sourcesDir, 'work', context.period.slice(0, 7), city.slug),
    name: 'education',
  });
  const units: OsmEducationUnit[] = [];
  for await (const feature of readOsmFeatures(exported)) {
    const unit = toEducationUnit(feature);
    if (unit) units.push(unit);
  }
  return units;
}

function groupByCell(candidates: readonly LevelCandidate[]): Map<string, CellCandidates> {
  const cells = new Map<string, CellCandidates>();
  for (const candidate of candidates) {
    const cell = cells.get(candidate.cell_id) ?? {
      lng: candidate.cell_lng,
      lat: candidate.cell_lat,
      candidates: [],
    };
    cell.candidates.push(candidate);
    cells.set(candidate.cell_id, cell);
  }
  return cells;
}

function roundMinutes(minutes: number | null): number | null {
  return minutes === null ? null : Math.round(minutes * 10) / 10;
}

function accessInputs(access: Record<ScoredLevel, LevelAccess>): JsonObject {
  return Object.fromEntries(
    SCORED_LEVELS.map((level) => [
      level,
      {
        t1: roundMinutes(access[level].t1),
        t2: roundMinutes(access[level].t2),
        s: Math.round(access[level].points * 1000) / 1000,
      },
    ]),
  );
}

export async function scoreCell(
  context: Pick<ScoreContext, 'router'>,
  params: EducationParams,
  cellId: string,
  cell: CellCandidates | undefined,
  distanceMethod: DistanceMethod,
): Promise<CellResult> {
  const candidates = cell?.candidates ?? [];
  const targets: Candidate[] = candidates.map((candidate) => ({
    key: candidate.level,
    poi_id: candidate.poi_id,
    lng: candidate.poi_lng,
    lat: candidate.poi_lat,
    straight_m: candidate.straight_m,
  }));
  const legs = cell
    ? await legsFromOrigin(
        context.router,
        { lng: cell.lng, lat: cell.lat },
        targets,
        params.walk_speed_kmh,
        params.walk_detour_factor,
      )
    : [];

  const reachable: (ReachableUnit & { level: ScoredLevel })[] = [];
  candidates.forEach((candidate, index) => {
    const leg = legs[index];
    if (!leg) return;
    reachable.push({
      level: candidate.level,
      institutionId: candidate.institution_id,
      entity: candidate.entity,
      minutes: leg.seconds / 60,
    });
  });

  const access = Object.fromEntries(
    SCORED_LEVELS.map((level) => [
      level,
      levelAccess(
        reachable.filter((unit) => unit.level === level),
        params.levels[level],
        params.choice_weight,
      ),
    ]),
  ) as Record<ScoredLevel, LevelAccess>;

  const nearestIds = SCORED_LEVELS.flatMap((level) => {
    const nearest = reachable
      .filter((unit) => unit.level === level)
      .sort((a, b) => a.minutes - b.minutes)[0];
    return nearest ? [nearest.institutionId] : [];
  });

  return {
    cellId,
    raw: educationScore(access, params.levels),
    inputs: {
      levels: accessInputs(access),
      counts: countWithin(reachable, params.count_bands_min),
      nearest_ids: [...new Set(nearestIds)],
      distance_method: distanceMethod,
    },
  };
}

function noDataReason(
  params: EducationParams,
  cityRegister: readonly RegisterRow[],
  placed: number,
): string | null {
  if (params.require_official_register && cityRegister.length === 0) return 'no_official_register';
  if (placed === 0) return 'no_source_data';
  return null;
}

async function scoreCity(
  context: ScoreContext,
  params: EducationParams,
  city: CoveredCity,
  cityRegister: readonly RegisterRow[],
  units: readonly OsmEducationUnit[],
  extractPath: string,
): Promise<JsonObject> {
  const { sql, snapshotId } = context;
  const seenOn = context.period;
  const geocoder = createLazyGeocoder(() => loadCityGeocoder(context, city, extractPath));
  const rows = await placeUnmatched(
    matchInstitutions(cityRegister, units, params.match),
    geocoder.geocode,
  );
  await upsertInstitutions(sql, city.id, seenOn, rows);
  const pois = await copyEducationPois(sql, snapshotId, city.id, seenOn);
  const summary = { ...matchSummary(rows), geocoding: geocoder.tally };
  const cellIds = await listCityCells(sql, snapshotId, city.id);

  const reason = noDataReason(params, cityRegister, pois);
  if (reason) {
    const empty: CellCategoryScore[] = cellIds.map((cellId) => ({
      cellId,
      score: null,
      inputs: { reason },
    }));
    await writeCategoryScores(sql, snapshotId, 'education', empty);
    return { ...summary, register_rows: cityRegister.length, pois, status: reason };
  }

  const metersPerMinute = (params.walk_speed_kmh * 1000) / 60;
  const candidates: LevelCandidate[] = [];
  for (const level of SCORED_LEVELS) {
    const found = await listCandidates(
      sql,
      snapshotId,
      city.id,
      SCORED_LEVEL_CATEGORY[level],
      params.levels[level].zero_min * metersPerMinute,
      params.max_candidates,
    );
    candidates.push(...found.map((candidate) => ({ ...candidate, level })));
  }
  const byCell = groupByCell(candidates);
  const distanceMethod: DistanceMethod = context.router ? 'pedestrian_routing' : 'straight_line';

  const results = await mapWithConcurrency(cellIds, 4, (cellId) =>
    scoreCell(context, params, cellId, byCell.get(cellId), distanceMethod),
  );

  const smoothed = smoothScores(
    new Map(results.map((result) => [result.cellId, result.raw])),
    await listNeighbourPairs(sql, city.id, context.cellSizeM),
    { cellWeight: 1 - params.neighbour_weight, neighbourWeight: params.neighbour_weight },
  );

  await writeCategoryScores(
    sql,
    snapshotId,
    'education',
    results.map((result) => {
      const score = smoothed.get(result.cellId) ?? null;
      return {
        cellId: result.cellId,
        score: score === null ? null : Math.round(score),
        inputs: { ...result.inputs, raw: result.raw },
      };
    }),
  );

  return {
    ...summary,
    register_rows: cityRegister.length,
    pois,
    distance_method: distanceMethod,
    status: 'scored',
  };
}

export const educationModule: ScoreModule = {
  key: 'education',
  async run(context) {
    const params = parseParams(context.params);
    const extractPath = await downloadOsmExtract(
      context.osmExtractUrl,
      context.sourcesDir,
      context.period,
    );
    const {
      rows: register,
      sourceDate,
      skipped,
      levelSources,
    } = await loadRegister(context.sourcesDir, params.register);
    context.logger.info('education register read', {
      school_year: params.register.school_year,
      source_date: sourceDate,
      rows: register.length,
      levels_from_plan: levelSources.plan,
      levels_from_name: levelSources.name,
      ...skipped,
    });

    const stats: Record<string, JsonObject> = {};
    for (const city of context.cities) {
      const units = await readCityUnits(context, city, extractPath);
      const cityRegister = register.filter((row) => row.city_slug === city.slug);
      stats[city.slug] = await scoreCity(context, params, city, cityRegister, units, extractPath);
      context.logger.info('education city scored', { city: city.slug, ...stats[city.slug] });
    }
    await writeEducationStats(context.sql, context.snapshotId, stats);

    return {
      sourceDates: {
        osm: await osmExtractDate(extractPath, context.period),
        siiir: sourceDate,
      },
    };
  },
};
