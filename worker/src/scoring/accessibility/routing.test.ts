import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { readMatrixRows, ROUTE_SCRIPT, runTransitRouting, type RoutingJob } from './routing.ts';

const directories: string[] = [];

afterAll(async () => {
  await Promise.all(directories.map((path) => rm(path, { recursive: true, force: true })));
});

async function job(): Promise<RoutingJob> {
  const workDir = await mkdtemp(join(tmpdir(), 'routing-'));
  directories.push(workDir);
  return {
    osmPbf: '/data/sibiu.osm.pbf',
    gtfs: ['/data/tursib.zip'],
    date: '2026-11-03',
    windowStart: '07:45',
    windowMinutes: 30,
    detailDeparture: '08:00',
    walkSpeedKmh: 4.5,
    maxMinutes: 90,
    maxRides: 3,
    stopWalkMaxMinutes: 11,
    origins: [
      { id: 'cell-a', lng: 24.15, lat: 45.79 },
      { id: 'cell-b', lng: 24.16, lat: 45.8 },
    ],
    stops: [{ id: 'g0:A', lng: 24.151, lat: 45.791 }],
    destinations: [{ id: 'center', lng: 24.152, lat: 45.797 }],
    withMatrix: true,
    withItineraries: true,
    workDir,
  };
}

describe('runTransitRouting', () => {
  it('hands the job to the r5py script and reads its outputs back', async () => {
    const input = await job();
    const calls: string[][] = [];
    const result = await runTransitRouting(input, async (command, args) => {
      calls.push([command, ...args]);
      const config = JSON.parse(await readFile(args[1] ?? '', 'utf8')) as Record<string, unknown>;
      expect(config).toMatchObject({
        osm_pbf: '/data/sibiu.osm.pbf',
        walk_speed_kmh: 4.5,
        max_rides: 3,
        transport_modes: ['TRAM', 'SUBWAY', 'BUS'],
        matrix: true,
        itineraries: true,
        r5py_arguments: ['--max-memory', '60%'],
      });
      expect(await readFile(String(config.origins), 'utf8')).toBe(
        'id,lng,lat\ncell-a,24.15,45.79\ncell-b,24.16,45.8\n',
      );
      const output = String(config.output_dir);
      await writeFile(
        join(output, 'walk_stops.csv'),
        'origin_id,stop_id,minutes\ncell-a,g0:A,1.5\n',
      );
      await writeFile(
        join(output, 'destinations.csv'),
        'origin_id,destination_id,transit_minutes,walk_minutes\ncell-a,center,12.5,30\ncell-b,center,,\n',
      );
      await writeFile(
        join(output, 'itineraries.csv'),
        'origin_id,destination_id,walk_minutes,wait_minutes,ride_minutes,transfers,route_id\ncell-a,center,4,3,5.5,0,T1\n',
      );
      await writeFile(join(output, 'matrix.bin'), Buffer.from([0, 0, 0, 17, 255, 255, 0, 0]));
    });

    expect(calls).toEqual([['python3', ROUTE_SCRIPT, join(input.workDir, 'job.json')]]);
    expect(result.walkToStops.get('cell-a')).toEqual([{ stopId: 'g0:A', minutes: 1.5 }]);
    expect(result.destinations.get('cell-a')?.get('center')).toEqual({
      transitMinutes: 12.5,
      walkMinutes: 30,
    });
    expect(result.destinations.get('cell-b')?.get('center')).toEqual({
      transitMinutes: null,
      walkMinutes: null,
    });
    expect(result.itineraries.get('cell-a')?.get('center')).toEqual({
      walkMinutes: 4,
      waitMinutes: 3,
      rideMinutes: 5.5,
      transfers: 0,
      routeId: 'T1',
    });
    const rows = await readMatrixRows(result.matrixPath ?? '', 2);
    expect(rows.map((row) => [...row])).toEqual([
      [0, 0, 0, 17],
      [255, 255, 0, 0],
    ]);
  });

  it('reports a failed job with its own code', async () => {
    await expect(
      runTransitRouting(await job(), () => Promise.reject(new Error('java missing'))),
    ).rejects.toMatchObject({ code: 'transit_routing_failed' });
  });

  it('refuses a matrix of the wrong size', async () => {
    const input = await job();
    const path = join(input.workDir, 'matrix.bin');
    await writeFile(path, Buffer.from([0, 0, 0]));
    await expect(readMatrixRows(path, 2)).rejects.toMatchObject({ code: 'transit_matrix_invalid' });
  });
});
