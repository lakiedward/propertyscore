export type HealthCategory =
  'health_pharmacy' | 'health_primary' | 'health_clinic' | 'health_hospital' | 'health_dentist';

export const NIGHT_PHARMACY_CATEGORY = 'health_pharmacy_night';
export const EMERGENCY_CATEGORY = 'health_emergency';

export const HEALTH_OSM_FILTERS = [
  'nwr/amenity=pharmacy,doctors,clinic,dentist,hospital',
  'nwr/healthcare',
] as const;

export type CnasProviderKind =
  'pharmacy' | 'family_doctor' | 'specialist_outpatient' | 'hospital' | 'dentist';

const CNAS_KIND_CATEGORY: Record<CnasProviderKind, HealthCategory> = {
  pharmacy: 'health_pharmacy',
  family_doctor: 'health_primary',
  specialist_outpatient: 'health_clinic',
  hospital: 'health_hospital',
  dentist: 'health_dentist',
};

export type Point = { lng: number; lat: number };

export type HealthPoi = {
  sourceRef: string;
  category: HealthCategory;
  name: string | null;
  location: Point;
  openingHours: string | null;
  isAlwaysOpen: boolean | null;
  speciality: string | null;
  sources: ('osm' | 'cnas')[];
  cnasContract: boolean;
  cnasRef: string | null;
};

export type CnasProvider = {
  id: string;
  kind: CnasProviderKind;
  name: string;
  location: Point | null;
};

const AMENITY_CATEGORY: Record<string, HealthCategory> = {
  pharmacy: 'health_pharmacy',
  doctors: 'health_primary',
  clinic: 'health_clinic',
  dentist: 'health_dentist',
  hospital: 'health_hospital',
};

const HEALTHCARE_CATEGORY: Record<string, HealthCategory> = {
  pharmacy: 'health_pharmacy',
  doctor: 'health_primary',
  clinic: 'health_clinic',
  centre: 'health_clinic',
  laboratory: 'health_clinic',
  dentist: 'health_dentist',
  hospital: 'health_hospital',
};

export function classifyHealthTags(tags: Record<string, string>): HealthCategory | null {
  const amenity = tags.amenity;
  if (amenity !== undefined && amenity in AMENITY_CATEGORY)
    return AMENITY_CATEGORY[amenity] ?? null;
  const healthcare = tags.healthcare;
  if (healthcare !== undefined && healthcare in HEALTHCARE_CATEGORY) {
    return HEALTHCARE_CATEGORY[healthcare] ?? null;
  }
  return null;
}

export function isAlwaysOpen(openingHours: string | undefined): boolean | null {
  if (openingHours === undefined || openingHours.trim() === '') return null;
  return openingHours.replace(/\s+/g, '').toLowerCase() === '24/7';
}

function isPosition(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number'
  );
}

function collectPositions(value: unknown, into: [number, number][]): void {
  if (isPosition(value)) {
    into.push(value);
    return;
  }
  if (Array.isArray(value)) for (const item of value) collectPositions(item, into);
}

export function representativePoint(geometry: {
  type: string;
  coordinates: unknown;
}): Point | null {
  const positions: [number, number][] = [];
  if (geometry.type === 'Point') collectPositions(geometry.coordinates, positions);
  else if (geometry.type === 'Polygon' && Array.isArray(geometry.coordinates)) {
    collectPositions(geometry.coordinates[0], positions);
  } else if (geometry.type === 'MultiPolygon' && Array.isArray(geometry.coordinates)) {
    const first: unknown = geometry.coordinates[0];
    if (Array.isArray(first)) collectPositions(first[0], positions);
  } else collectPositions(geometry.coordinates, positions);
  if (positions.length === 0) return null;
  const ring =
    positions.length > 1 && positions[0]?.join() === positions.at(-1)?.join()
      ? positions.slice(0, -1)
      : positions;
  const lng = ring.reduce((sum, position) => sum + position[0], 0) / ring.length;
  const lat = ring.reduce((sum, position) => sum + position[1], 0) / ring.length;
  return { lng, lat };
}

