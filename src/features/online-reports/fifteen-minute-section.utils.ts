import type { FifteenMinutePlace, FifteenMinuteSection } from './online-report.types';

export function nearestPerGroup(section: FifteenMinuteSection): FifteenMinutePlace[] {
  const groupOf = new Map(section.categories.map((category) => [category.key, category.group]));
  const nearest = new Map<string, FifteenMinutePlace>();
  for (const place of section.places) {
    const group = groupOf.get(place.category) ?? 'other';
    const current = nearest.get(group);
    if (!current || place.minutes < current.minutes) nearest.set(group, place);
  }
  return [...nearest.values()].sort((left, right) => left.minutes - right.minutes);
}

export function placesWithin(section: FifteenMinuteSection): number {
  return section.categories.reduce((sum, category) => sum + category.n15, 0);
}
