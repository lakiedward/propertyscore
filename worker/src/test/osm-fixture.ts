import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export function hasOsmium(): boolean {
  try {
    execFileSync('osmium', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export async function prepareSourcesDir(fixture: string, period: string): Promise<string> {
  const sourcesDir = await mkdtemp(join(tmpdir(), 'propertyscore-sources-'));
  await mkdir(join(sourcesDir, 'osm'));
  execFileSync('osmium', [
    'cat',
    join(import.meta.dirname, '..', 'sources', 'fixtures', fixture),
    '--output-header=osmosis_replication_timestamp=2026-10-31T20:21:02Z',
    '--output',
    join(sourcesDir, 'osm', `romania-${period.slice(0, 7)}.osm.pbf`),
  ]);
  return sourcesDir;
}
