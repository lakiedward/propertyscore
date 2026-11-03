import { describe, expect, it } from 'vitest';

import {
  calibrate,
  groupCellInputs,
  lightingExcludedCities,
  percentile,
  reachByType,
  scoreCells,
  walkedCellDistances,
  walkingTypes,
} from './safety.cells.ts';
import { v1Params } from './safety.test-params.ts';

const params = v1Params({ k: 4, night_offset: -8 });

describe('reachByType', () => {
  it('looks three radii away for every type', () => {
    const reach = reachByType(params);
    expect(reach.lighting).toBe(135);
    expect(reach.police).toBe(1800);
    expect(Object.keys(reach)).toHaveLength(14);
  });
});

describe('groupCellInputs', () => {
  it('stretches straight-line distances by the walking detour only for walking types', () => {
    const inputs = groupCellInputs(
      [
        { cellId: 'a', type: 'police', distances: [100], nightStates: ['unknown'] },
        { cellId: 'a', type: 'shop', distances: [100, 50], nightStates: ['open', 'closed'] },
      ],
      params,
    );
    expect(inputs.get('a')?.police).toEqual([{ distanceM: 130, nightState: 'unknown' }]);
    expect(inputs.get('a')?.shop).toEqual([
      { distanceM: 100, nightState: 'open' },
      { distanceM: 50, nightState: 'closed' },
    ]);
  });
});

describe('walkedCellDistances', () => {
  const station = (
    key: 'police' | 'fire_station',
    id: string,
    meters: number | null,
    nightState: 'open' | 'unknown',
  ) => ({
    key,
    poi_id: id,
    lng: 24.15,
    lat: 45.79,
    straight_m: 100,
    night_state: nightState,
    leg: meters === null ? null : { seconds: Math.round(meters / 1.25), meters },
  });

  it('walks to the police and fire stations only', () => {
    expect(walkingTypes(params)).toEqual(['police', 'fire_station']);
  });

  it('groups the walked distances by type with their night state and drops unreachable ones', () => {
    const rows = walkedCellDistances([
      {
        cellId: 'a',
        routed: [
          station('police', 'p1', 420, 'open'),
          station('police', 'p2', null, 'unknown'),
          station('police', 'p3', 900, 'unknown'),
          station('fire_station', 'f1', 1500, 'unknown'),
        ],
      },
      { cellId: 'b', routed: [station('police', 'p1', null, 'open')] },
    ]);

    expect(rows).toEqual([
      {
        cellId: 'a',
        type: 'police',
        distances: [420, 900],
        nightStates: ['open', 'unknown'],
        isWalked: true,
      },
      {
        cellId: 'a',
        type: 'fire_station',
        distances: [1500],
        nightStates: ['unknown'],
        isWalked: true,
      },
    ]);
  });

  it('uses a walked distance as it is, without the straight-line detour', () => {
    const inputs = groupCellInputs(
      [{ cellId: 'a', type: 'police', distances: [420], nightStates: ['open'], isWalked: true }],
      params,
    );
    expect(inputs.get('a')?.police).toEqual([{ distanceM: 420, nightState: 'open' }]);
  });
});

describe('scoreCells', () => {
  const police = [{ distanceM: 0, nightState: 'unknown' as const }];
  const cells = [
    { cellId: 'a', neighbourIds: ['b', 'c'], isResidential: true },
    { cellId: 'b', neighbourIds: ['a'], isResidential: true },
    { cellId: 'c', neighbourIds: ['a'], isResidential: false },
    { cellId: 'd', neighbourIds: [], isResidential: null },
  ];
  const scored = scoreCells(cells, new Map([['a', { police }]]), params, new Set());

  it('smooths each moment with the neighbours and averages day and night', () => {
    const [a, b, , d] = scored;
    expect(a).toMatchObject({ day: 54, night: 47, score: 51 });
    expect(b).toMatchObject({ day: 53, night: 45 });
    expect(d).toMatchObject({ day: 50, night: 42, score: 46 });
  });

  it('records each type by moment with its count and nearest element', () => {
    expect(scored[0]?.layers).toMatchObject({
      day: 54,
      night: 47,
      by_type: { police: { day: 6.4, night: 7.6, count: 1, nearest_m: 0 } },
    });
    expect(scored[3]?.layers).toMatchObject({ by_type: { police: { count: 0, nearest_m: null } } });
  });
});

describe('percentile', () => {
  it('interpolates between ranks', () => {
    expect(percentile([1, 2, 3, 4], 0.5)).toBe(2.5);
    expect(percentile([5], 0.9)).toBe(5);
    expect(percentile([], 0.5)).toBeNull();
  });
});

describe('lightingExcludedCities', () => {
  it('drops lighting where the mapped lamps per street km are under 20% of the 90th percentile', () => {
    const excluded = lightingExcludedCities(
      [
        { slug: 'timisoara', lighting: 4000, streetKm: 1000 },
        { slug: 'cluj-napoca', lighting: 3000, streetKm: 1000 },
        { slug: 'iasi', lighting: 300, streetKm: 1000 },
        { slug: 'empty', lighting: 0, streetKm: 0 },
      ],
      params.lighting_coverage_ratio,
    );
    expect([...excluded]).toEqual(['iasi']);
  });

  it('drops nothing when no city has mapped lamps', () => {
    expect(lightingExcludedCities([{ slug: 'a', lighting: 0, streetKm: 10 }], 0.2).size).toBe(0);
  });
});

describe('calibrate', () => {
  const cell = (dayRaw: number, isResidential: boolean | null, isLivedIn: boolean) => ({
    cellId: `${String(dayRaw)}-${String(isResidential)}-${String(isLivedIn)}`,
    isResidential,
    isLivedIn,
    score: 0,
    day: 0,
    night: 0,
    dayRaw,
    nightRaw: 0,
    layers: {},
  });

  it('proposes the k that would put the median and the 90th percentile of lived-in cells on target', () => {
    const result = calibrate(
      [
        cell(52, true, false),
        cell(54, true, false),
        cell(58, true, false),
        cell(62, true, false),
        cell(70, true, false),
        cell(100, false, true),
        cell(58, null, true),
        cell(50, null, false),
      ],
      params,
    );
    expect(result).toMatchObject({
      k: 4,
      lived_in_types: ['shop', 'transit_stop'],
      cells: 6,
      median_day: 58,
      k_for_median: 5,
    });
    expect(result.p90_day).toBeCloseTo(66);
    expect(result.k_for_p90).toBeCloseTo(8.75, 2);
  });
});
