import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { WorkerError } from '../../lib/errors.ts';
import { readCsvRecords } from './csv.ts';
import { nonEmpty } from './gtfs.ts';
import type { LngLat } from './transit.types.ts';

const run = promisify(execFile);

const R5_MAX_MEMORY = '60%';

export const ROUTE_SCRIPT = fileURLToPath(new URL('../../../transit/route.py', import.meta.url));

type RoutingPoint = LngLat & { id: string };

export type RoutingJob = {
  osmPbf: string;
  gtfs: string[];
  date: string;
  windowStart: string;
  windowMinutes: number;
  detailDeparture: string;
  walkSpeedKmh: number;
  maxMinutes: number;
  maxRides: number;
  stopWalkMaxMinutes: number;
  origins: RoutingPoint[];
  stops: RoutingPoint[];
  destinations: RoutingPoint[];
  withMatrix: boolean;
  withItineraries: boolean;
  workDir: string;
};

export type DestinationTiming = {
  transitMinutes: number | null;
  walkMinutes: number | null;
};

export type Itinerary = {
  walkMinutes: number;
  waitMinutes: number;
  rideMinutes: number;
  transfers: number;
  routeId: string | null;
};

export type RoutingResult = {
  walkToStops: Map<string, { stopId: string; minutes: number }[]>;
  destinations: Map<string, Map<string, DestinationTiming>>;
  itineraries: Map<string, Map<string, Itinerary>>;
  matrixPath: string | null;
};

export type RoutingRunner = (command: string, args: readonly string[]) => Promise<void>;

async function defaultRunner(command: string, args: readonly string[]): Promise<void> {
  await run(command, [...args], { maxBuffer: 64 * 1024 * 1024 });
}

function pointsCsv(points: readonly RoutingPoint[]): string {
  return `id,lng,lat\n${points.map((point) => `${point.id},${point.lng},${point.lat}`).join('\n')}\n`;
}

function optionalNumber(value: string | undefined): number | null {
  if (value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function nested<T>(map: Map<string, Map<string, T>>, outer: string): Map<string, T> {
  const existing = map.get(outer);
  if (existing) return existing;
  const created = new Map<string, T>();
  map.set(outer, created);
  return created;
}

async function readRoutingOutputs(outputDir: string, withMatrix: boolean): Promise<RoutingResult> {
  const walkToStops = new Map<string, { stopId: string; minutes: number }[]>();
  for await (const row of readCsvRecords(join(outputDir, 'walk_stops.csv'))) {
    const minutes = optionalNumber(row.minutes);
    if (!row.origin_id || !row.stop_id || minutes === null) continue;
    const list = walkToStops.get(row.origin_id) ?? [];
    list.push({ stopId: row.stop_id, minutes });
    walkToStops.set(row.origin_id, list);
  }
  const destinations = new Map<string, Map<string, DestinationTiming>>();
  for await (const row of readCsvRecords(join(outputDir, 'destinations.csv'))) {
    if (!row.origin_id || !row.destination_id) continue;
    nested(destinations, row.origin_id).set(row.destination_id, {
      transitMinutes: optionalNumber(row.transit_minutes),
      walkMinutes: optionalNumber(row.walk_minutes),
    });
  }
  const itineraries = new Map<string, Map<string, Itinerary>>();
  for await (const row of readCsvRecords(join(outputDir, 'itineraries.csv'))) {
    if (!row.origin_id || !row.destination_id) continue;
    nested(itineraries, row.origin_id).set(row.destination_id, {
      walkMinutes: optionalNumber(row.walk_minutes) ?? 0,
      waitMinutes: optionalNumber(row.wait_minutes) ?? 0,
      rideMinutes: optionalNumber(row.ride_minutes) ?? 0,
      transfers: optionalNumber(row.transfers) ?? 0,
      routeId: nonEmpty(row.route_id),
    });
  }
  return {
    walkToStops,
    destinations,
    itineraries,
    matrixPath: withMatrix ? join(outputDir, 'matrix.bin') : null,
  };
}

export async function runTransitRouting(
  job: RoutingJob,
  runner: RoutingRunner = defaultRunner,
): Promise<RoutingResult> {
  const outputDir = join(job.workDir, 'routing');
  await mkdir(outputDir, { recursive: true });
  const files = {
    origins: join(job.workDir, 'origins.csv'),
    stops: join(job.workDir, 'stops.csv'),
    destinations: join(job.workDir, 'destinations.csv'),
  };
  await writeFile(files.origins, pointsCsv(job.origins), 'utf8');
  await writeFile(files.stops, pointsCsv(job.stops), 'utf8');
  await writeFile(files.destinations, pointsCsv(job.destinations), 'utf8');
  const jobPath = join(job.workDir, 'job.json');
  await writeFile(
    jobPath,
    JSON.stringify({
      osm_pbf: job.osmPbf,
      gtfs: job.gtfs,
      date: job.date,
      window_start: job.windowStart,
      window_minutes: job.windowMinutes,
      detail_departure: job.detailDeparture,
      walk_speed_kmh: job.walkSpeedKmh,
      max_minutes: job.maxMinutes,
      max_rides: job.maxRides,
      stop_walk_max_minutes: job.stopWalkMaxMinutes,
      transport_modes: ['TRAM', 'SUBWAY', 'BUS'],
      origins: files.origins,
      stops: files.stops,
      destinations: files.destinations,
      matrix: job.withMatrix,
      itineraries: job.withItineraries,
      output_dir: outputDir,
      r5py_arguments: ['--max-memory', R5_MAX_MEMORY],
    }),
    'utf8',
  );
  try {
    await runner('python3', [ROUTE_SCRIPT, jobPath]);
  } catch (error) {
    throw new WorkerError('transit_routing_failed', 'The r5py routing job failed', {
      cause: error,
    });
  }
  return readRoutingOutputs(outputDir, job.withMatrix);
}

export async function readMatrixRows(path: string, size: number): Promise<Buffer[]> {
  const data = await readFile(path);
  if (data.length !== size * size * 2) {
    throw new WorkerError('transit_matrix_invalid', 'The travel matrix has the wrong size');
  }
  return Array.from({ length: size }, (_, row) =>
    data.subarray(row * size * 2, (row + 1) * size * 2),
  );
}
