import type { JsonObject, Sql } from '../../db/sql.ts';
import { noiseGridBuildings, noiseGridLines, type GridBox } from './noise.db.ts';
import type { NoiseCoverage } from './noise.formula.ts';
import { noiseLevelGrid, toMetres, type GridBuilding, type GridLine } from './noise.grid.ts';
import type { NoiseParams } from './noise.params.ts';

type Location = { lon: number; lat: number };

const GRID_STEP_M = 20;
const HALF_WIDTH_M = 1160;
const HALF_HEIGHT_M = 1000;
const FIRST_DRAWN_DB = 55;
const BUILDING_REACH_M = 600;
const METRES_PER_DEGREE = 111_320;

function boxAround(location: Location, eastM: number, northM: number): GridBox {
  const latSpan = northM / METRES_PER_DEGREE;
  const lonSpan = eastM / (METRES_PER_DEGREE * Math.cos((location.lat * Math.PI) / 180));
  return {
    west: location.lon - lonSpan,
    east: location.lon + lonSpan,
    south: location.lat - latSpan,
    north: location.lat + latSpan,
  };
}

export async function noiseHeatGrid(
  sql: Sql,
  input: { snapshotId: string; cityId: string; location: Location; coverage: NoiseCoverage },
  params: NoiseParams,
): Promise<JsonObject | null> {
  if (input.coverage.hasMaps || !input.coverage.hasProxySources) return null;
  const { snapshotId, cityId, location } = input;
  const columns = 2 * Math.round(HALF_WIDTH_M / GRID_STEP_M) + 1;
  const rows = 2 * Math.round(HALF_HEIGHT_M / GRID_STEP_M) + 1;
  const [rawLines, rawBuildings] = await Promise.all([
    noiseGridLines(
      sql,
      snapshotId,
      cityId,
      boxAround(
        location,
        HALF_WIDTH_M + params.nearest_radius_m,
        HALF_HEIGHT_M + params.nearest_radius_m,
      ),
    ),
    noiseGridBuildings(
      sql,
      snapshotId,
      cityId,
      boxAround(location, HALF_WIDTH_M + BUILDING_REACH_M, HALF_HEIGHT_M + BUILDING_REACH_M),
    ),
  ]);
  const lines: GridLine[] = rawLines.map((line) => ({
    kind: line.kind,
    sourceClass: line.sourceClass,
    points: line.coordinates.map(([lon, lat]) => toMetres(location, lon, lat)),
  }));
  const buildings: GridBuilding[] = rawBuildings.map((ring) => ({
    ring: ring.map(([lon, lat]) => toMetres(location, lon, lat)),
  }));
  const levels = noiseLevelGrid(
    {
      spec: { columns, rows, stepM: GRID_STEP_M },
      lines,
      buildings,
      coverage: input.coverage,
      firstDrawnDb: FIRST_DRAWN_DB,
    },
    params,
  );
  return {
    center: [location.lon, location.lat],
    step_m: GRID_STEP_M,
    columns,
    rows,
    levels,
  };
}
