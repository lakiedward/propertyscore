export const WEIGHT_TOTAL = 100;

export function parseWeight(value: string): number {
  const digits = value.replace(/\D/gu, '').slice(0, 3);
  return digits === '' ? 0 : Math.min(Number(digits), WEIGHT_TOTAL);
}

export function weightSum(weights: readonly number[]): number {
  return weights.reduce((sum, weight) => sum + weight, 0);
}

export function moveItem<T>(items: readonly T[], index: number, offset: -1 | 1): T[] {
  const target = index + offset;
  if (target < 0 || target >= items.length) {
    return [...items];
  }
  const next = [...items];
  const [moved] = next.splice(index, 1);
  if (moved !== undefined) {
    next.splice(target, 0, moved);
  }
  return next;
}
