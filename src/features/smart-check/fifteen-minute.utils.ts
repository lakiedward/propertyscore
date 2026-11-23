import {
  CoffeeIcon,
  DumbbellIcon,
  GraduationCapIcon,
  HeartPulseIcon,
  LandmarkIcon,
  PillIcon,
  ShoppingBagIcon,
  TicketIcon,
  TreesIcon,
  type LucideIcon,
} from 'lucide-react';
import { formatDate } from '@/i18n/format';
import type { LngLat, LngLatBounds } from '@/components/map/map.config';
import type { MapFeatureCollection } from '@/components/map/map-canvas';
import { boundsAround } from '@/components/report/report-map.utils';
import { areaCollection } from './report-map.utils';
import type { ReportSections } from './report.types';

export type FifteenMinuteSection = NonNullable<ReportSections['fifteen_minute']>;
type Group = FifteenMinuteSection['groups'][number];
type Place = FifteenMinuteSection['places'][number];

export const WALK_LIMIT_MIN = 15;
const TILE_COUNT = 8;
const MORE_THAN_TYPICAL = 1.5;
const DEFAULT_WALK_SPEED_KMH = 4.5;
const MIN_MAP_RADIUS_M = 700;
const SMOOTHING_ROUNDS = 3;

export const FAMILIES = ['shop', 'health', 'kids', 'green', 'services', 'outing'] as const;

export type Family = (typeof FAMILIES)[number];

export type FamilyStyle = { color: string; surface: string };

export const FAMILY_STYLES: Readonly<Record<Family, FamilyStyle>> = {
  shop: { color: '--ps-coral-600', surface: '--ps-coral-100' },
  health: { color: '--ps-rose-600', surface: '--ps-rose-100' },
  kids: { color: '--ps-sky-600', surface: '--ps-sky-100' },
  green: { color: '--ps-leaf-600', surface: '--ps-leaf-100' },
  services: { color: '--ps-steel-600', surface: '--ps-steel-100' },
  outing: { color: '--ps-violet-600', surface: '--ps-violet-100' },
};

type GroupMeta = { family: Family; icon: LucideIcon };

const GROUP_META: Readonly<Record<string, GroupMeta>> = {
  shops: { family: 'shop', icon: ShoppingBagIcon },
  food_drink: { family: 'outing', icon: CoffeeIcon },
  services: { family: 'services', icon: LandmarkIcon },
  pharmacies: { family: 'health', icon: PillIcon },
  medical: { family: 'health', icon: HeartPulseIcon },
  schools: { family: 'kids', icon: GraduationCapIcon },
  parks: { family: 'green', icon: TreesIcon },
  sport: { family: 'green', icon: DumbbellIcon },
  culture: { family: 'outing', icon: TicketIcon },
};

export function categoryFamily(section: FifteenMinuteSection, categoryKey: string): Family {
  const group = section.categories.find((category) => category.key === categoryKey)?.group;
  return (group ? GROUP_META[group]?.family : undefined) ?? 'services';
}

export function walkMetersPerMinute(section: FifteenMinuteSection): number {
  return Math.round(((section.walk_speed_kmh ?? DEFAULT_WALK_SPEED_KMH) * 1000) / 60);
}

export type ChecklistRow = {
  key: string;
  family: Family;
  isReached: boolean;
  minutes: number | null;
  count: number;
  nearest: Place | undefined;
};

export function nearestPlace(
  section: FifteenMinuteSection,
  categoryKey: string,
): Place | undefined {
  return section.places
    .filter((place) => place.category === categoryKey)
    .sort((left, right) => left.minutes - right.minutes)[0];
}

export function checklistRows(section: FifteenMinuteSection): ChecklistRow[] {
  return [...section.categories]
    .sort((left, right) => (left.t1_min ?? Infinity) - (right.t1_min ?? Infinity))
    .map((category) => ({
      key: category.key,
      family: categoryFamily(section, category.key),
      isReached: category.t1_min !== null && category.t1_min <= WALK_LIMIT_MIN,
      minutes: category.t1_min === null ? null : Math.max(1, Math.round(category.t1_min)),
      count: category.n15,
      nearest: nearestPlace(section, category.key),
    }));
}

export type Comparison =
  { kind: 'rare' } | { kind: 'many'; ratio: number } | { kind: 'fewer' } | { kind: 'same' };

export type ChoiceTile = {
  key: string;
  icon: LucideIcon;
  family: Family;
  count: number;
  typical: number | null;
  comparison: Comparison | null;
};

export function roundedRatio(ratio: number): number {
  return ratio >= 10 ? Math.round(ratio) : Math.round(ratio * 2) / 2;
}

