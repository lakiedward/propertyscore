import type { JsonObject } from '../../db/sql.ts';
import { gaussianBlur } from '../../lib/gaussian-blur.ts';
import { contourPolygons, type ContourPolygon } from './contours.ts';
import type { NeighbourhoodPlace } from './osm-transit.ts';
import type { LngLat } from './transit.types.ts';

const REACH_MINUTES = [15, 30, 45] as const;
const REACH_HEADLINE_MINUTES = 30;

const GRID_STEP_M = 40;
const SMOOTHING_SIGMA_M = 160;
const NEAREST_CELL_SPAN = 1.5;
const UNREACHED_MINUTES = 75;
const SIMPLIFY_M = 8;
const MIN_RING_AREA_M2 = 4 * GRID_STEP_M * GRID_STEP_M;
const UNREACHABLE = 65535;
const EARTH_RADIUS_M = 6_371_008.8;

export type ReachCell = LngLat & { minutes: number | null };

type Local = { east: number; north: number };

type Projection = {
  toLocal: (point: LngLat) => Local;
  toLngLat: (east: number, north: number) => [number, number];
};

function projection(origin: LngLat): Projection {
  const northPerDegree = (Math.PI / 180) * EARTH_RADIUS_M;
  const eastPerDegree = northPerDegree * Math.cos((origin.lat * Math.PI) / 180);
  return {
    toLocal: (point) => ({
      east: (point.lng - origin.lng) * eastPerDegree,
      north: (point.lat - origin.lat) * northPerDegree,
    }),
    toLngLat: (east, north) => [
      Number((origin.lng + east / eastPerDegree).toFixed(5)),
      Number((origin.lat + north / northPerDegree).toFixed(5)),
    ],
  };
}

function nearestCellFinder(cells: readonly Local[], cellSizeM: number) {
  const buckets = new Map<string, number[]>();
  const bucketOf = (east: number, north: number) =>
    `${String(Math.floor(east / cellSizeM))}:${String(Math.floor(north / cellSizeM))}`;
  cells.forEach((cell, index) => {
    const key = bucketOf(cell.east, cell.north);
    buckets.set(key, [...(buckets.get(key) ?? []), index]);
  });
  const limit = NEAREST_CELL_SPAN * cellSizeM;
  const reach = Math.ceil(limit / cellSizeM);
  return (east: number, north: number): number | null => {
    const column = Math.floor(east / cellSizeM);
    const row = Math.floor(north / cellSizeM);
    let best: number | null = null;
    let bestDistance = limit;
    for (let dx = -reach; dx <= reach; dx += 1) {
      for (let dy = -reach; dy <= reach; dy += 1) {
        for (const index of buckets.get(`${String(column + dx)}:${String(row + dy)}`) ?? []) {
          const cell = cells[index];
          if (!cell) continue;
          const distance = Math.hypot(cell.east - east, cell.north - north);
          if (distance <= bestDistance) {
            best = index;
            bestDistance = distance;
          }
        }
      }
    }
    return best;
  };
}

export function decodeTravelRow(row: Buffer, size: number): (number | null)[] | null {
  if (row.length !== size * 2) return null;
  return Array.from({ length: size }, (_, index) => {
    const minutes = row.readUInt16BE(index * 2);
    return minutes === UNREACHABLE ? null : minutes;
  });
}

function closeRing(ring: readonly [number, number][]): [number, number][] {
  const first = ring[0];
  return first ? [...ring, first] : [];
}

function toGeometry(
  polygons: readonly ContourPolygon[],
  toLngLat: (column: number, row: number) => [number, number],
): JsonObject {
  return {
    type: 'MultiPolygon',
    coordinates: polygons.map((polygon) =>
      polygon.map((ring) => closeRing(ring.map(([column, row]) => toLngLat(column, row)))),
    ),
  };
}

function percent(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

export function buildReach(input: {
  origin: LngLat;
  cells: readonly ReachCell[];
  cellSizeM: number;
  places: readonly NeighbourhoodPlace[];
}): JsonObject | null {
  const { cells, cellSizeM } = input;
  if (!cells.some((cell) => cell.minutes !== null)) return null;
  const project = projection(input.origin);
  const local = cells.map((cell) => project.toLocal(cell));
  const nearest = nearestCellFinder(local, cellSizeM);
  const margin = NEAREST_CELL_SPAN * cellSizeM + 3 * SMOOTHING_SIGMA_M;
  const west = Math.min(...local.map((cell) => cell.east)) - margin;
  const south = Math.min(...local.map((cell) => cell.north)) - margin;
  const east = Math.max(...local.map((cell) => cell.east)) + margin;
  const north = Math.max(...local.map((cell) => cell.north)) + margin;
  const columns = Math.ceil((east - west) / GRID_STEP_M) + 1;
  const rows = Math.ceil((north - south) / GRID_STEP_M) + 1;
  const values = new Float64Array(columns * rows);
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = nearest(west + column * GRID_STEP_M, south + row * GRID_STEP_M);
      const minutes = index === null ? null : (cells[index]?.minutes ?? null);
      values[row * columns + column] =
        minutes === null ? UNREACHED_MINUTES : Math.min(minutes, UNREACHED_MINUTES);
    }
  }
  const grid = {
    columns,
    rows,
    values: gaussianBlur(values, columns, rows, SMOOTHING_SIGMA_M / GRID_STEP_M),
  };
  const gridToLngLat = (column: number, row: number) =>
    project.toLngLat(west + column * GRID_STEP_M, south + row * GRID_STEP_M);
  const reachedWithin = (minutes: number) =>
    cells.filter((cell) => cell.minutes !== null && cell.minutes <= minutes).length;

  const seen = new Set<string>();
  const neighbourhoods = input.places.flatMap((place) => {
    const position = project.toLocal(place);
    const index = nearest(position.east, position.north);
    const key = place.name.toLocaleLowerCase('ro');
    if (index === null || seen.has(key)) return [];
    seen.add(key);
    return [
      {
        name: place.name,
        place: place.place,
        location: [Number(place.lng.toFixed(6)), Number(place.lat.toFixed(6))],
        minutes: cells[index]?.minutes ?? null,
      },
    ];
  });
  const neighbourhoodsWithin = (minutes: number) =>
    neighbourhoods.filter((place) => place.minutes !== null && place.minutes <= minutes).length;

  return {
    minutes: REACH_HEADLINE_MINUTES,
    share_pct: percent(reachedWithin(REACH_HEADLINE_MINUTES), cells.length),
    neighbourhoods_reached: neighbourhoodsWithin(REACH_HEADLINE_MINUTES),
    neighbourhoods_total: neighbourhoods.length,
    shares: REACH_MINUTES.map((minutes) => ({
      minutes,
      share_pct: percent(reachedWithin(minutes), cells.length),
      neighbourhoods_reached: neighbourhoodsWithin(minutes),
    })),
    isochrones: REACH_MINUTES.map((minutes) => ({
      minutes,
      geometry: toGeometry(
        contourPolygons(grid, minutes, {
          simplify: SIMPLIFY_M / GRID_STEP_M,
          minArea: MIN_RING_AREA_M2 / (GRID_STEP_M * GRID_STEP_M),
        }),
        gridToLngLat,
      ),
    })),
    neighbourhoods,
  };
}
