import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createSql, type Sql } from '../../db/sql.ts';
import { cityBoundingBox } from '../../sources/osm.ts';
import {
  clearCityTransit,
  insertCellTransit,
  insertFeed,
  insertNetwork,
  insertTravelMatrix,
  listCellNeighbours,
  listCityCells,
  readRoutingBundle,
  saveRoutingBundle,
  transitBoundingBox,
  writeCityStats,
} from './accessibility.db.ts';
import { stopRouteLinks } from './transit-network.ts';
import type { TransitNetwork } from './transit.types.ts';

const databaseUrl = process.env.DATABASE_URL;

const network: TransitNetwork = {
  stops: [
    {
      key: 'g0:A',
      name: 'Piața Mare',
      lng: 24.152,
      lat: 45.797,
      modes: ['bus'],
      wheelchairBoarding: 1,
    },
    {
      key: 'g0:B',
      name: 'Gara',
      lng: 24.16,
      lat: 45.8,
      modes: ['bus', 'trolleybus'],
      wheelchairBoarding: null,
    },
  ],
  routes: [
    {
      key: 'g0:5',
      ref: '5',
      mode: 'trolleybus',
      longName: 'Gară – Piața Mare',
      colour: '#E30613',
      textColour: '#FFFFFF',
      lines: [
        [
          { lng: 24.152, lat: 45.797 },
          { lng: 24.156, lat: 45.7985 },
          { lng: 24.16, lat: 45.8 },
        ],
      ],
    },
  ],
  patterns: [
    {
      routeKey: 'g0:5',
      directionLabel: 'Gară',
      stopKeys: ['g0:A', 'g0:B'],
      stopDeparturesPerHour: [6, 6],
    },
  ],
};

