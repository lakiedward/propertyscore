import { weightedScore } from '../components.ts';
import type { FifteenMinuteParams } from './fifteen-minute.params.ts';

export type CategoryAccess = {
  key: string;
  tNearestS: number | null;
  n5: number;
  n10: number;
  n15: number;
};

type CategoryResult = {
  t1_min: number | null;
  n5: number;
  n10: number;
  n15: number;
  s: number | null;
};

export type FifteenMinuteResult = {
  score: number | null;
  covered: number;
  total: number;
  categories: Record<string, CategoryResult>;
};

type Proximity = FifteenMinuteParams['proximity'];

export function proximity(minutes: number, curve: Proximity): number {
  if (minutes <= curve.full_min) return 1;
  if (minutes > curve.limit_min) return 0;
  const span = curve.limit_min - curve.full_min;
  return 1 - ((1 - curve.value_at_limit) * (minutes - curve.full_min)) / span;
}

export function categoryPoints(
  access: CategoryAccess,
  enough: number,
  params: Pick<FifteenMinuteParams, 'proximity' | 'nearest_weight' | 'choice_weight'>,
): number {
  const nearest =
    access.tNearestS === null ? 0 : proximity(access.tNearestS / 60, params.proximity);
  const choice = Math.min(1, access.n15 / enough);
  const total = params.nearest_weight + params.choice_weight;
  return (params.nearest_weight * nearest + params.choice_weight * choice) / total;
}

export function fifteenMinuteScore(
  access: ReadonlyMap<string, CategoryAccess>,
  coveredKeys: ReadonlySet<string>,
  params: FifteenMinuteParams,
): FifteenMinuteResult {
  const categories: Record<string, CategoryResult> = {};
  const components = params.categories.map((category) => {
    const measured = access.get(category.key);
    const isCovered = coveredKeys.has(category.key) && measured !== undefined;
    const points = isCovered ? categoryPoints(measured, category.enough, params) : null;
    categories[category.key] = {
      t1_min: measured?.tNearestS == null ? null : Math.round(measured.tNearestS / 6) / 10,
      n5: measured?.n5 ?? 0,
      n10: measured?.n10 ?? 0,
      n15: measured?.n15 ?? 0,
      s: points === null ? null : Math.round(points * 1000) / 1000,
    };
    return { key: category.key, weight: category.weight, points };
  });
  const scored = params.categories.filter(
    (category) => coveredKeys.has(category.key) && access.has(category.key),
  );
  const covered = scored.filter((category) => {
    const seconds = access.get(category.key)?.tNearestS;
    return seconds != null && seconds <= params.proximity.limit_min * 60;
  }).length;
  return { score: weightedScore(components), covered, total: scored.length, categories };
}
