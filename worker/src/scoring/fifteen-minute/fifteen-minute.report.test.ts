import { describe, expect, it } from 'vitest';

import type { Sql } from '../../db/sql.ts';
import { createLogger } from '../../lib/logger.ts';
import { createValhallaClient, type Leg } from '../../routing/valhalla.ts';
import { testParams } from './fifteen-minute.fixtures.ts';
import {
  assembleFifteenMinuteReport,
  fifteenMinuteReportSection,
  fifteenMinuteReportSchema,
  type ReportCandidate,
  routeTargets,
  typicalGroupCounts,
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
  typical: new Map([
    ['shops', 2],
    ['pharmacies', null],
    ['services', 5],
  ]),
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
      typical_n15: 2,
    });
  });

  it('gives each group the typical count of the city and none when it is unknown or unscored', () => {
    expect(
      Object.fromEntries(assembled.groups.map((group) => [group.key, group.typical_n15])),
    ).toEqual({ shops: 2, pharmacies: null, sport: null, services: null });
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
    expect(routeTargets(assembled).map((place) => place.id)).toEqual([
      'osm:node/4',
      'osm:node/5',
      'osm:node/1',
    ]);
  });

  it('keeps the nearest place for every category in the 15-minute list', () => {
    const allParams = testParams();
    const categories = allParams.categories.map(({ key }) => key);
    const report = assembleFifteenMinuteReport({
      params: allParams,
      candidates: categories.map((key, index) => candidate(key, index + 1, 300 + index * 20)),
      coveredKeys: new Set(categories),
      cell: { score: 88, cityAvg: 64, cityPercentile: 81 },
      typical: new Map(),
      distanceMethod: 'pedestrian_routing',
    });

    expect(report.covered).toBe(30);
    expect(routeTargets(report).map(({ category }) => category)).toEqual(categories);
  });
});

describe('fifteenMinuteReportSection', () => {
  it('keeps scores, walking times and successful routes after a later route request fails', async () => {
    const allParams = testParams();
    const candidates = allParams.categories
      .slice(0, 14)
      .map(({ key }, index) =>
        candidate(key, index + 1, 120 + index * 40, { lng: (index + 1) / 1000, lat: 0 }),
      );
    const sql = Object.assign(
      (query: TemplateStringsArray) => {
        const statement = query.join('');
        if (statement.includes('with origin')) {
          return [{ city_id: 'synthetic-city', score: 88, city_avg: 64, city_percentile: 81 }];
        }
        if (statement.includes('private.city_category_stats')) {
          return candidates.map(({ key }) => ({ category: key }));
        }
        if (statement.includes('private.walk_candidates_from')) return candidates;
        if (statement.includes('private.cell_walk_access')) return [];
        throw new Error('Unexpected SQL query');
      },
      { json: (value: unknown) => value },
    ) as unknown as Sql;
    const warnings: string[] = [];
    const context = {
      sql,
      snapshotId: 'synthetic-snapshot',
      cellId: 'synthetic-cell',
      citySlug: 'synthetic-city',
      latitude: 0,
      longitude: 0,
      params: { fifteen_minute: allParams },
      logger: createLogger('warn', (line) => warnings.push(line)),
    };
    const failed = candidates[12];
    if (!failed) throw new Error('Missing synthetic destination after the old route cap');
    const router = (failRoute: boolean) =>
      createValhallaClient('http://router.invalid', {
        fetch: (url, request) => {
          const path = url instanceof Request ? url.url : url.toString();
          if (path.endsWith('/sources_to_targets')) {
            return Promise.resolve(
              Response.json({
                sources_to_targets: [
                  candidates.map(({ leg }) => ({
                    time: leg?.seconds,
                    distance: (leg?.meters ?? 0) / 1000,
                  })),
                ],
              }),
            );
          }
          if (path.endsWith('/isochrone')) {
            return Promise.resolve(Response.json({ features: [] }));
          }
          if (!path.endsWith('/route')) throw new Error('Unexpected routing request');
          if (typeof request?.body !== 'string') throw new Error('Missing routing request body');
          const body = JSON.parse(request.body) as { locations: { lon: number }[] };
          if (failRoute && body.locations[1]?.lon === failed.lng) {
            return Promise.resolve(Response.json({}, { status: 503 }));
          }
          return Promise.resolve(
            Response.json({
              trip: { summary: { time: 120, length: 0.15 }, legs: [{ shape: '??gEgE' }] },
            }),
          );
        },
      });

    const complete = fifteenMinuteReportSchema.parse(
      await fifteenMinuteReportSection.build({ ...context, router: router(false) }),
    );
    const partial = fifteenMinuteReportSchema.parse(
      await fifteenMinuteReportSection.build({ ...context, router: router(true) }),
    );

    expect(complete.routes).toHaveLength(14);
    expect(partial).toEqual({
      ...complete,
      routes: complete.routes.filter(({ place_id }) => place_id !== failed.source_ref),
    });
    expect(warnings).toEqual([expect.stringContaining('"code":"walk_routing_failed"')]);
  });
});

describe('typicalGroupCounts', () => {
  function cells(group: string, values: readonly number[], censored: readonly number[] = []) {
    return values.map((n15, index) => ({ group, n15, isCensored: censored.includes(index) }));
  }

  it('takes the median of the cells of each group, the lower middle for an even count', () => {
    const typical = typicalGroupCounts([
      ...cells('shops', [4, 1, 9, 2, 6]),
      ...cells('parks', [3, 1, 7, 5]),
    ]);
    expect(typical.get('shops')).toBe(4);
    expect(typical.get('parks')).toBe(3);
  });

  it('keeps the median when only cells above it hit the candidate limit', () => {
    expect(
      typicalGroupCounts(cells('food_drink', [2, 3, 5, 20, 20], [3, 4])).get('food_drink'),
    ).toBe(5);
  });

  it('gives no typical count when cells at the candidate limit could move the median', () => {
    expect(
      typicalGroupCounts(cells('food_drink', [2, 10, 10, 10, 20], [1, 2, 3, 4])).get('food_drink'),
    ).toBeNull();
  });
});
