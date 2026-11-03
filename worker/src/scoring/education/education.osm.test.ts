import { describe, expect, it } from 'vitest';

import { nameSimilarity, normalizeName } from './education.names.ts';
import {
  classifyOsmUnit,
  ownershipFromTags,
  parseIscedLevels,
  representativePoint,
  toEducationUnit,
} from './education.osm.ts';

describe('normalizeName', () => {
  it('drops diacritics and punctuation and shortens the usual school names', () => {
    expect(normalizeName('Școala Gimnazială nr. 15')).toBe('sg nr 15');
    expect(normalizeName('Grădinița cu Program Prelungit Nr. 21')).toBe('gpp nr 21');
    expect(normalizeName('Colegiul Național „C.D. Loga”')).toBe('cn c d loga');
  });
});

describe('nameSimilarity', () => {
  it('matches the register and OSM spellings of the same unit', () => {
    expect(nameSimilarity('Școala Gimnazială Nr. 15', 'Scoala Gimnaziala nr.15')).toBe(1);
    expect(nameSimilarity('Grădinița PP 21', 'Grădinița cu program prelungit nr. 21')).toBeLessThan(
      1,
    );
  });

  it('never matches units with different numbers', () => {
    expect(nameSimilarity('Școala Gimnazială nr. 15', 'Școala Gimnazială nr. 16')).toBe(0);
    expect(nameSimilarity('Școala Gimnazială nr. 15', 'Școala Gimnazială')).toBe(0);
  });

  it('gives nothing for an empty name', () => {
    expect(nameSimilarity('', 'Școala Gimnazială nr. 1')).toBe(0);
  });
});

describe('parseIscedLevels', () => {
  it('reads lists and ranges', () => {
    expect(parseIscedLevels('1;2')).toEqual(['primary', 'lower_secondary']);
    expect(parseIscedLevels('0-3')).toEqual([
      'kindergarten',
      'primary',
      'lower_secondary',
      'upper_secondary',
    ]);
    expect(parseIscedLevels('5')).toEqual([]);
    expect(parseIscedLevels(undefined)).toEqual([]);
  });
});

describe('classifyOsmUnit', () => {
  it('maps the amenity and the name to levels', () => {
    expect(classifyOsmUnit({ amenity: 'kindergarten', name: 'Grădinița PP 3' })).toEqual([
      'kindergarten',
    ]);
    expect(classifyOsmUnit({ amenity: 'kindergarten', name: 'Creșa nr. 2' })).toEqual(['nursery']);
    expect(classifyOsmUnit({ amenity: 'school', name: 'Școala Gimnazială nr. 7' })).toEqual([
      'primary',
      'lower_secondary',
    ]);
    expect(classifyOsmUnit({ amenity: 'school', name: 'Liceul Teoretic Bartók Béla' })).toEqual([
      'upper_secondary',
    ]);
    expect(classifyOsmUnit({ amenity: 'college', name: 'Colegiul Național Bănățean' })).toEqual([
      'upper_secondary',
    ]);
    expect(classifyOsmUnit({ amenity: 'university', name: 'Universitatea de Vest' })).toEqual([
      'university',
    ]);
  });

  it('prefers isced:level over the name', () => {
    expect(
      classifyOsmUnit({
        amenity: 'school',
        name: 'Școala Gimnazială nr. 1',
        'isced:level': '0;1;2',
      }),
    ).toEqual(['kindergarten', 'primary', 'lower_secondary']);
  });

  it('leaves out schools that are not general education', () => {
    expect(classifyOsmUnit({ amenity: 'school', name: 'Școala de șoferi Auto Plus' })).toBeNull();
    expect(classifyOsmUnit({ amenity: 'school', name: 'After School Piticot' })).toBeNull();
    expect(classifyOsmUnit({ amenity: 'college', name: 'Școala Postliceală Sanitară' })).toBeNull();
    expect(classifyOsmUnit({ amenity: 'library' })).toBeNull();
  });
});

describe('ownershipFromTags', () => {
  it('reads operator:type and keeps unknown values unknown', () => {
    expect(ownershipFromTags({ 'operator:type': 'government' })).toBe('public');
    expect(ownershipFromTags({ 'operator:type': 'private' })).toBe('private');
    expect(ownershipFromTags({ 'operator:type': 'religious' })).toBe('unknown');
    expect(ownershipFromTags({})).toBe('unknown');
  });
});

describe('representativePoint', () => {
  it('uses the point itself or the centroid of the outer ring', () => {
    expect(representativePoint({ type: 'Point', coordinates: [21.2, 45.7] })).toEqual({
      lng: 21.2,
      lat: 45.7,
    });
    const square = representativePoint({
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [2, 0],
          [2, 2],
          [0, 2],
          [0, 0],
        ],
      ],
    });
    expect(square?.lng).toBeCloseTo(1);
    expect(square?.lat).toBeCloseTo(1);
    expect(representativePoint({ type: 'LineString', coordinates: [] })).toBeNull();
  });
});

describe('toEducationUnit', () => {
  it('builds a unit with a stable OSM reference', () => {
    expect(
      toEducationUnit({
        id: 'n42',
        geometry: { type: 'Point', coordinates: [21.23, 45.75] },
        properties: {
          amenity: 'kindergarten',
          name: ' Grădinița PP 21 ',
          'operator:type': 'public',
        },
      }),
    ).toEqual({
      osmRef: 'osm:node/42',
      name: 'Grădinița PP 21',
      levels: ['kindergarten'],
      ownership: 'public',
      location: { lng: 21.23, lat: 45.75 },
    });
  });
});
