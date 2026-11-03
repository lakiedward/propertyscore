import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createSql, type Sql } from '../../db/sql.ts';
import { createLogger } from '../../lib/logger.ts';
import { buildSnapshot } from '../../snapshot/build-snapshot.ts';
import type { ScoreModule } from '../score-module.ts';
import { runAir } from './air.module.ts';
import type { AirSources } from './air.sources.ts';

const silentLogger = createLogger('error', () => undefined);

const WINTER = new Set(['12', '01', '02']);
const SPLIT_LONGITUDE = 24.15;

function fakeSources(months: readonly string[]): AirSources {
  const pm25Model = (month: string) => (WINTER.has(month.slice(5, 7)) ? 20 : 8);
  return {
    mapYear: '2022',
    modelField: (pollutant, month) =>
      Promise.resolve(() => (pollutant === 'pm25' ? pm25Model(month) : 15)),
    stations: () =>
      Promise.resolve({
        stations: [
          {
            eoi_code: 'RO9990A',
            station_type: 'background',
            area_type: 'urban',
            longitude: 24.15192,
            latitude: 45.79705,
            active_from: '2010-01-01',
            active_to: null,
          },
          {
            eoi_code: 'RO9991A',
            station_type: 'traffic',
            area_type: 'urban',
            longitude: 24.14,
            latitude: 45.79,
            active_from: '2010-01-01',
            active_to: null,
          },
        ],
        months: months.flatMap((month) => [
          {
            eoiCode: 'RO9990A',
            pollutant: 'pm25' as const,
            month,
            mean: pm25Model(month) * 1.2,
            validDays: 30,
            source: 'eea_e1a' as const,
          },
          {
            eoiCode: 'RO9991A',
            pollutant: 'pm25' as const,
            month,
            mean: 90,
            validDays: 30,
            source: 'eea_e2a' as const,
          },
        ]),
      }),
    mapValues: (pollutant, points) =>
      Promise.resolve(
        pollutant === 'pm25' ? points.map((point) => (point.lon < SPLIT_LONGITUDE ? 8 : 12)) : null,
      ),
  };
}

const testAirModule: ScoreModule = {
  key: 'air',
  run: (context) => runAir(context, (_params, months) => fakeSources(months)),
};

const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)('air module against the local database', () => {
  let sql: Sql;
  let previousReady: string | undefined;
  let hadSibiuCells = false;
  let snapshotId = '';

  beforeAll(async () => {
    sql = createSql(databaseUrl ?? '');
    const [ready] = await sql<
      { id: string }[]
    >`select id from public.score_snapshots where status = 'ready'`;
    previousReady = ready?.id;
    const [cells] = await sql<{ has_cells: boolean }[]>`
      select exists (
        select 1 from private.grid_cells g join public.cities c on c.id = g.city_id where c.slug = 'sibiu'
      ) as has_cells
    `;
    hadSibiuCells = cells?.has_cells ?? false;

    const result = await buildSnapshot({
      sql,
      modules: [testAirModule],
      period: '2026-11-01',
      citySlugs: ['sibiu'],
      scoreKeys: [],
      sourcesDir: '/tmp/propertyscore-sources',
      osmExtractUrl: 'https://example.test/romania.osm.pbf',
      logger: silentLogger,
    });
    snapshotId = result.snapshotId;
  });

  afterAll(async () => {
    if (snapshotId) await sql`delete from public.score_snapshots where id = ${snapshotId}`;
    await sql`delete from private.air_stations where eoi_code in ('RO9990A', 'RO9991A')`;
    if (!hadSibiuCells) {
      await sql`delete from private.grid_cells where city_id = (select id from public.cities where slug = 'sibiu')`;
    }
    if (previousReady)
      await sql`update public.score_snapshots set status = 'ready' where id = ${previousReady}`;
    await sql.end({ timeout: 5 });
  });

  it('stores the stations, assigns them to the city and keeps their monthly means', async () => {
    const stations = await sql<{ eoi_code: string; slug: string | null; months: number }[]>`
      select s.eoi_code, c.slug, (select count(*)::int from private.air_station_months m where m.station_id = s.id) as months
      from private.air_stations s
      left join public.cities c on c.id = s.city_id
      where s.eoi_code in ('RO9990A', 'RO9991A')
      order by s.eoi_code
    `;
    expect(stations).toEqual([
      { eoi_code: 'RO9990A', slug: 'sibiu', months: 12 },
      { eoi_code: 'RO9991A', slug: 'sibiu', months: 12 },
    ]);
  });

  it('calibrates PM2.5 with the urban background station only and leaves NO2 uncalibrated', async () => {
    const calibration = await sql<
      { pollutant: string; factor: string; stations_used: number; status: string }[]
    >`
      select pollutant, factor, stations_used, status
      from private.air_city_calibration
      where snapshot_id = ${snapshotId}
      order by pollutant
    `;
    expect(calibration).toEqual([
      { pollutant: 'no2', factor: '1.000', stations_used: 0, status: 'uncalibrated' },
      { pollutant: 'pm25', factor: '1.200', stations_used: 1, status: 'calibrated' },
    ]);
  });

  it('scores every cell, refined by the 1 km map, and writes the category score', async () => {
    const cells = await sql<
      {
        west: boolean;
        pm25_annual: string;
        months: number;
        spatial_method: string;
        verdict_code: string;
        score_display: number;
        category: number;
      }[]
    >`
      select
        extensions.st_x(g.center::extensions.geometry) < ${SPLIT_LONGITUDE} as west,
        a.pm25_annual,
        cardinality(a.pm25_monthly) as months,
        a.spatial_method,
        a.verdict_code,
        a.score_display,
        (cs.categories ->> 'air')::int as category
      from private.cell_air a
      join private.grid_cells g on g.id = a.cell_id
      join private.cell_scores cs on cs.snapshot_id = a.snapshot_id and cs.cell_id = a.cell_id
      where a.snapshot_id = ${snapshotId}
    `;
    const [cellCount] = await sql<{ count: number }[]>`
      select count(*)::int as count from private.cell_scores where snapshot_id = ${snapshotId}
    `;
    expect(cells).toHaveLength(cellCount?.count ?? -1);
    expect(cells.every((cell) => cell.months === 12 && cell.spatial_method === 'eea_1km')).toBe(
      true,
    );
    expect(cells.every((cell) => cell.category === cell.score_display)).toBe(true);
    const west = cells.filter((cell) => cell.west).map((cell) => Number(cell.pm25_annual));
    const east = cells.filter((cell) => !cell.west).map((cell) => Number(cell.pm25_annual));
    expect(west.length).toBeGreaterThan(0);
    expect(east.length).toBeGreaterThan(0);
    expect(Math.max(...west)).toBeLessThan(Math.min(...east));
    expect(new Set(cells.map((cell) => cell.verdict_code)).size).toBeGreaterThan(0);
  });

  it('records the air sources and the city figures on the snapshot', async () => {
    const [snapshot] = await sql<
      { source_dates: Record<string, string>; air: Record<string, unknown> }[]
    >`
      select source_dates, stats -> 'air' -> 'sibiu' as air from public.score_snapshots where id = ${snapshotId}
    `;
    expect(snapshot?.source_dates).toEqual({
      cams: '2025-11/2026-10',
      eea_stations: '2025-11/2026-10',
      eea_air_map: '2022',
    });
    expect(snapshot?.air).toMatchObject({
      no_data: 0,
      calibration: {
        pm25: { status: 'calibrated', factor: 1.2, stations: 1 },
        no2: { status: 'uncalibrated' },
      },
    });
  });
});