describe.skipIf(!databaseUrl)('accessibility storage against the local database', () => {
  let sql: Sql;
  let snapshotId = '';
  let cityId = '';
  let hadCells = false;

  beforeAll(async () => {
    sql = createSql(databaseUrl ?? '');
    const [city] = await sql<{ id: string; has_cells: boolean }[]>`
      select c.id, exists (select 1 from private.grid_cells g where g.city_id = c.id) as has_cells
      from public.cities c
      where c.slug = 'craiova'
    `;
    cityId = city?.id ?? '';
    hadCells = city?.has_cells ?? false;
    await sql`select private.build_grid_cells(${cityId}, 175)`;
    const [snapshot] = await sql<{ id: string }[]>`
      insert into public.score_snapshots (scoring_version_id, period, status, finished_at, error_code)
      select id, '2026-11-01', 'failed', now(), 'test_fixture'
      from public.scoring_versions
      where kind = 'online' and is_active
      returning id
    `;
    snapshotId = snapshot?.id ?? '';
    await sql`select private.seed_cell_scores(${snapshotId}, ${cityId})`;
  });

  afterAll(async () => {
    await sql`delete from public.score_snapshots where id = ${snapshotId}`;
    if (!hadCells) await sql`delete from private.grid_cells where city_id = ${cityId}`;
    await sql.end({ timeout: 5 });
  });

  it('stores the network, the cell results and the travel matrix, and clears them again', async () => {
    await insertFeed(sql, snapshotId, cityId, {
      source: 'gtfs',
      operator: 'Tursib',
      sourceUrl: 'https://example.org/tursib.zip',
      license: null,
      feedVersion: '2026-10',
      validFrom: '2026-10-01',
      validTo: '2026-12-31',
      referenceDate: '2026-11-03',
      sha256: 'a'.repeat(64),
      status: 'used',
      errorCode: null,
    });
    await insertNetwork(sql, snapshotId, cityId, network, stopRouteLinks(network));

    const [route] = await sql<{ type: string; colour: string }[]>`
      select extensions.geometrytype(geometry::extensions.geometry) as type, colour
      from private.transit_routes where snapshot_id = ${snapshotId} and route_key = 'g0:5'
    `;
    expect(route).toEqual({ type: 'MULTILINESTRING', colour: '#E30613' });
    const [link] = await sql<{ departures: string }[]>`
      select peak_departures_per_hour::text as departures from private.transit_stop_routes
      where snapshot_id = ${snapshotId} and stop_key = 'g0:A'
    `;
    expect(link?.departures).toBe('6.00');

    const cells = await listCityCells(sql, snapshotId, cityId);
    expect(cells.length).toBeGreaterThan(900);
    const first = cells[0];
    const second = cells[1];
    if (!first || !second) throw new Error('Craiova has no cells');

    const neighbours = await listCellNeighbours(sql, snapshotId, cityId, 175);
    expect([...neighbours.values()].every((list) => list.length <= 6)).toBe(true);
    expect(Math.max(...[...neighbours.values()].map((list) => list.length))).toBe(6);

    await insertCellTransit(sql, snapshotId, [
      {
        cellId: first.cellId,
        accessIndex: 5.3968,
        sAccess: 0.45704,
        sTravel: null,
        sCoverage: 0.475,
        stops: [{ stop_key: 'g0:A', walk_min: 2, walk_m: 150 }],
        destinations: [],
        directions: 3,
        dataQuality: 'gtfs',
      },
    ]);
    const [transit] = await sql<{ s_access: string; s_travel: string | null }[]>`
      select s_access::text, s_travel::text from private.cell_transit
      where snapshot_id = ${snapshotId} and cell_id = ${first.cellId}
    `;
    expect(transit).toEqual({ s_access: '0.457', s_travel: null });

    const row = Buffer.alloc(cells.length * 2, 0xff);
    row.writeUInt16BE(0, 0);
    row.writeUInt16BE(23, 2);
    await insertTravelMatrix(sql, snapshotId, cityId, [{ cellId: first.cellId, minutes: row }]);
    const [minutes] = await sql<{ value: number | null }[]>`
      select private.transit_minutes(${snapshotId}, ${first.cellId}, ${second.cellId}) as value
    `;
    expect(minutes?.value).toBe(23);

    await sql`
      update private.cell_scores set categories = categories || '{"accessibility": 61}'
      where snapshot_id = ${snapshotId} and cell_id = ${first.cellId}
    `;
    await writeCityStats(sql, snapshotId, cityId, 'craiova', { data_quality: 'gtfs' });
    const [stats] = await sql<{ value: { avg: number; data_quality: string } }[]>`
      select stats #> '{accessibility,craiova}' as value from public.score_snapshots where id = ${snapshotId}
    `;
    expect(stats?.value).toMatchObject({ avg: 61, data_quality: 'gtfs' });

    await clearCityTransit(sql, snapshotId, cityId);
    const [left] = await sql<{ count: number }[]>`
      select (
        (select count(*) from private.transit_stops where snapshot_id = ${snapshotId})
        + (select count(*) from private.transit_feeds where snapshot_id = ${snapshotId})
        + (select count(*) from private.cell_transit where snapshot_id = ${snapshotId})
        + (select count(*) from private.cell_travel_matrix where snapshot_id = ${snapshotId})
      )::integer as count
    `;
    expect(left?.count).toBe(0);
  });

  it('keeps the network a city was routed on and replaces it on a rerun', async () => {
    expect(await readRoutingBundle(sql, snapshotId, cityId)).toBeNull();
    await saveRoutingBundle(sql, snapshotId, cityId, {
      referenceDate: '2026-11-03',
      osmPbf: Buffer.from('first'),
      gtfsArchives: [Buffer.from('a')],
    });
    await saveRoutingBundle(sql, snapshotId, cityId, {
      referenceDate: '2026-11-04',
      osmPbf: Buffer.from('second'),
      gtfsArchives: [Buffer.from('b'), Buffer.from('c')],
    });

    const bundle = await readRoutingBundle(sql, snapshotId, cityId);
    expect(bundle?.referenceDate).toBe('2026-11-04');
    expect(bundle?.osmPbf.toString()).toBe('second');
    expect(bundle?.gtfsArchives.map((archive) => archive.toString())).toEqual(['b', 'c']);
  });

  it('clips the transit network wide enough to reach every key destination of every city', async () => {
    const cities = await sql<{ id: string; slug: string }[]>`select id, slug from public.cities`;
    for (const city of cities) {
      const box = await transitBoundingBox(sql, city.id);
      const coverage = await cityBoundingBox(sql, city.id);
      expect(box.west).toBeLessThanOrEqual(coverage.west);
      expect(box.north).toBeGreaterThanOrEqual(coverage.north);
      const outside = await sql<{ count: number }[]>`
        select count(*)::int as count
        from private.key_destinations
        where city_id = ${city.id}
          and is_active
          and not extensions.st_contains(
            extensions.st_makeenvelope(${box.west}, ${box.south}, ${box.east}, ${box.north}, 4326),
            location::extensions.geometry
          )
      `;
      expect({ slug: city.slug, outside: outside[0]?.count }).toEqual({
        slug: city.slug,
        outside: 0,
      });
    }
  });
});
