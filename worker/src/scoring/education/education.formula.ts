import { linearPoints, weightedScore } from '../components.ts';
import { SCORED_LEVELS, type LevelParams, type ScoredLevel } from './education.params.ts';

export type ReachableUnit = {
  institutionId: string;
  entity: string;
  minutes: number;
};

export type LevelAccess = {
  t1: number | null;
  t2: number | null;
  points: number;
};

export function distancePoints(minutes: number | null, level: LevelParams): number {
  if (minutes === null) return 0;
  return linearPoints(minutes, level.zero_min, level.full_min);
}

export function nearestTwo(units: readonly ReachableUnit[]): {
  first: ReachableUnit | null;
  second: ReachableUnit | null;
} {
  const sorted = [...units].sort(
    (a, b) => a.minutes - b.minutes || a.institutionId.localeCompare(b.institutionId),
  );
  const first = sorted[0] ?? null;
  if (!first) return { first: null, second: null };
  const second = sorted.find((unit) => unit.entity !== first.entity) ?? null;
  return { first, second };
}

export function levelAccess(
  units: readonly ReachableUnit[],
  level: LevelParams,
  choiceWeight: number,
): LevelAccess {
  const { first, second } = nearestTwo(units);
  const t1 = first?.minutes ?? null;
  const t2 = second?.minutes ?? null;
  const points =
    (1 - choiceWeight) * distancePoints(t1, level) + choiceWeight * distancePoints(t2, level);
  return { t1, t2, points };
}

export function educationScore(
  access: Record<ScoredLevel, LevelAccess>,
  levels: Record<ScoredLevel, LevelParams>,
): number | null {
  return weightedScore(
    SCORED_LEVELS.map((key) => ({
      key,
      weight: levels[key].weight,
      points: access[key].points,
    })),
  );
}

export function countWithin(
  units: readonly ReachableUnit[],
  bandsMin: readonly number[],
): Record<string, number> {
  const nearestByInstitution = new Map<string, number>();
  for (const unit of units) {
    const known = nearestByInstitution.get(unit.institutionId);
    if (known === undefined || unit.minutes < known) {
      nearestByInstitution.set(unit.institutionId, unit.minutes);
    }
  }
  const minutes = [...nearestByInstitution.values()];
  return Object.fromEntries(
    bandsMin.map((band) => [`m${band}`, minutes.filter((value) => value <= band).length]),
  );
}
