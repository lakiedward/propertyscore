import { describe, expect, it } from 'vitest';

import type { CityHazard } from './seismic.db.ts';
import { parseSeismicParams } from './seismic.params.ts';
import { seismicReportFromHazards } from './seismic.report.ts';

const RAW_PARAMS = {
  code: 'P100-1/2013',
  return_period_years: 225,
  exceedance: { probability: 0.2, years: 50 },
  precision: 'address',
  snap_m: 250,
  levels: [
    [0.1, 'low'],
    [0.2, 'moderate'],
    [0.3, 'high'],
  ],
  top_level: 'very_high',
  question_codes: ['consolidation_and_expertise'],
  source: { dataset: 'p100_1_2013_ag_zoning', digitized_by: 'ccers_utcb' },
};

const PARAMS = parseSeismicParams(RAW_PARAMS);

const CITIES: CityHazard[] = [
  { slug: 'bucuresti', ag_g: 0.3, zone_count: 1 },
  { slug: 'iasi', ag_g: 0.25, zone_count: 1 },
  { slug: 'timisoara', ag_g: 0.2, zone_count: 1 },
  { slug: 'oradea', ag_g: 0.15, zone_count: 2 },
  { slug: 'cluj-napoca', ag_g: 0.1, zone_count: 1 },
];

describe('parseSeismicParams', () => {
  it('names the invalid fields', () => {
    expect(() => parseSeismicParams({ ...RAW_PARAMS, precision: 'street' })).toThrow(
      expect.objectContaining({
        code: 'invalid_seismic_params',
        message: 'Invalid params.seismic: precision',
      }),
    );
  });

  it('refuses thresholds that do not increase', () => {
    expect(() =>
      parseSeismicParams({
        ...RAW_PARAMS,
        levels: [
          [0.2, 'moderate'],
          [0.1, 'low'],
        ],
      }),
    ).toThrow(expect.objectContaining({ code: 'invalid_seismic_params' }));
  });
});

describe('seismicReportFromHazards', () => {
  it('reproduces the design example for Timișoara', () => {
    const report = seismicReportFromHazards({
      citySlug: 'timisoara',
      address: { ag_g: 0.2, distance_m: 0 },
      cities: CITIES,
      params: PARAMS,
    });
    expect(report).toEqual({
      schema_version: 1,
      status: 'context',
      code: 'P100-1/2013',
      return_period_years: 225,
      exceedance: { probability: 0.2, years: 50 },
      precision: 'address',
      ag_g: 0.2,
      level: 'moderate',
      address_ag_g: 0.2,
      city: { slug: 'timisoara', ag_g: 0.2, varies_within_city: false },
      comparison: [
        { slug: 'bucuresti', ag_g: 0.3 },
        { slug: 'iasi', ag_g: 0.25 },
        { slug: 'timisoara', ag_g: 0.2 },
        { slug: 'oradea', ag_g: 0.15 },
        { slug: 'cluj-napoca', ag_g: 0.1 },
      ],
      question_codes: ['consolidation_and_expertise'],
      source: { dataset: 'p100_1_2013_ag_zoning', digitized_by: 'ccers_utcb' },
    });
  });

  it('shows the zone of the address when the city spans two zones', () => {
    const report = seismicReportFromHazards({
      citySlug: 'oradea',
      address: { ag_g: 0.1, distance_m: 0 },
      cities: CITIES,
      params: PARAMS,
    });
    expect(report).toMatchObject({
      precision: 'address',
      ag_g: 0.1,
      level: 'low',
      city: { slug: 'oradea', ag_g: 0.15, varies_within_city: true },
    });
  });

  it('shows the city value when the formula asks for city precision', () => {
    const report = seismicReportFromHazards({
      citySlug: 'oradea',
      address: { ag_g: 0.1, distance_m: 0 },
      cities: CITIES,
      params: { ...PARAMS, precision: 'city' },
    });
    expect(report).toMatchObject({
      precision: 'city',
      ag_g: 0.15,
      level: 'moderate',
      address_ag_g: 0.1,
    });
  });

  it('falls back to the city value and says so when the address has no zone', () => {
    const report = seismicReportFromHazards({
      citySlug: 'iasi',
      address: null,
      cities: CITIES,
      params: PARAMS,
    });
    expect(report).toMatchObject({ status: 'context', precision: 'city', ag_g: 0.25 });
  });

  it('has no data when neither the address nor the city has a zone', () => {
    const report = seismicReportFromHazards({
      citySlug: 'sibiu',
      address: null,
      cities: [],
      params: PARAMS,
    });
    expect(report).toMatchObject({
      status: 'no_data',
      reason: 'outside_seismic_zones',
      ag_g: null,
      level: null,
      city: null,
      comparison: [],
    });
  });
});
