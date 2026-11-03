import { execFile } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { promisify } from 'node:util';

import { WorkerError } from '../../lib/errors.ts';
import type { BoundingBox } from '../../sources/osm.ts';
import type { AccessibilityParams } from './accessibility.params.ts';
import { distanceMeters } from './geo.ts';
import { centroid, groupStops, type StopPoint } from './transit-network.ts';
import {
  TRANSIT_MODES,
  type LngLat,
  type TransitMode,
  type TransitNetwork,
  type TransitPattern,
  type TransitRoute,
  type TransitStop,
} from './transit.types.ts';

const run = promisify(execFile);

type OplNode = LngLat & { id: string; tags: Record<string, string> };
type OplWay = { id: string; nodeIds: string[] };
type OplMember = { type: 'n' | 'w' | 'r'; id: string; role: string };
type OplRelation = { id: string; tags: Record<string, string>; members: OplMember[] };

export type OplData = {
  nodes: Map<string, OplNode>;
  ways: Map<string, OplWay>;
  relations: OplRelation[];
};

async function osmium(args: readonly string[]): Promise<void> {
  try {
    await run('osmium', [...args], { maxBuffer: 16 * 1024 * 1024 });
  } catch (error) {
    throw new WorkerError('osmium_failed', `osmium ${args[0] ?? ''} failed`, { cause: error });
  }
}

export async function clipOsmExtract(options: {
  extractPath: string;
  bbox: BoundingBox;
  workDir: string;
  name: string;
}): Promise<string> {
  await mkdir(options.workDir, { recursive: true });
  const clipped = join(options.workDir, `${options.name}.osm.pbf`);
  const { bbox } = options;
  await osmium([
    'extract',
    '--bbox',
    [bbox.west, bbox.south, bbox.east, bbox.north].join(','),
    '--strategy',
    'complete_ways',
    '--overwrite',
    '--output',
    clipped,
    options.extractPath,
  ]);
  return clipped;
}

export async function exportTransitOpl(clippedPath: string, workDir: string, name: string) {
  const filtered = join(workDir, `${name}.transit.osm.pbf`);
  const opl = join(workDir, `${name}.transit.opl`);
  await osmium([
    'tags-filter',
    '--overwrite',
    '--output',
    filtered,
    clippedPath,
    `r/route=${TRANSIT_MODES.join(',')}`,
  ]);
  await osmium(['cat', '--overwrite', '--output-format', 'opl', '--output', opl, filtered]);
  return opl;
}

export function unescapeOpl(value: string): string {
  return value.replace(/%([0-9a-fA-F]+)%/g, (_, hex: string) =>
    String.fromCodePoint(Number.parseInt(hex, 16)),
  );
}

function parseTags(value: string): Record<string, string> {
  const tags: Record<string, string> = {};
  if (value === '') return tags;
  for (const pair of value.split(',')) {
    const separator = pair.indexOf('=');
    if (separator <= 0) continue;
    tags[unescapeOpl(pair.slice(0, separator))] = unescapeOpl(pair.slice(separator + 1));
  }
  return tags;
}

function parseMembers(value: string): OplMember[] {
  if (value === '') return [];
  return value.split(',').flatMap((entry) => {
    const separator = entry.indexOf('@');
    const reference = separator === -1 ? entry : entry.slice(0, separator);
    const type = reference.charAt(0);
    if (type !== 'n' && type !== 'w' && type !== 'r') return [];
    return [
      {
        type,
        id: reference.slice(1),
        role: separator === -1 ? '' : unescapeOpl(entry.slice(separator + 1)),
      },
    ];
  });
}

export function parseOplLine(line: string, data: OplData): void {
  const [head, ...fields] = line.trim().split(' ');
  if (!head) return;
  const field = (prefix: string) => fields.find((part) => part.startsWith(prefix))?.slice(1);
  const type = head.charAt(0);
  const id = head.slice(1);
  if (type === 'n') {
    const lng = Number(field('x'));
    const lat = Number(field('y'));
    if (field('x') && field('y') && Number.isFinite(lng) && Number.isFinite(lat)) {
      data.nodes.set(id, { id, lng, lat, tags: parseTags(field('T') ?? '') });
    }
  } else if (type === 'w') {
    const nodes = field('N') ?? '';
    data.ways.set(id, {
      id,
      nodeIds: nodes === '' ? [] : nodes.split(',').map((ref) => ref.slice(1)),
    });
  } else if (type === 'r') {
    data.relations.push({
      id,
      tags: parseTags(field('T') ?? ''),
      members: parseMembers(field('M') ?? ''),
    });
  }
}

