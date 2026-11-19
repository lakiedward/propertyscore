import type { JsonObject, Sql } from '../../db/sql.ts';
import { mapWithConcurrency } from '../../lib/concurrency.ts';
import { gridNoiseSamples } from './noise.db.ts';
import { assessPoint, type NoiseCoverage } from './noise.formula.ts';
import type { NoiseParams } from './noise.params.ts';

type GridPoint = { lon: number; lat: number };

type GridCell = GridPoint & { index: number };

const GRID_STEP_M = 50;
const METRES_PER_DEGREE = 111_320;
const CHUNK_SIZE = 150;
const CHUNK_CONCURRENCY = 4;

export function gridAround(
  center: GridPoint,
  radiusM: number,
  stepM: number,
): { half: number; cells: GridCell[] } {
  const latStep = stepM / METRES_PER_DEGREE;
  const lonStep = stepM / (METRES_PER_DEGREE * Math.cos((center.lat * Math.PI) / 180));
  const half = Math.floor(radiusM / stepM);
  const width = 2 * half + 1;
  const cells: GridCell[] = [];
  for (let row = -half; row <= half; row += 1) {
    for (let column = -half; column <= half; column += 1) {
      if (Math.hypot(row, column) * stepM <= radiusM) {
        cells.push({
          lon: center.lon + column * lonStep,
          lat: center.lat - row * latStep,
          index: (row + half) * width + column + half,
        });
      }
    }
  }
  return { half, cells };
}

export async function noiseHeatGrid(
  sql: Sql,
  input: {
    snapshotId: string;
    cityId: string;
    location: GridPoint;
    coverage: NoiseCoverage;
  },
  params: NoiseParams,
): Promise<JsonObject> {
  const { half, cells } = gridAround(input.location, params.map_clip_m, GRID_STEP_M);
  const width = 2 * half + 1;
  const levels: (number | null)[] = Array.from({ length: width * width }, () => null);
  const chunks = Array.from({ length: Math.ceil(cells.length / CHUNK_SIZE) }, (_, index) =>
    cells.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE),
  );
  await mapWithConcurrency(chunks, CHUNK_CONCURRENCY, async (chunk) => {
    const samples = await gridNoiseSamples(
      sql,
      input.snapshotId,
      input.cityId,
      chunk,
      params.nearest_radius_m,
    );
    chunk.forEach((cell, position) => {
      levels[cell.index] = assessPoint(
        samples.get(position + 1) ?? [],
        input.coverage,
        params,
      ).lden;
    });
  });
  return {
    center: [input.location.lon, input.location.lat],
    step_m: GRID_STEP_M,
    half,
    levels,
  };
}
