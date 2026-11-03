import { describe, expect, it } from 'vitest';

import {
  classifyHealthTags,
  distanceMeters,
  geocodeProviders,
  isAlwaysOpen,
  mergeCnasProviders,
  namesMatch,
  normalizeProviderName,
  osmHealthPoi,
  representativePoint,
  type HealthPoi,
} from './health.sources.ts';

function pharmacy(sourceRef: string, name: string | null, lng: number, lat: number): HealthPoi {
  return {
    sourceRef,
    category: 'health_pharmacy',
    name,
    location: { lng, lat },
    openingHours: null,
    isAlwaysOpen: null,
    speciality: null,
    sources: ['osm'],
    cnasContract: false,
    cnasRef: null,
  };
}

describe('classifyHealthTags', () => {
  it('maps amenity and healthcare tags to the health categories', () => {
    expect(classifyHealthTags({ amenity: 'pharmacy' })).toBe('health_pharmacy');
    expect(classifyHealthTags({ amenity: 'doctors' })).toBe('health_primary');
    expect(classifyHealthTags({ healthcare: 'laboratory' })).toBe('health_clinic');
    expect(classifyHealthTags({ healthcare: 'centre' })).toBe('health_clinic');
    expect(classifyHealthTags({ amenity: 'dentist' })).toBe('health_dentist');
    expect(classifyHealthTags({ amenity: 'hospital', emergency: 'yes' })).toBe('health_hospital');
  });

  it('prefers the amenity tag and ignores other healthcare values', () => {
    expect(classifyHealthTags({ amenity: 'clinic', healthcare: 'doctor' })).toBe('health_clinic');
    expect(classifyHealthTags({ healthcare: 'physiotherapist' })).toBeNull();
    expect(classifyHealthTags({ shop: 'chemist' })).toBeNull();
  });
});

describe('isAlwaysOpen', () => {
  it('recognises 24/7 and keeps unknown hours unknown', () => {
    expect(isAlwaysOpen('24/7')).toBe(true);
    expect(isAlwaysOpen(' 24/7 ')).toBe(true);
    expect(isAlwaysOpen('Mo-Fr 08:00-20:00')).toBe(false);
    expect(isAlwaysOpen(undefined)).toBeNull();
    expect(isAlwaysOpen('')).toBeNull();
  });
});

describe('representativePoint', () => {
  it('uses the point itself or the mean of the outer ring', () => {
    expect(representativePoint({ type: 'Point', coordinates: [21.2, 45.7] })).toEqual({
      lng: 21.2,
      lat: 45.7,
    });
    const square = [
      [21, 45],
      [21.2, 45],
      [21.2, 45.2],
      [21, 45.2],
      [21, 45],
    ];
    const center = representativePoint({ type: 'MultiPolygon', coordinates: [[square]] });
    expect(center?.lng).toBeCloseTo(21.1);
    expect(center?.lat).toBeCloseTo(45.1);
    expect(representativePoint({ type: 'Point', coordinates: [] })).toBeNull();
  });
});

describe('osmHealthPoi', () => {
  it('builds a point of interest with its hours and speciality', () => {
    expect(
      osmHealthPoi({
        sourceRef: 'osm:node/5',
        geometry: { type: 'Point', coordinates: [21.2296, 45.7539] },
        properties: { amenity: 'pharmacy', name: 'Farmacia Catena', opening_hours: '24/7' },
      }),
    ).toMatchObject({
      sourceRef: 'osm:node/5',
      category: 'health_pharmacy',
      name: 'Farmacia Catena',
      isAlwaysOpen: true,
      sources: ['osm'],
      cnasContract: false,
    });
  });

  it('skips features that are not health places', () => {
    expect(
      osmHealthPoi({
        sourceRef: 'osm:node/6',
        geometry: { type: 'Point', coordinates: [21.2, 45.7] },
        properties: { amenity: 'cafe' },
      }),
    ).toBeNull();
  });
});

