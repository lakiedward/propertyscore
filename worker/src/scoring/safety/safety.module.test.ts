import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createSql, type Sql } from '../../db/sql.ts';
import { createLogger } from '../../lib/logger.ts';
import { listCoveredCities } from '../../snapshot/snapshot.db.ts';
import { safetyModule } from './safety.module.ts';

function hasOsmium(): boolean {
  try {
    execFileSync('osmium', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const databaseUrl = process.env.DATABASE_URL;
const silentLogger = createLogger('error', () => undefined);

type CellRow = {
  safety: number | null;
  inputs: Record<string, unknown>;
  layers: { day: number; night: number; by_type: Record<string, { count: number }> } | null;
  distance_m: number;
};

describe.skipIf(!databaseUrl || !hasOsmium())('safetyModule against the local database', () => {
  let sql: Sql;
  let sourcesDir: string;
  let hadCells = false;
  const created: string[] = [];

  beforeAll(async () => {
    sql = createSql(databaseUrl ?? '');
    sourcesDir = await mkdtemp(join(tmpdir(), 'safety-test-'));
    await mkdir(join(sourcesDir, 'osm'), { recursive: true });
    execFileSync('osmium', [
      'cat',
      join(import.meta.dirname, 'fixtures', 'safety.osm'),
      '--output-header=osmosis_replication_timestamp=2026-10-31T20:21:02Z',
      '--output',
      join(sourcesDir, 'osm', 'romania-2026-11.osm.pbf'),
    ]);
    const [cells] = await sql<{ has_cells: boolean }[]>`
      select exists (
        select 1 from private.grid_cells g
        join public.cities c on c.id = g.city_id
        where c.slug = 'timisoara'
      ) as has_cells
    `;
    hadCells = cells?.has_cells ?? false;
  });

  afterAll(async () => {
    if (created.length > 0) {
      await sql`delete from public.score_snapshots where id in ${sql(created)}`;
    }
    if (!hadCells) {
      await sql`
        delete from private.grid_cells
        where city_id = (select id from public.cities where slug = 'timisoara')
      `;
    }
    await sql.end({ timeout: 5 });
    await rm(sourcesDir, { recursive: true, force: true });
  });

  it('imports the elements, scores every cell by day and night and records the city figures', async () => {
    const [snapshot] = await sql<{ id: string }[]>`
      insert into public.score_snapshots (scoring_version_id, period, status, finished_at)
      select id, '2026-11-01', 'superseded', now()
      from public.scoring_versions
      where kind = 'online' and label = 'v1'
      returning id
    `;
    const snapshotId = snapshot?.id ?? '';
    created.push(snapshotId);
    const cities = await listCoveredCities(sql, ['timisoara']);
    const [timisoara] = cities;
    await sql`select private.build_grid_cells(${timisoara?.id ?? ''}, 175)`;
    await sql`select private.seed_cell_scores(${snapshotId}, ${timisoara?.id ?? ''})`;
    const [version] = await sql<{ params: Record<string, unknown> }[]>`
      select params from public.scoring_versions where kind = 'online' and label = 'v1'
    `;

    const result = await safetyModule.run({
      sql,
      snapshotId,
      period: '2026-11-01',
      cellSizeM: 175,
      cities,
      params: version?.params.safety,
      sourcesDir,
      osmExtract: { url: 'https://example.test/romania.osm.pbf', apiKey: null },
      router: null,
      logger: silentLogger,
    });
    expect(result).toEqual({ sourceDates: { osm: '2026-10-31' } });

    const features = await sql<{ feature_type: string; night_state: string; kind: string }[]>`
      select feature_type, night_state, extensions.geometrytype(geometry) as kind
      from private.safety_features
      where snapshot_id = ${snapshotId}
      order by feature_type, night_state, kind
    `;
    expect(features.map((row) => [row.feature_type, row.night_state, row.kind])).toEqual([
      ['bar', 'unknown', 'POINT'],
      ['isolated_passage', 'unknown', 'LINESTRING'],
      ['lighting', 'unknown', 'LINESTRING'],
      ['lighting', 'unknown', 'POINT'],
      ['nonstop', 'open', 'POINT'],
      ['police', 'unknown', 'POINT'],
      ['shop', 'closed', 'POINT'],
    ]);

    const cells = await sql<CellRow[]>`
      select
        (cs.categories ->> 'safety')::int as safety,
        cs.inputs -> 'safety' as inputs,
        cs.safety_layers as layers,
        extensions.st_distance(g.center, extensions.st_point(21.2257, 45.7537, 4326)::extensions.geography) as distance_m
      from private.cell_scores cs
      join private.grid_cells g on g.id = cs.cell_id
      where cs.snapshot_id = ${snapshotId}
      order by distance_m
    `;
    expect(cells.every((cell) => cell.safety !== null)).toBe(true);
    const [centre] = cells;
    const far = cells.at(-1);
    expect(centre?.layers?.by_type.police?.count).toBe(1);
    expect(centre?.safety).toBeGreaterThan(far?.safety ?? 100);
    expect(far).toMatchObject({ safety: 50, layers: { day: 50, night: 50 } });
    expect(centre?.inputs).toMatchObject({ distance_method: 'straight_line', excluded_types: [] });

    const [stats] = await sql<
      {
        source_dates: Record<string, string>;
        city: Record<string, unknown>;
        calibration: Record<string, unknown>;
      }[]
    >`
      select stats -> 'safety' -> 'timisoara' as city, stats -> 'safety' -> 'calibration' as calibration
      from public.score_snapshots
      where id = ${snapshotId}
    `;
    expect(stats?.city).toMatchObject({
      features: { police: 1, lighting: 2, shop: 1, nonstop: 1, bar: 1, isolated_passage: 1 },
      excluded_types: [],
      lighting_coverage_compared_with: ['timisoara'],
    });
    expect(stats?.city.street_km).toBeCloseTo(0.2, 1);
    const livedIn = cells.filter(
      (cell) =>
        (cell.layers?.by_type.shop?.count ?? 0) + (cell.layers?.by_type.transit_stop?.count ?? 0) >
        0,
    ).length;
    expect(livedIn).toBeGreaterThan(0);
    expect(stats?.calibration).toMatchObject({
      k: 7,
      lived_in_types: ['shop', 'transit_stop'],
      cells: livedIn,
    });
  });
});
