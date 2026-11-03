import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createSql, type Sql } from '../../db/sql.ts';
import { computeWalkAccess } from '../../routing/walk-access.ts';
import { computeCarAccess, readWalkAccess } from './health.access.ts';
import {
  countCityPois,
  emergencyPoiRows,
  healthPoiRows,
  insertPois,
  listEmergencyHospitals,
} from './health.db.ts';
import type { HealthPoi } from './health.sources.ts';

const databaseUrl = process.env.DATABASE_URL;

function pharmacy(sourceRef: string, lng: number, lat: number, isAlwaysOpen: boolean): HealthPoi {
  return {
    sourceRef,
    category: 'health_pharmacy',
    name: sourceRef,
    location: { lng, lat },
    openingHours: isAlwaysOpen ? '24/7' : null,
    isAlwaysOpen: isAlwaysOpen ? true : null,
    speciality: null,
    sources: ['osm'],
    cnasContract: false,
    cnasRef: null,
  };
}

describe.skipIf(!databaseUrl)('Health access against the local database', () => {
  let sql: Sql;
  let snapshotId = '';
  let cityId = '';
  let centerCell = '';
  let hadCells = false;

  beforeAll(async () => {
    sql = createSql(databaseUrl ?? '');
    const [city] = await sql<{ id: string }[]>`select id from public.cities where slug = 'sibiu'`;
    cityId = city?.id ?? '';
    const [cells] = await sql<{ has_cells: boolean }[]>`
      select exists (select 1 from private.grid_cells where city_id = ${cityId}) as has_cells
    `;
    hadCells = cells?.has_cells ?? false;
    await sql`select private.build_grid_cells(${cityId}, 175)`;
    const [started] = await sql<{ id: string }[]>`
      select private.start_score_snapshot('2026-11-01') as id
    `;
    snapshotId = started?.id ?? '';
    await sql`select private.seed_cell_scores(${snapshotId}, ${cityId})`;
    const [cell] = await sql<{ id: string }[]>`
      select private.find_grid_cell(extensions.st_point(24.15192, 45.79705, 4326)::extensions.geography, 175) as id
    `;
    centerCell = cell?.id ?? '';
    await sql`
      insert into private.emergency_hospitals (city_id, name, location, level, source_ref, valid_from)
      values (${cityId}, 'Spitalul de test', extensions.st_point(24.1395, 45.7866, 4326)::extensions.geography, 'upu', 'test', '2020-01-01')
    `;
  });

  afterAll(async () => {
    await sql`delete from private.emergency_hospitals where city_id = ${cityId} and source_ref = 'test'`;
    if (snapshotId) await sql`delete from public.score_snapshots where id = ${snapshotId}`;
    if (!hadCells) await sql`delete from private.grid_cells where city_id = ${cityId}`;
    await sql.end({ timeout: 5 });
  });

  it('stores the points once, computes walking access and drives to the emergency unit', async () => {
    const hospitals = await listEmergencyHospitals(sql, cityId, '2026-11-01');
    const rows = [
      ...healthPoiRows(
        [
          pharmacy('osm:node/1', 24.1522, 45.7972, true),
          pharmacy('osm:node/2', 24.156, 45.799, false),
        ],
        'health_pharmacy_night',
      ),
      ...emergencyPoiRows(hospitals, 'health_emergency', 'health_emergency_pediatric'),
    ];
    expect(await insertPois(sql, snapshotId, cityId, rows)).toBe(4);
    expect(await insertPois(sql, snapshotId, cityId, rows)).toBe(0);
    expect(
      await countCityPois(sql, snapshotId, cityId, [
        'health_pharmacy',
        'health_pharmacy_night',
        'health_clinic',
      ]),
    ).toEqual({ health_pharmacy: 2, health_pharmacy_night: 1, health_clinic: 0 });

    await computeWalkAccess({
      sql,
      router: null,
      snapshotId,
      cityId,
      walkSpeedKmh: 4.8,
      walkDetourFactor: 1.3,
      targets: [
        {
          key: 'health_pharmacy',
          poiCategories: ['health_pharmacy'],
          searchRadiusM: 2500,
          maxCandidates: 12,
        },
      ],
    });
    const walk = await readWalkAccess(sql, snapshotId, cityId, ['health_pharmacy']);
    const center = walk.find((record) => record.cellId === centerCell);
    expect(center).toMatchObject({ distanceMethod: 'straight_line', n15: 2 });
    expect(center?.tNearestS).toBeLessThan(300);

    const car = await computeCarAccess({
      sql,
      router: null,
      snapshotId,
      cityId,
      targets: [
        {
          key: 'health_emergency',
          poiCategories: ['health_emergency'],
          searchRadiusM: 30000,
          maxCandidates: 3,
        },
      ],
      carSpeedKmh: 30,
      carDetourFactor: 1.4,
    });
    const emergency = car.get(centerCell)?.get('health_emergency');
    expect(emergency?.seconds).toBeGreaterThan(200);
    expect(emergency?.seconds).toBeLessThan(600);
  });
});
