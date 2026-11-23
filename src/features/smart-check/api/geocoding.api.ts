import { z } from 'zod';
import { AppError } from '@/lib/errors';
import type { LngLat } from '@/components/map/map.config';
import { toAddressMatch, withoutRepeatedPlaces, type AddressMatch } from '../check.utils';

const PHOTON_URL = 'https://photon.komoot.io';
const ROMANIA_BBOX = '20.2,43.6,29.75,48.3';
const SEARCH_LIMIT = 12;
const SUGGESTION_LIMIT = 6;

const photonFeatureSchema = z.object({
  properties: z.object({
    osm_id: z.number(),
    osm_type: z.string(),
    countrycode: z.string().optional(),
    name: z.string().optional(),
    street: z.string().optional(),
    housenumber: z.string().optional(),
    district: z.string().optional(),
    locality: z.string().optional(),
    city: z.string().optional(),
    county: z.string().optional(),
  }),
  geometry: z.object({ coordinates: z.tuple([z.number(), z.number()]) }),
});

const photonResponseSchema = z.object({ features: z.array(photonFeatureSchema) });

export type PhotonFeature = z.infer<typeof photonFeatureSchema>;

async function readPhoton(url: URL, signal: AbortSignal | undefined) {
  let response: Response;
  try {
    response = await fetch(url, { signal: signal ?? null });
  } catch (error) {
    throw new AppError('network', 'Photon request failed', { cause: error });
  }
  if (!response.ok) {
    throw new AppError('unknown', `Photon answered ${String(response.status)}`);
  }
  const parsed = photonResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new AppError('unknown', 'Photon response does not match its schema', {
      cause: parsed.error,
    });
  }
  return parsed.data.features.filter((feature) => feature.properties.countrycode === 'RO');
}

export async function searchAddresses(
  query: string,
  signal?: AbortSignal,
): Promise<AddressMatch[]> {
  const url = new URL('/api/', PHOTON_URL);
  url.searchParams.set('q', query);
  url.searchParams.set('limit', String(SEARCH_LIMIT));
  url.searchParams.set('bbox', ROMANIA_BBOX);
  const features = await readPhoton(url, signal);
  return withoutRepeatedPlaces(features.map(toAddressMatch)).slice(0, SUGGESTION_LIMIT);
}

export async function reverseGeocode(
  position: LngLat,
  signal?: AbortSignal,
): Promise<AddressMatch | null> {
  const url = new URL('/reverse', PHOTON_URL);
  url.searchParams.set('lon', String(position[0]));
  url.searchParams.set('lat', String(position[1]));
  url.searchParams.set('limit', '1');
  const [feature] = await readPhoton(url, signal);
  return feature ? toAddressMatch(feature) : null;
}
