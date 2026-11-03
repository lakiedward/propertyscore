import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { buildGtfsNetwork, clockSeconds } from './gtfs.ts';
import {
  buildOsmNetwork,
  parseOplLine,
  unescapeOpl,
  writeSyntheticGtfs,
  type OplData,
} from './osm-transit.ts';
import { TEST_PARAMS } from './test-params.ts';

const OPL = [
  'n1 v1 dV c1 t2026-10-01T00:00:00Z i1 ua Tname=Pia%21b%a%20%Libert%103%%21b%ii,public_transport=platform x21.2257 y45.7537',
  'n2 v1 dV c1 t2026-10-01T00:00:00Z i1 ua Tpublic_transport=stop_position x21.2258 y45.7538',
  'n3 v1 dV c1 t2026-10-01T00:00:00Z i1 ua Tname=Gara%20%de%20%Nord,public_transport=platform x21.2080 y45.7500',
  'n4 v1 dV c1 t2026-10-01T00:00:00Z i1 ua Tname=Calea%20%Aradului,public_transport=platform x21.2200 y45.7750',
  'n5 v1 dV c1 t2026-10-01T00:00:00Z i1 ua T x21.2150 y45.7600',
  'w10 v1 dV c1 t2026-10-01T00:00:00Z i1 ua T Nn3,n5,n4',
  'r100 v1 dV c1 t2026-10-01T00:00:00Z i1 ua Ttype=route,route=tram,ref=1,name=Tramvai%20%1,colour=#e30613,to=Calea%20%Aradului Mn2@stop,n3@platform,n1@platform,n4@platform,w10@',
  'r200 v1 dV c1 t2026-10-01T00:00:00Z i1 ua Ttype=route,route=train,ref=R Mn3@platform,n4@platform',
  'r300 v1 dV c1 t2026-10-01T00:00:00Z i1 ua Ttype=route,route=bus,ref=33 Mn2@stop_entry_only,n4@stop',
];

function parse(): OplData {
  const data: OplData = { nodes: new Map(), ways: new Map(), relations: [] };
  for (const line of OPL) parseOplLine(line, data);
  return data;
}

const directories: string[] = [];

afterAll(async () => {
  await Promise.all(directories.map((path) => rm(path, { recursive: true, force: true })));
});

describe('OPL parsing', () => {
  it('decodes the escaped characters osmium writes', () => {
    expect(unescapeOpl('Pia%21b%a%20%Libert%103%%21b%ii')).toBe('Piața Libertății');
  });

  it('reads nodes, ways and relation members', () => {
    const data = parse();
    expect(data.nodes.get('1')?.tags.name).toBe('Piața Libertății');
    expect(data.ways.get('10')?.nodeIds).toEqual(['3', '5', '4']);
    expect(data.relations[0]?.members[4]).toEqual({ type: 'w', id: '10', role: '' });
  });
});

describe('buildOsmNetwork', () => {
  it('builds the lines from route relations, preferring platforms and skipping trains', () => {
    const network = buildOsmNetwork(parse());
    expect(network.routes.map((route) => [route.key, route.mode, route.ref, route.colour])).toEqual(
      [
        ['osm:r100', 'tram', '1', '#E30613'],
        ['osm:r300', 'bus', '33', null],
      ],
    );
    expect(network.patterns).toEqual([
      {
        routeKey: 'osm:r100',
        directionLabel: 'Calea Aradului',
        stopKeys: ['osm:n3', 'osm:n1', 'osm:n4'],
        stopDeparturesPerHour: null,
      },
      {
        routeKey: 'osm:r300',
        directionLabel: 'Calea Aradului',
        stopKeys: ['osm:n2', 'osm:n4'],
        stopDeparturesPerHour: null,
      },
    ]);
    expect(network.routes[0]?.lines).toEqual([
      [
        { lng: 21.208, lat: 45.75 },
        { lng: 21.215, lat: 45.76 },
        { lng: 21.22, lat: 45.775 },
      ],
    ]);
    expect(network.stops.find((stop) => stop.key === 'osm:n4')?.modes).toEqual(['bus', 'tram']);
  });

  it('writes a timetable from the default frequencies that the GTFS reader reads back', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'osm-gtfs-'));
    directories.push(directory);
    await writeSyntheticGtfs({
      network: buildOsmNetwork(parse()),
      params: TEST_PARAMS,
      validFrom: '2026-11-01',
      validTo: '2026-12-31',
      directory,
    });
    const network = await buildGtfsNetwork({
      directory,
      feedKey: 'synthetic',
      date: '2026-11-03',
      peak: { startSeconds: clockSeconds('07:30'), endSeconds: clockSeconds('08:30') },
    });
    const tram = network.patterns.find((pattern) => pattern.routeKey === 'synthetic:osm:r100');
    expect(tram?.stopDeparturesPerHour).toEqual([5, 5, 5]);
    const bus = network.patterns.find((pattern) => pattern.routeKey === 'synthetic:osm:r300');
    expect(bus?.stopDeparturesPerHour).toEqual([4, 4]);
  });
});
