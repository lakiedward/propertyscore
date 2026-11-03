import {
  houseNumberKeys,
  houseNumberValue,
  parseAddress,
  placeWordSet,
  streetKey,
} from './address.ts';

export type Point = { lng: number; lat: number };

export type GeocodePrecision = 'house' | 'nearby_house' | 'street';

type GeocodeResult = { location: Point; precision: GeocodePrecision };

export type GeocoderFeature = {
  geometry: { type: string; coordinates: unknown };
  properties: Record<string, string>;
};

export type GeocoderOptions = {
  sameAddressRadiusM: number;
  nearbyNumberMaxGap: number;
  streetMaxExtentM: number;
};

const DEFAULT_GEOCODER_OPTIONS: GeocoderOptions = {
  sameAddressRadiusM: 150,
  nearbyNumberMaxGap: 6,
  streetMaxExtentM: 300,
};

export const ADDRESS_OSM_FILTERS = ['nwr/addr:housenumber', 'w/highway'] as const;

export type AddressGeocoder = {
  geocode: (address: string) => GeocodeResult | null;
  size: { addresses: number; streets: number };
};

type HousePoint = { number: string; value: number | null; location: Point };

const EARTH_RADIUS_M = 6_371_008.8;

function distanceMeters(from: Point, to: Point): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLat = toRadians(to.lat - from.lat);
  const deltaLng = toRadians(to.lng - from.lng);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(deltaLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

function isPosition(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number'
  );
}

function positions(value: unknown, into: Point[] = []): Point[] {
  if (isPosition(value)) into.push({ lng: value[0], lat: value[1] });
  else if (Array.isArray(value)) for (const item of value) positions(item, into);
  return into;
}

function mean(points: readonly Point[]): Point | null {
  if (points.length === 0) return null;
  return {
    lng: points.reduce((sum, point) => sum + point.lng, 0) / points.length,
    lat: points.reduce((sum, point) => sum + point.lat, 0) / points.length,
  };
}

function spread(points: readonly Point[], centre: Point): number {
  return points.reduce((max, point) => Math.max(max, distanceMeters(centre, point)), 0);
}

function closestTo(points: readonly Point[], target: Point): Point | null {
  let best: { point: Point; distance: number } | null = null;
  for (const point of points) {
    const distance = distanceMeters(point, target);
    if (best === null || distance < best.distance) best = { point, distance };
  }
  return best?.point ?? null;
}

function streetNames(properties: Record<string, string>): string[] {
  return ['name', 'alt_name', 'old_name', 'official_name']
    .flatMap((key) => (properties[key] ?? '').split(';'))
    .map((name) => name.trim())
    .filter((name) => name !== '');
}

function oneLocation(points: readonly Point[], radiusM: number): Point | null {
  const centre = mean(points);
  if (centre === null || spread(points, centre) > radiusM) return null;
  return closestTo(points, centre);
}

function sameParity(a: number, b: number): boolean {
  return a % 2 === b % 2;
}

export function createAddressGeocoder(
  features: Iterable<GeocoderFeature>,
  cityName: string,
  options: GeocoderOptions = DEFAULT_GEOCODER_OPTIONS,
): AddressGeocoder {
  const houses = new Map<string, HousePoint[]>();
  const streets = new Map<string, Point[]>();
  let addressCount = 0;

  for (const feature of features) {
    const { properties } = feature;
    const housenumber = properties['addr:housenumber'];
    const street = properties['addr:street'] ?? properties['addr:place'];
    if (housenumber !== undefined && street !== undefined) {
      const location = mean(positions(feature.geometry.coordinates));
      const key = streetKey(street);
      if (location !== null && key !== '') {
        const list = houses.get(key) ?? [];
        for (const number of houseNumberKeys(housenumber)) {
          list.push({ number, value: houseNumberValue(number), location });
        }
        houses.set(key, list);
        addressCount += 1;
      }
    }
    if (properties.highway !== undefined) {
      const vertices = positions(feature.geometry.coordinates);
      for (const name of new Set(streetNames(properties).map(streetKey))) {
        if (name === '') continue;
        const list = streets.get(name) ?? [];
        list.push(...vertices);
        streets.set(name, list);
      }
    }
  }

  const knownKeys = [...new Set([...houses.keys(), ...streets.keys()])];
  const ignoredWords = placeWordSet(cityName);

  function resolveKey(key: string): string | null {
    if (houses.has(key) || streets.has(key)) return key;
    const wanted = key.split(' ');
    const candidates = knownKeys.filter((known) => {
      const knownWords = new Set(known.split(' '));
      return wanted.every((word) => knownWords.has(word));
    });
    return candidates.length === 1 ? (candidates[0] ?? null) : null;
  }

  function byHouse(key: string, number: string): GeocodeResult | null {
    const list = houses.get(key) ?? [];
    const exact = list.filter((house) => house.number === number).map((house) => house.location);
    if (exact.length > 0) {
      const location = oneLocation(exact, options.sameAddressRadiusM);
      return location ? { location, precision: 'house' } : null;
    }
    const value = houseNumberValue(number);
    if (value === null) return null;
    const nearby = list
      .filter(
        (house) =>
          house.value !== null &&
          sameParity(house.value, value) &&
          Math.abs(house.value - value) <= options.nearbyNumberMaxGap,
      )
      .sort((a, b) => Math.abs((a.value ?? 0) - value) - Math.abs((b.value ?? 0) - value));
    const closestGap = nearby[0] === undefined ? null : Math.abs((nearby[0].value ?? 0) - value);
    if (closestGap === null) return null;
    const closest = nearby
      .filter((house) => Math.abs((house.value ?? 0) - value) === closestGap)
      .map((house) => house.location);
    const location = oneLocation(closest, options.sameAddressRadiusM);
    return location ? { location, precision: 'nearby_house' } : null;
  }

  function byStreet(key: string): GeocodeResult | null {
    const location = oneLocation(streets.get(key) ?? [], options.streetMaxExtentM);
    return location ? { location, precision: 'street' } : null;
  }

  return {
    size: { addresses: addressCount, streets: streets.size },
    geocode(address) {
      const parsed = parseAddress(address, ignoredWords);
      if (parsed === null) return null;
      const key = resolveKey(parsed.streetKey);
      if (key === null) return null;
      const house = parsed.houseNumber === null ? null : byHouse(key, parsed.houseNumber);
      return house ?? byStreet(key);
    },
  };
}
