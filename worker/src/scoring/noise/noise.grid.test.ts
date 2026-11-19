import { describe, expect, it } from 'vitest';
import {
  buildingsCrossed,
  indexBuildings,
  insideRing,
  nearestOnSegment,
  noiseLevelGrid,
  type GridBuilding,
  type Metres,
} from './noise.grid.ts';
import { parseNoiseParams } from './noise.params.ts';

const params = parseNoiseParams({
  who: {
    air: { lden: 45, lnight: 40 },
    rail: { lden: 54, lnight: 44 },
    road: { lden: 53, lnight: 45 },
  },
  screen_db: 5,
  map_clip_m: 1000,
  scale_lden: [45, 75],
  night_weight: 0.3,
  proxy_ref_db: { primary: 72, residential: 55 },
  scale_lnight: [37, 65],
  band_width_db: 5,
  screen_max_db: 10,
  below_mapped_db: 50,
  sample_offset_m: 100,
  display_bands_db: [45, 55, 65, 70],
  nearest_radius_m: 1500,
  intermittent_kinds: ['rail', 'air'],
  proxy_ref_distance_m: 10,
  proxy_night_offset_db: 8,
  intermittent_penalty_db: 3,
});

const square = (x: number, y: number, size: number): GridBuilding => ({
  ring: [
    [x, y],
    [x + size, y],
    [x + size, y + size],
    [x, y + size],
    [x, y],
  ],
});

describe('nearestOnSegment', () => {
  it('measures to the closest point of the segment', () => {
    expect(nearestOnSegment([5, 3], [0, 0], [10, 0]).distance).toBeCloseTo(3);
    expect(nearestOnSegment([-4, 3], [0, 0], [10, 0]).distance).toBeCloseTo(5);
  });
});

describe('insideRing', () => {
  it('tells inside from outside', () => {
    const ring = square(0, 0, 10).ring;
    expect(insideRing([5, 5], ring)).toBe(true);
    expect(insideRing([15, 5], ring)).toBe(false);
  });
});

describe('buildingsCrossed', () => {
  it('counts the buildings between two points', () => {
    const index = indexBuildings([square(20, -5, 10), square(40, -5, 10)]);
    const from: Metres = [0, 0];
    expect(buildingsCrossed(index, from, [100, 0])).toBe(2);
    expect(buildingsCrossed(index, from, [10, 0])).toBe(0);
  });
});

describe('noiseLevelGrid', () => {
  it('is loudest on the road and quieter away from it', () => {
    const levels = noiseLevelGrid(
      {
        spec: { columns: 11, rows: 3, stepM: 20 },
        lines: [
          {
            kind: 'road',
            sourceClass: 'primary',
            points: [
              [-120, 0],
              [120, 0],
            ],
          },
        ],
        buildings: [],
        coverage: { hasMaps: false, hasProxySources: true },
        firstDrawnDb: 0,
      },
      params,
    );
    const middleRow = levels.slice(11, 22);
    const edgeRow = levels.slice(0, 11);
    expect(Math.max(...middleRow)).toBeGreaterThan(Math.max(...edgeRow));
  });
});
