type Position = [number, number];

export type HeatCell = readonly [longitude: number, latitude: number, value: number];

export type HeatStop = readonly [score: number, rgb: readonly [number, number, number]];

export type HeatRaster = {
  coordinates: [Position, Position, Position, Position];
  width: number;
  height: number;
  rgba: number[];
};

export type HeatGridOptions = {
  center: Position;
  halfWidthM: number;
  halfHeightM: number;
  stepM: number;
  cellSizeM: number;
  ramp: readonly HeatStop[];
  opacity: number;
};

const EARTH_RADIUS_M = 6_371_008.8;
const SPREAD_PER_CELL = 0.9;
const CUTOFF_SPREADS = 3;
const EDGE_WEIGHT_FROM = 0.35;
const EDGE_WEIGHT_TO = 1.1;

export function heatColour(ramp: readonly HeatStop[], value: number): [number, number, number] {
  const first = ramp[0];
  const last = ramp.at(-1);
  if (!first || !last) return [255, 255, 255];
  if (value <= first[0]) return [...first[1]];
  if (value >= last[0]) return [...last[1]];
  const upper = ramp.findIndex((stop) => value <= stop[0]);
  const low = ramp[upper - 1] ?? first;
  const high = ramp[upper] ?? last;
  const share = (value - low[0]) / (high[0] - low[0]);
  const mix = (from: number, to: number) => Math.round(from + (to - from) * share);
  return [mix(low[1][0], high[1][0]), mix(low[1][1], high[1][1]), mix(low[1][2], high[1][2])];
}

function metresPerDegree(latitude: number): { east: number; north: number } {
  const north = (Math.PI / 180) * EARTH_RADIUS_M;
  return { east: north * Math.cos((latitude * Math.PI) / 180), north };
}

export function heatRaster(cells: readonly HeatCell[], options: HeatGridOptions): HeatRaster {
  const { center, halfWidthM, halfHeightM, stepM } = options;
  const scale = metresPerDegree(center[1]);
  const width = Math.round((2 * halfWidthM) / stepM);
  const height = Math.round((2 * halfHeightM) / stepM);
  const spread = options.cellSizeM * SPREAD_PER_CELL;
  const cutoff = spread * CUTOFF_SPREADS;
  const local = cells.map(([longitude, latitude, value]) => ({
    x: (longitude - center[0]) * scale.east,
    y: (latitude - center[1]) * scale.north,
    value,
  }));
  const rgba: number[] = [];
  for (let row = 0; row < height; row += 1) {
    const y = halfHeightM - (row + 0.5) * stepM;
    for (let column = 0; column < width; column += 1) {
      const x = -halfWidthM + (column + 0.5) * stepM;
      let weights = 0;
      let total = 0;
      for (const cell of local) {
        const dx = cell.x - x;
        const dy = cell.y - y;
        if (Math.abs(dx) > cutoff || Math.abs(dy) > cutoff) continue;
        const weight = Math.exp(-(dx * dx + dy * dy) / (2 * spread * spread));
        weights += weight;
        total += weight * cell.value;
      }
      if (weights === 0) {
        rgba.push(0, 0, 0, 0);
        continue;
      }
      const edge = Math.min(
        1,
        Math.max(0, (weights - EDGE_WEIGHT_FROM) / (EDGE_WEIGHT_TO - EDGE_WEIGHT_FROM)),
      );
      rgba.push(
        ...heatColour(options.ramp, total / weights),
        Math.round(255 * options.opacity * edge),
      );
    }
  }
  const toPosition = (east: number, north: number): Position => [
    Number((center[0] + east / scale.east).toFixed(6)),
    Number((center[1] + north / scale.north).toFixed(6)),
  ];
  const right = (width * stepM) / 2;
  const top = (height * stepM) / 2;
  return {
    coordinates: [
      toPosition(-right, top),
      toPosition(right, top),
      toPosition(right, -top),
      toPosition(-right, -top),
    ],
    width,
    height,
    rgba,
  };
}
