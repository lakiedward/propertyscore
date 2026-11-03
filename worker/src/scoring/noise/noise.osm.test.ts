import { describe, expect, it } from 'vitest';

import type { OsmFeature } from '../../sources/osm.ts';
import { classifyNoiseSource, isBuildingFootprint } from './noise.osm.ts';

const LINE = {
  type: 'LineString',
  coordinates: [
    [21.2, 45.75],
    [21.21, 45.75],
  ],
};
const AREA = { type: 'MultiPolygon', coordinates: [] };

function feature(properties: Record<string, string>, geometry = LINE): OsmFeature {
  return { id: 'w1', geometry, properties };
}

describe('classifyNoiseSource', () => {
  it('maps road types and their links to the proxy classes', () => {
    expect(
      classifyNoiseSource(feature({ highway: 'primary_link', name: 'Bd. Revoluției' })),
    ).toEqual({ kind: 'road', sourceClass: 'primary', name: 'Bd. Revoluției', geometry: LINE });
    expect(classifyNoiseSource(feature({ highway: 'living_street' }))).toMatchObject({
      sourceClass: 'residential',
      name: null,
    });
    expect(classifyNoiseSource(feature({ highway: 'trunk', ref: 'DN6' }))).toMatchObject({
      sourceClass: 'trunk',
      name: 'DN6',
    });
  });

  it('keeps tram, main-line rail and runways, and drops sidings and yards', () => {
    expect(classifyNoiseSource(feature({ railway: 'tram' }))).toMatchObject({ kind: 'tram' });
    expect(classifyNoiseSource(feature({ railway: 'light_rail' }))).toMatchObject({
      sourceClass: 'tram',
    });
    expect(classifyNoiseSource(feature({ railway: 'rail' }))).toMatchObject({ kind: 'rail' });
    expect(classifyNoiseSource(feature({ railway: 'rail', service: 'siding' }))).toBeNull();
    expect(classifyNoiseSource(feature({ aeroway: 'runway' }))).toMatchObject({
      kind: 'air',
      sourceClass: 'runway',
    });
  });

  it('ignores tunnels, roads under construction, service roads and non-lines', () => {
    expect(classifyNoiseSource(feature({ highway: 'primary', tunnel: 'yes' }))).toBeNull();
    expect(classifyNoiseSource(feature({ highway: 'primary', construction: 'yes' }))).toBeNull();
    expect(classifyNoiseSource(feature({ highway: 'service' }))).toBeNull();
    expect(classifyNoiseSource(feature({ highway: 'primary' }, AREA))).toBeNull();
  });
});

describe('isBuildingFootprint', () => {
  it('keeps building areas and drops roofs and lines', () => {
    expect(isBuildingFootprint(feature({ building: 'apartments' }, AREA))).toBe(true);
    expect(isBuildingFootprint(feature({ building: 'roof' }, AREA))).toBe(false);
    expect(isBuildingFootprint(feature({ building: 'yes' }))).toBe(false);
  });
});
