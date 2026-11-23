import { extractOsmFeatures, readOsmFeatures, type OsmFeature } from '../../sources/osm.ts';
import { distanceMeters } from './geo.ts';
import type { LngLat } from './transit.types.ts';

export type EducationKind = 'high_school' | 'faculty';

export type EducationPlace = LngLat & {
  id: string;
  kind: EducationKind;
  name: string;
  group: string | null;
};

type Ring = [number, number][];

type Candidate = EducationPlace & { key: string; distance: number };

type University = { name: string; shortName: string | null; rings: Ring[] };

const EDUCATION_FILTERS = [
  'nwr/amenity=school,college,university',
  'nwr/building=school,college,university',
] as const;

const SEARCH_RADIUS_DEGREES = 0.3;
const HIGH_SCHOOL_PREFIX = /^(liceul?|colegiul?)\b/;
const HIGH_SCHOOL_EXCLUDED =
  /\b(clasele\s+(i|0|primare)|postliceal|gradinita|scoala\s+gimnaziala)\b/;
const FACULTY_PREFIX = /^facultatea\b/;
const UNIVERSITY_PREFIX = /^universitatea\b/;
const FACULTY_NAME_PREFIX = /^facultatea\s+(de\s+)?/i;
const QUOTES = /["“”„«»]/;
const NAME_SUFFIX = /\s+[-–—]\s+.*$/;

function normalized(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function isPair(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number'
  );
}

function outerRings(geometry: OsmFeature['geometry']): Ring[] {
  const { type, coordinates } = geometry;
  const polygons =
    type === 'Polygon' ? [coordinates] : type === 'MultiPolygon' ? coordinates : null;
  if (!Array.isArray(polygons)) return [];
  return polygons.flatMap((polygon) => {
    const ring: unknown = Array.isArray(polygon) ? polygon[0] : null;
    if (!Array.isArray(ring)) return [];
    const points = ring.filter(isPair);
    return points.length >= 3 ? [points] : [];
  });
}

function featurePoint(geometry: OsmFeature['geometry']): LngLat | null {
  if (geometry.type === 'Point') {
    return isPair(geometry.coordinates)
      ? { lng: geometry.coordinates[0], lat: geometry.coordinates[1] }
      : null;
  }
  const ring = outerRings(geometry)[0];
  if (!ring) return null;
  const open = ring.slice(0, -1).length >= 3 ? ring.slice(0, -1) : ring;
  return {
    lng: open.reduce((sum, [lng]) => sum + lng, 0) / open.length,
    lat: open.reduce((sum, [, lat]) => sum + lat, 0) / open.length,
  };
}

function isInside(point: LngLat, ring: Ring): boolean {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const [x1, y1] = ring[index] ?? [0, 0];
    const [x2, y2] = ring[previous] ?? [0, 0];
    if (y1 > point.lat !== y2 > point.lat) {
      const crossing = ((x2 - x1) * (point.lat - y1)) / (y2 - y1) + x1;
      if (point.lng < crossing) inside = !inside;
    }
  }
  return inside;
}

function isEducational(properties: Record<string, string>): boolean {
  const values = ['school', 'college', 'university'];
  return values.includes(properties.amenity ?? '') || values.includes(properties.building ?? '');
}

export function universityAbbreviation(name: string, shortName: string | null): string | null {
  if (shortName?.trim()) return shortName.trim();
  const words = name.split(QUOTES)[0]?.split(/\s+/) ?? [];
  const initials = words
    .filter((word) => /^\p{Lu}/u.test(word))
    .map((word) => word.charAt(0))
    .join('');
  return initials.length >= 2 ? initials.toUpperCase() : null;
}

function facultyName(name: string): string {
  const rest = name.replace(FACULTY_NAME_PREFIX, '').trim();
  return rest === '' ? name : rest.charAt(0).toUpperCase() + rest.slice(1);
}

function withoutGroup(name: string, group: string | null): string {
  if (!group) return name;
  const suffix = ` ${group}`;
  return name.endsWith(suffix) ? name.slice(0, -suffix.length).trim() : name;
}

function baseName(name: string): string {
  return name.replace(NAME_SUFFIX, '').trim();
}

