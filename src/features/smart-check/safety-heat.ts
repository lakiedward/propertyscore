import type { LngLat } from '@/components/map/map.config';
import type { ReportResult } from './report.types';
import type { SafetyWhen } from './safety.utils';

type Safety = NonNullable<ReportResult['sections']['safety']>;
type Rgb = readonly [number, number, number];
type HeatStop = readonly [score: number, rgb: Rgb];

const SAFETY_HEAT_RAMP = [
  [30, [226, 146, 120]],
  [47, [235, 196, 96]],
  [62, [236, 232, 210]],
  [77, [136, 192, 155]],
  [92, [46, 125, 85]],
] as const satisfies readonly HeatStop[];

export const SAFETY_HEAT_OPACITY = 1;

const HALF_WIDTH_M = 3600;
const HALF_HEIGHT_M = 2600;
const STEP_M = 40;
const SPREAD_PER_CELL = 0.9;
const CUTOFF_SPREADS = 3;
const EDGE_WEIGHT_FROM = 0.35;
const EDGE_WEIGHT_TO = 1.1;
const EARTH_RADIUS_M = 6_371_008.8;

export type HeatRaster = {
  coordinates: [LngLat, LngLat, LngLat, LngLat];
  width: number;
  height: number;
  rgba: Uint8ClampedArray<ArrayBuffer>;
};

export function heatGradient(): string {
  const first = SAFETY_HEAT_RAMP[0][0];
  const span = (SAFETY_HEAT_RAMP.at(-1)?.[0] ?? 100) - first;
  const stops = SAFETY_HEAT_RAMP.map(
    ([score, [red, green, blue]]) =>
      `rgb(${String(red)} ${String(green)} ${String(blue)}) ${String(Math.round(((score - first) / span) * 100))}%`,
  );
  return `linear-gradient(90deg, ${stops.join(', ')})`;
}

function heatColour(value: number): Rgb {
  const ramp: readonly HeatStop[] = SAFETY_HEAT_RAMP;
  const first = SAFETY_HEAT_RAMP[0];
  const last = SAFETY_HEAT_RAMP[SAFETY_HEAT_RAMP.length - 1] ?? first;
  if (value <= first[0]) return first[1];
  if (value >= last[0]) return last[1];
  const upper = ramp.findIndex((stop) => value <= stop[0]);
  const low = ramp[upper - 1] ?? first;
  const high = ramp[upper] ?? last;
  const share = (value - low[0]) / (high[0] - low[0]);
  const mix = (from: number, to: number) => Math.round(from + (to - from) * share);
  return [mix(low[1][0], high[1][0]), mix(low[1][1], high[1][1]), mix(low[1][2], high[1][2])];
}

export function heatRaster(
  heat: NonNullable<Safety['heat']>,
  center: LngLat,
  when: SafetyWhen,
): HeatRaster {
  const northScale = (Math.PI / 180) * EARTH_RADIUS_M;
  const eastScale = northScale * Math.cos((center[1] * Math.PI) / 180);
  const width = Math.round((2 * HALF_WIDTH_M) / STEP_M);
  const height = Math.round((2 * HALF_HEIGHT_M) / STEP_M);
  const spread = heat.cell_size_m * SPREAD_PER_CELL;
  const cutoff = spread * CUTOFF_SPREADS;
  const index = when === 'day' ? 2 : 3;
  const cells = heat.cells.map((cell) => ({
    x: (cell[0] - center[0]) * eastScale,
    y: (cell[1] - center[1]) * northScale,
    value: index === 2 ? cell[2] : cell[3],
  }));
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let row = 0; row < height; row += 1) {
    const y = HALF_HEIGHT_M - (row + 0.5) * STEP_M;
    for (let column = 0; column < width; column += 1) {
      const x = -HALF_WIDTH_M + (column + 0.5) * STEP_M;
      let weights = 0;
      let total = 0;
      for (const cell of cells) {
        const dx = cell.x - x;
        const dy = cell.y - y;
        if (Math.abs(dx) > cutoff || Math.abs(dy) > cutoff) continue;
        const weight = Math.exp(-(dx * dx + dy * dy) / (2 * spread * spread));
        weights += weight;
        total += weight * cell.value;
      }
      if (weights === 0) continue;
      const edge = Math.min(
        1,
        Math.max(0, (weights - EDGE_WEIGHT_FROM) / (EDGE_WEIGHT_TO - EDGE_WEIGHT_FROM)),
      );
      const value = total / weights;
      const [red, green, blue] = heatColour(value);
      const strength = Math.min(0.68, 0.4 + (0.3 * Math.abs(value - 62)) / 30);
      const offset = (row * width + column) * 4;
      rgba[offset] = red;
      rgba[offset + 1] = green;
      rgba[offset + 2] = blue;
      rgba[offset + 3] = Math.round(255 * edge * strength);
    }
  }
  const at = (east: number, north: number): LngLat => [
    Number((center[0] + east / eastScale).toFixed(6)),
    Number((center[1] + north / northScale).toFixed(6)),
  ];
  const right = (width * STEP_M) / 2;
  const top = (height * STEP_M) / 2;
  return {
    coordinates: [at(-right, top), at(right, top), at(right, -top), at(-right, -top)],
    width,
    height,
    rgba,
  };
}

export function rasterDataUrl(raster: HeatRaster): string | null {
  const canvas = document.createElement('canvas');
  canvas.width = raster.width;
  canvas.height = raster.height;
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.putImageData(new ImageData(raster.rgba, raster.width, raster.height), 0, 0);
  return canvas.toDataURL('image/png');
}
