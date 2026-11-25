import type { LngLat, LngLatBounds } from '@/components/map/map.config';
import type { MapFeatureCollection } from '@/components/map/map-canvas';
import { areaCollection } from './report-map.utils';
import type { ReportResult } from './report.types';

type Green = NonNullable<ReportResult['sections']['green']>;
export type GreenPark = Green['parks'][number];

const LISTED_PARKS = 9;
const LARGE_PARK_HA = 1;
const WALK_METRES_PER_MINUTE = 80;
const FRAME_PADDING_DEGREES = 0.0015;

export const GREEN_AMENITIES = ['playground', 'dog_park', 'sports'] as const;

function walkDuration(park: Pick<GreenPark, 'walk_m' | 'walk_seconds'>): number {
  return park.walk_seconds === undefined
    ? park.walk_m / WALK_METRES_PER_MINUTE
    : park.walk_seconds / 60;
}

export function parkWalkMinutes(park: Pick<GreenPark, 'walk_m' | 'walk_seconds'>): number {
  return Math.max(1, Math.round(walkDuration(park)));
}

export function listedParks(section: Green): GreenPark[] {
  const byWalkDuration = [...section.parks].sort(
    (left, right) => walkDuration(left) - walkDuration(right),
  );
  const large = byWalkDuration.filter((park) => park.area_ha >= LARGE_PARK_HA);
  return (large.length > 0 ? large : byWalkDuration).slice(0, LISTED_PARKS);
}

export function parksSummary(parks: readonly GreenPark[]) {
  const farthest = parks.reduce<GreenPark | undefined>(
    (far, park) => (!far || walkDuration(park) > walkDuration(far) ? park : far),
    undefined,
  );
  const biggest = parks.reduce<GreenPark | undefined>(
    (big, park) => (!big || park.area_ha > big.area_ha ? park : big),
    undefined,
  );
  return {
    farthest,
    biggest,
    totalHa: parks.reduce((sum, park) => sum + park.area_ha, 0),
  };
}

export function areasOf(section: Green, parkIds: readonly string[]): MapFeatureCollection {
  const wanted = new Set(parkIds);
  return areaCollection(
    section.areas.features
      .filter((feature) => {
        const id = feature.properties?.id;
        return typeof id === 'string' && wanted.has(id);
      })
      .map((feature) => feature.geometry),
  );
}

export function framingBounds(
  points: readonly LngLat[],
  areas?: MapFeatureCollection,
): LngLatBounds {
  const polygonPoints =
    areas?.features.flatMap(({ geometry }) => {
      if (geometry.type === 'Polygon') return geometry.coordinates.flat();
      if (geometry.type === 'MultiPolygon') return geometry.coordinates.flat(2);
      return [];
    }) ?? [];
  let west = Infinity;
  let east = -Infinity;
  let south = Infinity;
  let north = -Infinity;
  for (const [longitude, latitude] of [...points, ...polygonPoints]) {
    west = Math.min(west, longitude);
    east = Math.max(east, longitude);
    south = Math.min(south, latitude);
    north = Math.max(north, latitude);
  }
  return [
    [west - FRAME_PADDING_DEGREES, south - FRAME_PADDING_DEGREES],
    [east + FRAME_PADDING_DEGREES, north + FRAME_PADDING_DEGREES],
  ];
}
