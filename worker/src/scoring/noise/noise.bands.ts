import { mapWithConcurrency } from '../../lib/concurrency.ts';
import type { JsonObject, Sql } from '../../db/sql.ts';
import { bandPolygons, gridNoiseSamples, type BandCell } from './noise.db.ts';
import { assessPoint, type NoiseCoverage } from './noise.formula.ts';
import type { NoiseParams } from './noise.params.ts';

type GridPoint = { lon: number; lat: number };

const GRID_STEP_M = 50;
const FIRST_DRAWN_DB = 55;
const METRES_PER_DEGREE = 111_320;
const CHUNK_SIZE = 150;
const CHUNK_CONCURRENCY = 4;

export function gridAround(center: GridPoint, radiusM: number, stepM: number): GridPoint[] {
  const latStep = stepM / METRES_PER_DEGREE;
  const lonStep = stepM / (METRES_PER_DEGREE * Math.cos((center.lat * Math.PI) / 180));
  const steps = Math.floor(radiusM / stepM);
  const points: GridPoint[] = [];
  for (let row = -steps; row <= steps; row += 1) {
    for (let column = -steps; column <= steps; column += 1) {
      if (Math.hypot(row, column) * stepM <= radiusM) {
        points.push({ lon: center.lon + column * lonStep, lat: center.lat + row * latStep });
      }
    }
  }
  return points;
}

export function bandLow(level: number, bandWidthDb: number): number {
  return Math.floor(level / bandWidthDb) * bandWidthDb;
}

export async function noiseBandLayer(
  sql: Sql,
  input: {
    snapshotId: string;
    cityId: string;
    location: GridPoint;
    coverage: NoiseCoverage;
  },
  params: NoiseParams,
): Promise<JsonObject> {
  const points = gridAround(input.location, params.map_clip_m, GRID_STEP_M);
  const chunks = Array.from({ length: Math.ceil(points.length / CHUNK_SIZE) }, (_, index) =>
    points.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE),
  );
  const cellsByChunk = await mapWithConcurrency(chunks, CHUNK_CONCURRENCY, async (chunk) => {
    const samples = await gridNoiseSamples(
      sql,
      input.snapshotId,
      input.cityId,
      chunk,
      params.nearest_radius_m,
    );
    return chunk.flatMap((point, index): BandCell[] => {
      const level = assessPoint(samples.get(index + 1) ?? [], input.coverage, params).lden;
      if (level === null) return [];
      const dbLow = bandLow(level, params.band_width_db);
      return dbLow >= FIRST_DRAWN_DB ? [{ ...point, dbLow }] : [];
    });
  });
  const cells = cellsByChunk.flat();
  return bandPolygons(sql, cells, {
    halfLatDegrees: GRID_STEP_M / 2 / METRES_PER_DEGREE,
    halfLonDegrees:
      GRID_STEP_M / 2 / (METRES_PER_DEGREE * Math.cos((input.location.lat * Math.PI) / 180)),
  });
}
