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

export function parkWalkMinutes(metres: number): number {
  return Math.max(1, Math.round(metres / WALK_METRES_PER_MINUTE));
}

export function listedParks(section: Green): GreenPark[] {
  const byDistance = [...section.parks].sort((left, right) => left.walk_m - right.walk_m);
  const large = byDistance.filter((park) => park.area_ha >= LARGE_PARK_HA);
  return (large.length > 0 ? large : byDistance).slice(0, LISTED_PARKS);
}

export function parksSummary(parks: readonly GreenPark[]) {
  const farthest = parks.reduce<GreenPark | undefined>(
    (far, park) => (!far || park.walk_m > far.walk_m ? park : far),
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

export function framingBounds(points: readonly LngLat[]): LngLatBounds {
  const longitudes = points.map(([longitude]) => longitude);
  const latitudes = points.map(([, latitude]) => latitude);
  return [
    [
      Math.min(...longitudes) - FRAME_PADDING_DEGREES,
      Math.min(...latitudes) - FRAME_PADDING_DEGREES,
    ],
    [
      Math.max(...longitudes) + FRAME_PADDING_DEGREES,
      Math.max(...latitudes) + FRAME_PADDING_DEGREES,
    ],
  ];
}
