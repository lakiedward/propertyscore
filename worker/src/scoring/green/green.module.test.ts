import { rm } from 'node:fs/promises';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createSql, type Sql } from '../../db/sql.ts';
import { createLogger } from '../../lib/logger.ts';
import { buildSnapshot } from '../../snapshot/build-snapshot.ts';
import { hasOsmium, prepareSourcesDir } from '../../test/osm-fixture.ts';
import { greenModule, scoreGreenCell } from './green.module.ts';

const params = {
  radii_m: [300, 500, 1000],
  near_radius_m: 500,
  wide_radius_m: 1000,
  share_cap: 0.3,
  small_min_ha: 0.5,
  small_full_m: 300,
  small_zero_m: 1200,
  large_min_ha: 5,
  large_full_m: 1000,
  large_zero_m: 3000,
  canopy_cap: 0.25,
  min_polygon_ha: 0.05,
  walk_detour_factor: 1.3,
  weights: { c1: 35, c2: 15, c3: 25, c4: 15, c5: 10 },
};

describe('scoreGreenCell', () => {
  it('turns the measures into the score and an audit trail', () => {
    const row = scoreGreenCell(
      {
        cell_id: 'cell',
        shares: { '300': 0.121, '500': 0.184, '1000': 0.241 },
        nearest_small_id: 'park',
        nearest_small_m: 553.8,
        nearest_large_id: 'park',
        nearest_large_m: 553.8,
      },
      params,
    );

    expect(row.score).toBe(69);
    expect(row.inputs).toMatchObject({
      share: { '500': 0.184 },
      nearest_small: { green_area_id: 'park', walk_m: 720 },
      distance_method: 'straight_line',
      components: { c4: 1, c5: null },
    });
  });
});

const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!databaseUrl || !hasOsmium())('greenModule against the local database', () => {
  let sql: Sql;
  let sourcesDir = '';
  let previousReady: string | undefined;
  let hadSibiuCells = false;
  let snapshotId = '';

  beforeAll(async () => {
    sql = createSql(databaseUrl ?? '');
    sourcesDir = await prepareSourcesDir('sibiu.osm', '2026-11-01');
    const [ready] = await sql<{ id: string }[]>`
      select id from public.score_snapshots where status = 'ready'
    `;
    previousReady = ready?.id;
    const [cells] = await sql<{ has_cells: boolean }[]>`
      select exists (
        select 1 from private.grid_cells g
        join public.cities c on c.id = g.city_id
        where c.slug = 'sibiu'
      ) as has_cells
    `;
    hadSibiuCells = cells?.has_cells ?? false;

    const result = await buildSnapshot({
      sql,
      modules: [greenModule],
      period: '2026-11-01',
      citySlugs: ['sibiu'],
      scoreKeys: [],
      sourcesDir,
      osmExtractUrl: 'https://example.test/romania.osm.pbf',
      logger: createLogger('error', () => undefined),
    });
    snapshotId = result.snapshotId;
  });

  afterAll(async () => {
    if (snapshotId) await sql`delete from public.score_snapshots where id = ${snapshotId}`;
    if (!hadSibiuCells) {
      await sql`
        delete from private.grid_cells
        where city_id = (select id from public.cities where slug = 'sibiu')
      `;
    }
    if (previousReady) {
      await sql`update public.score_snapshots set status = 'ready' where id = ${previousReady}`;
    }
    await sql.end({ timeout: 5 });
    await rm(sourcesDir, { recursive: true, force: true });
  });

  it('merges the public green areas with their names and amenities', async () => {
    const areas = await sql<
      { name: string | null; kind: string; area_ha: string; amenities: string[] }[]
    >`
      select name, kind::text, area_ha::text, amenities
      from private.green_areas
      where snapshot_id = ${snapshotId}
      order by area_ha desc
    `;

    expect(areas).toHaveLength(2);
    expect(areas[0]).toMatchObject({
      name: 'Parcul Sub Arini',
      kind: 'park',
      amenities: ['playground'],
    });
    expect(Number(areas[0]?.area_ha)).toBeCloseTo(12, 0);
    expect(areas[1]).toMatchObject({ name: 'Scuarul Cetății', amenities: [] });
  });

  it('scores the cells next to the park higher than the ones far away', async () => {
    const [near] = await sql<{ score: number; walk_m: number; share: number }[]>`
      select
        (cs.categories ->> 'green')::integer as score,
        (cs.inputs #>> '{green,nearest_large,walk_m}')::integer as walk_m,
        (cs.inputs #>> '{green,share,500}')::float8 as share
      from private.cell_scores cs
      join private.grid_cells g on g.id = cs.cell_id
      where cs.snapshot_id = ${snapshotId}
      order by g.center operator(extensions.<->) extensions.st_point(24.1326, 45.80035, 4326)::extensions.geography
      limit 1
    `;
    const [far] = await sql<{ score: number }[]>`
      select (cs.categories ->> 'green')::integer as score
      from private.cell_scores cs
      join private.grid_cells g on g.id = cs.cell_id
      where cs.snapshot_id = ${snapshotId}
      order by g.center operator(extensions.<->) extensions.st_point(24.08, 45.79, 4326)::extensions.geography
      limit 1
    `;

    expect(near?.walk_m).toBe(0);
    expect(near?.share).toBeGreaterThan(0.1);
    expect(near?.score).toBeGreaterThan(60);
    expect(far?.score).toBe(0);
  });

  it('writes the city green figures and the OSM date', async () => {
    const [snapshot] = await sql<{ green: Record<string, unknown>; osm: string }[]>`
      select stats #> '{green,sibiu}' as green, source_dates ->> 'osm' as osm
      from public.score_snapshots
      where id = ${snapshotId}
    `;

    expect(snapshot?.osm).toBe('2026-10-31');
    expect(snapshot?.green).toMatchObject({ near_radius_m: 500, cells_no_data: 0 });
    expect(Number(snapshot?.green.avg_share_near)).toBeGreaterThan(0);
  });
});
