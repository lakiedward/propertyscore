import type { LngLat, LngLatBounds } from '@/components/map/map.config';
import type { MapFeatureCollection } from '@/components/map/map-canvas';

const EARTH_RADIUS_M = 6_371_008.8;
const RING_STEPS = 96;
const POLYLINE_PRECISION = 1e6;

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

export function lineCollection(lines: readonly (readonly LngLat[])[]): MapFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: lines
      .filter((line) => line.length > 1)
      .map((line) => ({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: [...line] },
      })),
  };
}

export function decodePolyline6(encoded: string): LngLat[] {
  const positions: LngLat[] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;
  const readValue = (): number => {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index) - 63;
      index += 1;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };
  while (index < encoded.length) {
    latitude += readValue();
    longitude += readValue();
    positions.push([longitude / POLYLINE_PRECISION, latitude / POLYLINE_PRECISION]);
  }
  return positions;
}
