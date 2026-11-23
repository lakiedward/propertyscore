import { describe, expect, it } from 'vitest';
import { FREIDORF_REPORT_RESULT } from '@/test/factories/smart-check-report';
import { heatRaster } from './safety-heat';
import { parseReportResult } from './report.utils';
import { helpRows, safetyBreakdown, walkMinutes } from './safety.utils';

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