export function osmHealthPoi(feature: {
  sourceRef: string;
  geometry: { type: string; coordinates: unknown };
  properties: Record<string, string>;
}): HealthPoi | null {
  const category = classifyHealthTags(feature.properties);
  if (category === null) return null;
  const location = representativePoint(feature.geometry);
  if (location === null) return null;
  const name = feature.properties.name?.trim();
  const openingHours = feature.properties.opening_hours?.trim();
  return {
    sourceRef: feature.sourceRef,
    category,
    name: name === undefined || name === '' ? null : name.slice(0, 300),
    location,
    openingHours:
      openingHours === undefined || openingHours === '' ? null : openingHours.slice(0, 500),
    isAlwaysOpen: isAlwaysOpen(openingHours),
    speciality: feature.properties['healthcare:speciality'] ?? null,
    sources: ['osm'],
    cnasContract: false,
    cnasRef: null,
  };
}

const NAME_NOISE = new Set([
  'sc',
  'srl',
  'sa',
  'srld',
  'snc',
  'pfa',
  'cmi',
  'farmacia',
  'farmacie',
  'cabinet',
  'cabinetul',
  'medical',
  'medicala',
  'individual',
  'de',
  'si',
  'dr',
]);

export function normalizeProviderName(name: string): string[] {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1 && !NAME_NOISE.has(token));
}

export function namesMatch(left: string, right: string): boolean {
  const leftTokens = new Set(normalizeProviderName(left));
  const rightTokens = new Set(normalizeProviderName(right));
  if (leftTokens.size === 0 || rightTokens.size === 0) return false;
  const shared = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  return shared / Math.min(leftTokens.size, rightTokens.size) >= 0.5;
}

const EARTH_RADIUS_M = 6_371_008.8;

export function distanceMeters(from: Point, to: Point): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLat = toRadians(to.lat - from.lat);
  const deltaLng = toRadians(to.lng - from.lng);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(deltaLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

export type MergeResult = {
  pois: HealthPoi[];
  cnasMatched: number;
  cnasAdded: number;
  cnasWithoutLocation: number;
};

export function mergeCnasProviders(
  osmPois: readonly HealthPoi[],
  providers: readonly CnasProvider[],
  matchRadiusM: number,
): MergeResult {
  const pois = osmPois.map((poi) => ({ ...poi, sources: [...poi.sources] }));
  const claimed = new Set<number>();
  let cnasMatched = 0;
  let cnasAdded = 0;
  let cnasWithoutLocation = 0;
  for (const provider of providers) {
    const location = provider.location;
    if (location === null) {
      cnasWithoutLocation += 1;
      continue;
    }
    const category = CNAS_KIND_CATEGORY[provider.kind];
    let match: { index: number; distance: number } | null = null;
    for (const [index, poi] of pois.entries()) {
      if (claimed.has(index) || poi.category !== category || poi.name === null) continue;
      const distance = distanceMeters(poi.location, location);
      if (distance > matchRadiusM || !namesMatch(poi.name, provider.name)) continue;
      if (match === null || distance < match.distance) match = { index, distance };
    }
    const matched = match === null ? undefined : pois[match.index];
    if (match !== null && matched !== undefined) {
      claimed.add(match.index);
      matched.cnasContract = true;
      matched.cnasRef = `cnas:${provider.id}`;
      matched.sources.push('cnas');
      cnasMatched += 1;
      continue;
    }
    pois.push({
      sourceRef: `cnas:${provider.id}`,
      category,
      name: provider.name.slice(0, 300),
      location,
      openingHours: null,
      isAlwaysOpen: null,
      speciality: null,
      sources: ['cnas'],
      cnasContract: true,
      cnasRef: `cnas:${provider.id}`,
    });
    cnasAdded += 1;
  }
  return { pois, cnasMatched, cnasAdded, cnasWithoutLocation };
}
