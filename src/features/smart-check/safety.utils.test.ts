import { describe, expect, it } from 'vitest';
import { FREIDORF_REPORT_RESULT } from '@/test/factories/smart-check-report';
import { heatRaster } from './safety-heat';
import { parseReportResult } from './report.utils';
import { safetyElementOverlays } from './safety-map-layers';
import { chipOfType, helpRows, nearestElement, safetyBreakdown, walkMinutes } from './safety.utils';

const result = parseReportResult(FREIDORF_REPORT_RESULT);
const safety = result?.sections.safety;

describe('safetyBreakdown', () => {
  it('splits the contributions of a moment into raises and lowers that add up to the score', () => {
    if (!safety) throw new Error('fixture has no safety section');
    const day = safetyBreakdown(safety, 'day');
    expect(day.raises.every((row) => row.points > 0)).toBe(true);
    expect(day.lowers.every((row) => row.points < 0)).toBe(true);
    expect(day.start + day.up - day.down).toBe(day.score);
  });
});

describe('helpRows', () => {
  it('lists the nearest landmarks and the medical layers', () => {
    if (!result) throw new Error('fixture does not parse');
    const keys = helpRows(result).map((row) => row.key);
    expect(keys).toContain('nonstop');
    expect(keys).toContain('h4');
  });
});

describe('walkMinutes', () => {
  it('never returns less than one minute', () => {
    expect(walkMinutes(4)).toBe(1);
    expect(walkMinutes(370)).toBe(6);
  });
});

describe('heatRaster', () => {
  it('colours the pixels around the cells and leaves the rest transparent', () => {
    if (!safety?.heat || !result) throw new Error('fixture has no heat');
    const raster = heatRaster(safety.heat, [21.18007, 45.72912], 'day');
    expect(raster.rgba).toHaveLength(raster.width * raster.height * 4);
    expect(raster.rgba.some((value, index) => index % 4 === 3 && value > 0)).toBe(true);
  });
});

const elements = {
  reach_m: { shop: 120, park: 200 },
  points: {
    shop: [
      [21.181, 45.7291],
      [21.1802, 45.7292],
    ] as [number, number][],
    police: [[21.19, 45.73]] as [number, number][],
  },
  lines: {},
  areas: {
    park_lit: [
      [
        [
          [21.17, 45.72],
          [21.171, 45.72],
          [21.171, 45.721],
          [21.17, 45.72],
        ],
      ],
    ] as [number, number][][][],
  },
};

describe('nearestElement', () => {
  it('takes the nearest point of the chip from the map elements', () => {
    const nearest = nearestElement({ landmarks: [], elements }, 'shop', [21.18007, 45.72912]);
    expect(nearest?.position).toEqual([21.1802, 45.7292]);
    expect(nearest?.distanceM).toBeGreaterThan(5);
    expect(nearest?.distanceM).toBeLessThan(20);
  });

  it('prefers the landmark, whose distance may be walked', () => {
    const nearest = nearestElement(
      {
        landmarks: [
          { id: 'p', type: 'police', name: null, location: [21.19, 45.73], distance_m: 1500 },
        ],
        elements,
      },
      'police',
      [21.18007, 45.72912],
    );
    expect(nearest).toEqual({ position: [21.19, 45.73], distanceM: 1500 });
  });

  it('groups lit parks under the park chip', () => {
    expect(chipOfType('park_lit')).toBe('park');
    expect(nearestElement({ landmarks: [], elements }, 'park', [21.17, 45.72])?.distanceM).toBe(0);
  });
});

describe('safetyElementOverlays', () => {
  it('dims every layer but the focused one and hides the chips that are off', () => {
    const overlays = safetyElementOverlays(elements, {
      when: 'day',
      hiddenChips: new Set(['park']),
      focusedChip: 'shop',
    });
    const shops = overlays.find((overlay) => overlay.id.startsWith('safety-shop-points'));
    const parks = overlays.find((overlay) => overlay.id.startsWith('safety-park-lit'));
    expect(shops?.kind === 'circle' && shops.opacity).toBe(1);
    expect(parks?.isVisible).toBe(false);
    expect(parks?.kind === 'fill' && parks.outlineOpacity).toBe(0.1);
  });
});
