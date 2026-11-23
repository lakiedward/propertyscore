import type { ReportResult } from './report.types';

type AirSection = NonNullable<ReportResult['sections']['air']>;
type IndustrySection = NonNullable<ReportResult['sections']['industry']>;

const LISTED_INDUSTRY_SITES = 6;

const WINTER_MONTHS = new Set([11, 12, 1, 2, 3]);
const WINTER_PEAK_RATIO = 1.4;
const BAR_HEADROOM = 1.2;

export type AirVerdict = 'clean_all_year' | 'winter_peaks' | 'above_limit_most_year' | 'default';

export function airVerdict(code: string | null): AirVerdict {
  if (code === 'clean_all_year' || code === 'winter_peaks' || code === 'above_limit_most_year') {
    return code;
  }
  return 'default';
}

export function hasWinterPeak(air: AirSection): boolean {
  const values = air.pm25_monthly.flatMap((value, index) =>
    value === null ? [] : [{ value, month: Number(air.months[index]?.slice(5, 7)) }],
  );
  if (values.length === 0) return false;
  const peak = values.reduce((best, item) => (item.value > best.value ? item : best));
  const low = Math.min(...values.map((item) => item.value));
  return WINTER_MONTHS.has(peak.month) && low > 0 && peak.value >= low * WINTER_PEAK_RATIO;
}

export type MonthBar = {
  month: string;
  value: number | null;
  height: number;
  isOverLimit: boolean;
};

export function monthBars(air: AirSection): { bars: MonthBar[]; limitHeight: number } {
  const limit = air.limits.pm25;
  const peak = Math.max(...air.pm25_monthly.map((value) => value ?? 0), limit) * BAR_HEADROOM;
  return {
    bars: air.months.map((month, index) => {
      const value = air.pm25_monthly[index] ?? null;
      return {
        month,
        value,
        height: value === null ? 0 : (value / peak) * 100,
        isOverLimit: value !== null && value > limit,
      };
    }),
    limitHeight: (limit / peak) * 100,
  };
}

export function sortedSites(industry: IndustrySection): IndustrySection['sites'] {
  return [...industry.sites]
    .sort((left, right) => left.distance_m - right.distance_m)
    .slice(0, LISTED_INDUSTRY_SITES);
}

export function splitPeriod(value: string | undefined): [string, string] | null {
  const match = /^(\d{4}-\d{2})\/(\d{4}-\d{2})$/.exec(value ?? '');
  return match?.[1] && match[2] ? [match[1], match[2]] : null;
}
