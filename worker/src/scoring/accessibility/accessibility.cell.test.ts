import { describe, expect, it } from 'vitest';

import { evaluateCell, type CityTransitContext } from './accessibility.cell.ts';
import { TEST_PARAMS } from './test-params.ts';
import type { TransitStop } from './transit.types.ts';

const stop = (key: string, lng: number, lat: number, modes: TransitStop['modes']): TransitStop => ({
  key,
  name: key,
  lng,
  lat,
  modes,
  wheelchairBoarding: null,
});

const stops = [
  stop('g0:A', 21.2257, 45.7538, ['tram']),
  stop('g0:north', 21.2257, 45.7717, ['tram']),
  stop('g0:far', 21.25, 45.75, ['bus']),
];

const context: CityTransitContext = {
  params: TEST_PARAMS,
  stops: new Map(stops.map((item) => [item.key, item])),
  services: [{ stopKey: 'g0:A', routeKey: 'g0:T1', mode: 'tram', departuresPerHour: 7.5 }],
  patterns: [
    {
      routeKey: 'g0:T1',
      directionLabel: 'Nord',
      stopKeys: ['g0:A', 'g0:north'],
      stopDeparturesPerHour: [7.5, 7.5],
    },
  ],
  modeOfRoute: new Map([['g0:T1', 'tram']]),
  destinations: [
    { id: 'center', kind: 'center', lng: 21.2289, lat: 45.7576 },
    { id: 'station', kind: 'station', lng: 21.208, lat: 45.75 },
  ],
  routeKeyOf: (routeId) => (routeId === 'T1' ? 'g0:T1' : null),
};

describe('evaluateCell', () => {
  it('combines stop access, door-to-door times and directions into one score', () => {
    const result = evaluateCell(context, {
      origin: { lng: 21.2257, lat: 45.7537 },
      walks: [
        { stopId: 'g0:A', minutes: 2 },
        { stopId: 'g0:far', minutes: 9 },
        { stopId: 'unknown', minutes: 1 },
      ],
      timings: new Map([
        ['center', { transitMinutes: 12, walkMinutes: 8 }],
        ['station', { transitMinutes: 35, walkMinutes: 50 }],
      ]),
      itineraries: new Map([
        [
          'station',
          { walkMinutes: 6, waitMinutes: 4, rideMinutes: 25, transfers: 1, routeId: 'T1' },
        ],
      ]),
    });

    expect(result.accessIndex).toBeCloseTo(30 / 7);
    expect(result.sTravel).toBeCloseTo((30 * 1 + 15 * 0.5) / 45);
    expect(result.directions).toBe(1);
    expect(result.stops).toEqual([{ stop_key: 'g0:A', walk_min: 2, walk_m: 150 }]);
    expect(result.destinations).toEqual([
      {
        destination_id: 'center',
        kind: 'center',
        minutes: 8,
        by_walking: true,
        walk: 8,
        wait: null,
        ride: null,
        transfers: null,
        route_key: null,
      },
      {
        destination_id: 'station',
        kind: 'station',
        minutes: 35,
        by_walking: false,
        walk: 6,
        wait: 4,
        ride: 25,
        transfers: 1,
        route_key: 'g0:T1',
      },
    ]);
    expect(result.raw).not.toBeNull();
  });

  it('scores a cell with no stop in reach low but not empty', () => {
    const result = evaluateCell(context, {
      origin: { lng: 21.3, lat: 45.8 },
      walks: [],
      timings: new Map(),
      itineraries: new Map(),
    });
    expect(result.sAccess).toBe(0);
    expect(result.sCoverage).toBe(0);
    expect(result.sTravel).toBe(0);
    expect(result.raw).toBe(0);
  });
});
