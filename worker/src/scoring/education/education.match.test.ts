import { describe, expect, it } from 'vitest';

import {
  haversineMeters,
  matchInstitutions,
  matchSummary,
  placeUnmatched,
} from './education.match.ts';
import type { OsmEducationUnit } from './education.osm.ts';
import type { RegisterRow } from './education.siiir.ts';

const MATCH = { radius_m: 300, min_similarity: 0.6, name_only_similarity: 0.9 };

function registerRow(overrides: Partial<RegisterRow>): RegisterRow {
  return {
    siiir_code: '3561100001',
    parent_siiir_code: null,
    city_slug: 'timisoara',
    name: 'Școala Gimnazială nr. 15',
    levels: ['primary', 'lower_secondary'],
    ownership: 'public',
    teaching_languages: null,
    address: 'Str. Exemplu 1',
    lng: null,
    lat: null,
    is_excluded: false,
    source_date: '2026-09-01',
    ...overrides,
  };
}

function osmUnit(overrides: Partial<OsmEducationUnit>): OsmEducationUnit {
  return {
    osmRef: 'osm:way/1',
    name: 'Scoala Gimnaziala nr. 15',
    levels: ['primary', 'lower_secondary'],
    ownership: 'unknown',
    location: { lng: 21.23, lat: 45.75 },
    ...overrides,
  };
}

describe('haversineMeters', () => {
  it('measures about 111 km per degree of latitude', () => {
    expect(haversineMeters({ lng: 21, lat: 45 }, { lng: 21, lat: 46 })).toBeCloseTo(111_195, -2);
  });
});

