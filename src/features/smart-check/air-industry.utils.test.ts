import {
  airVerdict,
  hasWinterPeak,
  monthBars,
  sortedSites,
  splitPeriod,
} from './air-industry.utils';
import { FREIDORF_REPORT_RESULT } from '@/test/factories/smart-check-report';
import { parseReportResult } from './report.utils';

function sections() {
  const result = parseReportResult(FREIDORF_REPORT_RESULT);
  if (!result?.sections.air || !result.sections.industry) throw new Error('Fixture lost air');
  return { air: result.sections.air, industry: result.sections.industry };
}

describe('air and industry helpers', () => {
  it('maps an unknown verdict to the default one', () => {
    expect(airVerdict('winter_peaks')).toBe('winter_peaks');
    expect(airVerdict('something_new')).toBe('default');
    expect(airVerdict(null)).toBe('default');
  });

  it('flags the winter peak of the Freidorf year', () => {
    expect(hasWinterPeak(sections().air)).toBe(true);
  });

  it('marks the months above the limit and keeps the limit line inside the chart', () => {
    const { bars, limitHeight } = monthBars(sections().air);
    expect(bars).toHaveLength(12);
    expect(bars.filter((bar) => bar.isOverLimit)).toHaveLength(8);
    expect(limitHeight).toBeGreaterThan(0);
    expect(limitHeight).toBeLessThan(100);
  });

  it('lists the nearest sites first, six at most', () => {
    const sites = sortedSites(sections().industry);
    expect(sites.length).toBeLessThanOrEqual(6);
    expect(sites.map((site) => site.distance_m)).toEqual(
      [...sites.map((site) => site.distance_m)].sort((left, right) => left - right),
    );
  });

  it('splits a source period', () => {
    expect(splitPeriod('2025-11/2026-10')).toEqual(['2025-11', '2026-10']);
    expect(splitPeriod('2026-11-02')).toBeNull();
    expect(splitPeriod(undefined)).toBeNull();
  });
});
