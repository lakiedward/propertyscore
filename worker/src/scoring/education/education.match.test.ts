import { describe, expect, it } from 'vitest';

import { haversineMeters, matchInstitutions, matchSummary } from './education.match.ts';
import type { OsmEducationUnit } from './education.osm.ts';
import type { RegisterRow } from './education.register.ts';

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
          name: 'Școala Gimnazială nr. 15 Timișoara',
          lng: 21.23,
          lat: 45.75,
        }),
        registerRow({ siiir_code: 'b', lng: 21.23, lat: 45.75 }),
      ],
      [osmUnit({})],
      MATCH,
    );
    expect(rows.find((row) => row.match_status === 'matched')?.siiir_code).toBe('b');
    expect(matchSummary(rows)).toEqual({
      institutions: 2,
      matched: 1,
      siiir_only: 1,
      osm_only: 0,
      unplaced: 0,
    });
  });
});
