import type { ReportResult } from './report.types';

type Investment = NonNullable<ReportResult['sections']['investment']>;
type Sale = NonNullable<Investment['sale']>;
type Month = { period: string; median_eur_m2: number };

export const AREA_MIN = 25;
export const AREA_MAX = 140;
const FALLBACK_AREA = 60;
const PRICE_STEP_EUR = 1000;
const RENT_STEP_EUR = 5;
const CHANGE_STEP_EUR = 100;
const SCALE_MARGIN = 0.25;
const BAR_FLOOR_PCT = 40;
const CITY_WIDE_PRECISIONS = new Set(['city_statistics', 'city_average', 'city']);

export type PriceInterval = {
  key: string;
  name: string;
  count: number | null;
  median: number;
  low: number | null;
  high: number | null;
  isCity: boolean;
};

export type IntervalScale = { min: number; max: number };

export function isCityWide(precision: string): boolean {
  return CITY_WIDE_PRECISIONS.has(precision);
}

export function clampArea(area: number): number {
  return Math.min(AREA_MAX, Math.max(AREA_MIN, Math.round(area)));
}

export function initialArea(investment: Investment, sale: Sale): number {
  return clampArea(investment.declared.area_m2 ?? sale.typical?.area_m2 ?? FALLBACK_AREA);
}

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

export function estimateForArea(
  investment: Investment,
  sale: Sale,
  area: number,
): { price: number; low: number | null; high: number | null } {
  const declared = investment.declared.area_m2;
  const useStored = declared !== null && declared === area && sale.estimate_eur != null;
  const price = useStored ? sale.estimate_eur : roundTo(sale.median_eur_m2 * area, PRICE_STEP_EUR);
  const low =
    useStored && sale.estimate_low_eur != null
      ? sale.estimate_low_eur
      : sale.p25_eur_m2 == null
        ? null
        : roundTo(sale.p25_eur_m2 * area, PRICE_STEP_EUR);
  const high =
    useStored && sale.estimate_high_eur != null
      ? sale.estimate_high_eur
      : sale.p75_eur_m2 == null
        ? null
        : roundTo(sale.p75_eur_m2 * area, PRICE_STEP_EUR);
  return { price: price ?? roundTo(sale.median_eur_m2 * area, PRICE_STEP_EUR), low, high };
}

export function rentForArea(investment: Investment, area: number): number | null {
  const { rent } = investment;
  if (!rent) return null;
  if (rent.median_eur_m2 != null) return roundTo(rent.median_eur_m2 * area, RENT_STEP_EUR);
  const declared = investment.declared.area_m2;
  if (rent.estimate_eur != null && declared !== null && declared > 0) {
    return roundTo((rent.estimate_eur / declared) * area, RENT_STEP_EUR);
  }
  return rent.estimate_eur ?? null;
}

export function priceIntervals(
  investment: Investment,
  sale: Sale,
  labels: { city: string; nearby: (name: string) => string },
): { intervals: PriceInterval[]; scale: IntervalScale } {
  const intervals: PriceInterval[] = [
    {
      key: 'city',
      name: labels.city,
      count: sale.count ?? null,
      median: sale.median_eur_m2,
      low: sale.p25_eur_m2 ?? null,
      high: sale.p75_eur_m2 ?? null,
      isCity: true,
    },
    ...[...investment.nearby]
      .sort((a, b) => b.median_eur_m2 - a.median_eur_m2)
      .map((locality) => ({
        key: locality.name,
        name: labels.nearby(locality.name),
        count: locality.count,
        median: locality.median_eur_m2,
        low: locality.p25_eur_m2,
        high: locality.p75_eur_m2,
        isCity: false,
      })),
  ];
  const values = intervals.flatMap((item) => [
    item.median,
    item.low ?? item.median,
    item.high ?? item.median,
  ]);
  const span = Math.max(...values) - Math.min(...values) || 1;
  return {
    intervals,
    scale: {
      min: Math.min(...values) - span * SCALE_MARGIN,
      max: Math.max(...values) + span * SCALE_MARGIN,
    },
  };
}

export function scalePosition(value: number, scale: IntervalScale): number {
  return ((value - scale.min) / (scale.max - scale.min)) * 100;
}

export type HistoryChange = {
  first: Month;
  last: Month;
  perM2: number;
  percent: number;
  monthsSpan: number;
  bars: { period: string; value: number; height: number; isLast: boolean }[];
};

export function historyChange(months: readonly Month[]): HistoryChange | null {
  const first = months[0];
  const last = months.at(-1);
  if (!first || !last || months.length < 2) return null;
  const values = months.map((month) => month.median_eur_m2);
  const low = Math.min(...values);
  const span = Math.max(...values) - low || 1;
  return {
    first,
    last,
    perM2: last.median_eur_m2 - first.median_eur_m2,
    percent: ((last.median_eur_m2 - first.median_eur_m2) / first.median_eur_m2) * 100,
    monthsSpan: months.length - 1,
    bars: months.map((month, index) => ({
      period: month.period,
      value: month.median_eur_m2,
      height: BAR_FLOOR_PCT + ((month.median_eur_m2 - low) / span) * (100 - BAR_FLOOR_PCT),
      isLast: index === months.length - 1,
    })),
  };
}

export function changeForArea(change: HistoryChange, area: number): number {
  return roundTo(change.perM2 * area, CHANGE_STEP_EUR);
}

export function yieldBarWidth(grossPct: number): number {
  const YIELD_SCALE_PCT = 8;
  return Math.min(100, (grossPct / YIELD_SCALE_PCT) * 100);
}
