import { describe, expect, it } from 'vitest';

import { accessibilitySection } from './accessibility.report.ts';

describe('accessibilitySection', () => {
  it('names the stops, the lines and the key destinations of the cell', () => {
    const section = accessibilitySection({
      inputs: {
        s_access: 0.8,
        s_travel: 0.6,
        s_coverage: 0.5,
        directions: 3,
        weights: { access: 40, travel: 45, coverage: 15 },
        data_quality: 'gtfs',
        reference_date: '2026-10-28',
      },
      transit: {
        stops: [
          { stop_key: 'a', walk_min: 3.2, walk_m: 240 },
          { stop_key: 'missing', walk_min: 5, walk_m: 380 },
        ],
        destinations: [
          {
            destination_id: 'd1',
            kind: 'center',
            minutes: 12,
            by_walking: false,
            walk: 5,
            wait: 3,
            ride: 4,
            transfers: 0,
            route_key: 'r1',
          },
        ],
      },
      stops: [
        { stop_key: 'a', name: 'Piața Mărăști', modes: ['tram'], longitude: 21.2, latitude: 45.7 },
      ],
      routes: [
        {
          route_key: 'r1',
          ref: '1',
          mode: 'tram',
          long_name: null,
          colour: '#C0392B',
          text_colour: null,
          stop_keys: ['a'],
          peak_per_hour: 7.96,
        },
      ],
      destinations: [
        {
          id: 'd1',
          kind: 'center',
          label_ro: 'Centru',
          label_en: 'Centre',
          longitude: 21.22,
          latitude: 45.75,
        },
      ],
    });

    expect(section).toMatchObject({
      status: 'scored',
      stops: [{ id: 'a', name: 'Piața Mărăști', routes: ['1'] }],
      routes: [{ ref: '1', peak_per_hour: 8 }],
      destinations: [{ id: 'd1', label: { ro: 'Centru', en: 'Centre' }, route: { ref: '1' } }],
    });
  });

  it('takes the walk, wait, ride and line from the trip planned at the address', () => {
    const destination = (id: string, minutes: number | null) => ({
      destination_id: id,
      kind: 'station',
      minutes,
      by_walking: false,
      walk: null,
      wait: null,
      ride: null,
      transfers: null,
      route_key: null,
    });
    const label = (id: string) => ({
      id,
      kind: 'station',
      label_ro: id,
      label_en: id,
      longitude: 21.2,
      latitude: 45.75,
    });
    const section = accessibilitySection({
      inputs: {
        s_access: 0.8,
        s_travel: 0.6,
        s_coverage: 0.5,
        directions: 3,
        weights: { access: 40, travel: 45, coverage: 15 },
        data_quality: 'osm_only',
        reference_date: '2026-11-03',
      },
      transit: { stops: [], destinations: [destination('gara', 13), destination('far', null)] },
      stops: [],
      routes: [],
      destinations: [label('gara'), label('far')],
      addressTrips: new Map([
        [
          'gara',
          { walkMinutes: 6.7, waitMinutes: 1.1, rideMinutes: 3.7, transfers: 0, routeId: 'r18' },
        ],
        ['far', { walkMinutes: 60, waitMinutes: 3, rideMinutes: 27, transfers: 1, routeId: 'r35' }],
      ]),
      tripRoutes: [
        {
          route_key: 'osm:r18',
          ref: '18',
          mode: 'trolleybus',
          long_name: null,
          colour: null,
          text_colour: null,
          stop_keys: [],
          peak_per_hour: null,
        },
      ],
      routeKeyOf: (routeId) => (routeId === 'r18' ? 'osm:r18' : null),
    });

    expect(section.destinations).toMatchObject([
      { id: 'gara', walk: 7, wait: 1, ride: 4, transfers: 0, route: { ref: '18' } },
      { id: 'far', minutes: null, walk: null, wait: null, ride: null, route: null },
    ]);
  });
});
