type Point = [number, number];

export type ValueGrid = {
  columns: number;
  rows: number;
  values: ArrayLike<number>;
};

export type ContourPolygon = Point[][];

type Crossing = { key: string; point: Point };

type Segment = readonly [Crossing, Crossing];

function valueAt(grid: ValueGrid, column: number, row: number): number {
  return grid.values[row * grid.columns + column] ?? Infinity;
}

function crossing(
  grid: ValueGrid,
  threshold: number,
  from: Point,
  to: Point,
  key: string,
): Crossing {
  const start = valueAt(grid, from[0], from[1]);
  const end = valueAt(grid, to[0], to[1]);
  const share =
    Number.isFinite(start) && Number.isFinite(end) && end !== start
      ? Math.min(1, Math.max(0, (threshold - start) / (end - start)))
      : Number.isFinite(start)
        ? 0
        : 1;
  return {
    key,
    point: [from[0] + (to[0] - from[0]) * share, from[1] + (to[1] - from[1]) * share],
  };
}

function cellSegments(grid: ValueGrid, threshold: number, column: number, row: number): Segment[] {
  const corners: Point[] = [
    [column, row],
    [column + 1, row],
    [column + 1, row + 1],
    [column, row + 1],
  ];
  const values = corners.map(([c, r]) => valueAt(grid, c, r));
  const inside = values.map((value) => value <= threshold);
  const keys = [
    `h${String(row)}:${String(column)}`,
    `v${String(row)}:${String(column + 1)}`,
    `h${String(row + 1)}:${String(column)}`,
    `v${String(row)}:${String(column)}`,
  ];
  const edges = corners.map((corner, index) => {
    const next = corners[(index + 1) % 4] ?? corner;
    const from = index < 2 ? corner : next;
    const to = index < 2 ? next : corner;
    return inside[index] === inside[(index + 1) % 4]
      ? null
      : crossing(grid, threshold, from, to, keys[index] ?? '');
  });
  const crossed = edges.filter((edge): edge is Crossing => edge !== null);
  const [first, second] = crossed;
  if (crossed.length === 2 && first && second) return [[first, second]];
  const [e0, e1, e2, e3] = edges;
  if (!e0 || !e1 || !e2 || !e3) return [];
  const finite = values.filter((value) => Number.isFinite(value));
  const centreInside =
    finite.length === 4 && finite.reduce((sum, value) => sum + value, 0) / 4 <= threshold;
  return inside[0] !== centreInside
    ? [
        [e3, e0],
        [e1, e2],
      ]
    : [
        [e0, e1],
        [e2, e3],
      ];
}

function chainRings(segments: readonly Segment[]): Point[][] {
  const byKey = new Map<string, number[]>();
  segments.forEach(([start, end], index) => {
    for (const key of [start.key, end.key]) byKey.set(key, [...(byKey.get(key) ?? []), index]);
  });
  const used = new Uint8Array(segments.length);
  const rings: Point[][] = [];
  segments.forEach(([start, end], first) => {
    if (used[first]) return;
    used[first] = 1;
    const ring: Point[] = [start.point, end.point];
    let currentKey = end.key;
    for (;;) {
      const next = (byKey.get(currentKey) ?? []).find((index) => !used[index]);
      const segment = next === undefined ? undefined : segments[next];
      if (next === undefined || !segment) break;
      used[next] = 1;
      const reached = segment[0].key === currentKey ? segment[1] : segment[0];
      currentKey = reached.key;
      if (currentKey === start.key) break;
      ring.push(reached.point);
    }
    if (ring.length >= 3) rings.push(ring);
  });
  return rings;
}

export function signedArea(ring: readonly Point[]): number {
  return (
    ring.reduce((area, [x1, y1], index) => {
      const [x2, y2] = ring[(index + 1) % ring.length] ?? [x1, y1];
      return area + x1 * y2 - x2 * y1;
    }, 0) / 2
  );
}

