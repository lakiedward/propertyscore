import type { OsmFeature } from '../../sources/osm.ts';

type NoiseSourceKind = 'road' | 'tram' | 'rail' | 'air';

export type NoiseSourceFeature = {
  kind: NoiseSourceKind;
  sourceClass: string;
  name: string | null;
  geometry: OsmFeature['geometry'];
};

export const NOISE_SOURCE_FILTERS = [
  'w/highway=motorway,motorway_link,trunk,trunk_link,primary,primary_link,secondary,secondary_link,tertiary,tertiary_link,residential,living_street,unclassified',
  'w/railway=rail,tram,light_rail',
  'w/aeroway=runway',
] as const;

export const NOISE_BUILDING_FILTERS = ['wr/building'] as const;

const ROAD_CLASSES: Record<string, string> = {
  motorway: 'motorway',
  motorway_link: 'motorway',
  trunk: 'trunk',
  trunk_link: 'trunk',
  primary: 'primary',
  primary_link: 'primary',
  secondary: 'secondary',
  secondary_link: 'secondary',
  tertiary: 'tertiary',
  tertiary_link: 'tertiary',
  residential: 'residential',
  living_street: 'residential',
  unclassified: 'residential',
};

const INACTIVE_LIFECYCLE = ['construction', 'proposed', 'disused', 'abandoned'];

function isInactive(properties: Record<string, string>): boolean {
  return (
    INACTIVE_LIFECYCLE.some((state) => properties[state] !== undefined) ||
    properties.access === 'no' ||
    properties.tunnel === 'yes'
  );
}

function sourceType(
  properties: Record<string, string>,
): { kind: NoiseSourceKind; sourceClass: string } | null {
  const roadClass = properties.highway === undefined ? undefined : ROAD_CLASSES[properties.highway];
  if (roadClass !== undefined) return { kind: 'road', sourceClass: roadClass };
  const railway = properties.railway;
  if (railway === 'tram' || railway === 'light_rail') return { kind: 'tram', sourceClass: 'tram' };
  if (railway === 'rail' && properties.service === undefined) {
    return { kind: 'rail', sourceClass: 'rail' };
  }
  if (properties.aeroway === 'runway') return { kind: 'air', sourceClass: 'runway' };
  return null;
}

export function classifyNoiseSource(feature: OsmFeature): NoiseSourceFeature | null {
  if (feature.geometry.type !== 'LineString') return null;
  if (isInactive(feature.properties)) return null;
  const type = sourceType(feature.properties);
  if (type === null) return null;
  const name = feature.properties.name ?? feature.properties.ref ?? null;
  return { ...type, name: name === null ? null : name.slice(0, 300), geometry: feature.geometry };
}

export function isBuildingFootprint(feature: OsmFeature): boolean {
  const building = feature.properties.building;
  return (
    building !== undefined &&
    building !== 'no' &&
    building !== 'roof' &&
    (feature.geometry.type === 'MultiPolygon' || feature.geometry.type === 'Polygon')
  );
}
