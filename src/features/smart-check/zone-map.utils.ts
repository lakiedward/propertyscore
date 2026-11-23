import type { LngLat } from '@/components/map/map.config';
import { decodePolyline6 } from '@/components/report/report-map.utils';
import type { ReportHue } from '@/components/report/report-hues';
import type { ReportResult } from './report.types';

export const ZONE_LAYERS = ['green', 'fifteen', 'ring'] as const;

export type ZoneLayer = (typeof ZONE_LAYERS)[number];

const PLACE_GROUPS = [
  'shops',
  'food_drink',
  'services',
  'pharmacies',
  'medical',
  'schools',
  'parks',
  'sport',
  'culture',
] as const;

type PlaceGroup = (typeof PLACE_GROUPS)[number];

const PLACE_GROUP_HUES: Readonly<Record<PlaceGroup, ReportHue>> = {
  shops: 'fifteenMinute',
  food_drink: 'accessibility',
  services: 'industry',
  pharmacies: 'health',
  medical: 'health',
  schools: 'education',
  parks: 'green',
  sport: 'safety',
  culture: 'air',
};

const WALK_ROUTE_LIMIT = 5;

export type ZoneRoute = {
  id: string;
  mode: 'walk' | 'transit';
  name: string | null;
  group: PlaceGroup | null;
  hue: ReportHue;
  minutes: number;
  lines: LngLat[][];
};

function isPlaceGroup(value: string | undefined): value is PlaceGroup {
  return PLACE_GROUPS.some((group) => group === value);
}

export function walkRoutes(result: ReportResult): ZoneRoute[] {
  const section = result.sections.fifteen_minute;
  if (!section) return [];
  const groupOf = new Map(section.categories.map((category) => [category.key, category.group]));
  const places = new Map(section.places.map((place) => [place.id, place]));
  const nearest = new Map<PlaceGroup, ZoneRoute>();
  for (const route of section.routes) {
    const place = places.get(route.place_id);
    const group = groupOf.get(place?.category ?? '');
    if (!place || route.minutes <= 0 || !isPlaceGroup(group)) continue;
    const current = nearest.get(group);
    if (current && current.minutes <= route.minutes) continue;
    nearest.set(group, {
      id: route.place_id,
      mode: 'walk',
      name: place.name,
      group,
      hue: PLACE_GROUP_HUES[group],
      minutes: route.minutes,
      lines: [decodePolyline6(route.polyline6)],
    });
  }
  return [...nearest.values()]
    .sort((left, right) => left.minutes - right.minutes)
    .slice(0, WALK_ROUTE_LIMIT);
}

export function transitRoutes(result: ReportResult, language: 'ro' | 'en'): ZoneRoute[] {
  const section = result.sections.accessibility;
  if (!section) return [];
  return section.destinations
    .flatMap((destination) =>
      destination.minutes === null || destination.path.length === 0
        ? []
        : [
            {
              id: destination.id,
              mode: 'transit' as const,
              name: destination.label[language],
              group: null,
              hue: 'noise' as const,
              minutes: destination.minutes,
              lines: destination.path.map((leg) =>
                leg.coordinates.map(([longitude, latitude]): LngLat => [longitude, latitude]),
              ),
            },
          ],
    )
    .sort((left, right) => left.minutes - right.minutes);
}

export function routeEnd(route: ZoneRoute): LngLat | undefined {
  return route.lines.at(-1)?.at(-1);
}
