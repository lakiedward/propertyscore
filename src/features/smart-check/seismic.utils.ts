import type { LngLat } from '@/components/map/map.config';
import type { ReportResult } from './report.types';

type Seismic = NonNullable<ReportResult['sections']['seismic']>;
export type SeismicEarthquakes = NonNullable<Seismic['earthquakes']>;
export type SeismicEarthquake = SeismicEarthquakes['events'][number];

export const SEISMIC_COLOR = 'var(--ps-amber-800)';
export const SEISMIC_COLOR_DARK = 'color-mix(in oklab, var(--ps-amber-800) 70%, black)';
export const SEISMIC_TINT = 'color-mix(in oklab, var(--ps-amber-200) 35%, var(--card))';
export const SEISMIC_LEVEL_FILLS: Readonly<Record<string, string>> = {
  low: 'var(--ps-green-100)',
  moderate: 'color-mix(in oklab, var(--ps-amber-200) 35%, var(--card))',
  high: 'color-mix(in oklab, var(--ps-amber-200) 80%, var(--ps-amber-800))',
  very_high: 'color-mix(in oklab, var(--ps-amber-200) 40%, var(--ps-amber-800))',
};
export const SEISMIC_SCALE_BANDS = [
  { from: 0, to: 16.67, level: 'low' },
  { from: 16.67, to: 50, level: 'moderate' },
  { from: 50, to: 83.33, level: 'high' },
  { from: 83.33, to: 100, level: 'very_high' },
] as const;

export const LISTED_EARTHQUAKES = 6;
const SCALE_MIN_G = 0.05;
const SCALE_SPAN_G = 0.3;
const SHARED_LABEL_KM = 4;
const KM_PER_DEGREE = 111.2;
const MARKER_SIZE_PER_MAGNITUDE = 14;

export function strongestEarthquakes(
  earthquakes: SeismicEarthquakes,
  limit = LISTED_EARTHQUAKES,
): SeismicEarthquake[] {
  return [...earthquakes.events]
    .sort((left, right) => right.magnitude - left.magnitude || left.distance_km - right.distance_km)
    .slice(0, limit);
}

function kilometresApart(left: SeismicEarthquake, right: SeismicEarthquake): number {
  const latitude = ((left.location[1] + right.location[1]) / 2) * (Math.PI / 180);
  const dx = (left.location[0] - right.location[0]) * Math.cos(latitude);
  const dy = left.location[1] - right.location[1];
  return Math.hypot(dx, dy) * KM_PER_DEGREE;
}

export function markerLabels(
  top: readonly SeismicEarthquake[],
): Map<SeismicEarthquake, string | null> {
  const anchors: SeismicEarthquake[] = [];
  const labels = new Map<SeismicEarthquake, string | null>();
  for (const event of top) {
    const isShared = anchors.some((kept) => kilometresApart(kept, event) <= SHARED_LABEL_KM);
    if (isShared) {
      labels.set(event, null);
    } else {
      anchors.push(event);
      labels.set(event, event.date.slice(0, 4));
    }
  }
  return labels;
}

export function earthquakeMarkerSize(magnitude: number): number {
  return Math.max(6, (magnitude - 3) * MARKER_SIZE_PER_MAGNITUDE);
}

export function listedMagnitudeSize(magnitude: number): number {
  return Math.round(26 + (magnitude - 4) * 10);
}

export function scalePosition(value: number): number {
  return Math.min(100, Math.max(0, ((value - SCALE_MIN_G) / SCALE_SPAN_G) * 100));
}

export type SeismicScaleGroup = {
  value: number;
  isHere: boolean;
  slugs: string[];
};

export function scaleGroups(seismic: Seismic, citySlug: string): SeismicScaleGroup[] {
  const values = [...new Set(seismic.comparison.map((city) => city.ag_g))].sort(
    (left, right) => right - left,
  );
  return values.map((value) => {
    const slugs = seismic.comparison
      .filter((city) => city.ag_g === value)
      .sort((left, right) => Number(right.slug === citySlug) - Number(left.slug === citySlug))
      .map((city) => city.slug);
    return { value, isHere: slugs.includes(citySlug) && value === seismic.ag_g, slugs };
  });
}

export function citySlugLabelKey(slug: string): string {
  return `report.chapters.seismic.cities.${slug}`;
}

const BUILDING_PERIOD_CODES: Readonly<Record<string, readonly string[]>> = {
  before_1963: [],
  p13: ['P13-63', 'P13-70'],
  p100_1978: ['P100-78', 'P100-81', 'P100-90'],
  p100_1992: ['P100-92'],
  p100_2006: ['P100-1/2006', 'P100-1/2013'],
};

export function buildingPeriodCodes(period: string): readonly string[] | null {
  return BUILDING_PERIOD_CODES[period] ?? null;
}

export const SEISMIC_MAP_RADIUS_M = 65_000;
export const SEISMIC_RING_KM = [25, 50] as const;

export function ringLabelPosition(center: LngLat, distanceKm: number): LngLat {
  const offsetKm = distanceKm * 0.72;
  const [longitude, latitude] = center;
  const kmPerLongitude = KM_PER_DEGREE * Math.cos((latitude * Math.PI) / 180);
  return [longitude + offsetKm / kmPerLongitude, latitude - offsetKm / KM_PER_DEGREE];
}

const VRANCEA_CENTER: LngLat = [26.6, 45.7];
const VRANCEA_DISTANCE_STEP_KM = 10;

export function vranceaDistanceKm(center: LngLat): number {
  const toRadians = Math.PI / 180;
  const dLat = (VRANCEA_CENTER[1] - center[1]) * toRadians;
  const dLon = (VRANCEA_CENTER[0] - center[0]) * toRadians;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(center[1] * toRadians) *
      Math.cos(VRANCEA_CENTER[1] * toRadians) *
      Math.sin(dLon / 2) ** 2;
  const km = 2 * 6371 * Math.asin(Math.sqrt(a));
  return Math.round(km / VRANCEA_DISTANCE_STEP_KM) * VRANCEA_DISTANCE_STEP_KM;
}

export function earthquakeSpread(earthquakes: SeismicEarthquakes) {
  const distances = earthquakes.events.map((event) => event.distance_km);
  const magnitudes = earthquakes.events.map((event) => event.magnitude);
  return {
    minKm: Math.round(Math.min(...distances) / 5) * 5,
    maxKm: Math.round(earthquakes.radius_km),
    maxMagnitude: Math.max(...magnitudes),
  };
}