export function compareToTypical(
  count: number,
  typical: number | null | undefined,
): Comparison | null {
  if (typical === null || typical === undefined) return null;
  if (typical === 0) return { kind: 'rare' };
  const ratio = count / typical;
  if (ratio >= MORE_THAN_TYPICAL) return { kind: 'many', ratio: roundedRatio(ratio) };
  if (ratio <= 1 / MORE_THAN_TYPICAL) return { kind: 'fewer' };
  return { kind: 'same' };
}

function toTile(group: Group, meta: GroupMeta): ChoiceTile {
  return {
    key: group.key,
    icon: meta.icon,
    family: meta.family,
    count: group.n15,
    typical: group.typical_n15 ?? null,
    comparison: compareToTypical(group.n15, group.typical_n15),
  };
}

export function choiceTiles(section: FifteenMinuteSection): ChoiceTile[] {
  return section.groups
    .filter((group) => group.n15 > 0 && GROUP_META[group.key] !== undefined)
    .sort((left, right) => right.n15 - left.n15)
    .slice(0, TILE_COUNT)
    .flatMap((group) => {
      const meta = GROUP_META[group.key];
      return meta ? [toTile(group, meta)] : [];
    });
}

export type FewerGroup = { key: string; count: number; typical: number };

export function fewerThanTypical(section: FifteenMinuteSection): FewerGroup[] {
  const shown = new Set(choiceTiles(section).map((tile) => tile.key));
  return section.groups.flatMap((group) => {
    const typical = group.typical_n15;
    if (shown.has(group.key) || GROUP_META[group.key] === undefined) return [];
    if (typical === null || typical === undefined || group.n15 >= typical) return [];
    return [{ key: group.key, count: group.n15, typical }];
  });
}

function zonePoints(section: FifteenMinuteSection): LngLat[] {
  const widest = widestIsochrone(section);
  if (!widest) return [];
  return areaCollection([widest.geometry]).features.flatMap((feature) => {
    const { geometry } = feature;
    if (geometry.type === 'Polygon') return geometry.coordinates.flat();
    if (geometry.type === 'MultiPolygon') return geometry.coordinates.flat(2);
    return [];
  });
}

export function placeBounds(center: LngLat, section: FifteenMinuteSection): LngLatBounds {
  const [[minLng, minLat], [maxLng, maxLat]] = boundsAround(center, MIN_MAP_RADIUS_M);
  const points = [
    ...section.places.map((place): LngLat => [place.lng, place.lat]),
    ...zonePoints(section),
  ];
  return [
    [
      Math.min(minLng, ...points.map(([lng]) => lng)),
      Math.min(minLat, ...points.map(([, lat]) => lat)),
    ],
    [
      Math.max(maxLng, ...points.map(([lng]) => lng)),
      Math.max(maxLat, ...points.map(([, lat]) => lat)),
    ],
  ];
}

export function widestIsochrone(
  section: FifteenMinuteSection,
): FifteenMinuteSection['isochrones'][number] | undefined {
  return [...section.isochrones].sort((left, right) => right.minutes - left.minutes)[0];
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const SOURCE_DATE_FORMAT = { day: 'numeric', month: 'short', year: 'numeric' } as const;

export function formatSourceDate(value: string): string {
  return ISO_DATE.test(value) ? formatDate(value, SOURCE_DATE_FORMAT) : value;
}

type Ring = readonly (readonly [number, number])[];

function smoothRing(ring: Ring, rounds: number): [number, number][] {
  let points = ring.slice(0, -1).map(([lng, lat]): [number, number] => [lng, lat]);
  for (let round = 0; round < rounds; round += 1) {
    points = points.flatMap((point, index): [number, number][] => {
      const next = points[(index + 1) % points.length] ?? point;
      return [
        [0.75 * point[0] + 0.25 * next[0], 0.75 * point[1] + 0.25 * next[1]],
        [0.25 * point[0] + 0.75 * next[0], 0.25 * point[1] + 0.75 * next[1]],
      ];
    });
  }
  const [first] = points;
  return first ? [...points, first] : points;
}

export function smoothAreas(collection: MapFeatureCollection): MapFeatureCollection {
  return {
    ...collection,
    features: collection.features.map((feature) => {
      const { geometry } = feature;
      if (geometry.type === 'Polygon') {
        return {
          ...feature,
          geometry: {
            type: 'Polygon',
            coordinates: geometry.coordinates.map((ring) => smoothRing(ring, SMOOTHING_ROUNDS)),
          },
        };
      }
      if (geometry.type === 'MultiPolygon') {
        return {
          ...feature,
          geometry: {
            type: 'MultiPolygon',
            coordinates: geometry.coordinates.map((polygon) =>
              polygon.map((ring) => smoothRing(ring, SMOOTHING_ROUNDS)),
            ),
          },
        };
      }
      return feature;
    }),
  };
}
