import { execFileSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { extractOsmFeatures, osmSourceRef, parseGeoJsonSeqLine, readOsmFeatures } from './osm.ts';

function hasOsmium(): boolean {
  try {
    execFileSync('osmium', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

describe('parseGeoJsonSeqLine', () => {
  it('reads a record-separated feature and keeps only string tags', () => {
    const line = `\u001e${JSON.stringify({
      type: 'Feature',
      id: 'w10',
      geometry: { type: 'Polygon', coordinates: [] },
      properties: { leisure: 'park', name: 'Parcul Rozelor', '@version': 1 },
    })}`;
    expect(parseGeoJsonSeqLine(line)).toEqual({
      id: 'w10',
      geometry: { type: 'Polygon', coordinates: [] },
      properties: { leisure: 'park', name: 'Parcul Rozelor' },
    });
  });

  it('skips blank lines and records without an id or geometry', () => {
    expect(parseGeoJsonSeqLine('')).toBeNull();
    expect(parseGeoJsonSeqLine(JSON.stringify({ type: 'Feature', properties: {} }))).toBeNull();
  });
});

describe('osmSourceRef', () => {
  it('turns osmium ids into stable references', () => {
    expect(osmSourceRef('n5')).toBe('osm:node/5');
    expect(osmSourceRef('w10')).toBe('osm:way/10');
    expect(osmSourceRef('r7')).toBe('osm:relation/7');
    expect(osmSourceRef('a20')).toBe('osm:way/10');
    expect(osmSourceRef('a15')).toBe('osm:relation/7');
  });
});

describe.skipIf(!hasOsmium())('extractOsmFeatures', () => {
  const workDirs: string[] = [];

  afterAll(async () => {
    await Promise.all(workDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it('clips to the city box, keeps the filtered tags and exports areas', async () => {
    const workDir = await mkdtemp(join(tmpdir(), 'osm-test-'));
    workDirs.push(workDir);

    const exported = await extractOsmFeatures({
      extractPath: join(import.meta.dirname, 'fixtures', 'parks.osm'),
      bbox: { west: 21.2, south: 45.7, east: 21.3, north: 45.8 },
      filters: ['nwr/leisure'],
      geometryTypes: ['polygon'],
      workDir,
      name: 'timisoara-green',
    });

    const features = [];
    for await (const feature of readOsmFeatures(exported)) features.push(feature);

    expect(features).toHaveLength(1);
    expect(features[0]).toMatchObject({
      id: 'a20',
      geometry: { type: 'MultiPolygon' },
      properties: { leisure: 'park', name: 'Parcul Rozelor' },
    });
  });
});
