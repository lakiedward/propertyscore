import { gaussianBlur } from '../lib/gaussian-blur.ts';
import type { HeatRaster } from './heat-grid.ts';

type Position = [number, number];

export type BandStep = readonly [from: number, rgb: readonly [number, number, number]];

export type BandGridOptions = {
  center: Position;
  columns: number;
  rows: number;
  cellM: number;
  levels: readonly number[];
  pixelM: number;
  floor: number;
  bands: readonly BandStep[];
  opacity: number;
};

const EARTH_RADIUS_M = 6_371_008.8;

function sampleBilinear(
  grid: Float64Array,
  columns: number,
  rows: number,
  x: number,
  y: number,
): number {
  const fx = Math.min(columns - 1, Math.max(0, x));
  const fy = Math.min(rows - 1, Math.max(0, y));
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const x1 = Math.min(columns - 1, x0 + 1);
  const y1 = Math.min(rows - 1, y0 + 1);
  const tx = fx - x0;
  const ty = fy - y0;
  const at = (column: number, row: number) => grid[row * columns + column] ?? 0;
  const top = at(x0, y0) * (1 - tx) + at(x1, y0) * tx;
  const bottom = at(x0, y1) * (1 - tx) + at(x1, y1) * tx;
  return top * (1 - ty) + bottom * ty;
}

export function bandRaster(options: BandGridOptions): HeatRaster {
  const { center, columns, rows, cellM, pixelM } = options;
  const northPerDegree = (Math.PI / 180) * EARTH_RADIUS_M;
  const eastPerDegree = northPerDegree * Math.cos((center[1] * Math.PI) / 180);
  const smooth = gaussianBlur(
    options.levels.map((level) => Math.max(level, options.floor)),
    columns,
    rows,
    1,
  );
  const halfWidthM = (columns * cellM) / 2;
  const halfHeightM = (rows * cellM) / 2;
  const width = Math.round((2 * halfWidthM) / pixelM);
  const height = Math.round((2 * halfHeightM) / pixelM);
  const alpha = Math.round(255 * options.opacity);
  const rgba: number[] = [];
  for (let row = 0; row < height; row += 1) {
    const y = ((row + 0.5) * pixelM) / cellM - 0.5;
    for (let column = 0; column < width; column += 1) {
      const x = ((column + 0.5) * pixelM) / cellM - 0.5;
      const level = sampleBilinear(smooth, columns, rows, x, y);
      const band = options.bands.findLast((step) => level >= step[0]);
      if (band === undefined) rgba.push(0, 0, 0, 0);
      else rgba.push(band[1][0], band[1][1], band[1][2], alpha);
    }
  }
  const toPosition = (east: number, north: number): Position => [
    Number((center[0] + east / eastPerDegree).toFixed(6)),
    Number((center[1] + north / northPerDegree).toFixed(6)),
  ];
  return {
    coordinates: [
      toPosition(-halfWidthM, halfHeightM),
      toPosition(halfWidthM, halfHeightM),
      toPosition(halfWidthM, -halfHeightM),
      toPosition(-halfWidthM, -halfHeightM),
    ],
    width,
    height,
    rgba,
  };
}
