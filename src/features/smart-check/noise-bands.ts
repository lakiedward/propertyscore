import type { LngLat } from '@/components/map/map.config';
import type { ReportResult } from './report.types';

type Noise = NonNullable<ReportResult['sections']['noise']>;
type Heat = NonNullable<Noise['map']['heat']>;
type Rgb = readonly [number, number, number];
type BandStep = readonly [from: number, rgb: Rgb];

export const NOISE_BANDS = [
  [55, [246, 227, 168]],
  [60, [240, 184, 119]],
  [65, [224, 127, 85]],
  [70, [184, 67, 43]],
] as const satisfies readonly BandStep[];

export const NOISE_BAND_OPACITY = 0.5;

const PIXEL_M = 4;
const FLOOR_DB = 50;
const SMOOTHING_CELLS = 1;
const EARTH_RADIUS_M = 6_371_008.8;

export type BandRaster = {
  coordinates: [LngLat, LngLat, LngLat, LngLat];
  width: number;
  height: number;
  rgba: Uint8ClampedArray<ArrayBuffer>;
};

function gaussianKernel(sigma: number): Float64Array {
  const radius = Math.ceil(3 * sigma);
  const kernel = new Float64Array(2 * radius + 1);
  let total = 0;
  for (let index = 0; index < kernel.length; index += 1) {
    const offset = index - radius;
    const weight = Math.exp(-(offset * offset) / (2 * sigma * sigma));
    kernel[index] = weight;
    total += weight;
  }
  return kernel.map((weight) => weight / total);
}

function gaussianBlur(
  values: ArrayLike<number>,
  columns: number,
  rows: number,
  sigma: number,
): Float64Array {
  const kernel = gaussianKernel(sigma);
  const radius = (kernel.length - 1) / 2;
  const clamp = (value: number, upper: number) => Math.min(upper, Math.max(0, value));
  const horizontal = new Float64Array(columns * rows);
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      let sum = 0;
      for (let k = -radius; k <= radius; k += 1) {
        sum +=
          (kernel[k + radius] ?? 0) * (values[row * columns + clamp(column + k, columns - 1)] ?? 0);
      }
      horizontal[row * columns + column] = sum;
    }
  }
  const result = new Float64Array(columns * rows);
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      let sum = 0;
      for (let k = -radius; k <= radius; k += 1) {
        sum +=
          (kernel[k + radius] ?? 0) *
          (horizontal[clamp(row + k, rows - 1) * columns + column] ?? 0);
      }
      result[row * columns + column] = sum;
    }
  }
  return result;
}

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

export function noiseBandRaster(heat: Heat): BandRaster {
  const { center, columns, rows, step_m: cellM } = heat;
  const northPerDegree = (Math.PI / 180) * EARTH_RADIUS_M;
  const eastPerDegree = northPerDegree * Math.cos((center[1] * Math.PI) / 180);
  const smooth = gaussianBlur(
    heat.levels.map((level) => Math.max(level, FLOOR_DB)),
    columns,
    rows,
    SMOOTHING_CELLS,
  );
  const halfWidthM = (columns * cellM) / 2;
  const halfHeightM = (rows * cellM) / 2;
  const width = Math.round((2 * halfWidthM) / PIXEL_M);
  const height = Math.round((2 * halfHeightM) / PIXEL_M);
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let row = 0; row < height; row += 1) {
    const y = ((row + 0.5) * PIXEL_M) / cellM - 0.5;
    for (let column = 0; column < width; column += 1) {
      const x = ((column + 0.5) * PIXEL_M) / cellM - 0.5;
      const level = sampleBilinear(smooth, columns, rows, x, y);
      const band = NOISE_BANDS.findLast((step) => level >= step[0]);
      if (band === undefined) continue;
      const offset = (row * width + column) * 4;
      rgba[offset] = band[1][0];
      rgba[offset + 1] = band[1][1];
      rgba[offset + 2] = band[1][2];
      rgba[offset + 3] = 255;
    }
  }
  const toPosition = (east: number, north: number): LngLat => [
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

export function bandRasterUrl(raster: BandRaster): string | null {
  const canvas = document.createElement('canvas');
  canvas.width = raster.width;
  canvas.height = raster.height;
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.putImageData(new ImageData(raster.rgba, raster.width, raster.height), 0, 0);
  return canvas.toDataURL('image/png');
}

export function bandSwatch(from: number): string {
  const step = NOISE_BANDS.find((band) => band[0] === from);
  const [red, green, blue] = step?.[1] ?? [0, 0, 0];
  return `rgb(${String(red)} ${String(green)} ${String(blue)})`;
}
