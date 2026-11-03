import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  accessIndex,
  accessibilityScore,
  accessPoints,
  coveragePoints,
  destinationPoints,
  directionsWithoutTransfer,
  smoothScore,
  travelPoints,
} from './accessibility.formula.ts';
import { parseAccessibilityParams } from './accessibility.params.ts';
import { TEST_PARAMS } from './test-params.ts';
import type { TransitMode, TransitPattern, TransitStop } from './transit.types.ts';

const MIGRATION = fileURLToPath(
  new URL(
    '../../../../supabase/migrations/20261103095914_create_transit_tables.sql',
    import.meta.url,
  ),
);

function migrationParams(): unknown {
  const sql = readFileSync(MIGRATION, 'utf8');
  const match = /'accessibility',\s*'(\{[\s\S]*?\})'::jsonb/.exec(sql);
  if (!match?.[1]) throw new Error('accessibility params not found in the migration');
  return JSON.parse(match[1]);
}

describe('accessibility params', () => {
  it('match the values the migration stores in v1', () => {
    expect(parseAccessibilityParams(migrationParams())).toEqual(TEST_PARAMS);
  });

  it('refuse smoothing weights that do not add up to 1', () => {
    expect(() =>
      parseAccessibilityParams({ ...TEST_PARAMS, smoothing: { cell: 0.7, neighbours: 0.4 } }),
    ).toThrow(expect.objectContaining({ code: 'invalid_accessibility_params' }));
  });
});

describe('accessIndex', () => {
  const walks = [
    { stopKey: 'tram-stop', walkMinutes: 2 },
    { stopKey: 'bus-stop', walkMinutes: 4 },
    { stopKey: 'far-bus-stop', walkMinutes: 6 },
  ];

  it('takes the best line whole and half of every other line, each line once', () => {
    const result = accessIndex(
      walks,
      [
        { stopKey: 'tram-stop', routeKey: 'tram-1', mode: 'tram', departuresPerHour: 7.5 },
        { stopKey: 'bus-stop', routeKey: 'bus-33', mode: 'bus', departuresPerHour: 4 },
        { stopKey: 'far-bus-stop', routeKey: 'bus-33', mode: 'bus', departuresPerHour: 12 },
        { stopKey: 'far-bus-stop', routeKey: 'bus-40', mode: 'bus', departuresPerHour: 12 },
      ],
      TEST_PARAMS,
    );
    expect(result.routes.map((route) => route.routeKey)).toEqual(['tram-1', 'bus-33']);
    expect(result.routes[0]?.accessMinutes).toBeCloseTo(7);
    expect(result.routes[1]?.accessMinutes).toBeCloseTo(13.5);
    expect(result.index).toBeCloseTo(30 / 7 + 0.5 * (30 / 13.5), 6);
  });

  it('counts a line without a timetable with the OpenStreetMap default frequency', () => {
    const result = accessIndex(
      walks,
      [{ stopKey: 'bus-stop', routeKey: 'bus-1', mode: 'bus', departuresPerHour: null }],
      TEST_PARAMS,
    );
    expect(result.routes[0]?.accessMinutes).toBeCloseTo(4 + 7.5 + 2);
  });

  it('ignores lines that do not leave at the peak and stops outside the mode radius', () => {
    const result = accessIndex(
      walks,
      [
        { stopKey: 'tram-stop', routeKey: 'tram-9', mode: 'tram', departuresPerHour: 0 },
        { stopKey: 'far-bus-stop', routeKey: 'bus-2', mode: 'bus', departuresPerHour: 30 },
      ],
      TEST_PARAMS,
    );
    expect(result).toEqual({ index: 0, routes: [] });
  });

  it('reaches a subway station farther away than a bus stop', () => {
    const result = accessIndex(
      [{ stopKey: 'metro', walkMinutes: 10 }],
      [{ stopKey: 'metro', routeKey: 'm2', mode: 'subway', departuresPerHour: 12 }],
      TEST_PARAMS,
    );
    expect(result.routes).toHaveLength(1);
  });
});

describe('accessPoints', () => {
  it('maps the index on a log scale between the calibrated bounds', () => {
    expect(accessPoints(0, 1, 40)).toBe(0);
    expect(accessPoints(1, 1, 40)).toBe(0);
    expect(accessPoints(40, 1, 40)).toBe(1);
    expect(accessPoints(80, 1, 40)).toBe(1);
    expect(accessPoints(Math.sqrt(40), 1, 40)).toBeCloseTo(0.5);
  });
});

