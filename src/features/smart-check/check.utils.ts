import type { LngLat } from '@/components/map/map.config';
import type { PhotonFeature } from './api/geocoding.api';

export const CHECK_PRICE_RON = 30;

export type CheckAccess = 'guest' | 'pending' | 'error' | 'standard' | 'unlimited';

export type AddressMatch = {
  id: string;
  main: string;
  sub: string;
  label: string;
  position: LngLat;
};

type CheckCity = {
  slug: string;
  name: string;
  center: LngLat;
  radiusM: number;
};

export const CHECK_CITIES = [
  { slug: 'timisoara', name: 'Timișoara', center: [21.22571, 45.75372], radiusM: 7000 },
  { slug: 'bucuresti', name: 'București', center: [26.10254, 44.42677], radiusM: 13000 },
  { slug: 'cluj-napoca', name: 'Cluj-Napoca', center: [23.62364, 46.77121], radiusM: 7000 },
  { slug: 'iasi', name: 'Iași', center: [27.60144, 47.15845], radiusM: 7000 },
  { slug: 'constanta', name: 'Constanța', center: [28.63483, 44.15981], radiusM: 8000 },
  { slug: 'craiova', name: 'Craiova', center: [23.79488, 44.33018], radiusM: 6000 },
  { slug: 'sibiu', name: 'Sibiu', center: [24.12558, 45.79833], radiusM: 5000 },
  { slug: 'oradea', name: 'Oradea', center: [21.91894, 47.0465], radiusM: 6000 },
  { slug: 'targu-mures', name: 'Târgu Mureș', center: [24.55747, 46.54245], radiusM: 5000 },
] as const satisfies readonly CheckCity[];

const EARTH_RADIUS_M = 6_371_008.8;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function distanceInMeters(from: LngLat, to: LngLat): number {
  const latitudeDelta = toRadians(to[1] - from[1]);
  const longitudeDelta = toRadians(to[0] - from[0]);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(from[1])) * Math.cos(toRadians(to[1])) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(haversine));
}

export function findCoveredCity(position: LngLat) {
  return CHECK_CITIES.find((city) => distanceInMeters(city.center, position) <= city.radiusM);
}

function joinParts(parts: readonly (string | undefined)[]): string {
  const seen = new Set<string>();
  return parts
    .filter((part): part is string => {
      if (!part || seen.has(part)) {
        return false;
      }
      seen.add(part);
      return true;
    })
    .join(', ');
}

function streetLine({ name, street, housenumber }: PhotonFeature['properties']) {
  const streetName = street ?? name;
  if (!streetName) {
    return undefined;
  }
  return housenumber ? `${streetName} ${housenumber}` : streetName;
}

export function toAddressMatch({ properties, geometry }: PhotonFeature): AddressMatch {
  const line = streetLine(properties);
  const placeName =
    properties.street && properties.name !== properties.street ? properties.name : undefined;
  const town = properties.city ?? properties.locality;
  const main = placeName ?? line ?? town ?? properties.county ?? '';
  const sub = joinParts([
    placeName ? line : undefined,
    properties.district,
    town,
    properties.county,
  ]);
  return {
    id: `${properties.osm_type}${String(properties.osm_id)}`,
    main,
    sub,
    label: joinParts([line ?? main, town]),
    position: geometry.coordinates,
  };
}

export function withoutRepeatedPlaces(matches: readonly AddressMatch[]): AddressMatch[] {
  const seen = new Set<string>();
  return matches.filter(({ main, sub }) => {
    const key = `${main}|${sub}`.toLocaleLowerCase('ro');
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
