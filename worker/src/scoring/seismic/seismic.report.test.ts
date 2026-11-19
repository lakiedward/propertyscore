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
  building_periods: [
    {
      key: 'before_1963',
      until_year: 1962,
      codes: [],
      question_codes: ['seismic_risk_class'],
    },
    {
      key: 'p13',
      until_year: 1977,
      codes: ['P13-63', 'P13-70'],
      question_codes: ['seismic_risk_class'],
    },
    {
      key: 'p100_1978',
      until_year: 1991,
      codes: ['P100-78', 'P100-81', 'P100-90'],
      question_codes: [],
    },
    { key: 'p100_1992', until_year: 2006, codes: ['P100-92'], question_codes: [] },
    {
      key: 'p100_2006',
      until_year: null,
      codes: ['P100-1/2006', 'P100-1/2013'],
      question_codes: [],
    },
  ],
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
  it('names the design code of the building from the declared construction year', () => {
    const report = seismicReportFromHazards({
      citySlug: 'bucuresti',
      address: { ag_g: 0.3, distance_m: 0 },
      cities: CITIES,
      params: PARAMS,
      constructionYear: 1972,
    });
    expect(report.building).toEqual({
      construction_year: 1972,
      period: 'p13',
      codes: ['P13-63', 'P13-70'],
    });
    expect(report.question_codes).toEqual(['consolidation_and_expertise', 'seismic_risk_class']);
  });

  it('puts the last year of a period inside that period', () => {
    const report = seismicReportFromHazards({
      citySlug: 'bucuresti',
      address: { ag_g: 0.3, distance_m: 0 },
      cities: CITIES,
      params: PARAMS,
      constructionYear: 2006,
    });
    expect(report.building?.period).toBe('p100_1992');
    expect(report.question_codes).toEqual(['consolidation_and_expertise']);
  });

  it('leaves the building out on a formula without design periods', () => {
    const report = seismicReportFromHazards({
      citySlug: 'bucuresti',
      address: { ag_g: 0.3, distance_m: 0 },
      cities: CITIES,
      params: parseSeismicParams({ ...RAW_PARAMS, building_periods: undefined }),
      constructionYear: 1972,
    });
    expect(report.building).toBeNull();
    expect(report.question_codes).toEqual(['consolidation_and_expertise']);
  });

  it('refuses building periods that do not end open', () => {
    expect(() =>
      parseSeismicParams({
        ...RAW_PARAMS,
        building_periods: [{ key: 'old', until_year: 1977, codes: [], question_codes: [] }],
      }),
    ).toThrow(expect.objectContaining({ code: 'invalid_seismic_params' }));
  });

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
      building: null,
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