export async function readOpl(path: string): Promise<OplData> {
  const data: OplData = { nodes: new Map(), ways: new Map(), relations: [] };
  const lines = createInterface({ input: createReadStream(path, 'utf8'), crlfDelay: Infinity });
  for await (const line of lines) parseOplLine(line, data);
  return data;
}

function isTransitMode(value: string | undefined): value is TransitMode {
  return TRANSIT_MODES.some((mode) => mode === value);
}

function osmColour(value: string | undefined): string | null {
  if (!value) return null;
  const hex = /^#?([0-9a-fA-F]{6})$/.exec(value.trim());
  if (hex?.[1]) return `#${hex[1].toUpperCase()}`;
  const short = /^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/.exec(value.trim());
  return short
    ? `#${short
        .slice(1)
        .map((digit) => digit.repeat(2))
        .join('')
        .toUpperCase()}`
    : null;
}

export function buildOsmNetwork(data: OplData): TransitNetwork {
  const routes = data.relations.filter(
    (relation) => relation.tags.type === 'route' && isTransitMode(relation.tags.route),
  );
  const stopNodesOf = (relation: OplRelation): OplNode[] => {
    const nodeMembers = relation.members.filter((member) => member.type === 'n');
    const platforms = nodeMembers.filter((member) => member.role.startsWith('platform'));
    const chosen =
      platforms.length > 0
        ? platforms
        : nodeMembers.filter((member) => member.role.startsWith('stop'));
    return chosen
      .map((member) => data.nodes.get(member.id))
      .filter((node): node is OplNode => node !== undefined);
  };

  const points = new Map<string, StopPoint>();
  for (const relation of routes) {
    for (const node of stopNodesOf(relation)) {
      points.set(node.id, {
        id: node.id,
        name: node.tags.name ?? null,
        lng: node.lng,
        lat: node.lat,
      });
    }
  }
  const groupOf = groupStops([...points.values()]);
  const keyOf = (nodeId: string) => `osm:n${groupOf.get(nodeId) ?? nodeId}`;

  const members = new Map<string, StopPoint[]>();
  const modesOf = new Map<string, Set<TransitMode>>();
  const patterns: TransitPattern[] = [];
  const transitRoutes: TransitRoute[] = [];

  for (const relation of routes) {
    const mode = relation.tags.route;
    if (!isTransitMode(mode)) continue;
    const routeKey = `osm:r${relation.id}`;
    const stopKeys: string[] = [];
    let lastName: string | null = null;
    for (const node of stopNodesOf(relation)) {
      const key = keyOf(node.id);
      if (stopKeys[stopKeys.length - 1] === key) continue;
      stopKeys.push(key);
      lastName = node.tags.name ?? lastName;
      const list = members.get(key) ?? [];
      const point = points.get(node.id);
      if (point && !list.includes(point)) list.push(point);
      members.set(key, list);
      const modes = modesOf.get(key) ?? new Set<TransitMode>();
      modes.add(mode);
      modesOf.set(key, modes);
    }
    if (stopKeys.length < 2) continue;
    patterns.push({
      routeKey,
      directionLabel: relation.tags.to ?? lastName ?? relation.tags.name ?? relation.id,
      stopKeys,
      stopDeparturesPerHour: null,
    });
    const lines = relation.members
      .filter((member) => member.type === 'w' && member.role === '')
      .map((member) =>
        (data.ways.get(member.id)?.nodeIds ?? [])
          .map((nodeId) => data.nodes.get(nodeId))
          .filter((node): node is OplNode => node !== undefined)
          .map((node) => ({ lng: node.lng, lat: node.lat })),
      )
      .filter((line) => line.length >= 2);
    transitRoutes.push({
      key: routeKey,
      ref: relation.tags.ref ?? null,
      mode,
      longName: relation.tags.name ?? null,
      colour: osmColour(relation.tags.colour),
      textColour: null,
      lines,
    });
  }

  const stops: TransitStop[] = [...members.entries()].map(([key, list]) => {
    const leader = points.get(key.slice('osm:n'.length));
    return {
      key,
      name: leader?.name ?? list.find((point) => point.name)?.name ?? null,
      ...centroid(list),
      modes: [...(modesOf.get(key) ?? [])].sort(),
      wheelchairBoarding: null,
    };
  });

  return { stops, routes: transitRoutes, patterns };
}

