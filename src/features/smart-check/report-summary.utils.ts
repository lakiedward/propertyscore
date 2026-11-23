import { REPORT_CATEGORY_KEYS } from './report.schemas';
import type { ReportCategoryKey, ReportResult } from './report.types';

type CategorySummary = NonNullable<ReportResult['categories'][ReportCategoryKey]>;

export type ScoredCategory = {
  key: ReportCategoryKey;
  score: number;
  average: number;
  percentile: number | null;
  weight: number;
  isFlat: boolean;
};

export const CATEGORY_GROUPS = [
  { key: 'mostImportant', categories: ['accessibility', 'fifteen_minute', 'safety'] },
  { key: 'environment', categories: ['noise', 'green', 'air', 'industry'] },
  { key: 'services', categories: ['education', 'health'] },
] as const satisfies readonly { key: string; categories: readonly ReportCategoryKey[] }[];

const HIGHLIGHTS = 3;
const WEAK_POINT_BELOW = 55;
const AT_AVERAGE_WITHIN = 2;
const FAR_ABOVE_PERCENTILE = 90;
const DEFAULT_WALK_SPEED_KMH = 4.5;
const WALK_MINUTES = 15;

export type ReportContext = 'seismic' | 'investment';

export function walkSpeedKmh(result: ReportResult): number {
  return result.sections.fifteen_minute?.walk_speed_kmh ?? DEFAULT_WALK_SPEED_KMH;
}

export function analysisRadiusKm(result: ReportResult): number {
  return Math.ceil(walkSpeedKmh(result) * (WALK_MINUTES / 60) * 10) / 10;
}

export function reportContexts(result: ReportResult): ReportContext[] {
  const { seismic, investment } = result.sections;
  return [
    ...(seismic ? (['seismic'] as const) : []),
    ...(investment ? (['investment'] as const) : []),
  ];
}

function isFlatDistribution(summary: CategorySummary): boolean {
  return summary.city_min === summary.city_max || summary.histogram.filter(Boolean).length <= 1;
}

export function scoredCategories(result: ReportResult): ScoredCategory[] {
  return REPORT_CATEGORY_KEYS.flatMap((key) => {
    const summary = result.categories[key];
    if (summary?.score === null || summary?.score === undefined) return [];
    const score = Math.round(summary.score);
    return [
      {
        key,
        score,
        average: Math.round(summary.city_avg ?? score),
        percentile: summary.percentile,
        weight: summary.weight,
        isFlat: isFlatDistribution(summary),
      },
    ];
  });
}

export type ZonePosition = 'unknown' | 'top' | 'above' | 'average' | 'below';

export function zonePosition(percentile: number | null): ZonePosition {
  if (percentile === null) return 'unknown';
  if (percentile >= 90) return 'top';
  if (percentile >= 60) return 'above';
  if (percentile >= 40) return 'average';
  return 'below';
}

export function weakestCategory(scored: readonly ScoredCategory[]): ScoredCategory | undefined {
  const lowest = [...scored].sort((left, right) => left.score - right.score)[0];
  return lowest && lowest.score < WEAK_POINT_BELOW ? lowest : undefined;
}

function byLead(scored: readonly ScoredCategory[]): ScoredCategory[] {
  return [...scored].sort(
    (left, right) => right.score - right.average - (left.score - left.average),
  );
}

export function strongestCategories(scored: readonly ScoredCategory[]): ScoredCategory[] {
  const weak = weakestCategory(scored);
  return byLead(scored)
    .filter((item) => item.key !== weak?.key && item.score > item.average)
    .slice(0, 2);
}

export function highlights(scored: readonly ScoredCategory[]): {
  good: ScoredCategory[];
  watch: ScoredCategory[];
} {
  const sorted = byLead(scored);
  return {
    good: sorted.slice(0, HIGHLIGHTS),
    watch: sorted.slice(HIGHLIGHTS).slice(-HIGHLIGHTS).reverse(),
  };
}

export type CardTitleKind = 'flat' | 'farAbove' | 'above' | 'below' | 'atAverage';

export function cardTitleKind(item: ScoredCategory): CardTitleKind {
  if (item.isFlat) return 'flat';
  if (item.score > item.average) {
    return (item.percentile ?? 0) >= FAR_ABOVE_PERCENTILE ? 'farAbove' : 'above';
  }
  if (item.score < item.average) return 'below';
  return 'atAverage';
}

export type StandingKind =
  | { kind: 'flat' }
  | { kind: 'none' }
  | { kind: 'best' }
  | { kind: 'worst' }
  | { kind: 'better'; percent: number };

export function standing(item: ScoredCategory): StandingKind {
  if (item.isFlat) return { kind: 'flat' };
  if (item.percentile === null) return { kind: 'none' };
  if (item.percentile >= 99) return { kind: 'best' };
  if (item.percentile <= 1) return { kind: 'worst' };
  return { kind: 'better', percent: Math.round(item.percentile) };
}

export type CityDifference =
  { kind: 'flat' } | { kind: 'atAverage' } | { kind: 'up' | 'down'; points: number };

export function cityDifference(item: ScoredCategory): CityDifference {
  const delta = item.score - item.average;
  if (item.isFlat) return { kind: 'flat' };
  if (Math.abs(delta) < AT_AVERAGE_WITHIN) return { kind: 'atAverage' };
  return { kind: delta > 0 ? 'up' : 'down', points: Math.abs(delta) };
}

function weightShares(scored: readonly ScoredCategory[]): Map<ReportCategoryKey, number> {
  const total = scored.reduce((sum, item) => sum + item.weight, 0) || 1;
  return new Map(scored.map((item) => [item.key, (item.weight / total) * 100]));
}

export type FormationPart = { key: ReportCategoryKey; points: number };

export function formation(scored: readonly ScoredCategory[]): {
  parts: FormationPart[];
  lost: number;
} {
  const shares = weightShares(scored);
  const parts = scored
    .map((item) => ({ key: item.key, points: (item.score * (shares.get(item.key) ?? 0)) / 100 }))
    .sort((left, right) => (shares.get(right.key) ?? 0) - (shares.get(left.key) ?? 0));
  const lost = Math.max(0, 100 - parts.reduce((sum, part) => sum + part.points, 0));
  return { parts, lost };
}

export type ZoneStanding = {
  ownBin: number;
  binSize: number;
  zones: number;
  belowPercent: number;
  atLeast: number;
};

export function zoneStanding(histogram: readonly number[], score: number): ZoneStanding {
  const bins = Math.max(histogram.length, 1);
  const binSize = 100 / bins;
  const ownBin = Math.min(bins - 1, Math.floor(score / binSize));
  const zones = histogram.reduce((sum, count) => sum + count, 0);
  const below = histogram.slice(0, ownBin).reduce((sum, count) => sum + count, 0);
  return {
    ownBin,
    binSize,
    zones,
    belowPercent: zones === 0 ? 0 : Math.floor((below / zones) * 100),
    atLeast: zones - below,
  };
}
