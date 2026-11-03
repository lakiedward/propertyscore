import { describe, expect, it } from 'vitest';

import {
  assessCell,
  assessPoint,
  bandLevel,
  energySum,
  median,
  noiseScore,
  proxyLevel,
  type NoiseSample,
  type PointNoise,
} from './noise.formula.ts';
import { NOISE_PARAMS } from './noise.fixtures.ts';

const BOTH = { hasMaps: true, hasProxySources: true };
const PROXY_ONLY = { hasMaps: false, hasProxySources: true };

function contour(
  kind: 'road' | 'rail' | 'aggregate',
  indicator: 'lden' | 'lnight',
  dbLow: number | null,
): NoiseSample {
  return { measure: 'contour', kind, indicator, datasetId: `${kind}-${indicator}`, dbLow };
}

describe('noiseScore', () => {
  it('reproduces the plan example: Lden 55 and Lnight 47 give 58', () => {
    expect(noiseScore(55, 47, NOISE_PARAMS)).toBe(58);
  });

  it('is 100 at the quiet end, 0 at the loud end and clamps outside', () => {
    expect(noiseScore(40, 35, NOISE_PARAMS)).toBe(100);
    expect(noiseScore(75, 65, NOISE_PARAMS)).toBe(0);
    expect(noiseScore(30, 20, NOISE_PARAMS)).toBe(100);
    expect(noiseScore(90, 80, NOISE_PARAMS)).toBe(0);
  });
});

describe('energySum', () => {
  it('adds levels as energy, not arithmetically', () => {
    expect(energySum([60, 60])).toBeCloseTo(63.01, 2);
    expect(energySum([70, 50])).toBeCloseTo(70.04, 2);
    expect(energySum([])).toBeNull();
  });
});

describe('bandLevel and proxyLevel', () => {
  it('takes the middle of a 5 dB band', () => {
    expect(bandLevel(55, 5)).toBe(57.5);
    expect(bandLevel(75, 5)).toBe(77.5);
  });

  it('loses 3 dB per doubling of distance and 5 dB per row of buildings, at most 10', () => {
    expect(proxyLevel(72, 10, 0, NOISE_PARAMS)).toBe(72);
    expect(proxyLevel(72, 5, 0, NOISE_PARAMS)).toBe(72);
    expect(proxyLevel(72, 20, 0, NOISE_PARAMS)).toBeCloseTo(68.99, 2);
    expect(proxyLevel(72, 100, 1, NOISE_PARAMS)).toBeCloseTo(57, 5);
    expect(proxyLevel(72, 100, 4, NOISE_PARAMS)).toBeCloseTo(52, 5);
  });
});

describe('assessPoint', () => {
  it('reads the strategic map bands and calls the result street precision', () => {
    const point = assessPoint(
      [contour('road', 'lden', 55), contour('road', 'lnight', 45), contour('rail', 'lden', null)],
      BOTH,
      NOISE_PARAMS,
    );
    expect(point).toMatchObject({ lden: 57.5, lnight: 47.5, precision: 'street', score: 53 });
    expect(point.datasetIds).toEqual(['rail-lden', 'road-lden', 'road-lnight']);
  });

  it('treats a point outside every contour as below the mapped range', () => {
    const point = assessPoint([contour('road', 'lden', null)], BOTH, NOISE_PARAMS);
    expect(point).toMatchObject({ lden: 50, lnight: 42, precision: 'street', score: 73 });
  });

  it('adds the intermittent penalty to railways before summing', () => {
    const point = assessPoint(
      [contour('road', 'lden', 55), contour('rail', 'lden', 55)],
      BOTH,
      NOISE_PARAMS,
    );
    expect(point.lden).toBeCloseTo(energySum([57.5, 60.5]) ?? 0, 1);
  });

  it('estimates from OSM when the city has no map, keeping the loudest class per kind', () => {
    const point = assessPoint(
      [
        {
          measure: 'proxy',
          kind: 'road',
          sourceClass: 'primary',
          distanceM: 120,
          buildingsCrossed: 0,
        },
        {
          measure: 'proxy',
          kind: 'road',
          sourceClass: 'residential',
          distanceM: 15,
          buildingsCrossed: 0,
        },
        {
          measure: 'proxy',
          kind: 'air',
          sourceClass: 'runway',
          distanceM: 900,
          buildingsCrossed: 0,
        },
      ],
      PROXY_ONLY,
      NOISE_PARAMS,
    );
    expect(point.precision).toBe('estimate');
    expect(point.sources).toEqual([
      { kind: 'road', method: 'osm_proxy', lden: 61.2, lnight: 53.2 },
    ]);
    expect(point.lden).toBe(61.2);
  });

  it('uses the aggregate map alone when the city publishes one', () => {
    const point = assessPoint(
      [contour('aggregate', 'lden', 60), contour('road', 'lden', 70)],
      BOTH,
      NOISE_PARAMS,
    );
    expect(point.sources.map((source) => source.kind)).toEqual(['aggregate']);
    expect(point.lden).toBe(62.5);
  });

  it('has no data when the city has neither maps nor OSM sources', () => {
    expect(assessPoint([], { hasMaps: false, hasProxySources: false }, NOISE_PARAMS)).toMatchObject(
      { score: null, precision: 'no_data' },
    );
  });

  it('calls a point with no OSM source in range quiet, not missing', () => {
    expect(assessPoint([], PROXY_ONLY, NOISE_PARAMS)).toMatchObject({
      lden: 50,
      lnight: 42,
      precision: 'estimate',
      score: 73,
    });
  });
});

describe('median and assessCell', () => {
  it('takes the middle value', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBeNull();
  });

  it('scores a cell with the median of its seven points', () => {
    const point = (score: number, precision: 'street' | 'estimate'): PointNoise => ({
      score,
      lden: 75 - score / 3,
      lnight: 60,
      precision,
      sources: [],
      datasetIds: ['road-lden'],
    });
    const cell = assessCell([
      point(20, 'street'),
      point(90, 'street'),
      point(58, 'street'),
      point(60, 'estimate'),
      point(40, 'street'),
      point(70, 'street'),
      point(55, 'street'),
    ]);
    expect(cell).toMatchObject({ score: 58, precision: 'estimate', datasetIds: ['road-lden'] });
  });

  it('has no data when no point was scored', () => {
    expect(
      assessCell([
        {
          score: null,
          lden: null,
          lnight: null,
          precision: 'no_data',
          sources: [],
          datasetIds: [],
        },
      ]),
    ).toMatchObject({ score: null, precision: 'no_data' });
  });
});
