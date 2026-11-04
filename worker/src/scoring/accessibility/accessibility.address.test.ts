import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import type { Sql } from '../../db/sql.ts';
import { createLogger } from '../../lib/logger.ts';
import { planTripsFromAddress } from './accessibility.address.ts';
import { TEST_PARAMS } from './test-params.ts';

vi.mock('./accessibility.db.ts', () => ({
  readRoutingBundle: vi.fn((_sql: Sql, snapshotId: string) =>
    Promise.resolve(
      snapshotId === 'with-bundle'
        ? {
            referenceDate: '2026-11-03',
            osmPbf: Buffer.from('pbf'),
            gtfsArchives: [Buffer.from('zip')],
          }
        : null,
    ),
  ),
}));

const logger = createLogger('error', () => undefined);

function input(snapshotId: string) {
  return {
    sql: {} as Sql,
    logger,
    snapshotId,
    cityId: 'city',
    address: { lng: 21.2253, lat: 45.754 },
    destinations: [{ id: 'gara', lng: 21.207, lat: 45.751 }],
    params: TEST_PARAMS,
  };
}

describe('planTripsFromAddress', () => {
  it('routes from the address on the network the snapshot saved', async () => {
    const trips = await planTripsFromAddress({
      ...input('with-bundle'),
      runner: async (_command, args) => {
        const job = JSON.parse(await readFile(args[1] ?? '', 'utf8')) as Record<string, unknown>;
        expect(job).toMatchObject({ date: '2026-11-03', matrix: false, itineraries: true });
        expect(await readFile(String(job.osm_pbf), 'utf8')).toBe('pbf');
        const output = String(job.output_dir);
        await writeFile(join(output, 'walk_stops.csv'), 'origin_id,stop_id,minutes\n');
        await writeFile(
          join(output, 'destinations.csv'),
          'origin_id,destination_id,transit_minutes,walk_minutes\n',
        );
        await writeFile(
          join(output, 'itineraries.csv'),
          'origin_id,destination_id,walk_minutes,wait_minutes,ride_minutes,transfers,route_id\naddress,gara,6.7,1.1,3.7,0,r18\n',
        );
      },
    });

    expect(trips.get('gara')).toEqual({
      walkMinutes: 6.7,
      waitMinutes: 1.1,
      rideMinutes: 3.7,
      transfers: 0,
      routeId: 'r18',
    });
  });

  it('returns no trips when the snapshot saved no network', async () => {
    const runner = vi.fn();
    expect((await planTripsFromAddress({ ...input('without-bundle'), runner })).size).toBe(0);
    expect(runner).not.toHaveBeenCalled();
  });

  it('keeps the report going when routing fails', async () => {
    const trips = await planTripsFromAddress({
      ...input('with-bundle'),
      runner: () => Promise.reject(new Error('java missing')),
    });
    expect(trips.size).toBe(0);
  });
});