function csvField(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function csv(header: readonly string[], rows: readonly (readonly (string | number)[])[]): string {
  return `${[header, ...rows].map((row) => row.map(csvField).join(',')).join('\n')}\n`;
}

function clock(value: number): string {
  const seconds = Math.round(value);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  return [hours, minutes, rest].map((part) => String(part).padStart(2, '0')).join(':');
}

const GTFS_ROUTE_TYPE: Record<TransitMode, number> = { tram: 0, subway: 1, bus: 3, trolleybus: 11 };

export async function writeSyntheticGtfs(options: {
  network: TransitNetwork;
  params: AccessibilityParams;
  validFrom: string;
  validTo: string;
  directory: string;
}): Promise<string> {
  const { network, params, directory } = options;
  await mkdir(directory, { recursive: true });
  const stopByKey = new Map(network.stops.map((stop) => [stop.key, stop]));
  const routeByKey = new Map(network.routes.map((route) => [route.key, route]));
  const date = (value: string) => value.replaceAll('-', '');
  const serviceStart = 5 * 3600;
  const serviceEnd = 23 * 3600;

  const tripRows: string[][] = [];
  const stopTimeRows: (string | number)[][] = [];
  const frequencyRows: (string | number)[][] = [];
  network.patterns.forEach((pattern, index) => {
    const route = routeByKey.get(pattern.routeKey);
    if (!route) return;
    const mode = params.modes[route.mode];
    const speed = (mode.osm_speed_kmh * 1000) / 3600;
    const tripId = `p${index}`;
    tripRows.push([route.key, 'all', tripId, pattern.directionLabel]);
    let offset = 0;
    pattern.stopKeys.forEach((key, position) => {
      const stop = stopByKey.get(key);
      const previous = stopByKey.get(pattern.stopKeys[position - 1] ?? '');
      if (stop && previous) offset += distanceMeters(previous, stop) / speed;
      const time = clock(serviceStart + offset);
      stopTimeRows.push([tripId, time, time, key, position + 1]);
    });
    frequencyRows.push([
      tripId,
      clock(serviceStart),
      clock(serviceEnd),
      Math.round(3600 / mode.osm_departures_per_hour),
    ]);
  });

  const files: Record<string, string> = {
    'agency.txt': csv(
      ['agency_id', 'agency_name', 'agency_url', 'agency_timezone'],
      [['osm', 'OpenStreetMap', 'https://www.openstreetmap.org', 'Europe/Bucharest']],
    ),
    'stops.txt': csv(
      ['stop_id', 'stop_name', 'stop_lat', 'stop_lon'],
      network.stops.map((stop) => [stop.key, stop.name ?? stop.key, stop.lat, stop.lng]),
    ),
    'routes.txt': csv(
      ['route_id', 'agency_id', 'route_short_name', 'route_long_name', 'route_type'],
      network.routes.map((route) => [
        route.key,
        'osm',
        route.ref ?? '',
        route.longName ?? route.key,
        GTFS_ROUTE_TYPE[route.mode],
      ]),
    ),
    'calendar.txt': csv(
      [
        'service_id',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday',
        'start_date',
        'end_date',
      ],
      [['all', 1, 1, 1, 1, 1, 1, 1, date(options.validFrom), date(options.validTo)]],
    ),
    'trips.txt': csv(['route_id', 'service_id', 'trip_id', 'trip_headsign'], tripRows),
    'stop_times.txt': csv(
      ['trip_id', 'arrival_time', 'departure_time', 'stop_id', 'stop_sequence'],
      stopTimeRows,
    ),
    'frequencies.txt': csv(['trip_id', 'start_time', 'end_time', 'headway_secs'], frequencyRows),
  };
  for (const [name, content] of Object.entries(files)) {
    await writeFile(join(directory, name), content, 'utf8');
  }
  return directory;
}
