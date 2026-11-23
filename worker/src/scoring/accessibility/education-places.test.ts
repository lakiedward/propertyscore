import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

import { afterAll, describe, expect, it } from 'vitest';

import type { OsmFeature } from '../../sources/osm.ts';
import { hasOsmium } from '../../test/osm-fixture.ts';
import {
  educationPlaces,
  exportEducationPlaces,
  universityAbbreviation,
} from './education-places.ts';

const ORIGIN = { lng: 21.225, lat: 45.753 };

function point(id: string, lng: number, lat: number, properties: Record<string, string>) {
  return { id, geometry: { type: 'Point', coordinates: [lng, lat] }, properties } as OsmFeature;
}

function square(
  id: string,
  lng: number,
  lat: number,
  size: number,
  properties: Record<string, string>,
) {
  const ring = [
    [lng, lat],
    [lng + size, lat],
    [lng + size, lat + size],
    [lng, lat + size],
    [lng, lat],
  ];
  return { id, geometry: { type: 'Polygon', coordinates: [ring] }, properties } as OsmFeature;
}

describe('universityAbbreviation', () => {
  it('prefers the short name and otherwise takes the capitalised initials', () => {
    expect(universityAbbreviation('Universitatea Politehnica Timișoara', 'UPT')).toBe('UPT');
    expect(universityAbbreviation('Universitatea de Vest din Timișoara', null)).toBe('UVT');
    expect(universityAbbreviation('Universitatea „Regele Mihai”', null)).toBeNull();
  });
});

describe('educationPlaces', () => {
  const features = [
    point('n1', 21.226, 45.754, { amenity: 'school', name: 'Colegiul Național Bănățean' }),
    square('a2', 21.23, 45.75, 0.002, {
      building: 'school',
      name: 'Liceul Waldorf - Corp Gimnaziu',
    }),
    point('n3', 21.3, 45.8, { amenity: 'school', name: 'Liceul Waldorf' }),
    point('n4', 21.227, 45.752, {
      amenity: 'school',
      name: 'Liceul Teoretic Lenau - clasele I-IV',
    }),
    point('n5', 21.228, 45.752, { amenity: 'school', name: 'Școala Gimnazială nr. 2' }),
    square('a6', 21.24, 45.74, 0.01, {
      amenity: 'university',
      name: 'Universitatea Politehnica Timișoara',
      short_name: 'UPT',
    }),
    point('n7', 21.245, 45.745, { amenity: 'university', name: 'Facultatea de Mecanică' }),
    point('n8', 21.3, 45.7, { amenity: 'university', name: 'Facultatea de Mecanică' }),
    point('n9', 21.2, 45.76, {
      building: 'university',
      name: 'Facultatea de Drept',
      operator: 'Universitatea de Vest din Timișoara',
    }),
    square('a10', 21.1, 45.7, 0.002, { amenity: 'university', name: 'Universitatea Ioan Slavici' }),
    point('n11', 21.22, 45.75, { shop: 'books', name: 'Liceul fals' }),
  ];

  it('keeps high schools and faculties, one per name, nearest first', () => {
    const places = educationPlaces(features, ORIGIN, 10);
    expect(places.map(({ id, kind, name, group }) => ({ id, kind, name, group }))).toEqual([
      {
        id: 'high_school:n1',
        kind: 'high_school',
        name: 'Colegiul Național Bănățean',
        group: null,
      },
      { id: 'high_school:a2', kind: 'high_school', name: 'Liceul Waldorf', group: null },
      { id: 'faculty:n7', kind: 'faculty', name: 'Mecanică', group: 'UPT' },
      { id: 'faculty:n9', kind: 'faculty', name: 'Drept', group: 'UVT' },
      { id: 'faculty:a10', kind: 'faculty', name: 'Universitatea Ioan Slavici', group: null },
    ]);
  });

  it('keeps only the nearest places of each kind', () => {
    const places = educationPlaces(features, ORIGIN, 1);
    expect(places.map((place) => place.id)).toEqual(['high_school:n1', 'faculty:n7']);
  });
});

const directories: string[] = [];

afterAll(async () => {
  await Promise.all(directories.map((path) => rm(path, { recursive: true, force: true })));
});

describe.skipIf(!hasOsmium())('exportEducationPlaces', () => {
  it('reads the schools of an OSM extract', async () => {
    const workDir = await mkdtemp(join(tmpdir(), 'education-places-'));
    directories.push(workDir);
    const osm = join(workDir, 'schools.osm');
    await writeFile(
      osm,
      `<?xml version="1.0" encoding="UTF-8"?>
<osm version="0.6">
  <node id="1" version="1" lat="45.754" lon="21.226"><tag k="amenity" v="school"/><tag k="name" v="Colegiul Național Bănățean"/></node>
  <node id="2" version="1" lat="45.745" lon="21.245"><tag k="amenity" v="university"/><tag k="name" v="Facultatea de Mecanică"/></node>
  <node id="3" version="1" lat="45.750" lon="21.230"><tag k="amenity" v="cafe"/><tag k="name" v="Liceul Cafe"/></node>
</osm>
`,
    );
    const osmPbf = join(workDir, 'schools.osm.pbf');
    execFileSync('osmium', ['cat', osm, '--output', osmPbf]);
    const places = await exportEducationPlaces({
      osmPbf,
      workDir,
      origin: ORIGIN,
      limitPerKind: 10,
    });
    expect(places.map((place) => [place.kind, place.name])).toEqual([
      ['high_school', 'Colegiul Național Bănățean'],
      ['faculty', 'Mecanică'],
    ]);
  });
});
