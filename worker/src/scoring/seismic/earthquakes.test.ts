import { describe, expect, it } from 'vitest';

import {
  buildEarthquakeReport,
  mergeCatalogues,
  parseEmscEvents,
  parseUsgsEvents,
  usgsPlace,
  type CatalogueEvent,
} from './earthquakes.ts';

const ADDRESS = { longitude: 21.18007, latitude: 45.72912 };

function usgsFeature(input: {
  mag: number | null;
  place: string | null;
  time: string;
  lon: number;
  lat: number;
  type?: string;
}) {
  return {
    properties: {
      mag: input.mag,
      place: input.place,
      time: Date.parse(input.time),
      type: input.type ?? 'earthquake',
    },
    geometry: { coordinates: [input.lon, input.lat, 10] },
  };
}

function emscFeature(input: {
  mag: number | null;
  time: string;
  lon: number;
  lat: number;
  evtype?: string;
}) {
  return {
    properties: {
      mag: input.mag,
      time: input.time,
      lat: input.lat,
      lon: input.lon,
      evtype: input.evtype ?? 'ke',
    },
  };
}

function event(overrides: Partial<CatalogueEvent>): CatalogueEvent {
  return {
    catalogue: 'usgs',
    time: '1991-07-12T10:42:21.000Z',
    magnitude: 5.6,
    longitude: 21.2,
    latitude: 45.6,
    place: null,
    ...overrides,
  };
}

describe('usgsPlace', () => {
  it('keeps the locality of a USGS place', () => {
    expect(usgsPlace('2 km S of Livezile, Romania')).toBe('Livezile');
    expect(usgsPlace('1 km NW of Plandište, Serbia')).toBe('Plandište');
  });

  it('drops names USGS lost the diacritics of and regions without a locality', () => {
    expect(usgsPlace('4 km S of Giulv?z, Romania')).toBeNull();
    expect(usgsPlace('Serbia-Romania border region')).toBeNull();
    expect(usgsPlace(null)).toBeNull();
  });
});

describe('parseUsgsEvents', () => {
  it('keeps earthquakes with a magnitude', () => {
    const events = parseUsgsEvents({
      features: [
        usgsFeature({
          mag: 5.6,
          place: '2 km S of Livezile, Romania',
          time: '1991-07-12T10:42:21Z',
          lon: 21.13,
          lat: 45.48,
        }),
        usgsFeature({
          mag: 3.9,
          place: null,
          time: '2001-01-01T00:00:00Z',
          lon: 21.1,
          lat: 45.7,
          type: 'quarry blast',
        }),
        usgsFeature({ mag: null, place: null, time: '2001-01-01T00:00:00Z', lon: 21.1, lat: 45.7 }),
      ],
    });
    expect(events).toEqual([
      {
        catalogue: 'usgs',
        time: '1991-07-12T10:42:21.000Z',
        magnitude: 5.6,
        longitude: 21.13,
        latitude: 45.48,
        place: 'Livezile',
      },
    ]);
  });
});

describe('parseEmscEvents', () => {
  it('keeps known and suspected earthquakes', () => {
    const events = parseEmscEvents({
      features: [
        emscFeature({ mag: 3.8, time: '2024-01-13T09:08:27.97Z', lon: 21.2947, lat: 45.4378 }),
        emscFeature({ mag: 3.6, time: '2024-02-01T09:00:00Z', lon: 21.2, lat: 45.5, evtype: 'qb' }),
      ],
    });
    expect(events).toEqual([
      {
        catalogue: 'emsc',
        time: '2024-01-13T09:08:27.970Z',
        magnitude: 3.8,
        longitude: 21.2947,
        latitude: 45.4378,
        place: null,
      },
    ]);
  });
});

describe('mergeCatalogues', () => {
  it('drops a secondary event that matches a primary one in time and place', () => {
    const primary = [
      event({ time: '2023-06-06T17:26:52.000Z', magnitude: 4.7, longitude: 21.4, latitude: 46.06 }),
    ];
    const secondary = [
      event({
        catalogue: 'emsc',
        time: '2023-06-06T17:26:51.800Z',
        magnitude: 4.7,
        longitude: 21.52,
        latitude: 46.12,
      }),
      event({
        catalogue: 'emsc',
        time: '2024-01-13T09:08:27.970Z',
        magnitude: 3.8,
        longitude: 21.29,
        latitude: 45.44,
      }),
    ];
    const merged = mergeCatalogues(primary, secondary);
    expect(merged.map((item) => [item.catalogue, item.time])).toEqual([
      ['usgs', '2023-06-06T17:26:52.000Z'],
      ['emsc', '2024-01-13T09:08:27.970Z'],
    ]);
  });

  it('keeps two events minutes apart', () => {
    const merged = mergeCatalogues(
      [event({ time: '2023-05-22T17:46:42.000Z' })],
      [event({ catalogue: 'emsc', time: '2023-05-22T19:55:25.000Z' })],
    );
    expect(merged).toHaveLength(2);
  });
});

describe('buildEarthquakeReport', () => {
  it('writes the events within the radius with their distance and the sources used', () => {
    const report = buildEarthquakeReport({
      ...ADDRESS,
      usgs: [
        event({
          time: '1991-07-12T10:42:21.000Z',
          magnitude: 5.61,
          longitude: 21.131,
          latitude: 45.4806,
          place: 'Livezile',
        }),
        event({
          time: '1990-05-30T10:40:00.000Z',
          magnitude: 6.9,
          longitude: 26.6,
          latitude: 45.8,
        }),
      ],
      emsc: [
        event({
          catalogue: 'emsc',
          time: '2024-01-13T09:08:27.970Z',
          magnitude: 3.8,
          longitude: 21.29474,
          latitude: 45.43781,
        }),
      ],
      retrievedOn: '2026-11-19',
    });
    expect(report).toEqual({
      catalogue: 'catalogul USGS și EMSC',
      since_year: 1991,
      radius_km: 60,
      min_magnitude: 3.5,
      retrieved_on: '2026-11-19',
      sources: [
        expect.objectContaining({ key: 'usgs', license: 'domeniu public' }),
        expect.objectContaining({ key: 'emsc', license: 'CC BY 4.0' }),
      ],
      events: [
        {
          date: '1991-07-12',
          magnitude: 5.6,
          distance_km: 28,
          place: 'Livezile',
          location: [21.131, 45.4806],
          catalogue: 'usgs',
        },
        {
          date: '2024-01-13',
          magnitude: 3.8,
          distance_km: 34,
          place: null,
          location: [21.2947, 45.4378],
          catalogue: 'emsc',
        },
      ],
    });
  });

  it('names no source when no earthquake is near', () => {
    const report = buildEarthquakeReport({
      ...ADDRESS,
      usgs: [],
      emsc: [],
      retrievedOn: '2026-11-19',
    });
    expect(report.events).toEqual([]);
    expect(report.sources).toEqual([]);
    expect(report.since_year).toBe(1900);
  });
});
