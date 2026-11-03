import type { LngLat } from './transit.types.ts';

const EARTH_RADIUS_M = 6_371_008.8;

function radians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function distanceMeters(from: LngLat, to: LngLat): number {
  const dLat = radians(to.lat - from.lat);
  const dLng = radians(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(from.lat)) * Math.cos(radians(to.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function bearingDegrees(from: LngLat, to: LngLat): number {
  const y = Math.sin(radians(to.lng - from.lng)) * Math.cos(radians(to.lat));
  const x =
    Math.cos(radians(from.lat)) * Math.sin(radians(to.lat)) -
    Math.sin(radians(from.lat)) * Math.cos(radians(to.lat)) * Math.cos(radians(to.lng - from.lng));
  const degrees = (Math.atan2(y, x) * 180) / Math.PI;
  return (degrees + 360) % 360;
}
