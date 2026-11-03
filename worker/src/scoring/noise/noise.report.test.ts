import { describe, expect, it } from 'vitest';

import type { CityNoiseCoverage } from './noise.db.ts';
import { NOISE_PARAMS } from './noise.fixtures.ts';
import { assessPoint } from './noise.formula.ts';
import { buildNoiseReportBlock, displayBand } from './noise.report.ts';

describe('displayBand', () => {
  it('places a level on the five-step scale of the design', () => {
    const bands = NOISE_PARAMS.display_bands_db;
    expect(displayBand(42, bands)).toBe('below_45');
    expect(displayBand(55, bands)).toBe('55_65');
    expect(displayBand(67, bands)).toBe('65_70');
    expect(displayBand(70, bands)).toBe('above_70');
  });
});

describe('buildNoiseReportBlock', () => {
  const coverage: CityNoiseCoverage = {
    datasets: [
      {
        id: 'road-lden',
        sourceType: 'road',
        indicator: 'lden',
        round: 2022,
        provider: 'Primăria Timișoara',
        licence: 'OGL-RO',
      },
    ],
    sourceCount: 120,
  };

  it('freezes the address level, the nearest sources and the dataset it came from', () => {
    const point = assessPoint(
      [{ measure: 'contour', kind: 'road', indicator: 'lden', datasetId: 'road-lden', dbLow: 55 }],
      { hasMaps: true, hasProxySources: true },
      NOISE_PARAMS,
    );
    const block = buildNoiseReportBlock(
      point,
      coverage,
      [
        {
          kind: 'road',
          sourceClass: 'primary',
          sourceRef: 'osm:way/1',
          name: 'Bd. Revoluției',
          distanceM: 120,
          ldenBand: [65, 69],
        },
      ],
      { contours: {}, lines: {} },
      NOISE_PARAMS,
    );
    expect(block).toMatchObject({
      precision: 'street',
      method: 'strategic_map',
      round: 2022,
      lden: 58,
      lnight: 50,
      band: '55_65',
      sources: [
        {
          kind: 'road',
          source_class: 'primary',
          name: 'Bd. Revoluției',
          distance_m: 120,
          lden_band: [65, 69],
        },
      ],
      sources_meta: [
        { provider: 'Primăria Timișoara', licence: 'OGL-RO', round: 2022, indicator: 'lden' },
      ],
    });
  });

  it('marks an OSM-only city as an estimate without a map round', () => {
    const point = assessPoint(
      [
        {
          measure: 'proxy',
          kind: 'road',
          sourceClass: 'secondary',
          distanceM: 40,
          buildingsCrossed: 1,
        },
      ],
      { hasMaps: false, hasProxySources: true },
      NOISE_PARAMS,
    );
    const block = buildNoiseReportBlock(
      point,
      { datasets: [], sourceCount: 10 },
      [],
      {},
      NOISE_PARAMS,
    );
    expect(block).toMatchObject({ precision: 'estimate', method: 'osm_proxy', round: null });
  });

  it('reports no data without a score or a method', () => {
    const point = assessPoint([], { hasMaps: false, hasProxySources: false }, NOISE_PARAMS);
    const block = buildNoiseReportBlock(
      point,
      { datasets: [], sourceCount: 0 },
      [],
      {},
      NOISE_PARAMS,
    );
    expect(block).toMatchObject({ score: null, precision: 'no_data', method: null, band: null });
  });
});
