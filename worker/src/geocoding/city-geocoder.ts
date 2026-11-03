import { join } from 'node:path';

import type { Sql } from '../db/sql.ts';
import type { CoveredCity } from '../snapshot/snapshot.db.ts';
import { cityBoundingBox, extractOsmFeatures, readOsmFeatures } from '../sources/osm.ts';
import {
  ADDRESS_OSM_FILTERS,
  createAddressGeocoder,
  type AddressGeocoder,
  type GeocodePrecision,
  type GeocoderFeature,
  type Point,
} from './geocoder.ts';

export async function loadCityGeocoder(
  context: { sql: Sql; sourcesDir: string; period: string },
  city: CoveredCity,
  extractPath: string,
): Promise<AddressGeocoder> {
  const exported = await extractOsmFeatures({
    extractPath,
    bbox: await cityBoundingBox(context.sql, city.id),
    filters: ADDRESS_OSM_FILTERS,
    geometryTypes: ['point', 'linestring', 'polygon'],
    workDir: join(context.sourcesDir, 'work', context.period.slice(0, 7), city.slug),
    name: 'addresses',
  });
  const features: GeocoderFeature[] = [];
  for await (const feature of readOsmFeatures(exported)) {
    if (feature.properties['addr:housenumber'] !== undefined || feature.properties.highway) {
      features.push(feature);
    }
  }
  return createAddressGeocoder(features, city.name);
}

export type GeocodeTally = Record<GeocodePrecision | 'not_found', number>;

function emptyTally(): GeocodeTally {
  return { house: 0, nearby_house: 0, street: 0, not_found: 0 };
}

export function createLazyGeocoder(load: () => Promise<AddressGeocoder>): {
  geocode: (address: string) => Promise<Point | null>;
  tally: GeocodeTally;
} {
  let geocoder: Promise<AddressGeocoder> | null = null;
  const tally = emptyTally();
  return {
    tally,
    async geocode(address) {
      geocoder ??= load();
      const result = (await geocoder).geocode(address);
      tally[result?.precision ?? 'not_found'] += 1;
      return result?.location ?? null;
    },
  };
}
