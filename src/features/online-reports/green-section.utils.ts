import type { GreenComponent, GreenPark } from './online-report.types';

const WALK_METERS_PER_MINUTE = 80;

export const PARK_FILTERS = ['playground', 'dog_park', 'large'] as const;

export type ParkFilter = (typeof PARK_FILTERS)[number];

export function walkMinutes(walkM: number): number {
  return Math.max(1, Math.round(walkM / WALK_METERS_PER_MINUTE));
}

export function waffleCells(share: number): number {
  return Math.min(100, Math.max(0, Math.round(share * 100)));
}

export function discAreaPerPercent(radiusM: number): number {
  return Math.round((Math.PI * radiusM * radiusM) / 100);
}

export function shareFor(shares: Readonly<Record<string, number>>, radiusM: number): number {
  return shares[String(radiusM)] ?? 0;
}

function matchesFilter(park: GreenPark, filter: ParkFilter, largeMinHa: number): boolean {
  if (filter === 'large') return park.area_ha >= largeMinHa;
  return park.amenities.includes(filter);
}

export function filterParks(
  parks: readonly GreenPark[],
  filters: ReadonlySet<ParkFilter>,
  largeMinHa: number,
): GreenPark[] {
  return parks.filter((park) =>
    [...filters].every((filter) => matchesFilter(park, filter, largeMinHa)),
  );
}

export function parkFilterCounts(
  parks: readonly GreenPark[],
  largeMinHa: number,
): Record<ParkFilter, number> {
  const count = (filter: ParkFilter) =>
    parks.filter((park) => matchesFilter(park, filter, largeMinHa)).length;
  return { playground: count('playground'), dog_park: count('dog_park'), large: count('large') };
}

export type ComponentShare = GreenComponent & {
  earned: number;
  available: number;
};

export function componentShares(components: readonly GreenComponent[]): ComponentShare[] {
  const scoredWeight = components.reduce(
    (sum, component) => sum + (component.points === null ? 0 : component.weight),
    0,
  );
  return components.map((component) => {
    if (component.points === null || scoredWeight === 0) {
      return { ...component, earned: 0, available: 0 };
    }
    const available = (100 * component.weight) / scoredWeight;
    return { ...component, earned: available * component.points, available };
  });
}

export function biggestGain(
  shares: readonly ComponentShare[],
): { key: GreenComponent['key']; points: number } | undefined {
  const ranked = shares
    .filter((share) => share.points !== null)
    .map((share) => ({ key: share.key, points: Math.round(share.available - share.earned) }))
    .sort((left, right) => right.points - left.points);
  const [first] = ranked;
  return first && first.points >= 1 ? first : undefined;
}
