import { describe, expect, it } from 'vitest';

import type { NearbySite, StoredSite } from './industry.db.ts';
import type { IndustryParams } from './industry.formula.ts';
import { parseIndustryParams, scoreCells } from './industry.module.ts';
import { industryReportFromSites } from './industry.report.ts';

const PARAMS: IndustryParams = parseIndustryParams({
  dataset: { url: 'https://example.test/eea.zip', version: 'v16', country: 'Romania' },
  radius_m: 5000,
  decay: [
    [300, 3],
    [1000, 1],
    [3000, 0.15],
    [5000, 0],
  ],
  k: 0.14,
  sector_weights: {
    energy: 1.2,
    metals: 1.3,
    chemicals: 1.3,
    minerals: 1.2,
    waste_water: 0.8,
    paper_wood: 0.9,
    livestock: 0.8,
    food: 0.6,
    other: 0.7,
  },
  emission_multipliers: { none: 0.6, reported: 1, top: 1.5 },
  air_pollutants: ['nox'],
  top_emitter_pollutants: ['nox'],
  top_emitter_share: 0.1,
  odour_sectors: ['waste_water'],
  winter_activities: ['1(c)'],
  suspect_center_m: 150,
  near_m: 1000,
});

function nearby(id: string, sector: NearbySite['sector_code'], distance: number): NearbySite {
  return {
    site_id: id,
    name: `Site ${id}`,
    sector_code: sector,
    impact_codes: ['air'],
    is_top_emitter: false,
    has_air_releases: true,
    reporting_year: 2024,
    distance_m: distance,
    bearing_deg: 44.6,
    longitude: 21.2471234,
    latitude: 45.7704321,
  };
}

describe('parseIndustryParams', () => {
  it('names the invalid fields', () => {
    expect(() => parseIndustryParams({ ...PARAMS, k: -1 })).toThrow(
      expect.objectContaining({
        code: 'invalid_industry_params',
        message: 'Invalid params.industry: k',
      }),
    );
  });
});

describe('scoreCells', () => {
  const sites = new Map<string, StoredSite>(
    [
      { id: 'factory', sector_code: 'metals' as const },
      { id: 'treatment', sector_code: 'waste_water' as const },
      { id: 'chp', sector_code: 'energy' as const },
    ].map((site) => [
      site.id,
      {
        ...site,
        is_top_emitter: false,
        has_air_releases: true,
        city_id: null,
        coordinate_status: 'ok',
      },
    ]),
  );

  it('scores every cell, 100 without sites, with the audit trail', () => {
    const rows = scoreCells({
      cellIds: ['cell-a', 'cell-b'],
      pairs: [
        { cell_id: 'cell-a', site_id: 'factory', distance_m: 2300 },
        { cell_id: 'cell-a', site_id: 'treatment', distance_m: 3800 },
        { cell_id: 'cell-a', site_id: 'chp', distance_m: 4100 },
        { cell_id: 'cell-b', site_id: 'unknown', distance_m: 100 },
      ],
      sites,
      params: PARAMS,
      reportingYear: 2024,
    });
    expect(rows[0]).toMatchObject({ cellId: 'cell-a', score: 90 });
    expect(rows[0]?.inputs.P).toBeCloseTo(0.7348, 3);
    expect(rows[0]?.inputs).toMatchObject({
      reporting_year: 2024,
      sites: [
        { id: 'factory', d_m: 2300, w: 1.3, f: 0.4475 },
        { id: 'treatment', d_m: 3800, w: 0.8, f: 0.09 },
        { id: 'chp', d_m: 4100, w: 1.2, f: 0.0675 },
      ],
    });
    expect(rows[1]).toEqual({
      cellId: 'cell-b',
      score: 100,
      inputs: { P: 0, reporting_year: 2024, sites: [] },
    });
  });
});

describe('industryReportFromSites', () => {
  it('lists the sites from the address, sorted, with the cell score split between them', () => {
    const report = industryReportFromSites({
      sites: [
        nearby('chp', 'energy', 4100),
        nearby('factory', 'metals', 2300.4),
        nearby('treatment', 'waste_water', 3800),
      ],
      cellScore: 90,
      params: PARAMS,
      reportingYear: 2024,
    });
    expect(report).toMatchObject({
      score: 90,
      nearest_m: 2300,
      count_near: 0,
      count_radius: 3,
      near_m: 1000,
      radius_m: 5000,
      source: { dataset: 'eea_ied_eprtr', version: 'v16', reporting_year: 2024 },
    });
    expect(report.sites.map((site) => site.id)).toEqual(['factory', 'treatment', 'chp']);
    expect(report.sites[0]).toMatchObject({
      distance_m: 2300,
      bearing_deg: 45,
      location: [21.247123, 45.770432],
      reporting_year: 2024,
    });
    expect(report.sites.reduce((sum, site) => sum + site.points_lost, 0)).toBe(10);
  });

  it('reports no score when the register is missing', () => {
    expect(
      industryReportFromSites({ sites: [], cellScore: null, params: PARAMS, reportingYear: null }),
    ).toMatchObject({ score: null, reason: 'no_source_data', sites: [], nearest_m: null });
  });

  it('keeps 100 and an empty list when nothing is within the radius', () => {
    expect(
      industryReportFromSites({ sites: [], cellScore: 100, params: PARAMS, reportingYear: 2024 }),
    ).toMatchObject({ score: 100, sites: [], nearest_m: null, count_radius: 0 });
  });
});
