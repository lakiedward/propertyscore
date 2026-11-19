import { assessPoint, type NoiseCoverage, type NoiseSample } from './noise.formula.ts';
import type { NoiseKind, NoiseParams } from './noise.params.ts';

export type Metres = [number, number];

export type GridLine = { kind: NoiseKind; sourceClass: string; points: Metres[] };

export type GridBuilding = { ring: Metres[] };

export type NoiseGridSpec = {
  columns: number;
  rows: number;
  stepM: number;
};

const METRES_PER_DEGREE = 111_320;
const BUILDING_BUCKET_M = 100;

export function toMetres(origin: { lon: number; lat: number }, lon: number, lat: number): Metres {
  return [
    (lon - origin.lon) * METRES_PER_DEGREE * Math.cos((origin.lat * Math.PI) / 180),
    (lat - origin.lat) * METRES_PER_DEGREE,
  ];
}

export function nearestOnSegment(
  point: Metres,
  from: Metres,
  to: Metres,
): { distance: number; at: Metres } {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const lengthSquared = dx * dx + dy * dy;
  const share =
    lengthSquared === 0
      ? 0
      : Math.min(
          1,
          Math.max(0, ((point[0] - from[0]) * dx + (point[1] - from[1]) * dy) / lengthSquared),
        );
  const at: Metres = [from[0] + share * dx, from[1] + share * dy];
  return { distance: Math.hypot(point[0] - at[0], point[1] - at[1]), at };
}

function orientation(a: Metres, b: Metres, c: Metres): number {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function segmentsCross(a: Metres, b: Metres, c: Metres, d: Metres): boolean {
  const first = orientation(a, b, c);
  const second = orientation(a, b, d);
  const third = orientation(c, d, a);
  const fourth = orientation(c, d, b);
  return first * second <= 0 && third * fourth <= 0;
}

export function insideRing(point: Metres, ring: readonly Metres[]): boolean {
  let inside = false;
  for (
    let index = 0, previous = ring.length - 1;
    index < ring.length;
    previous = index, index += 1
  ) {
    const current = ring[index];
    const before = ring[previous];
    if (!current || !before) continue;
    const crosses =
      current[1] > point[1] !== before[1] > point[1] &&
      point[0] <
        ((before[0] - current[0]) * (point[1] - current[1])) / (before[1] - current[1]) +
          current[0];
    if (crosses) inside = !inside;
  }
  return inside;
}

type IndexedBuilding = { ring: Metres[]; box: [number, number, number, number] };

export type BuildingIndex = { buckets: Map<string, IndexedBuilding[]> };

export function indexBuildings(buildings: readonly GridBuilding[]): BuildingIndex {
  const buckets = new Map<string, IndexedBuilding[]>();
  for (const building of buildings) {
    const xs = building.ring.map((point) => point[0]);
    const ys = building.ring.map((point) => point[1]);
    if (xs.length === 0) continue;
    const box: [number, number, number, number] = [
      Math.min(...xs),
      Math.min(...ys),
      Math.max(...xs),
      Math.max(...ys),
    ];
    const indexed = { ring: building.ring, box };
    for (
      let x = Math.floor(box[0] / BUILDING_BUCKET_M);
      x <= Math.floor(box[2] / BUILDING_BUCKET_M);
      x += 1
    ) {
      for (
        let y = Math.floor(box[1] / BUILDING_BUCKET_M);
        y <= Math.floor(box[3] / BUILDING_BUCKET_M);
        y += 1
      ) {
        const key = `${String(x)}:${String(y)}`;
        buckets.set(key, [...(buckets.get(key) ?? []), indexed]);
      }
    }
  }
  return { buckets };
}

export function buildingsCrossed(index: BuildingIndex, from: Metres, to: Metres): number {
  const seen = new Set<IndexedBuilding>();
  const minX = Math.min(from[0], to[0]);
  const maxX = Math.max(from[0], to[0]);
  const minY = Math.min(from[1], to[1]);
  const maxY = Math.max(from[1], to[1]);
  for (
    let x = Math.floor(minX / BUILDING_BUCKET_M);
    x <= Math.floor(maxX / BUILDING_BUCKET_M);
    x += 1
  ) {
    for (
      let y = Math.floor(minY / BUILDING_BUCKET_M);
      y <= Math.floor(maxY / BUILDING_BUCKET_M);
      y += 1
    ) {
      for (const building of index.buckets.get(`${String(x)}:${String(y)}`) ?? [])
        seen.add(building);
    }
  }
  let count = 0;
  for (const building of seen) {
    const [boxMinX, boxMinY, boxMaxX, boxMaxY] = building.box;
    if (boxMaxX < minX || boxMinX > maxX || boxMaxY < minY || boxMinY > maxY) continue;
    if (insideRing(from, building.ring)) continue;
    let touches = insideRing(to, building.ring);
    for (let edge = 1; !touches && edge < building.ring.length; edge += 1) {
      const start = building.ring[edge - 1];
      const end = building.ring[edge];
      if (start && end && segmentsCross(from, to, start, end)) touches = true;
    }
    if (touches) count += 1;
  }
  return count;
}

type ClassGroup = { kind: NoiseKind; sourceClass: string; segments: [Metres, Metres][] };

export function groupLines(lines: readonly GridLine[]): ClassGroup[] {
  const groups = new Map<string, ClassGroup>();
  for (const line of lines) {
    const key = `${line.kind}:${line.sourceClass}`;
    const group = groups.get(key) ?? {
      kind: line.kind,
      sourceClass: line.sourceClass,
      segments: [],
    };
    for (let index = 1; index < line.points.length; index += 1) {
      const from = line.points[index - 1];
      const to = line.points[index];
      if (from && to) group.segments.push([from, to]);
    }
    groups.set(key, group);
  }
  return [...groups.values()];
}

export function samplesAt(
  point: Metres,
  groups: readonly ClassGroup[],
  buildings: BuildingIndex,
  radiusM: number,
): NoiseSample[] {
  const samples: NoiseSample[] = [];
  for (const group of groups) {
    let best: { distance: number; at: Metres } | null = null;
    for (const [from, to] of group.segments) {
      const candidate = nearestOnSegment(point, from, to);
      if (best === null || candidate.distance < best.distance) best = candidate;
    }
    if (best === null || best.distance > radiusM) continue;
    samples.push({
      measure: 'proxy',
      kind: group.kind,
      sourceClass: group.sourceClass,
      distanceM: Math.round(best.distance),
      buildingsCrossed: buildingsCrossed(buildings, point, best.at),
    });
  }
  return samples;
}

export function noiseLevelGrid(
  input: {
    spec: NoiseGridSpec;
    lines: readonly GridLine[];
    buildings: readonly GridBuilding[];
    coverage: NoiseCoverage;
    firstDrawnDb: number;
  },
  params: NoiseParams,
): number[] {
  const { columns, rows, stepM } = input.spec;
  const groups = groupLines(input.lines);
  const buildings = indexBuildings(input.buildings);
  const levels: number[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const point: Metres = [(column - (columns - 1) / 2) * stepM, ((rows - 1) / 2 - row) * stepM];
      const samples = samplesAt(point, groups, buildings, params.nearest_radius_m);
      const level = assessPoint(samples, input.coverage, params).lden;
      levels.push(level === null || level < input.firstDrawnDb ? 0 : Math.round(level));
    }
  }
  return levels;
}
