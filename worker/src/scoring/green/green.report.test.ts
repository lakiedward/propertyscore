import { describe, expect, it } from 'vitest';

import { addressWalks } from './green.report.ts';

const MEASURE = {
  cell_id: 'address',
  shares: { '500': 0.12 },
  nearest_small_id: 'small-park',
  nearest_small_m: 100,
  nearest_large_id: 'large-park',
  nearest_large_m: 600,
};

describe('addressWalks', () => {
  it('uses the routed walk to the nearest park when the router reached it', () => {
    const legs = new Map([['small-park', { meters: 180.4, seconds: 140 }]]);
    expect(addressWalks(MEASURE, legs, 1.3)).toEqual({
      small: { green_area_id: 'small-park', walk_m: 180 },
      large: { green_area_id: 'large-park', walk_m: 780 },
      distanceMethod: 'pedestrian_routing',
    });
  });

  it('walks the straight line times the detour factor without routing', () => {
    expect(addressWalks(MEASURE, new Map(), 1.3)).toEqual({
      small: { green_area_id: 'small-park', walk_m: 130 },
      large: { green_area_id: 'large-park', walk_m: 780 },
      distanceMethod: 'straight_line',
    });
  });
});
