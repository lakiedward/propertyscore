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
});
