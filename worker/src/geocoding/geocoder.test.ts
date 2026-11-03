import { describe, expect, it } from 'vitest';

import { createAddressGeocoder, type GeocoderFeature } from './geocoder.ts';

function house(street: string, number: string, lng: number, lat: number): GeocoderFeature {
  return {
    geometry: { type: 'Point', coordinates: [lng, lat] },
    properties: { 'addr:street': street, 'addr:housenumber': number },
  };
}

function street(name: string, coordinates: [number, number][]): GeocoderFeature {
  return {
    geometry: { type: 'LineString', coordinates },
    properties: { highway: 'residential', name },
  };
}

const FEATURES: GeocoderFeature[] = [
  house('Strada Gladiolelor', '2', 24.15, 45.79),
  house('Strada Gladiolelor', '8', 24.152, 45.791),
  {
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [24.16, 45.8],
          [24.1602, 45.8],
          [24.1602, 45.8002],
          [24.16, 45.8],
        ],
      ],
    },
    properties: {
      building: 'yes',
      'addr:street': 'Bulevardul Victoriei',
      'addr:housenumber': '10-12',
    },
  },
  house('Strada Principală', '5', 24.1, 45.7),
  house('Strada Principală', '5', 24.3, 45.9),
  street('Aleea Scurtă', [
    [24.2, 45.75],
    [24.201, 45.75],
  ]),
  street('Strada Lungă', [
    [24.0, 45.75],
    [24.05, 45.75],
  ]),
  street('Strada General Ion Dragalina', [
    [24.21, 45.76],
    [24.211, 45.76],
  ]),
];

const geocoder = createAddressGeocoder(FEATURES, 'Sibiu');

describe('createAddressGeocoder', () => {
  it('counts the address points and named streets it indexed', () => {
    expect(geocoder.size).toEqual({ addresses: 5, streets: 3 });
  });

  it('finds an exact house number, also inside a range drawn as a building', () => {
    expect(geocoder.geocode('Gladiolelor 2, SIBIU')).toEqual({
      location: { lng: 24.15, lat: 45.79 },
      precision: 'house',
    });
    expect(geocoder.geocode('B-dul Victoriei nr. 12')?.precision).toBe('house');
  });

  it('falls back to the closest number on the same side of the street', () => {
    expect(geocoder.geocode('Str. Gladiolelor nr. 6')).toEqual({
      location: { lng: 24.152, lat: 45.791 },
      precision: 'nearby_house',
    });
    expect(geocoder.geocode('Str. Gladiolelor nr. 5')).toBeNull();
  });

  it('places a short street at its middle and refuses a long one', () => {
    expect(geocoder.geocode('Aleea Scurtă 3')?.precision).toBe('street');
    expect(geocoder.geocode('Strada Lungă 3')).toBeNull();
  });

  it('refuses the same address found in two distant places', () => {
    expect(geocoder.geocode('Str. Principală nr. 5')).toBeNull();
  });

  it('accepts a shortened street name when only one street contains it', () => {
    expect(geocoder.geocode('Str. Dragalina 4')?.precision).toBe('street');
    expect(geocoder.geocode('Str. Necunoscută 1')).toBeNull();
    expect(geocoder.geocode('SIBIU')).toBeNull();
  });
});
