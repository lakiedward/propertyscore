import { FREIDORF_REPORT_RESULT } from '@/test/factories/smart-check-report';
import {
  changeForArea,
  clampArea,
  estimateForArea,
  historyChange,
  initialArea,
  isCityWide,
  priceIntervals,
  rentForArea,
} from './investment.utils';
import { parseReportResult } from './report.utils';

function investment() {
  const section = parseReportResult(FREIDORF_REPORT_RESULT)?.sections.investment;
  if (!section?.sale) throw new Error('The Freidorf fixture has no investment sale block');
  return { section, sale: section.sale };
}

describe('investment utils', () => {
  it('treats statistics and averages as city-wide', () => {
    expect(isCityWide('city_statistics')).toBe(true);
    expect(isCityWide('city_average')).toBe(true);
    expect(isCityWide('radius')).toBe(false);
  });

  it('keeps the area within the slider range', () => {
    expect(clampArea(10)).toBe(25);
    expect(clampArea(500)).toBe(140);
    expect(clampArea(62.4)).toBe(62);
  });

  it('starts from the typical area when none is declared', () => {
    const { section, sale } = investment();
    expect(initialArea(section, sale)).toBe(59);
  });

  it('prices an area from the median and the interval, rounded to a thousand', () => {
    const { section, sale } = investment();
    expect(estimateForArea(section, sale, 62)).toEqual({
      price: 123000,
      low: 108000,
      high: 144000,
    });
  });

  it('prices the rent per square metre of the chosen area, rounded to 5', () => {
    const { section } = investment();
    expect(rentForArea(section, 62)).toBe(505);
  });

  it('lists the city first and the localities from the dearest', () => {
    const { section, sale } = investment();
    const { intervals, scale } = priceIntervals(section, sale, {
      city: 'City',
      nearby: (name) => name,
    });
    expect(intervals.map((item) => item.name)).toEqual(['City', 'Dumbrăvița', 'Giroc']);
    expect(scale.min).toBeLessThan(1748);
    expect(scale.max).toBeGreaterThan(2458);
  });

  it('reads the change over the months and needs at least two', () => {
    const { section } = investment();
    const change = historyChange(section.history?.months ?? []);
    expect(change?.perM2).toBe(45);
    expect(change?.monthsSpan).toBe(3);
    expect(change?.bars.at(-1)?.isLast).toBe(true);
    expect(change && changeForArea(change, 62)).toBe(2800);
    expect(historyChange([{ period: '2026-11-01', median_eur_m2: 1984 }])).toBeNull();
  });
});
