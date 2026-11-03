import { execFile } from 'node:child_process';
import { access, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { WorkerError } from '../../lib/errors.ts';
import { readCsvRecords } from './csv.ts';
import { centroid, groupStops, type StopPoint } from './transit-network.ts';
import type {
  LngLat,
  TransitMode,
  TransitNetwork,
  TransitPattern,
  TransitRoute,
  TransitStop,
} from './transit.types.ts';

const run = promisify(execFile);

export type FeedInfo = {
  version: string | null;
  validFrom: string | null;
  validTo: string | null;
};

type WeeklyService = { days: boolean[]; start: string; end: string };

export type ServiceCalendar = {
  weekly: Map<string, WeeklyService>;
  exceptions: Map<string, Map<string, boolean>>;
};

export type PeakWindow = { startSeconds: number; endSeconds: number };

export async function unzipGtfs(zipPath: string, directory: string): Promise<string> {
  await rm(directory, { recursive: true, force: true });
  await mkdir(directory, { recursive: true });
  try {
    await run('unzip', ['-o', '-q', '-j', zipPath, '*.txt', '-d', directory]);
  } catch (error) {
    throw new WorkerError('gtfs_unzip_failed', 'The GTFS archive could not be unpacked', {
      cause: error,
    });
  }
  return directory;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function* records(directory: string, file: string): AsyncGenerator<Record<string, string>> {
  const path = join(directory, file);
  if (!(await exists(path))) return;
  yield* readCsvRecords(path);
}

export function nonEmpty(value: string | undefined): string | null {
  return value === undefined || value === '' ? null : value;
}

export function gtfsDate(value: string): string | null {
  const match = /^(\d{4})(\d{2})(\d{2})$/.exec(value);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

export function gtfsSeconds(value: string): number | null {
  const match = /^(\d{1,3}):([0-5]\d):([0-5]\d)$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}

export function clockSeconds(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return (hours ?? 0) * 3600 + (minutes ?? 0) * 60;
}

export function gtfsMode(routeType: string): TransitMode | null {
  const type = Number(routeType);
  if (!Number.isInteger(type)) return null;
  if (type === 0 || (type >= 900 && type <= 906)) return 'tram';
  if (type === 1 || (type >= 400 && type <= 405)) return 'subway';
  if (type === 11 || type === 800) return 'trolleybus';
  if (type === 3 || (type >= 700 && type <= 716)) return 'bus';
  return null;
}

export function gtfsColour(value: string): string | null {
  return /^[0-9a-fA-F]{6}$/.test(value) ? `#${value.toUpperCase()}` : null;
}

export async function readFeedInfo(directory: string): Promise<FeedInfo> {
  for await (const row of records(directory, 'feed_info.txt')) {
    return {
      version: nonEmpty(row.feed_version),
      validFrom: gtfsDate(row.feed_start_date ?? ''),
      validTo: gtfsDate(row.feed_end_date ?? ''),
    };
  }
  return { version: null, validFrom: null, validTo: null };
}

export async function readServiceCalendar(directory: string): Promise<ServiceCalendar> {
  const weekly = new Map<string, WeeklyService>();
  for await (const row of records(directory, 'calendar.txt')) {
    const start = gtfsDate(row.start_date ?? '');
    const end = gtfsDate(row.end_date ?? '');
    if (!row.service_id || !start || !end) continue;
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(
      (day) => row[day] === '1',
    );
    weekly.set(row.service_id, { days, start, end });
  }
  const exceptions = new Map<string, Map<string, boolean>>();
  for await (const row of records(directory, 'calendar_dates.txt')) {
    const date = gtfsDate(row.date ?? '');
    if (!row.service_id || !date) continue;
    const day = exceptions.get(date) ?? new Map<string, boolean>();
    day.set(row.service_id, row.exception_type === '1');
    exceptions.set(date, day);
  }
  return { weekly, exceptions };
}

export function activeServices(calendar: ServiceCalendar, date: string): Set<string> {
  const weekday = (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;
  const active = new Set<string>();
  for (const [id, service] of calendar.weekly) {
    if (service.days[weekday] && date >= service.start && date <= service.end) active.add(id);
  }
  for (const [id, isAdded] of calendar.exceptions.get(date) ?? []) {
    if (isAdded) active.add(id);
    else active.delete(id);
  }
  return active;
}

export function calendarRange(calendar: ServiceCalendar): { from: string; to: string } | null {
  const dates = [
    ...[...calendar.weekly.values()].flatMap((service) => [service.start, service.end]),
    ...[...calendar.exceptions.entries()]
      .filter(([, services]) => [...services.values()].some(Boolean))
      .map(([date]) => date),
  ].sort();
  const from = dates[0];
  const to = dates[dates.length - 1];
  return from && to ? { from, to } : null;
}

type RawStop = StopPoint & { parent: string | null; wheelchair: number | null };
type TripInfo = { routeId: string; headsign: string; directionId: string; shapeId: string };
type StopTime = { sequence: number; stopId: string; departure: number };
type Frequency = { start: number; end: number; headway: number };

async function readStops(directory: string): Promise<Map<string, RawStop>> {
  const stops = new Map<string, RawStop>();
  for await (const row of records(directory, 'stops.txt')) {
    const lat = Number(row.stop_lat);
    const lng = Number(row.stop_lon);
    if (!row.stop_id || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const locationType = row.location_type ?? '';
    if (locationType !== '' && locationType !== '0' && locationType !== '1') continue;
    const wheelchair = Number(row.wheelchair_boarding);
    stops.set(row.stop_id, {
      id: row.stop_id,
      name: nonEmpty(row.stop_name),
      lng,
      lat,
      parent: locationType === '1' ? null : nonEmpty(row.parent_station),
      wheelchair: row.wheelchair_boarding && wheelchair >= 0 && wheelchair <= 2 ? wheelchair : null,
    });
  }
  return stops;
}

async function readRoutes(
  directory: string,
): Promise<Map<string, Omit<TransitRoute, 'key' | 'lines'>>> {
  const routes = new Map<string, Omit<TransitRoute, 'key' | 'lines'>>();
  for await (const row of records(directory, 'routes.txt')) {
    const mode = gtfsMode(row.route_type ?? '');
    if (!row.route_id || !mode) continue;
    routes.set(row.route_id, {
      ref: nonEmpty(row.route_short_name),
      mode,
      longName: nonEmpty(row.route_long_name),
      colour: gtfsColour(row.route_color ?? ''),
      textColour: gtfsColour(row.route_text_color ?? ''),
    });
  }
  return routes;
}

function mostCommon(values: readonly string[]): string | null {
  const counts = new Map<string, number>();
  for (const value of values) if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
  let best: string | null = null;
  let bestCount = 0;
  for (const [value, count] of counts) {
    if (count > bestCount || (count === bestCount && best !== null && value < best)) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}

export async function buildGtfsNetwork(options: {
  directory: string;
  feedKey: string;
  date: string;
  peak: PeakWindow;
}): Promise<TransitNetwork> {
  const { directory, feedKey, peak } = options;
  const calendar = await readServiceCalendar(directory);
  const services = activeServices(calendar, options.date);
  const rawStops = await readStops(directory);
  const routeInfo = await readRoutes(directory);

  const trips = new Map<string, TripInfo>();
  for await (const row of records(directory, 'trips.txt')) {
    if (!row.trip_id || !row.route_id || !services.has(row.service_id ?? '')) continue;
    if (!routeInfo.has(row.route_id)) continue;
    trips.set(row.trip_id, {
      routeId: row.route_id,
      headsign: row.trip_headsign ?? '',
      directionId: row.direction_id ?? '',
      shapeId: row.shape_id ?? '',
    });
  }

  const frequencies = new Map<string, Frequency[]>();
  for await (const row of records(directory, 'frequencies.txt')) {
    const start = gtfsSeconds(row.start_time ?? '');
    const end = gtfsSeconds(row.end_time ?? '');
    const headway = Number(row.headway_secs);
    if (!row.trip_id || !trips.has(row.trip_id) || start === null || end === null) continue;
    if (!(headway > 0)) continue;
    const list = frequencies.get(row.trip_id) ?? [];
    list.push({ start, end, headway });
    frequencies.set(row.trip_id, list);
  }

  const stopTimes = new Map<string, StopTime[]>();
  for await (const row of records(directory, 'stop_times.txt')) {
    if (!row.trip_id || !trips.has(row.trip_id) || !row.stop_id) continue;
    const departure = gtfsSeconds(row.departure_time ?? '') ?? gtfsSeconds(row.arrival_time ?? '');
    const sequence = Number(row.stop_sequence);
    if (departure === null || !Number.isFinite(sequence)) continue;
    const list = stopTimes.get(row.trip_id) ?? [];
    list.push({ sequence, stopId: row.stop_id, departure });
    stopTimes.set(row.trip_id, list);
  }

  const servedStopIds = new Set<string>();
  for (const times of stopTimes.values()) for (const time of times) servedStopIds.add(time.stopId);
  const leaderOf = (id: string): string => rawStops.get(id)?.parent ?? id;
  const leaders = [...new Set([...servedStopIds].filter((id) => rawStops.has(id)).map(leaderOf))]
    .map((id) => rawStops.get(id))
    .filter((stop): stop is RawStop => stop !== undefined);
  const groupOfLeader = groupStops(leaders);
  const stopKeyOf = (id: string): string | null => {
    if (!rawStops.has(id)) return null;
    const leader = leaderOf(id);
    return `${feedKey}:${groupOfLeader.get(leader) ?? leader}`;
  };

  const headsigns = new Map<string, string[]>();
  for (const trip of trips.values()) {
    const id = `${trip.routeId}\u0000${trip.directionId}`;
    const list = headsigns.get(id) ?? [];
    list.push(trip.headsign);
    headsigns.set(id, list);
  }

  const peakHours = (peak.endSeconds - peak.startSeconds) / 3600;
  const patterns = new Map<string, TransitPattern & { counts: number[] }>();
  const shapesOfRoute = new Map<string, Set<string>>();
  const modesOfStop = new Map<string, Set<TransitMode>>();

  for (const [tripId, times] of stopTimes) {
    const trip = trips.get(tripId);
    const route = trip ? routeInfo.get(trip.routeId) : undefined;
    if (!trip || !route || times.length < 2) continue;
    times.sort((a, b) => a.sequence - b.sequence);
    const sequence: { key: string; offset: number }[] = [];
    const first = times[0]?.departure ?? 0;
    for (const time of times) {
      const key = stopKeyOf(time.stopId);
      if (!key || sequence[sequence.length - 1]?.key === key) continue;
      sequence.push({ key, offset: time.departure - first });
    }
    if (sequence.length < 2) continue;

    const routeKey = `${feedKey}:${trip.routeId}`;
    const lastStop = rawStops.get(times[times.length - 1]?.stopId ?? '');
    const directionLabel =
      mostCommon(headsigns.get(`${trip.routeId}\u0000${trip.directionId}`) ?? []) ??
      lastStop?.name ??
      (trip.directionId || '0');
    const patternId = `${routeKey}\u0000${directionLabel}\u0000${sequence.map((s) => s.key).join('>')}`;
    const pattern = patterns.get(patternId) ?? {
      routeKey,
      directionLabel,
      stopKeys: sequence.map((stop) => stop.key),
      stopDeparturesPerHour: [],
      counts: sequence.map(() => 0),
    };
    const starts = frequencies.get(tripId)?.flatMap((frequency) => {
      const list: number[] = [];
      for (let start = frequency.start; start < frequency.end; start += frequency.headway) {
        list.push(start);
      }
      return list;
    }) ?? [first];
    for (const start of starts) {
      sequence.forEach((stop, position) => {
        const departure = (start + stop.offset) % 86_400;
        if (departure >= peak.startSeconds && departure < peak.endSeconds) {
          pattern.counts[position] = (pattern.counts[position] ?? 0) + 1;
        }
      });
    }
    patterns.set(patternId, pattern);

    if (trip.shapeId) {
      const shapes = shapesOfRoute.get(routeKey) ?? new Set<string>();
      shapes.add(trip.shapeId);
      shapesOfRoute.set(routeKey, shapes);
    }
    for (const stop of sequence) {
      const modes = modesOfStop.get(stop.key) ?? new Set<TransitMode>();
      modes.add(route.mode);
      modesOfStop.set(stop.key, modes);
    }
  }

  const wantedShapes = new Set([...shapesOfRoute.values()].flatMap((shapes) => [...shapes]));
  const shapePoints = new Map<string, { sequence: number; point: LngLat }[]>();
  for await (const row of records(directory, 'shapes.txt')) {
    if (!row.shape_id || !wantedShapes.has(row.shape_id)) continue;
    const lat = Number(row.shape_pt_lat);
    const lng = Number(row.shape_pt_lon);
    const sequence = Number(row.shape_pt_sequence);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(sequence)) continue;
    const list = shapePoints.get(row.shape_id) ?? [];
    list.push({ sequence, point: { lng, lat } });
    shapePoints.set(row.shape_id, list);
  }

  const members = new Map<string, RawStop[]>();
  for (const id of servedStopIds) {
    const key = stopKeyOf(id);
    const stop = rawStops.get(id);
    if (!key || !stop) continue;
    const list = members.get(key) ?? [];
    list.push(stop);
    members.set(key, list);
  }

  const stops: TransitStop[] = [];
  for (const [key, list] of members) {
    const modes = modesOfStop.get(key);
    if (!modes) continue;
    const leader = rawStops.get(key.slice(feedKey.length + 1));
    const wheelchair = list.map((stop) => stop.wheelchair).filter((value) => value !== null);
    stops.push({
      key,
      name: leader?.name ?? list[0]?.name ?? null,
      ...centroid(list),
      modes: [...modes].sort(),
      wheelchairBoarding:
        wheelchair.length === 0 ? null : wheelchair.includes(1) ? 1 : (wheelchair[0] ?? null),
    });
  }

  const stopByKey = new Map(stops.map((stop) => [stop.key, stop]));
  const finalPatterns = [...patterns.values()].map(({ counts, ...pattern }) => ({
    ...pattern,
    stopDeparturesPerHour: counts.map((count) => Math.round((100 * count) / peakHours) / 100),
  }));

  const routes: TransitRoute[] = [];
  for (const [routeId, info] of routeInfo) {
    const key = `${feedKey}:${routeId}`;
    const routePatterns = finalPatterns.filter((pattern) => pattern.routeKey === key);
    if (routePatterns.length === 0) continue;
    const fromShapes = [...(shapesOfRoute.get(key) ?? [])]
      .map((id) =>
        (shapePoints.get(id) ?? [])
          .sort((a, b) => a.sequence - b.sequence)
          .map((entry) => entry.point),
      )
      .filter((line) => line.length >= 2);
    const lines =
      fromShapes.length > 0
        ? fromShapes
        : routePatterns.map((pattern) =>
            pattern.stopKeys
              .map((stopKey) => stopByKey.get(stopKey))
              .filter((stop): stop is TransitStop => stop !== undefined)
              .map((stop) => ({ lng: stop.lng, lat: stop.lat })),
          );
    routes.push({ key, ...info, lines });
  }

  return { stops, routes, patterns: finalPatterns };
}
