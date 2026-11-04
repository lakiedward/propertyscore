import { execFile } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { promisify } from 'node:util';

import { z } from 'zod';

import type { Sql } from '../db/sql.ts';
import { WorkerError } from '../lib/errors.ts';
import { downloadOnce } from './download.ts';
import { privateSourceHeaders } from './mirror.ts';

const run = promisify(execFile);

export type BoundingBox = {
  west: number;
  south: number;
  east: number;
  north: number;
};

export type OsmGeometryType = 'point' | 'linestring' | 'polygon';

export type OsmFeature = {
  id: string;
  geometry: { type: string; coordinates: unknown };
  properties: Record<string, string>;
};

const RECORD_SEPARATOR = '\u001e';

const featureSchema = z.object({
  id: z.string().min(2),
  geometry: z.object({ type: z.string(), coordinates: z.unknown() }),
  properties: z.record(z.string(), z.unknown()).nullish(),
});

export type OsmExtractSource = {
  url: string;
  apiKey: string | null;
};

export async function downloadOsmExtract(
  source: OsmExtractSource,
  sourcesDir: string,
  period: string,
): Promise<string> {
  return downloadOnce(
    source.url,
    join(sourcesDir, 'osm', `romania-${period.slice(0, 7)}.osm.pbf`),
    { headers: privateSourceHeaders(source.apiKey) },
  );
}

export async function osmExtractDate(extractPath: string, fallback: string): Promise<string> {
  try {
    const { stdout } = await run('osmium', [
      'fileinfo',
      '--get',
      'header.option.osmosis_replication_timestamp',
      extractPath,
    ]);
    const date = /^\d{4}-\d{2}-\d{2}/.exec(stdout.trim());
    return date ? date[0] : fallback;
  } catch (error) {
    throw new WorkerError('osmium_failed', 'osmium fileinfo failed', { cause: error });
  }
}

export async function cityBoundingBox(sql: Sql, cityId: string): Promise<BoundingBox> {
  const [row] = await sql<BoundingBox[]>`
    select
      extensions.st_xmin(box) as west,
      extensions.st_ymin(box) as south,
      extensions.st_xmax(box) as east,
      extensions.st_ymax(box) as north
    from (
      select extensions.st_expand(boundary::extensions.geometry, 0.01) as box
      from public.cities
      where id = ${cityId}
    ) as city
  `;
  if (!row) throw new WorkerError('city_not_found', `City ${cityId} not found`);
  return row;
}

async function osmium(args: readonly string[]): Promise<void> {
  try {
    await run('osmium', [...args], { maxBuffer: 16 * 1024 * 1024 });
  } catch (error) {
    throw new WorkerError('osmium_failed', `osmium ${args[0] ?? ''} failed`, { cause: error });
  }
}

export async function extractOsmFeatures(options: {
  extractPath: string;
  bbox: BoundingBox;
  filters: readonly string[];
  geometryTypes: readonly OsmGeometryType[];
  workDir: string;
  name: string;
}): Promise<string> {
  const { bbox, workDir, name } = options;
  await mkdir(workDir, { recursive: true });
  const clipped = join(workDir, `${name}.clip.osm.pbf`);
  const filtered = join(workDir, `${name}.filtered.osm.pbf`);
  const exported = join(workDir, `${name}.geojsonseq`);
  await osmium([
    'extract',
    '--bbox',
    [bbox.west, bbox.south, bbox.east, bbox.north].join(','),
    '--strategy',
    'smart',
    '--overwrite',
    '--output',
    clipped,
    options.extractPath,
  ]);
  await osmium(['tags-filter', '--overwrite', '--output', filtered, clipped, ...options.filters]);
  await osmium([
    'export',
    '--format',
    'geojsonseq',
    '--add-unique-id',
    'type_id',
    '--geometry-types',
    options.geometryTypes.join(','),
    '--overwrite',
    '--output',
    exported,
    filtered,
  ]);
  return exported;
}

export function parseGeoJsonSeqLine(line: string): OsmFeature | null {
  const text = line.startsWith(RECORD_SEPARATOR) ? line.slice(1) : line;
  if (text.trim() === '') return null;
  const parsed = featureSchema.safeParse(JSON.parse(text));
  if (!parsed.success) return null;
  const properties: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed.data.properties ?? {})) {
    if (typeof value === 'string') properties[key] = value;
  }
  return { id: parsed.data.id, geometry: parsed.data.geometry, properties };
}

export async function* readOsmFeatures(path: string): AsyncGenerator<OsmFeature> {
  const lines = createInterface({ input: createReadStream(path, 'utf8'), crlfDelay: Infinity });
  for await (const line of lines) {
    const feature = parseGeoJsonSeqLine(line);
    if (feature) yield feature;
  }
}

export function osmSourceRef(featureId: string): string {
  const prefix = featureId.charAt(0);
  const number = Number(featureId.slice(1));
  if (!Number.isSafeInteger(number)) return `osm:${featureId}`;
  if (prefix === 'n') return `osm:node/${number}`;
  if (prefix === 'w') return `osm:way/${number}`;
  if (prefix === 'r') return `osm:relation/${number}`;
  if (prefix === 'a') {
    return number % 2 === 0 ? `osm:way/${number / 2}` : `osm:relation/${(number - 1) / 2}`;
  }
  return `osm:${featureId}`;
}
