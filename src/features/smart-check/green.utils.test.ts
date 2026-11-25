import { describe, expect, it } from 'vitest';
import { FREIDORF_REPORT_RESULT } from '@/test/factories/smart-check-report';
import {
  areasOf,
  framingBounds,
  isParkWalkEstimated,
  listedParks,
  parkWalkMinutes,
  parksSummary,
} from './green.utils';
import { parseReportResult } from './report.utils';

const section = parseReportResult(FREIDORF_REPORT_RESULT)?.sections.green;
if (!section) throw new Error('fixture has no green section');

describe('parkWalkMinutes', () => {
  it('walks 80 metres a minute and never returns less than one', () => {
    expect(parkWalkMinutes({ walk_m: 155 })).toBe(2);
    expect(parkWalkMinutes({ walk_m: 1535 })).toBe(19);
    expect(parkWalkMinutes({ walk_m: 10 })).toBe(1);
  });

  it('prefers actual routing time over an estimate from metres', () => {
    expect(parkWalkMinutes({ walk_m: 1200, walk_seconds: 240 })).toBe(4);
  });
});

describe('isParkWalkEstimated', () => {
  it('uses the chapter method for legacy reports with no routed time per park', () => {
    const park = section.parks[0];
    if (!park) throw new Error('fixture has no green park');
    const legacy = { ...section, parks: [park] };
    expect(isParkWalkEstimated(park, { ...legacy, distance_method: 'straight_line' })).toBe(true);
    expect(isParkWalkEstimated(park, { ...legacy, distance_method: 'pedestrian_routing' })).toBe(
      false,
    );
  });
});

describe('listedParks', () => {
  it('lists the parks of at least one hectare, nearest first', () => {
    const parks = listedParks(section);
    expect(parks.every((park) => park.area_ha >= 1)).toBe(true);
    expect(parks.map((park) => park.walk_m)).toEqual([1535, 1917]);
  });

  it('falls back to every park when none is large', () => {
    const small = { ...section, parks: section.parks.filter((park) => park.area_ha < 1) };
    expect(listedParks(small)).toHaveLength(small.parks.length);
  });

  it('orders parks and takes the farthest by routed time when available', () => {
    const [near, far] = listedParks(section);
    if (!near || !far) throw new Error('fixture has too few parks');
    const routedFar = { ...far, walk_seconds: 240 };
    const parks = listedParks({ ...section, parks: [near, routedFar] });
    expect(parks).toEqual([routedFar, near]);
    expect(parksSummary(parks).farthest).toBe(near);
  });
});

describe('parksSummary', () => {
  it('finds the farthest and the biggest park and the total area', () => {
    const parks = listedParks(section);
    const summary = parksSummary(parks);
    expect(summary.farthest?.walk_m).toBe(1917);
    expect(summary.biggest?.area_ha).toBe(2.49);
    expect(summary.totalHa).toBeCloseTo(3.92);
  });

  it('has no park to point at when the list is empty', () => {
    expect(parksSummary([])).toEqual({ farthest: undefined, biggest: undefined, totalHa: 0 });
  });
});

describe('areasOf', () => {
  it('keeps only the polygons of the given parks', () => {
    const [park] = listedParks(section);
    expect(areasOf(section, park ? [park.id] : []).features).toHaveLength(1);
    expect(areasOf(section, []).features).toHaveLength(0);
  });
});

describe('framingBounds', () => {
  it('wraps every point with a margin', () => {
    const [[west, south], [east, north]] = framingBounds([
      [21.1, 45.7],
      [21.2, 45.8],
    ]);
    expect(west).toBeLessThan(21.1);
    expect(south).toBeLessThan(45.7);
    expect(east).toBeGreaterThan(21.2);
    expect(north).toBeGreaterThan(45.8);
  });

  it('includes the outlying polygon of a displayed multipart park, not an unlisted park', () => {
    const [park] = listedParks(section);
    if (!park) throw new Error('fixture has no listed park');
    const distant = [
      [21.3, 45.9],
      [21.4, 45.9],
      [21.4, 46],
      [21.3, 45.9],
    ];
    const unlisted = [
      [22.3, 46.9],
      [22.4, 46.9],
      [22.4, 47],
      [22.3, 46.9],
    ];
    const collection = areasOf(
      {
        ...section,
        areas: {
          ...section.areas,
          features: [
            ...section.areas.features,
            {
              type: 'Feature',
              properties: { id: park.id },
              geometry: { type: 'MultiPolygon', coordinates: [[distant]] },
            },
            {
              type: 'Feature',
              properties: { id: 'unlisted' },
              geometry: { type: 'Polygon', coordinates: [unlisted] },
            },
          ],
        },
      },
      [park.id],
    );

    const [, [east, north]] = framingBounds([park.center], collection);
    expect(east).toBeGreaterThan(21.4);
    expect(east).toBeLessThan(22.3);
    expect(north).toBeGreaterThan(46);
    expect(north).toBeLessThan(46.9);
  });
});
