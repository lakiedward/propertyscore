import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createSql, type Sql } from '../../db/sql.ts';
import { cityHazards, hazardAt } from './seismic.db.ts';

const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)('Seismic zones against the local database', () => {
  let sql: Sql;

  beforeAll(() => {
    sql = createSql(databaseUrl ?? '');
  });

  afterAll(async () => {
    await sql.end();
  });

  it('finds the zone of an address and of every city', async () => {
    const address = await hazardAt(sql, {
      longitude: 21.95006,
      latitude: 47.00084,
      code: 'P100-1/2013',
      snapM: 250,
    });
    expect(address).toEqual({ ag_g: 0.1, distance_m: 0 });

    const cities = await cityHazards(sql, 'P100-1/2013');
    expect(cities.map((city) => [city.slug, city.ag_g])).toEqual([
      ['bucuresti', 0.3],
      ['iasi', 0.25],
      ['timisoara', 0.2],
      ['constanta', 0.2],
      ['craiova', 0.2],
      ['sibiu', 0.2],
      ['oradea', 0.15],
      ['targu-mures', 0.15],
      ['cluj-napoca', 0.1],
    ]);
    expect(cities.find((city) => city.slug === 'oradea')?.zone_count).toBe(2);
  });

  it('returns nothing for a point outside every zone', async () => {
    const address = await hazardAt(sql, {
      longitude: 25,
      latitude: 46,
      code: 'P100-1/2013',
      snapM: 250,
    });
    expect(address).toBeNull();
  });
});
