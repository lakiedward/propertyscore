import { daysOpenAt } from './opening-hours.ts';
import type { NightState, SafetyType } from './safety.params.ts';

export type SafetyClassification = {
  type: SafetyType;
  nightState: NightState;
};

export type NightRule = {
  minute: number;
  minOpenNights: number;
};

const ISOLATED_PATHS = new Set(['footway', 'path', 'steps', 'pedestrian', 'cycleway']);
const BARS = new Set(['bar', 'pub', 'nightclub']);
const NONSTOP_AMENITIES = new Set(['fuel', 'pharmacy']);
const TRANSIT_STOP_MODES = ['bus', 'tram', 'trolleybus'] as const;
const IGNORED_SHOPS = new Set(['no', 'vacant', 'disused']);
const MAIN_RAIL_USAGE = new Set(['main', 'branch', 'industrial']);

type Tags = Readonly<Record<string, string>>;

function isLine(geometryType: string): boolean {
  return geometryType === 'LineString' || geometryType === 'MultiLineString';
}

function isAlwaysOpen(tags: Tags): boolean {
  return tags.opening_hours?.trim() === '24/7';
}

export function nightStateOf(tags: Tags, rule: NightRule): NightState {
  const openingHours = tags.opening_hours;
  if (!openingHours) return 'unknown';
  const nights = daysOpenAt(openingHours, rule.minute);
  if (nights === null) return 'unknown';
  return nights >= rule.minOpenNights ? 'open' : 'closed';
}

function classifyHighway(tags: Tags, geometryType: string): SafetyType | null {
  const highway = tags.highway;
  if (!highway) return null;
  if (highway === 'street_lamp' && geometryType === 'Point') return 'lighting';
  if (highway === 'bus_stop' && geometryType === 'Point') return 'transit_stop';
  if (!isLine(geometryType)) return null;
  const isPath = ISOLATED_PATHS.has(highway);
  if (isPath && (tags.tunnel === 'yes' || tags.lit === 'no')) return 'isolated_passage';
  if (tags.lit === 'yes') return 'lighting';
  return null;
}

function classifyRailway(tags: Tags, geometryType: string): SafetyType | null {
  const railway = tags.railway;
  if (!railway) return null;
  if (railway === 'rail' && isLine(geometryType) && !tags.service) {
    return !tags.usage || MAIN_RAIL_USAGE.has(tags.usage) ? 'isolated_passage' : null;
  }
  if (railway === 'tram_stop' && geometryType === 'Point') return 'transit_stop';
  if (railway === 'halt') return 'train_halt';
  if (railway === 'station' && tags.station !== 'subway' && tags.station !== 'light_rail') {
    return tags.train === 'no' ? null : 'train_station';
  }
  return null;
}

function isTransitPlatform(tags: Tags): boolean {
  return (
    tags.public_transport === 'platform' && TRANSIT_STOP_MODES.some((mode) => tags[mode] === 'yes')
  );
}

export function classifySafetyFeature(
  tags: Tags,
  geometryType: string,
  rule: NightRule,
): SafetyClassification[] {
  const types = new Map<SafetyType, NightState>();
  const add = (type: SafetyType | null, nightState: NightState = 'unknown') => {
    if (type && !types.has(type)) types.set(type, nightState);
  };

  add(classifyHighway(tags, geometryType));
  add(classifyRailway(tags, geometryType));
  if (isTransitPlatform(tags) && geometryType === 'Point') add('transit_stop');

  const shop = tags.shop;
  if (shop && !IGNORED_SHOPS.has(shop)) {
    add(
      isAlwaysOpen(tags) ? 'nonstop' : 'shop',
      isAlwaysOpen(tags) ? 'open' : nightStateOf(tags, rule),
    );
  }
  const amenity = tags.amenity;
  if (amenity && NONSTOP_AMENITIES.has(amenity) && isAlwaysOpen(tags)) add('nonstop', 'open');
  if (amenity === 'police') add('police');
  if (amenity === 'fire_station') add('fire_station');
  if (amenity === 'embassy' || tags.office === 'diplomatic') add('diplomatic');
  if (amenity && BARS.has(amenity)) add('bar', nightStateOf(tags, rule));
  if (tags.building === 'mixed_use' || tags.building === 'retail') add('mixed_use');
  if (tags.leisure === 'park' && !isLine(geometryType)) {
    add(tags.lit === 'yes' ? 'park_lit' : 'park');
  }

  return [...types].map(([type, nightState]) => ({ type, nightState }));
}

export const SAFETY_OSM_FILTERS = [
  'n/highway=street_lamp,bus_stop',
  'w/highway=footway,path,steps,pedestrian,cycleway',
  'w/lit=yes',
  'w/railway=rail',
  'n/railway=tram_stop,halt,station',
  'w/railway=station,halt',
  'n/public_transport=platform',
  'nwr/shop',
  'nwr/amenity=fuel,pharmacy,police,fire_station,embassy,bar,pub,nightclub',
  'nwr/office=diplomatic',
  'wr/building=mixed_use,retail',
  'wr/leisure=park',
] as const;

export const STREET_OSM_FILTER =
  'w/highway=motorway,trunk,primary,secondary,tertiary,unclassified,residential,living_street,pedestrian,service' as const;

const STREETS = new Set(STREET_OSM_FILTER.slice('w/highway='.length).split(','));

export function isStreet(tags: Tags, geometryType: string): boolean {
  return isLine(geometryType) && !!tags.highway && STREETS.has(tags.highway);
}
