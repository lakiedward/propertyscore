import { describe, expect, it } from 'vitest';

import type { CityCategoryStat, WalkAccessRecord } from './fifteen-minute.db.ts';
import { testParams } from './fifteen-minute.fixtures.ts';
import { cellScoreRows, parseFifteenMinuteParams, walkTargets } from './fifteen-minute.module.ts';

const params = testParams({
  categories: [
    {
      key: 'supermarket',
      group: 'shops',
      osm: ['shop=supermarket'],
      poi_categories: [],
      exclude: [],
      weight: 6,
      enough: 3,
    },
    {
      key: 'pharmacy',
      group: 'pharmacies',
      osm: ['amenity=pharmacy'],
      poi_categories: [],
      exclude: [],
      weight: 4,
      enough: 2,
    },
  ],
});

function record(
  cellId: string,
  category: string,
  tNearestS: number | null,
  n15: number,
): WalkAccessRecord {
  return {
    cell_id: cellId,
    category,
    t_nearest_s: tNearestS,
    n5: 0,
    n10: 0,
    n15,
    distance_method: 'pedestrian_routing',
  };
}

function stat(category: string, isCovered: boolean): CityCategoryStat {
  return {
    category,
    poi_count: isCovered ? 10 : 1,
    is_covered: isCovered,
    avg_t_nearest_s: null,
    share_within_15: null,
  };
}

const identity = (scores: ReadonlyMap<string, number | null>) => new Map(scores);

describe('parseFifteenMinuteParams', () => {
  it('names the parameters in the error code', () => {
    expect(() => parseFifteenMinuteParams({})).toThrow(
      expect.objectContaining({ code: 'invalid_fifteen_minute_params' }) as Error,
    );
  });
});

describe('walkTargets', () => {
  it('routes at least as many candidates as a category needs to be full', () => {
    const targets = walkTargets(testParams({ max_candidates: 2 }));
    const restaurant = targets.find((target) => target.key === 'fifteen_minute_restaurant');
    expect(restaurant).toMatchObject({ maxCandidates: 5, searchRadiusM: 1600, minPoiCount: 5 });
  });
});

describe('cellScoreRows', () => {
  it('scores every cell from its walking access and keeps the audit trail', () => {
    const rows = cellScoreRows(
      ['c1', 'c2'],
      [
        record('c1', 'fifteen_minute_supermarket', 300, 3),
        record('c1', 'fifteen_minute_pharmacy', null, 0),
        record('c2', 'fifteen_minute_supermarket', 1200, 0),
        record('c2', 'fifteen_minute_pharmacy', 240, 2),
      ],
      [stat('fifteen_minute_supermarket', true), stat('fifteen_minute_pharmacy', true)],
      params,
      identity,
    );
    expect(rows.map((row) => row.score)).toEqual([60, 40]);
    expect(rows[0]?.inputs).toMatchObject({
      raw_score: 60,
      covered: 1,
      total: 2,
      distance_method: 'pedestrian_routing',
    });
  });

  it('leaves out categories the city lacks data for', () => {
    const rows = cellScoreRows(
      ['c1'],
      [
        record('c1', 'fifteen_minute_supermarket', 300, 3),
        record('c1', 'fifteen_minute_pharmacy', null, 0),
      ],
      [stat('fifteen_minute_supermarket', true), stat('fifteen_minute_pharmacy', false)],
      params,
      identity,
    );
    expect(rows[0]?.score).toBe(100);
  });

  it('writes no score and a reason when the city has no usable category', () => {
    const rows = cellScoreRows(
      ['c1'],
      [],
      [stat('fifteen_minute_supermarket', false)],
      params,
      identity,
    );
    expect(rows).toEqual([{ cellId: 'c1', score: null, inputs: { reason: 'no_source_data' } }]);
  });

  it('applies the smoothing to the raw scores', () => {
    const rows = cellScoreRows(
      ['c1'],
      [record('c1', 'fifteen_minute_supermarket', 300, 3)],
      [stat('fifteen_minute_supermarket', true)],
      params,
      () => new Map([['c1', 42]]),
    );
    expect(rows[0]).toMatchObject({ score: 42, inputs: { raw_score: 100 } });
  });
});