describe('travelPoints', () => {
  it('gives full points at 10 minutes and none at 60, with wider bounds for the airport', () => {
    expect(destinationPoints('center', 8, TEST_PARAMS.travel)).toBe(1);
    expect(destinationPoints('station', 35, TEST_PARAMS.travel)).toBeCloseTo(0.5);
    expect(destinationPoints('airport', 47.5, TEST_PARAMS.travel)).toBeCloseTo(0.5);
    expect(destinationPoints('mall', null, TEST_PARAMS.travel)).toBe(0);
  });

  it('splits the weight of a kind among its destinations and renormalises missing kinds', () => {
    const points = travelPoints(
      [
        { kind: 'center', minutes: 8 },
        { kind: 'station', minutes: 35 },
        { kind: 'airport', minutes: 47.5 },
        { kind: 'mall', minutes: null },
        { kind: 'hospital', minutes: 10 },
        { kind: 'hospital', minutes: 60 },
      ],
      TEST_PARAMS.travel,
    );
    expect(points).toBeCloseTo(50 / 85, 6);
  });

  it('has no data for a city without key destinations', () => {
    expect(travelPoints([], TEST_PARAMS.travel)).toBeNull();
  });
});

describe('directionsWithoutTransfer', () => {
  const origin = { lng: 21.2257, lat: 45.7537 };
  const stop = (key: string, lng: number, lat: number): TransitStop => ({
    key,
    name: key,
    lng,
    lat,
    modes: ['bus'],
    wheelchairBoarding: null,
  });
  const stops = new Map(
    [
      stop('A', 21.2257, 45.7538),
      stop('north', 21.2257, 45.7717),
      stop('east', 21.2514, 45.7537),
      stop('near-south', 21.2257, 45.7492),
      stop('far-south', 21.2257, 45.7357),
    ].map((item) => [item.key, item]),
  );
  const patterns: TransitPattern[] = [
    {
      routeKey: 'tram-1',
      directionLabel: 'Nord',
      stopKeys: ['far-south', 'A', 'north'],
      stopDeparturesPerHour: [8, 8, 8],
    },
    {
      routeKey: 'bus-33',
      directionLabel: 'Est',
      stopKeys: ['A', 'near-south', 'east'],
      stopDeparturesPerHour: [4, 4, 4],
    },
  ];
  const modeOfRoute = new Map<string, TransitMode>([
    ['tram-1', 'tram'],
    ['bus-33', 'bus'],
  ]);

  it('counts the sectors reached downstream of the boarding stop, beyond the minimum distance', () => {
    const result = directionsWithoutTransfer({
      origin,
      boardingStopKeys: new Set(['A']),
      patterns,
      stops,
      modeOfRoute,
      coverage: TEST_PARAMS.coverage,
    });
    expect(result).toEqual({ directions: 2, modes: ['bus', 'tram'] });
    expect(coveragePoints(result, TEST_PARAMS.coverage)).toBeCloseTo(2 / 8 + 0.1);
  });

  it('reaches nothing without a boarding stop', () => {
    const result = directionsWithoutTransfer({
      origin,
      boardingStopKeys: new Set(),
      patterns,
      stops,
      modeOfRoute,
      coverage: TEST_PARAMS.coverage,
    });
    expect(coveragePoints(result, TEST_PARAMS.coverage)).toBe(0);
  });

  it('caps the multimodal bonus at full points', () => {
    expect(coveragePoints({ directions: 8, modes: ['bus', 'tram'] }, TEST_PARAMS.coverage)).toBe(1);
  });
});

describe('accessibilityScore', () => {
  it('weighs the three components 40 / 45 / 15', () => {
    const access = accessPoints(30 / 7 + 0.5 * (30 / 13.5), 1, 40);
    expect(access).toBeCloseTo(0.457, 3);
    expect(
      accessibilityScore({ access, travel: 50 / 85, coverage: 0.475 }, TEST_PARAMS.weights),
    ).toBe(52);
  });

  it('averages only the components with data', () => {
    expect(
      accessibilityScore({ access: 0.5, travel: null, coverage: 1 }, TEST_PARAMS.weights),
    ).toBe(64);
    expect(
      accessibilityScore({ access: null, travel: null, coverage: null }, TEST_PARAMS.weights),
    ).toBeNull();
  });
});

describe('smoothScore', () => {
  it('blends 70% of the cell with 30% of the neighbours that have a score', () => {
    expect(smoothScore(92, [60, null, 70], TEST_PARAMS.smoothing)).toBe(84);
  });

  it('keeps the cell value without scored neighbours and stays empty without data', () => {
    expect(smoothScore(40, [null], TEST_PARAMS.smoothing)).toBe(40);
    expect(smoothScore(null, [80], TEST_PARAMS.smoothing)).toBeNull();
  });
});
