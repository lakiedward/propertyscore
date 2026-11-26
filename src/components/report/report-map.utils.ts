import type { LngLat, LngLatBounds } from '@/components/map/map.config';
import type { MapFeatureCollection } from '@/components/map/map-canvas';

const EARTH_RADIUS_M = 6_371_008.8;
const RING_STEPS = 96;
const POLYLINE_PRECISION = 1e6;
const MAX_POLYLINE_SHIFT = 25;

function offsetPosition([longitude, latitude]: LngLat, distanceM: number, bearing: number): LngLat {
  const latitudeRad = (latitude * Math.PI) / 180;
  const north = (distanceM / EARTH_RADIUS_M) * Math.cos(bearing);
  const east = ((distanceM / EARTH_RADIUS_M) * Math.sin(bearing)) / Math.cos(latitudeRad);
  return [longitude + (east * 180) / Math.PI, latitude + (north * 180) / Math.PI];
}

export function ringAround(center: LngLat, radiusM: number): MapFeatureCollection {
  const coordinates = Array.from({ length: RING_STEPS + 1 }, (_, step) =>
    offsetPosition(center, radiusM, (step / RING_STEPS) * 2 * Math.PI),
  );
  return {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } }],
  };
}

export function boundsAround(center: LngLat, radiusM: number): LngLatBounds {
  const [west] = offsetPosition(center, radiusM, -Math.PI / 2);
  const [east] = offsetPosition(center, radiusM, Math.PI / 2);
  const [, south] = offsetPosition(center, radiusM, Math.PI);
  const [, north] = offsetPosition(center, radiusM, 0);
  return [
    [west, south],
    [east, north],
  ];
}

export function isDrawableLine(line: readonly LngLat[]): boolean {
  return line.length > 1;
}

export function lineCollection(lines: readonly (readonly LngLat[])[]): MapFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: lines.filter(isDrawableLine).map((line) => ({
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: [...line] },
    })),
  };
}

export function decodePolyline6(encoded: string): LngLat[] {
  const coordinates: LngLat[] = [];
  let latitude = 0;
  let longitude = 0;
  let index = 0;

  function readDelta() {
    let delta = 0;
    for (let shift = 0; shift <= MAX_POLYLINE_SHIFT && index < encoded.length; shift += 5) {
      const chunk = encoded.charCodeAt(index++) - 63;
      if (chunk < 0 || chunk > 63) return null;
      delta |= (chunk & 31) << shift;
      if (chunk < 32) return delta & 1 ? ~(delta >> 1) : delta >> 1;
    }
    return null;
  }

  while (index < encoded.length) {
    const latDelta = readDelta();
    const lngDelta = readDelta();
    if (latDelta === null || lngDelta === null) return [];
    latitude += latDelta;
    longitude += lngDelta;
    if (
      Math.abs(latitude) > 90 * POLYLINE_PRECISION ||
      Math.abs(longitude) > 180 * POLYLINE_PRECISION
    ) {
      return [];
    }
    coordinates.push([longitude / POLYLINE_PRECISION, latitude / POLYLINE_PRECISION]);
  }

  return coordinates;
}
