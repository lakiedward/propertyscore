import {
  historyRange,
  sampleKind,
  type MarketCountKind,
} from '../../../worker/src/report/investment-contract.ts';
import type { ReportResult } from './report.types';

export {
  estimateForArea,
  investmentSources,
  isCityWide,
  rentForArea,
  yieldScope,
  type InvestmentYieldBasis,
} from '../../../worker/src/report/investment-contract.ts';

type Investment = NonNullable<ReportResult['sections']['investment']>;
type Sale = NonNullable<Investment['sale']>;
type Month = { period: string; median_eur_m2: number };

export const AREA_MIN = 25;
export const AREA_MAX = 140;
const FALLBACK_AREA = 60;
const CHANGE_STEP_EUR = 100;
const SCALE_MARGIN = 0.25;
const BAR_FLOOR_PCT = 40;

export type PriceInterval = {
  key: string;
  name: string;
  count: number | null;
  countKind: MarketCountKind;
  median: number;
  low: number | null;
  high: number | null;
  isCity: boolean;
};

export type IntervalScale = { min: number; max: number };

export function clampArea(area: number): number {
  return Math.min(AREA_MAX, Math.max(AREA_MIN, Math.round(area)));
}

export function initialArea(investment: Investment, sale: Sale): number {
  return investment.declared.area_m2 ?? clampArea(sale.typical?.area_m2 ?? FALLBACK_AREA);
}

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

export function priceIntervals(
  investment: Investment,
  sale: Sale,
  labels: { primary: string; nearby: (name: string) => string },
): { intervals: PriceInterval[]; scale: IntervalScale } {
  const intervals: PriceInterval[] = [
    {
      key: 'city',
      name: labels.primary,
      count: sale.count ?? null,
      countKind: sampleKind(sale),
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
        count: locality.count ?? null,
        countKind: sampleKind(locality),
        median: locality.median_eur_m2,
        low: locality.p25_eur_m2 ?? null,
        high: locality.p75_eur_m2 ?? null,
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
  const range = historyRange(months);
  if (!range) return null;
  const { ordered, ...change } = range;
  const values = ordered.map((month) => month.median_eur_m2);
  const low = Math.min(...values);
  const span = Math.max(...values) - low || 1;
  return {
    ...change,
    bars: ordered.map((month, index) => ({
      period: month.period,
      value: month.median_eur_m2,
      height: BAR_FLOOR_PCT + ((month.median_eur_m2 - low) / span) * (100 - BAR_FLOOR_PCT),
      isLast: index === ordered.length - 1,
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