describe('matchInstitutions', () => {
  it('takes the position from OSM and the data from the register', () => {
    const [row] = matchInstitutions([registerRow({})], [osmUnit({})], MATCH);
    expect(row).toMatchObject({
      siiir_code: '3561100001',
      osm_ref: 'osm:way/1',
      name: 'Școala Gimnazială nr. 15',
      ownership: 'public',
      lng: 21.23,
      location_precision: 'osm',
      match_status: 'matched',
    });
  });

  it('matches a geocoded register row only within the radius', () => {
    const near = registerRow({ lng: 21.231, lat: 45.7505 });
    const far = registerRow({ lng: 21.3, lat: 45.75 });
    expect(matchInstitutions([near], [osmUnit({})], MATCH)[0]?.match_status).toBe('matched');
    const rows = matchInstitutions([far], [osmUnit({})], MATCH);
    expect(rows.map((row) => row.match_status)).toEqual(['siiir_only', 'osm_only']);
    expect(rows[0]).toMatchObject({ lng: 21.3, location_precision: 'geocoded' });
  });

  it('does not match a name-only register row when two OSM units fit equally', () => {
    const rows = matchInstitutions(
      [registerRow({})],
      [osmUnit({}), osmUnit({ osmRef: 'osm:node/2', location: { lng: 21.25, lat: 45.76 } })],
      MATCH,
    );
    expect(rows.map((row) => row.match_status)).toEqual(['siiir_only', 'osm_only', 'osm_only']);
    expect(rows[0]).toMatchObject({ lng: null, location_precision: null });
  });

  it('never pairs units of different levels', () => {
    const rows = matchInstitutions(
      [registerRow({ name: 'Grădinița nr. 15', levels: ['kindergarten'] })],
      [osmUnit({ name: 'Grădinița nr. 15' })],
      MATCH,
    );
    expect(rows.map((row) => row.match_status)).toEqual(['siiir_only', 'osm_only']);
  });

  it('uses each OSM unit at most once, for the best register row', () => {
    const rows = matchInstitutions(
      [
        registerRow({
          siiir_code: 'a',
          name: 'Școala Gimnazială nr. 15 „Ion Creangă”',
          lng: 21.23,
          lat: 45.75,
        }),
        registerRow({
          siiir_code: 'b',
          name: 'Școala Gimnazială nr. 15 „Avram Iancu”',
          lng: 21.23,
          lat: 45.75,
        }),
      ],
      [osmUnit({ name: 'Școala Generală nr. 15 Avram Iancu' })],
      MATCH,
    );
    expect(rows.find((row) => row.match_status === 'matched')?.siiir_code).toBe('b');
    expect(matchSummary(rows)).toEqual({
      institutions: 2,
      matched: 1,
      siiir_only: 1,
      osm_only: 0,
      excluded: 0,
      geocoded: 1,
      unplaced: 0,
    });
  });

  it('matches by name alone when the spellings differ only in the unit type and the city', () => {
    const rows = matchInstitutions(
      [registerRow({ name: 'GRĂDINIŢA CU PROGRAM PRELUNGIT NR. 14', levels: ['kindergarten'] })],
      [osmUnit({ name: 'Grădinița nr. 14 Timișoara', levels: ['kindergarten'] })],
      MATCH,
    );
    expect(rows.map((row) => row.match_status)).toEqual(['matched']);
  });

  it('takes one of several OSM features of the same unit drawn at one place', () => {
    const rows = matchInstitutions(
      [registerRow({ name: 'Liceul Teoretic „Constantin Noica”', levels: ['upper_secondary'] })],
      [
        osmUnit({ name: 'Liceul Teoretic Constantin Noica', levels: ['upper_secondary'] }),
        osmUnit({
          osmRef: 'osm:node/2',
          name: 'Liceul Teoretic Constantin Noica',
          levels: ['upper_secondary'],
          location: { lng: 21.2305, lat: 45.7502 },
        }),
      ],
      MATCH,
    );
    expect(rows.map((row) => [row.match_status, row.osm_ref])).toEqual([
      ['matched', 'osm:way/1'],
      ['osm_only', 'osm:node/2'],
    ]);
  });

  it('leaves an OSM unit unmatched when two register rows claim it by name alone', () => {
    const rows = matchInstitutions(
      [registerRow({ siiir_code: 'a' }), registerRow({ siiir_code: 'b' })],
      [osmUnit({})],
      MATCH,
    );
    expect(rows.map((row) => row.match_status)).toEqual(['siiir_only', 'siiir_only', 'osm_only']);
  });

  it('lets an excluded register unit claim its OSM unit whatever level OSM guessed', () => {
    const rows = matchInstitutions(
      [
        registerRow({
          name: 'Școala Postliceală Sanitară „Virginia Henderson”',
          levels: ['upper_secondary'],
          is_excluded: true,
        }),
      ],
      [osmUnit({ name: 'Școala Postliceală Sanitară Virginia Henderson' })],
      MATCH,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ match_status: 'excluded', osm_ref: 'osm:way/1' });
    expect(matchSummary(rows)).toMatchObject({ excluded: 1, unplaced: 0 });
  });
});

describe('placeUnmatched', () => {
  it('geocodes only the register rows that stayed without a match and a position', async () => {
    const rows = matchInstitutions(
      [
        registerRow({ siiir_code: 'matched' }),
        registerRow({
          siiir_code: 'found',
          name: 'Liceul Teoretic Vlad',
          address: 'Str. Găsită 4',
        }),
        registerRow({
          siiir_code: 'missing',
          name: 'Liceul Teoretic Mircea',
          address: 'Str. Lipsă 9',
        }),
        registerRow({ siiir_code: 'excluded', name: 'Școala Specială', is_excluded: true }),
      ],
      [osmUnit({})],
      MATCH,
    );
    const asked: string[] = [];
    const placed = await placeUnmatched(rows, (address) => {
      asked.push(address);
      return Promise.resolve(address === 'Str. Găsită 4' ? { lng: 21.25, lat: 45.76 } : null);
    });
    expect(asked).toEqual(['Str. Găsită 4', 'Str. Lipsă 9']);
    expect(placed.find((row) => row.siiir_code === 'found')).toMatchObject({
      lng: 21.25,
      lat: 45.76,
      location_precision: 'geocoded',
      match_status: 'siiir_only',
    });
    expect(matchSummary(placed)).toMatchObject({ geocoded: 1, unplaced: 1 });
  });
});
