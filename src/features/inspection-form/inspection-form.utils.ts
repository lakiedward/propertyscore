import type { VersionItem } from './inspection-form.types';

export const WEIGHT_TOTAL = 100;

const WEIGHT_MAX_DIGITS = 3;

export function weightDigits(value: string): string {
  return value.replace(/\D/gu, '').slice(0, WEIGHT_MAX_DIGITS);
}

export function parseWeight(value: string): number {
  const digits = weightDigits(value);
  return digits === '' ? 0 : Math.min(Number(digits), WEIGHT_TOTAL);
}

export function weightSum(weights: readonly number[]): number {
  return weights.reduce((sum, weight) => sum + weight, 0);
}

export function moveItemTo<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items];
  if (from < 0 || from >= next.length || to < 0 || to >= next.length) {
    return next;
  }
  const [moved] = next.splice(from, 1);
  if (moved !== undefined) {
    next.splice(to, 0, moved);
  }
  return next;
}

export function moveItem<T>(items: readonly T[], index: number, offset: -1 | 1): T[] {
  return moveItemTo(items, index, index + offset);
}

export function orderByIds<T extends { id: string }>(
  items: readonly T[],
  ids: readonly string[],
): T[] {
  const position = new Map(ids.map((id, index) => [id, index]));
  return [...items].sort(
    (first, second) =>
      (position.get(first.id) ?? Number.MAX_SAFE_INTEGER) -
      (position.get(second.id) ?? Number.MAX_SAFE_INTEGER),
  );
}

export function questionWeightTotals(
  questions: readonly { category_id: string; weight: number }[],
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const question of questions) {
    totals[question.category_id] = (totals[question.category_id] ?? 0) + question.weight;
  }
  return totals;
}

export function isSameOrder(items: readonly { id: string }[], ids: readonly string[]): boolean {
  return items.length === ids.length && items.every((item, index) => item.id === ids[index]);
}

type NumberedVersion = { version: number; status: string };

function nextVersionNumber(
  versions: readonly NumberedVersion[],
  step: number,
  base: number,
): number {
  const draft = versions.find((version) => version.status === 'draft');
  if (draft) {
    return draft.version;
  }
  const highest = versions.reduce((max, version) => Math.max(max, version.version), base);
  return Math.round((highest + step) * 10) / 10;
}

export function nextConsentVersion(versions: readonly NumberedVersion[]): number {
  return nextVersionNumber(versions, 0.1, 0.9);
}

export function nextFormVersion(versions: readonly NumberedVersion[]): number {
  return nextVersionNumber(versions, 1, 0);
}

export type ListedVersion = {
  id: string;
  version: number;
  status: VersionItem['status'];
  published_at: string | null;
  archived_at: string | null;
  updated_at: string;
};

export function toVersionItems(
  versions: readonly ListedVersion[],
  usageCounts: Readonly<Record<string, number>>,
  label: (version: number) => string,
): VersionItem[] {
  return versions.map((version) => ({
    id: version.id,
    label: label(version.version),
    status: version.status,
    publishedAt: version.published_at,
    archivedAt: version.archived_at,
    updatedAt: version.updated_at,
    inspectionCount: usageCounts[version.id] ?? 0,
  }));
}

type ResolvableVersion = { id: string; status: VersionItem['status'] };

export function resolveVersions<Version extends ResolvableVersion>(
  versions: readonly Version[],
  viewedId: string | null,
) {
  const draft = versions.find((version) => version.status === 'draft') ?? null;
  const published = versions.find((version) => version.status === 'published') ?? null;
  const viewed = versions.find((version) => version.id === viewedId) ?? null;
  return { draft, published, shown: viewed ?? draft ?? published };
}

export function toUsageCounts<IdColumn extends string>(
  rows: readonly (Record<IdColumn, string> & { inspection_count: number })[],
  idColumn: IdColumn,
): Record<string, number> {
  return Object.fromEntries(rows.map((row) => [row[idColumn], row.inspection_count]));
}

export function changedSections<Section>(
  sections: readonly Section[],
  dirty: readonly (object | undefined)[] | undefined,
): Section[] {
  return sections.filter((_, index) => Object.keys(dirty?.[index] ?? {}).length > 0);
}