function contains(ring: readonly Point[], [x, y]: Point): boolean {
  let inside = false;
  ring.forEach(([xi, yi], index) => {
    const [xj, yj] = ring[(index + ring.length - 1) % ring.length] ?? [xi, yi];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  });
  return inside;
}

function perpendicularDistance([x, y]: Point, [x1, y1]: Point, [x2, y2]: Point): number {
  const length = Math.hypot(x2 - x1, y2 - y1);
  if (length === 0) return Math.hypot(x - x1, y - y1);
  return Math.abs((y2 - y1) * x - (x2 - x1) * y + x2 * y1 - y2 * x1) / length;
}

function simplifyLine(points: readonly Point[], tolerance: number): Point[] {
  const first = points[0];
  const last = points.at(-1);
  if (points.length < 3 || !first || !last) return [...points];
  let farthest = 0;
  let split = 0;
  points.forEach((point, index) => {
    if (index === 0 || index === points.length - 1) return;
    const distance = perpendicularDistance(point, first, last);
    if (distance > farthest) {
      farthest = distance;
      split = index;
    }
  });
  if (farthest <= tolerance) return [first, last];
  return [
    ...simplifyLine(points.slice(0, split + 1), tolerance).slice(0, -1),
    ...simplifyLine(points.slice(split), tolerance),
  ];
}

export function simplifyRing(ring: readonly Point[], tolerance: number): Point[] {
  const start = ring[0];
  if (ring.length < 4 || !start) return [...ring];
  const half = Math.floor(ring.length / 2);
  return [
    ...simplifyLine(ring.slice(0, half + 1), tolerance).slice(0, -1),
    ...simplifyLine([...ring.slice(half), start], tolerance).slice(0, -1),
  ];
}

function padded(grid: ValueGrid): ValueGrid {
  const columns = grid.columns + 2;
  const rows = grid.rows + 2;
  const values = new Float64Array(columns * rows).fill(Infinity);
  for (let row = 0; row < grid.rows; row += 1) {
    for (let column = 0; column < grid.columns; column += 1) {
      values[(row + 1) * columns + column + 1] = valueAt(grid, column, row);
    }
  }
  return { columns, rows, values };
}

export function contourPolygons(
  grid: ValueGrid,
  threshold: number,
  options: { simplify: number; minArea: number },
): ContourPolygon[] {
  const frame = padded(grid);
  const segments: Segment[] = [];
  for (let row = 0; row < frame.rows - 1; row += 1) {
    for (let column = 0; column < frame.columns - 1; column += 1) {
      segments.push(...cellSegments(frame, threshold, column, row));
    }
  }
  const rings = chainRings(segments)
    .map((ring) =>
      simplifyRing(
        ring.map(([column, row]): Point => [column - 1, row - 1]),
        options.simplify,
      ),
    )
    .filter((ring) => ring.length >= 3 && Math.abs(signedArea(ring)) >= options.minArea);
  const probe = (ring: readonly Point[]): Point => ring[0] ?? [0, 0];
  const depth = rings.map(
    (ring, index) =>
      rings.filter((other, otherIndex) => otherIndex !== index && contains(other, probe(ring)))
        .length,
  );
  const outers = rings.flatMap((ring, index) =>
    (depth[index] ?? 0) % 2 === 0
      ? [
          {
            ring,
            area: Math.abs(signedArea(ring)),
            rings: [signedArea(ring) < 0 ? [...ring].reverse() : ring],
          },
        ]
      : [],
  );
  rings.forEach((ring, index) => {
    if ((depth[index] ?? 0) % 2 === 0) return;
    const owner = outers
      .filter((outer) => contains(outer.ring, probe(ring)))
      .sort((left, right) => left.area - right.area)[0];
    owner?.rings.push(signedArea(ring) > 0 ? [...ring].reverse() : ring);
  });
  return outers.map((outer) => outer.rings);
}