describe('normalizeProviderName and namesMatch', () => {
  it('drops diacritics, legal forms and generic words', () => {
    expect(normalizeProviderName('S.C. Farmacia Catena Nr. 12 S.R.L.')).toEqual([
      'catena',
      'nr',
      '12',
    ]);
    expect(normalizeProviderName('Cabinet Medical Individual Dr. Popescu Ștefan')).toEqual([
      'popescu',
      'stefan',
    ]);
  });

  it('matches names that share most of their meaningful words', () => {
    expect(namesMatch('Farmacia Catena', 'SC CATENA HYGEIA SRL')).toBe(true);
    expect(namesMatch('Farmacia Dona', 'Farmacia Catena')).toBe(false);
    expect(namesMatch('Farmacia', 'Farmacie')).toBe(false);
  });
});

describe('distanceMeters', () => {
  it('measures short distances on the sphere', () => {
    expect(
      distanceMeters({ lng: 21.2257, lat: 45.7537 }, { lng: 21.2257, lat: 45.7546 }),
    ).toBeCloseTo(100, -1);
  });
});

describe('mergeCnasProviders', () => {
  const osm = [
    pharmacy('osm:node/1', 'Farmacia Catena', 21.2296, 45.7539),
    pharmacy('osm:node/2', 'Farmacia Dona', 21.23, 45.754),
  ];

  it('marks an OSM place under contract when a provider with a similar name is close', () => {
    const result = mergeCnasProviders(
      osm,
      [
        {
          id: 'p1',
          kind: 'pharmacy',
          name: 'SC Catena Hygeia SRL',
          address: null,
          location: { lng: 21.2297, lat: 45.7539 },
        },
      ],
      50,
    );
    expect(result).toMatchObject({ cnasMatched: 1, cnasAdded: 0, cnasWithoutLocation: 0 });
    expect(result.pois[0]).toMatchObject({
      cnasContract: true,
      cnasRef: 'cnas:p1',
      sources: ['osm', 'cnas'],
    });
    expect(osm[0]?.cnasContract).toBe(false);
  });

  it('adds a provider without an OSM pair as a new place and counts the ungeocoded ones', () => {
    const result = mergeCnasProviders(
      osm,
      [
        {
          id: 'p2',
          kind: 'pharmacy',
          name: 'Farmacia Catena',
          address: null,
          location: { lng: 21.24, lat: 45.76 },
        },
        { id: 'p3', kind: 'family_doctor', name: 'Dr. Ionescu', address: null, location: null },
      ],
      50,
    );
    expect(result).toMatchObject({ cnasMatched: 0, cnasAdded: 1, cnasWithoutLocation: 1 });
    expect(result.pois.at(-1)).toMatchObject({
      sourceRef: 'cnas:p2',
      category: 'health_pharmacy',
      sources: ['cnas'],
      cnasContract: true,
    });
  });

  it('never matches across categories and uses each OSM place once', () => {
    const result = mergeCnasProviders(
      osm,
      [
        {
          id: 'p4',
          kind: 'dentist',
          name: 'Catena',
          address: null,
          location: { lng: 21.2296, lat: 45.7539 },
        },
        {
          id: 'p5',
          kind: 'pharmacy',
          name: 'Catena',
          address: null,
          location: { lng: 21.2296, lat: 45.7539 },
        },
        {
          id: 'p6',
          kind: 'pharmacy',
          name: 'Catena',
          address: null,
          location: { lng: 21.2296, lat: 45.7539 },
        },
      ],
      50,
    );
    expect(result).toMatchObject({ cnasMatched: 1, cnasAdded: 2 });
  });
});

describe('geocodeProviders', () => {
  it('geocodes only the providers that have an address but no location', async () => {
    const asked: string[] = [];
    const providers = await geocodeProviders(
      [
        {
          id: 'a',
          kind: 'pharmacy',
          name: 'Placed',
          address: 'Str. A 1',
          location: { lng: 1, lat: 2 },
        },
        { id: 'b', kind: 'pharmacy', name: 'Found', address: 'Str. B 2', location: null },
        { id: 'c', kind: 'pharmacy', name: 'Missing', address: 'Str. C 3', location: null },
        { id: 'd', kind: 'pharmacy', name: 'No address', address: null, location: null },
      ],
      (address) => {
        asked.push(address);
        return Promise.resolve(address === 'Str. B 2' ? { lng: 21.2, lat: 45.7 } : null);
      },
    );
    expect(asked).toEqual(['Str. B 2', 'Str. C 3']);
    expect(providers.map((provider) => provider.location)).toEqual([
      { lng: 1, lat: 2 },
      { lng: 21.2, lat: 45.7 },
      null,
      null,
    ]);
  });
});
