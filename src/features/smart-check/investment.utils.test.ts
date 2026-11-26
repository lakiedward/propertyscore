import { FREIDORF_REPORT_RESULT } from '@/test/factories/smart-check-report';
import {
  changeForArea,
  clampArea,
  estimateForArea,
  historyChange,
  initialArea,
  isCityWide,
  priceIntervals,
  rentEstimateForArea,
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
    expect(initialArea({ ...section, declared: { area_m2: null } }, sale)).toBe(53);
  });

  it('preserves the precise declared area and the saved estimates', () => {
    const { section, sale } = investment();
    const area = initialArea(section, sale);
    expect(area).toBe(58.5);
    expect(initialArea({ ...section, declared: { area_m2: 145.25 } }, sale)).toBe(145.25);
    expect(estimateForArea(section, sale, area)).toEqual({
      price: 116000,
      low: 102000,
      high: 136000,
    });
    expect(rentEstimateForArea(section, area)?.value).toBe(480);
  });

  it('does not use an unscaled market median as an estimate', () => {
    const { section } = investment();
    expect(rentEstimateForArea({ ...section, rent: { median_eur: 420 } }, 58.5)).toBeNull();
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
    expect(rentEstimateForArea(section, 62)).toEqual({ value: 505, basis: 'perM2' });
  });

  it('lists the city first and the localities from the dearest', () => {
    const { section, sale } = investment();
    const { intervals, scale } = priceIntervals(section, sale, {
      primary: 'City',
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

  it('measures calendar months across missing observations and year boundaries', () => {
    const change = historyChange([
      { period: '2027-01-01', median_eur_m2: 2000 },
      { period: '2026-10-01', median_eur_m2: 1900 },
    ]);
    expect(change?.monthsSpan).toBe(3);
    expect(change?.bars.map(({ period }) => period)).toEqual(['2026-10-01', '2027-01-01']);
  });
});
