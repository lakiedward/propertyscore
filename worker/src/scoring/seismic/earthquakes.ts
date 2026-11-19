import { z } from 'zod';

import { distanceMeters } from '../accessibility/geo.ts';

export const EARTHQUAKE_QUERY = {
  radiusKm: 60,
  minMagnitude: 3.5,
  startYear: 1900,
} as const;

const SAME_EVENT_SECONDS = 90;
const SAME_EVENT_KM = 100;
const EMSC_EARTHQUAKE_TYPES = new Set(['ke', 'se']);
const USGS_PLACE = /^\d+\s*km\s+[NSEW]{1,3}\s+of\s+(.+?),\s*[^,]+$/;

type CatalogueKey = 'usgs' | 'emsc';

export type CatalogueEvent = {
  catalogue: CatalogueKey;
  time: string;
  magnitude: number;
  longitude: number;
  latitude: number;
  place: string | null;
};

type EarthquakeSource = {
  key: CatalogueKey;
  name: string;
  license: string;
  url: string;
};

const EARTHQUAKE_SOURCES: Record<CatalogueKey, EarthquakeSource> = {
  usgs: {
    key: 'usgs',
    name: 'U.S. Geological Survey, catalogul ComCat',
    license: 'domeniu public',
    url: 'https://earthquake.usgs.gov/fdsnws/event/1/',
  },
  emsc: {
    key: 'emsc',
    name: 'EMSC (European-Mediterranean Seismological Centre)',
    license: 'CC BY 4.0',
    url: 'https://www.seismicportal.eu/fdsn-wsevent.html',
  },
};

export type EarthquakeReport = {
  catalogue: string;
  since_year: number;
  radius_km: number;
  min_magnitude: number;
  retrieved_on: string;
  sources: EarthquakeSource[];
  events: {
    date: string;
    magnitude: number;
    distance_km: number;
    place: string | null;
    location: [number, number];
    catalogue: CatalogueKey;
  }[];
};

const usgsSchema = z.object({
  features: z.array(
    z.object({
      properties: z.object({
        mag: z.number().nullable(),
        place: z.string().nullable(),
        time: z.number(),
        type: z.string(),
      }),
      geometry: z.object({ coordinates: z.array(z.number()).min(2) }),
    }),
  ),
});

const emscSchema = z.object({
  features: z.array(
    z.object({
      properties: z.object({
        mag: z.number().nullable(),
        time: z.string(),
        lat: z.number(),
        lon: z.number(),
        evtype: z.string().nullable().optional(),
      }),
    }),
  ),
});

export function usgsPlace(place: string | null): string | null {
  const name = place === null ? undefined : USGS_PLACE.exec(place.trim())?.[1];
  if (name === undefined || name.includes('?')) return null;
  return name;
}

export function parseUsgsEvents(body: unknown): CatalogueEvent[] {
  return usgsSchema.parse(body).features.flatMap((feature) => {
    const { mag, place, time, type } = feature.properties;
    const [longitude, latitude] = feature.geometry.coordinates;
    if (mag === null || type !== 'earthquake' || longitude === undefined || latitude === undefined)
      return [];
    return [
      {
        catalogue: 'usgs' as const,
        time: new Date(time).toISOString(),
        magnitude: mag,
        longitude,
        latitude,
        place: usgsPlace(place),
      },
    ];
  });
}

export function parseEmscEvents(body: unknown): CatalogueEvent[] {
  return emscSchema.parse(body).features.flatMap((feature) => {
    const { mag, time, lat, lon, evtype } = feature.properties;
    if (mag === null || (evtype != null && !EMSC_EARTHQUAKE_TYPES.has(evtype))) return [];
    return [
      {
        catalogue: 'emsc' as const,
        time: new Date(time).toISOString(),
        magnitude: mag,
        longitude: lon,
        latitude: lat,
        place: null,
      },
    ];
  });
}

function kilometres(from: { longitude: number; latitude: number }, to: CatalogueEvent): number {
  return (
    distanceMeters(
      { lng: from.longitude, lat: from.latitude },
      { lng: to.longitude, lat: to.latitude },
    ) / 1000
  );
}

function isSameEvent(left: CatalogueEvent, right: CatalogueEvent): boolean {
  const seconds = Math.abs(Date.parse(left.time) - Date.parse(right.time)) / 1000;
  return seconds <= SAME_EVENT_SECONDS && kilometres(left, right) <= SAME_EVENT_KM;
}

export function mergeCatalogues(
  primary: readonly CatalogueEvent[],
  secondary: readonly CatalogueEvent[],
): CatalogueEvent[] {
  const extra = secondary.filter((event) => !primary.some((kept) => isSameEvent(kept, event)));
  return [...primary, ...extra].sort((left, right) => left.time.localeCompare(right.time));
}

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function buildEarthquakeReport(input: {
  longitude: number;
  latitude: number;
  usgs: readonly CatalogueEvent[];
  emsc: readonly CatalogueEvent[];
  retrievedOn: string;
}): EarthquakeReport {
  const events = mergeCatalogues(input.usgs, input.emsc)
    .map((event) => ({ event, distanceKm: kilometres(input, event) }))
    .filter(
      ({ event, distanceKm }) =>
        distanceKm <= EARTHQUAKE_QUERY.radiusKm && event.magnitude >= EARTHQUAKE_QUERY.minMagnitude,
    )
    .map(({ event, distanceKm }) => ({
      date: event.time.slice(0, 10),
      magnitude: roundTo(event.magnitude, 1),
      distance_km: Math.round(distanceKm),
      place: event.place,
      location: [roundTo(event.longitude, 4), roundTo(event.latitude, 4)] as [number, number],
      catalogue: event.catalogue,
    }));
  const used = new Set(events.map((event) => event.catalogue));
  const sources = (['usgs', 'emsc'] as const)
    .filter((key) => used.has(key))
    .map((key) => EARTHQUAKE_SOURCES[key]);
  const firstYear = events[0] === undefined ? null : Number(events[0].date.slice(0, 4));
  return {
    catalogue:
      sources.length === 0
        ? 'catalogul USGS și EMSC'
        : `catalogul ${sources.map((source) => source.key.toUpperCase()).join(' și ')}`,
    since_year: firstYear ?? EARTHQUAKE_QUERY.startYear,
    radius_km: EARTHQUAKE_QUERY.radiusKm,
    min_magnitude: EARTHQUAKE_QUERY.minMagnitude,
    retrieved_on: input.retrievedOn,
    sources,
    events,
  };
}
