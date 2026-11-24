import type { FormCategory, FormQuestion } from './inspection-form.types';

export const WEIGHT_TOTAL = 100;

export function parseWeight(value: string): number {
  const digits = value.replace(/\D/gu, '').slice(0, 3);
  return digits === '' ? 0 : Math.min(Number(digits), WEIGHT_TOTAL);
}

export function weightSum(weights: readonly number[]): number {
  return weights.reduce((sum, weight) => sum + weight, 0);
}

export function questionsByCategory(
  categories: readonly FormCategory[],
  questions: readonly FormQuestion[],
) {
  let number = 0;
  return categories.map((category) => {
    const ordered = questions
      .filter((question) => question.category_id === category.id)
      .toSorted((first, second) => first.position - second.position)
      .map((question) => {
        number += 1;
        return { ...question, number: String(number).padStart(2, '0') };
      });
    return { category, questions: ordered };
  });
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

export function consentVersionLabel(version: number): string {
  const tenths = Math.round(version * 10);
  return `${String(Math.trunc(tenths / 10))}.${String(tenths % 10)}`;
}
