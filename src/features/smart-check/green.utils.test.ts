import { describe, expect, it } from 'vitest';
import { FREIDORF_REPORT_RESULT } from '@/test/factories/smart-check-report';
import { areasOf, framingBounds, listedParks, parkWalkMinutes, parksSummary } from './green.utils';
import { parseReportResult } from './report.utils';

const section = parseReportResult(FREIDORF_REPORT_RESULT)?.sections.green;
if (!section) throw new Error('fixture has no green section');

describe('parkWalkMinutes', () => {
  it('walks 80 metres a minute and never returns less than one', () => {
    expect(parkWalkMinutes(155)).toBe(2);
    expect(parkWalkMinutes(1535)).toBe(19);
    expect(parkWalkMinutes(10)).toBe(1);
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
});
