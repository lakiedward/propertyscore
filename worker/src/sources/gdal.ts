import { execFile, spawn } from 'node:child_process';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { promisify } from 'node:util';

import { z } from 'zod';

import { WorkerError } from '../lib/errors.ts';

const run = promisify(execFile);

export type GeoPoint = {
  lon: number;
  lat: number;
};

type RasterBand = {
  values: Float32Array;
  noData: number | null;
  metadata: Record<string, string>;
};

export type RasterGrid = {
  width: number;
  height: number;
  originX: number;
  originY: number;
  pixelWidth: number;
  pixelHeight: number;
  bands: RasterBand[];
};

const gdalInfoSchema = z.object({
  size: z.tuple([z.number().int().positive(), z.number().int().positive()]),
  geoTransform: z.tuple([z.number(), z.number(), z.number(), z.number(), z.number(), z.number()]),
  bands: z.array(
    z.object({
      noDataValue: z.union([z.number(), z.string()]).nullish(),
      metadata: z.record(z.string(), z.record(z.string(), z.string())).nullish(),
    }),
  ),
});

type GdalInfo = z.infer<typeof gdalInfoSchema>;

const BUFFER_LIMIT = 256 * 1024 * 1024;

async function gdal(command: string, args: readonly string[]): Promise<string> {
  try {
    const { stdout } = await run(command, [...args], { maxBuffer: BUFFER_LIMIT });
    return stdout;
  } catch (error) {
    throw new WorkerError('gdal_failed', `${command} failed`, { cause: error });
  }
}

function noDataOf(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isNaN(number) ? Number.NaN : number;
}

function parseGdalInfo(json: string): GdalInfo {
  const parsed = gdalInfoSchema.safeParse(JSON.parse(json));
  if (!parsed.success)
    throw new WorkerError('gdal_info_unreadable', 'gdalinfo output is not a raster');
  if (parsed.data.geoTransform[2] !== 0 || parsed.data.geoTransform[4] !== 0) {
    throw new WorkerError('raster_rotated', 'Rotated rasters are not supported');
  }
  return parsed.data;
}

export async function readRaster(path: string, workDir: string): Promise<RasterGrid> {
  const info = parseGdalInfo(await gdal('gdalinfo', ['-json', path]));
  const [width, height] = info.size;
  await mkdir(workDir, { recursive: true });
  const raw = join(workDir, `${basename(path)}.f32`);
  await gdal('gdal_translate', ['-q', '-of', 'ENVI', '-ot', 'Float32', path, raw]);
  try {
    const bytes = await readFile(raw);
    const pixels = width * height;
    if (bytes.byteLength !== pixels * info.bands.length * 4) {
      throw new WorkerError('raster_size_mismatch', 'Raw raster size does not match gdalinfo');
    }
    const all = new Float32Array(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    );
    return {
      width,
      height,
      originX: info.geoTransform[0],
      originY: info.geoTransform[3],
      pixelWidth: info.geoTransform[1],
      pixelHeight: info.geoTransform[5],
      bands: info.bands.map((band, index) => ({
        values: all.subarray(index * pixels, (index + 1) * pixels),
        noData: noDataOf(band.noDataValue),
        metadata: band.metadata?.[''] ?? {},
      })),
    };
  } finally {
    await rm(raw, { force: true });
    await rm(`${raw}.hdr`, { force: true });
    await rm(`${raw}.aux.xml`, { force: true });
  }
}

export function isNoData(value: number, noData: number | null): boolean {
  if (Number.isNaN(value)) return true;
  if (noData === null) return false;
  if (Number.isNaN(noData)) return false;
  return Math.abs(value - noData) <= Math.abs(noData) * 1e-6;
}

export function sampleBilinear(
  grid: Pick<RasterGrid, 'width' | 'height' | 'originX' | 'originY' | 'pixelWidth' | 'pixelHeight'>,
  values: Float32Array,
  point: GeoPoint,
): number | null {
  const x = (point.lon - grid.originX) / grid.pixelWidth - 0.5;
  const y = (point.lat - grid.originY) / grid.pixelHeight - 0.5;
  if (x < 0 || y < 0 || x > grid.width - 1 || y > grid.height - 1) return null;
  const x0 = Math.min(Math.floor(x), grid.width - 2);
  const y0 = Math.min(Math.floor(y), grid.height - 2);
  const dx = x - x0;
  const dy = y - y0;
  const corners = [
    values[y0 * grid.width + x0],
    values[y0 * grid.width + x0 + 1],
    values[(y0 + 1) * grid.width + x0],
    values[(y0 + 1) * grid.width + x0 + 1],
  ];
  if (corners.some((value) => value === undefined || Number.isNaN(value))) return null;
  const [topLeft = 0, topRight = 0, bottomLeft = 0, bottomRight = 0] = corners;
  const top = topLeft + (topRight - topLeft) * dx;
  const bottom = bottomLeft + (bottomRight - bottomLeft) * dx;
  return top + (bottom - top) * dy;
}

export function parseLocationValues(
  stdout: string,
  expected: number,
  noData: number | null,
): (number | null)[] {
  const lines = stdout.split('\n');
  if (lines.at(-1) === '') lines.pop();
  if (lines.length !== expected) {
    throw new WorkerError(
      'gdal_location_mismatch',
      `Expected ${expected} values, got ${lines.length}`,
    );
  }
  return lines.map((line) => {
    const text = line.trim();
    if (text === '') return null;
    const value = Number(text);
    return isNoData(value, noData) ? null : value;
  });
}

export async function sampleRasterAtPoints(
  path: string,
  points: readonly GeoPoint[],
): Promise<(number | null)[]> {
  if (points.length === 0) return [];
  const info = parseGdalInfo(await gdal('gdalinfo', ['-json', path]));
  if (info.bands.length !== 1)
    throw new WorkerError('raster_band_count', 'Expected a single-band raster');
  const noData = noDataOf(info.bands[0]?.noDataValue);
  const input = points.map((point) => `${point.lon} ${point.lat}\n`).join('');
  const stdout = await new Promise<string>((resolve, reject) => {
    const child = spawn('gdallocationinfo', ['-valonly', '-wgs84', path], {
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    const chunks: Buffer[] = [];
    child.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
    child.on('error', (error) => {
      reject(new WorkerError('gdal_failed', 'gdallocationinfo failed', { cause: error }));
    });
    child.on('close', (code) => {
      if (code === 0 || code === 1) resolve(Buffer.concat(chunks).toString('utf8'));
      else reject(new WorkerError('gdal_failed', `gdallocationinfo exited with ${code}`));
    });
    child.stdin.end(input);
  });
  return parseLocationValues(stdout, points.length, noData);
}
