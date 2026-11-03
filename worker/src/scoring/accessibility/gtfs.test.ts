import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  activeServices,
  buildGtfsNetwork,
  calendarRange,
  clockSeconds,
  gtfsColour,
  gtfsMode,
  gtfsSeconds,
  readFeedInfo,
  readServiceCalendar,
} from './gtfs.ts';
import { stopRouteLinks } from './transit-network.ts';

const FEED = fileURLToPath(new URL('./fixtures/gtfs', import.meta.url));
const PEAK = { startSeconds: clockSeconds('07:30'), endSeconds: clockSeconds('08:30') };

describe('GTFS values', () => {
  it('parses times past midnight, modes and colours', () => {
    expect(gtfsSeconds('25:10:00')).toBe(90_600);
    expect(gtfsSeconds('7:5:00')).toBeNull();
    expect(gtfsMode('0')).toBe('tram');
    expect(gtfsMode('11')).toBe('trolleybus');
    expect(gtfsMode('401')).toBe('subway');
    expect(gtfsMode('2')).toBeNull();
    expect(gtfsColour('e30613')).toBe('#E30613');
    expect(gtfsColour('red')).toBeNull();
  });
});

describe('the service calendar', () => {
  it('reads the feed version and its validity', async () => {
    expect(await readFeedInfo(FEED)).toEqual({
      version: '2026-10',
      validFrom: '2026-10-01',
      validTo: '2026-12-31',
    });
    expect(calendarRange(await readServiceCalendar(FEED))).toEqual({
      from: '2026-10-01',
      to: '2026-12-31',
    });
  });

  it('applies weekdays and the exceptions of calendar_dates', async () => {
    const calendar = await readServiceCalendar(FEED);
    expect([...activeServices(calendar, '2026-11-03')]).toEqual(['WK']);
    expect([...activeServices(calendar, '2026-11-07')]).toEqual(['WE']);
    expect([...activeServices(calendar, '2026-11-10')]).toEqual(['WE']);
    expect([...activeServices(calendar, '2027-01-05')]).toEqual([]);
  });
});

describe('buildGtfsNetwork', () => {
  it('groups the platforms of a stop and keeps only bus, trolleybus, tram and subway', async () => {
    const network = await buildGtfsNetwork({
      directory: FEED,
      feedKey: 'g0',
      date: '2026-11-03',
      peak: PEAK,
    });
    expect(
      network.stops
        .map((stop) => ({
          key: stop.key,
          name: stop.name,
          modes: stop.modes,
          wheelchair: stop.wheelchairBoarding,
        }))
        .sort((a, b) => a.key.localeCompare(b.key)),
    ).toEqual([
      { key: 'g0:A1', name: 'Piața Libertății', modes: ['tram', 'trolleybus'], wheelchair: 1 },
      {
        key: 'g0:C',
        name: 'Calea Aradului, capăt',
        modes: ['tram', 'trolleybus'],
        wheelchair: null,
      },
      { key: 'g0:P', name: 'Gara de Nord', modes: ['tram'], wheelchair: null },
    ]);
    expect(network.routes.map((route) => [route.key, route.mode, route.colour])).toEqual([
      ['g0:T1', 'tram', '#E30613'],
      ['g0:TB15', 'trolleybus', null],
    ]);
    expect(network.routes[0]?.lines).toHaveLength(1);
    expect(network.routes[0]?.lines[0]).toHaveLength(3);
  });

  it('counts the departures of every stop in the peak hour, including frequency-based trips', async () => {
    const network = await buildGtfsNetwork({
      directory: FEED,
      feedKey: 'g0',
      date: '2026-11-03',
      peak: PEAK,
    });
    const patterns = network.patterns
      .map((pattern) => ({
        route: pattern.routeKey,
        direction: pattern.directionLabel,
        stops: pattern.stopKeys,
        departures: pattern.stopDeparturesPerHour,
      }))
      .sort((a, b) => `${a.route}${a.direction}`.localeCompare(`${b.route}${b.direction}`));
    expect(patterns).toEqual([
      {
        route: 'g0:T1',
        direction: 'Calea Aradului',
        stops: ['g0:P', 'g0:A1', 'g0:C'],
        departures: [3, 3, 2],
      },
      {
        route: 'g0:T1',
        direction: 'Gara de Nord',
        stops: ['g0:C', 'g0:A1', 'g0:P'],
        departures: [1, 1, 1],
      },
      {
        route: 'g0:TB15',
        direction: 'Calea Aradului',
        stops: ['g0:A1', 'g0:C'],
        departures: [6, 6],
      },
    ]);
    expect(
      stopRouteLinks(network).find(
        (link) => link.stopKey === 'g0:A1' && link.routeKey === 'g0:TB15',
      ),
    ).toEqual({
      stopKey: 'g0:A1',
      routeKey: 'g0:TB15',
      directionLabel: 'Calea Aradului',
      departuresPerHour: 6,
    });
  });

  it('uses only the services of the reference day', async () => {
    const network = await buildGtfsNetwork({
      directory: FEED,
      feedKey: 'g0',
      date: '2026-11-10',
      peak: PEAK,
    });
    expect(network.patterns).toEqual([
      {
        routeKey: 'g0:T1',
        directionLabel: 'Calea Aradului',
        stopKeys: ['g0:P', 'g0:A1'],
        stopDeparturesPerHour: [1, 1],
      },
    ]);
  });
});
