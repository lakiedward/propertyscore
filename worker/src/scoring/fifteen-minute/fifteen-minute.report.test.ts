import { describe, expect, it } from 'vitest';

import type { Leg } from '../../routing/valhalla.ts';
import { testParams } from './fifteen-minute.fixtures.ts';
import {
  assembleFifteenMinuteReport,
  fifteenMinuteReportSchema,
  type ReportCandidate,
  routeTargets,
} from './fifteen-minute.report.ts';

const params = testParams({
  categories: [
    {
      key: 'supermarket',
      group: 'shops',
      osm: ['shop=supermarket'],
      poi_categories: [],
      exclude: [],
      weight: 6,
      enough: 3,
    },
    {
      key: 'convenience',
      group: 'shops',
      osm: ['shop=convenience'],
      poi_categories: [],
      exclude: [],
      weight: 4,
      enough: 3,
    },
    {
      key: 'pharmacy',
      group: 'pharmacies',
      osm: ['amenity=pharmacy'],
      poi_categories: [],
      exclude: [],
      weight: 6,
      enough: 2,
    },
    {
      key: 'swimming_pool',
      group: 'sport',
      osm: ['leisure=swimming_pool'],
      poi_categories: [],
      exclude: [],
      weight: 1,
      enough: 1,
    },
    {
      key: 'car_service',
      group: 'services',
      osm: ['shop=car_repair'],
      poi_categories: [],
      exclude: [],
      weight: 1,
      enough: 1,
    },
  ],
});

function candidate(
  key: string,
  id: number,
  seconds: number | null,
  extra: Partial<ReportCandidate> = {},
) {
  const leg: Leg | null = seconds === null ? null : { seconds, meters: Math.round(seconds * 1.25) };
  return {
    key: `fifteen_minute_${key}`,
    poi_id: `poi-${id}`,
    source_ref: `osm:node/${id}`,
    name: null,
    lng: 21.2 + id / 1000,
    lat: 45.7,
    straight_m: 100,
    opening_hours: null,
    is_24h: null,
    ...extra,
    leg,
  };
}

const assembled = assembleFifteenMinuteReport({
  params,
  candidates: [
    candidate('supermarket', 1, 250),
    candidate('supermarket', 2, 550),
    candidate('supermarket', 3, 880),
    candidate('convenience', 4, 120, { opening_hours: '24/7', is_24h: true }),
    candidate('pharmacy', 5, 170, { name: 'Farmacia Catena' }),
    candidate('pharmacy', 6, null),
    candidate('swimming_pool', 7, 1440),
  ],
  coveredKeys: new Set(['supermarket', 'convenience', 'pharmacy', 'swimming_pool']),
  cell: { score: 88, cityAvg: 64, cityPercentile: 81 },
  distanceMethod: 'pedestrian_routing',
});

describe('assembleFifteenMinuteReport', () => {
  it('counts cumulative 5, 10 and 15 minute bands per category and group', () => {
    expect(assembled.categories.find((category) => category.key === 'supermarket')).toMatchObject({
      t1_min: 4,
      n5: 1,
      n10: 2,
      n15: 3,
      status: 'ok',
    });
    expect(assembled.groups.find((group) => group.key === 'shops')).toEqual({
      key: 'shops',
      categories: ['supermarket', 'convenience'],
      n5: 2,
      n10: 3,
      n15: 4,
    });
  });

  it('lists missing categories with the nearest one beyond 15 minutes and separates the ones without data', () => {
    expect(assembled.missing).toEqual([{ key: 'swimming_pool', nearest_min: 24, nearest_m: 1800 }]);
    expect(assembled.categories.find((category) => category.key === 'car_service')?.status).toBe(
      'no_data',
    );
    expect(assembled.covered).toBe(3);
    expect(assembled.total).toBe(4);
  });

  it('keeps only places within 15 minutes and the ones open non-stop', () => {
    expect(assembled.places.map((place) => place.id)).toEqual([
      'osm:node/1',
      'osm:node/2',
      'osm:node/3',
      'osm:node/4',
      'osm:node/5',
    ]);
    expect(assembled.nonstop).toEqual([
      { place_id: 'osm:node/4', category: 'convenience', minutes: 2, hours_source: 'osm' },
    ]);
  });

  it('carries the cell score and the city comparison', () => {
    expect(assembled).toMatchObject({
      score: 88,
      city_avg: { score: 64 },
      city_percentile: 81,
      walk_speed_kmh: 4.5,
    });
  });

  it('produces a result the report schema accepts', () => {
    expect(
      fifteenMinuteReportSchema.safeParse({ ...assembled, isochrones: [], routes: [] }).success,
    ).toBe(true);
  });
});

describe('routeTargets', () => {
  it('routes to the nearest place of each category, closest first', () => {
    expect(routeTargets(assembled, 2).map((place) => place.id)).toEqual([
      'osm:node/4',
      'osm:node/5',
    ]);
  });
});