function groupOf(
  point: LngLat,
  properties: Record<string, string>,
  universities: readonly University[],
): string | null {
  const university = universities.find((item) => item.rings.some((ring) => isInside(point, ring)));
  if (university) return universityAbbreviation(university.name, university.shortName);
  const operator = baseName(properties.operator ?? '');
  return UNIVERSITY_PREFIX.test(normalized(operator))
    ? universityAbbreviation(operator, null)
    : null;
}

function nearestPerKey(candidates: readonly Candidate[]): Candidate[] {
  const byKey = new Map<string, Candidate>();
  for (const candidate of candidates) {
    const current = byKey.get(candidate.key);
    const nearest = !current || candidate.distance < current.distance ? candidate : current;
    byKey.set(candidate.key, {
      ...nearest,
      group: nearest.group ?? current?.group ?? candidate.group,
    });
  }
  return [...byKey.values()];
}

export function educationPlaces(
  features: readonly OsmFeature[],
  origin: LngLat,
  limitPerKind: number,
): EducationPlace[] {
  const educational = features.filter(
    (feature) => feature.properties.name?.trim() && isEducational(feature.properties),
  );
  const universities: University[] = educational.flatMap((feature) => {
    const name = baseName(feature.properties.name ?? '');
    const rings = outerRings(feature.geometry);
    return UNIVERSITY_PREFIX.test(normalized(name)) && rings.length > 0
      ? [{ name, shortName: feature.properties.short_name ?? null, rings }]
      : [];
  });
  const located = educational.flatMap((feature) => {
    const point = featurePoint(feature.geometry);
    return point ? [{ feature, point, name: baseName(feature.properties.name ?? '') }] : [];
  });
  const faculties = located.filter(({ name }) => FACULTY_PREFIX.test(normalized(name)));

  const candidates: Candidate[] = located.flatMap(({ feature, point, name }): Candidate[] => {
    const key = normalized(name);
    const distance = distanceMeters(origin, point);
    const base = { ...point, distance, id: '', group: null };
    if (
      HIGH_SCHOOL_PREFIX.test(key) &&
      !HIGH_SCHOOL_EXCLUDED.test(normalized(feature.properties.name ?? ''))
    ) {
      return [{ ...base, id: `high_school:${feature.id}`, kind: 'high_school', name, key }];
    }
    if (FACULTY_PREFIX.test(key)) {
      const label = facultyName(name);
      return [
        {
          ...base,
          id: `faculty:${feature.id}`,
          kind: 'faculty',
          name: label,
          group: groupOf(point, feature.properties, universities),
          key: `faculty:${normalized(label)}`,
        },
      ];
    }
    const rings = outerRings(feature.geometry);
    const hasFaculty = faculties.some((faculty) =>
      rings.some((ring) => isInside(faculty.point, ring)),
    );
    if (UNIVERSITY_PREFIX.test(key) && !hasFaculty) {
      return [{ ...base, id: `faculty:${feature.id}`, kind: 'faculty', name, key }];
    }
    return [];
  });

  const unique = nearestPerKey(candidates);
  return (['high_school', 'faculty'] as const).flatMap((kind) =>
    unique
      .filter((candidate) => candidate.kind === kind)
      .sort((left, right) => left.distance - right.distance || left.id.localeCompare(right.id))
      .slice(0, limitPerKind)
      .map(({ id, name, group, lng, lat }) => ({
        id,
        kind,
        name: withoutGroup(name, group),
        group,
        lng,
        lat,
      })),
  );
}

export async function exportEducationPlaces(options: {
  osmPbf: string;
  workDir: string;
  origin: LngLat;
  limitPerKind: number;
}): Promise<EducationPlace[]> {
  const { origin } = options;
  const exported = await extractOsmFeatures({
    extractPath: options.osmPbf,
    bbox: {
      west: origin.lng - SEARCH_RADIUS_DEGREES,
      south: origin.lat - SEARCH_RADIUS_DEGREES,
      east: origin.lng + SEARCH_RADIUS_DEGREES,
      north: origin.lat + SEARCH_RADIUS_DEGREES,
    },
    filters: EDUCATION_FILTERS,
    geometryTypes: ['point', 'polygon'],
    workDir: options.workDir,
    name: 'education',
  });
  const features: OsmFeature[] = [];
  for await (const feature of readOsmFeatures(exported)) features.push(feature);
  return educationPlaces(features, origin, options.limitPerKind);
}
