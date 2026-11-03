import type { OsmFeature } from '../../sources/osm.ts';
import { osmSourceRef } from '../../sources/osm.ts';
import { normalizeName } from './education.names.ts';

export const EDUCATION_LEVELS = [
  'nursery',
  'kindergarten',
  'primary',
  'lower_secondary',
  'upper_secondary',
  'university',
] as const;

export type EducationLevel = (typeof EDUCATION_LEVELS)[number];

export type Ownership = 'public' | 'private' | 'unknown';

export type Point = { lng: number; lat: number };

export type OsmEducationUnit = {
  osmRef: string;
  name: string | null;
  levels: EducationLevel[];
  ownership: Ownership;
  location: Point;
};

export const EDUCATION_OSM_FILTERS = [
  'nwr/amenity=school,kindergarten,childcare,college,university',
] as const;

const ISCED_LEVELS: Record<string, EducationLevel> = {
  '0': 'kindergarten',
  '1': 'primary',
  '2': 'lower_secondary',
  '3': 'upper_secondary',
};

const NOT_GENERAL_EDUCATION =
  /\b(soferi|conducatori auto|scoala auto|dans|muzica populara|inot|limbi straine|after ?school|postliceal[ae]?|meditatii)\b/;

export function parseIscedLevels(value: string | undefined): EducationLevel[] {
  if (!value) return [];
  const levels = new Set<EducationLevel>();
  for (const part of value.split(';')) {
    const range = /^\s*(\d)\s*-\s*(\d)\s*$/.exec(part);
    const bounds = range ? [Number(range[1]), Number(range[2])] : [Number(part.trim())];
    const from = bounds[0];
    const to = bounds[1] ?? from;
    if (
      from === undefined ||
      to === undefined ||
      !Number.isInteger(from) ||
      !Number.isInteger(to)
    ) {
      continue;
    }
    for (let level = from; level <= to; level += 1) {
      const mapped = ISCED_LEVELS[String(level)];
      if (mapped) levels.add(mapped);
    }
  }
  return EDUCATION_LEVELS.filter((level) => levels.has(level));
}

function schoolLevelsFromName(normalized: string): EducationLevel[] {
  if (/\b(l|lt|ltehn|cn|ct|liceu|colegiu|colegiul|seminar|seminarul)\b/.test(normalized)) {
    return ['upper_secondary'];
  }
  if (/\bsp\b/.test(normalized)) return ['primary'];
  return ['primary', 'lower_secondary'];
}

export function classifyOsmUnit(properties: Record<string, string>): EducationLevel[] | null {
  const amenity = properties.amenity;
  const normalized = normalizeName(properties.name ?? '');
  if (NOT_GENERAL_EDUCATION.test(normalized)) return null;
  const isNursery = /\bcresa\b/.test(normalized);

  if (amenity === 'childcare') return ['nursery'];
  if (amenity === 'kindergarten') return [isNursery ? 'nursery' : 'kindergarten'];
  if (amenity === 'university') return ['university'];
  if (amenity === 'college') {
    return /\b(l|lt|ltehn|cn|ct|liceu|colegiu|colegiul)\b/.test(normalized)
      ? ['upper_secondary']
      : null;
  }
  if (amenity === 'school') {
    const isced = parseIscedLevels(properties['isced:level']);
    if (isced.length > 0) return isced;
    return schoolLevelsFromName(normalized);
  }
  return null;
}

export function ownershipFromTags(properties: Record<string, string>): Ownership {
  const type = properties['operator:type'];
  if (type === 'public' || type === 'government') return 'public';
  if (type === 'private') return 'private';
  return 'unknown';
}

function isPosition(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number'
  );
}

function ringCentroid(ring: readonly [number, number][]): Point | null {
  let area = 0;
  let x = 0;
  let y = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    const current = ring[index];
    const next = ring[index + 1];
    if (!current || !next) continue;
    const cross = current[0] * next[1] - next[0] * current[1];
    area += cross;
    x += (current[0] + next[0]) * cross;
    y += (current[1] + next[1]) * cross;
  }
  if (area === 0) {
    const first = ring[0];
    return first ? { lng: first[0], lat: first[1] } : null;
  }
  return { lng: x / (3 * area), lat: y / (3 * area) };
}

function outerRing(coordinates: unknown): [number, number][] | null {
  if (!Array.isArray(coordinates)) return null;
  const ring: unknown = coordinates[0];
  if (!Array.isArray(ring) || !ring.every(isPosition)) return null;
  return ring;
}

export function representativePoint(geometry: OsmFeature['geometry']): Point | null {
  if (geometry.type === 'Point') {
    return isPosition(geometry.coordinates)
      ? { lng: geometry.coordinates[0], lat: geometry.coordinates[1] }
      : null;
  }
  if (geometry.type === 'Polygon') {
    const ring = outerRing(geometry.coordinates);
    return ring ? ringCentroid(ring) : null;
  }
  if (geometry.type === 'MultiPolygon' && Array.isArray(geometry.coordinates)) {
    const ring = outerRing(geometry.coordinates[0]);
    return ring ? ringCentroid(ring) : null;
  }
  return null;
}

export function toEducationUnit(feature: OsmFeature): OsmEducationUnit | null {
  const levels = classifyOsmUnit(feature.properties);
  if (!levels) return null;
  const location = representativePoint(feature.geometry);
  if (!location) return null;
  const name = feature.properties.official_name ?? feature.properties.name ?? null;
  return {
    osmRef: osmSourceRef(feature.id),
    name: name && name.trim() !== '' ? name.trim().slice(0, 300) : null,
    levels,
    ownership: ownershipFromTags(feature.properties),
    location,
  };
}
