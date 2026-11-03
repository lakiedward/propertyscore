import { describe, expect, it } from 'vitest';

import type { ValhallaClient } from './valhalla.ts';
import {
  type Candidate,
  legsFromOrigin,
  straightLineLeg,
  summarizeLegs,
  walkAccessRowsForCell,
} from './walk-access.ts';

const candidates: Candidate[] = [
  { key: 'a', poi_id: 'p1', lng: 21.23, lat: 45.75, straight_m: 200 },
  { key: 'a', poi_id: 'p2', lng: 21.24, lat: 45.75, straight_m: 700 },
  { key: 'b', poi_id: 'p3', lng: 21.25, lat: 45.75, straight_m: 900 },
];

describe('straightLineLeg', () => {
  it('stretches the straight line by the detour factor and walks it at the given speed', () => {
    expect(straightLineLeg(1000, 4.5, 1.3)).toEqual({ meters: 1300, seconds: 1040 });
  });
});

describe('summarizeLegs', () => {
  it('finds the nearest point and counts the cumulative 5, 10 and 15 minute bands', () => {
    expect(
      summarizeLegs(
        'cell',
        'a',
        [
          { poiId: 'p1', leg: { seconds: 700, meters: 870 } },
          { poiId: 'p2', leg: { seconds: 250, meters: 300 } },
          { poiId: 'p3', leg: { seconds: 900, meters: 1100 } },
          { poiId: 'p4', leg: null },
          { poiId: 'p5', leg: { seconds: 1200, meters: 1500 } },
        ],
        'pedestrian_routing',
      ),
    ).toEqual({
      cell_id: 'cell',
      category: 'a',
      t_nearest_s: 250,
      d_nearest_m: 300,
      n5: 1,
      n10: 1,
      n15: 3,
      candidates: 5,
      nearest_poi_id: 'p2',
      distance_method: 'pedestrian_routing',
    });
  });

  it('leaves the nearest empty when nothing is reachable', () => {
    expect(summarizeLegs('cell', 'a', [], 'straight_line')).toMatchObject({
      t_nearest_s: null,
      d_nearest_m: null,
      n15: 0,
      candidates: 0,
    });
  });
});

describe('walkAccessRowsForCell', () => {
  it('writes one row per target, including targets without candidates', () => {
    const targets = ['a', 'b', 'c'].map((key) => ({
      key,
      poiCategories: [key],
      searchRadiusM: 1600,
      maxCandidates: 10,
    }));
    const legs = [{ seconds: 100, meters: 120 }, { seconds: 500, meters: 600 }, null];
    const rows = walkAccessRowsForCell('cell', targets, candidates, legs, 'pedestrian_routing');
    expect(rows.map((row) => [row.category, row.t_nearest_s, row.n10, row.candidates])).toEqual([
      ['a', 100, 2, 2],
      ['b', null, 0, 1],
      ['c', null, 0, 0],
    ]);
  });
});

describe('legsFromOrigin', () => {
  it('falls back to the straight line without a router', async () => {
    expect(await legsFromOrigin(null, { lng: 21.2, lat: 45.7 }, candidates, 4.5, 1.3)).toEqual([
      { meters: 260, seconds: 208 },
      { meters: 910, seconds: 728 },
      { meters: 1170, seconds: 936 },
    ]);
  });

  it('asks the router for one row from the origin', async () => {
    const router: ValhallaClient = {
      matrix: ({ targets }) => Promise.resolve([targets.map(() => ({ seconds: 60, meters: 75 }))]),
      isochrones: () => Promise.resolve([]),
      route: () => Promise.resolve(null),
      tilesetDate: () => Promise.resolve(null),
    };
    const legs = await legsFromOrigin(router, { lng: 21.2, lat: 45.7 }, candidates, 4.5, 1.3);
    expect(legs).toHaveLength(3);
    expect(legs[0]).toEqual({ seconds: 60, meters: 75 });
    expect(await legsFromOrigin(router, { lng: 21.2, lat: 45.7 }, [], 4.5, 1.3)).toEqual([]);
  });
});
