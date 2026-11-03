import { describe, expect, it } from 'vitest';

import { classifyGreenFeature } from './green.osm.ts';

describe('classifyGreenFeature', () => {
  it('maps OSM green tags to a kind', () => {
    expect(classifyGreenFeature({ leisure: 'park' })).toEqual({
      type: 'area',
      kind: 'park',
      isPublic: true,
    });
    expect(classifyGreenFeature({ natural: 'wood' })).toMatchObject({ kind: 'forest' });
    expect(classifyGreenFeature({ landuse: 'village_green' })).toMatchObject({ kind: 'square' });
    expect(classifyGreenFeature({ landuse: 'grass' })).toMatchObject({ kind: 'other' });
  });

  it('keeps private and residential gardens out of public green', () => {
    expect(classifyGreenFeature({ leisure: 'park', access: 'private' })).toMatchObject({
      isPublic: false,
    });
    expect(classifyGreenFeature({ leisure: 'garden', 'garden:type': 'residential' })).toMatchObject(
      { isPublic: false },
    );
  });

  it('turns playgrounds, dog parks and pitches into amenities', () => {
    expect(classifyGreenFeature({ leisure: 'playground' })).toEqual({
      type: 'amenity',
      amenity: 'playground',
    });
    expect(classifyGreenFeature({ leisure: 'pitch' })).toEqual({
      type: 'amenity',
      amenity: 'sports',
    });
  });

  it('ignores anything else', () => {
    expect(classifyGreenFeature({ landuse: 'cemetery' })).toBeNull();
  });
});
