import type { Tables } from '@/lib/supabase/database.types';

type OnlineReportRow = Pick<
  Tables<'online_reports'>,
  | 'id'
  | 'number'
  | 'status'
  | 'address_text'
  | 'latitude'
  | 'longitude'
  | 'declared_rooms'
  | 'declared_area_m2'
  | 'declared_floor'
  | 'declared_building_floors'
  | 'declared_construction_year'
  | 'overall_score'
  | 'result'
  | 'created_at'
  | 'generated_at'
>;

type CategorySummaryOverrides = {
  score?: number | null;
  percentile?: number | null;
  city_avg?: number | null;
  weight?: number;
};

const CATEGORY_WEIGHTS = {
  safety: 15,
  accessibility: 20,
  fifteen_minute: 18,
  green: 10,
  noise: 12,
  air: 5,
  industry: 5,
  education: 8,
  health: 7,
} as const;

type CategoryKey = keyof typeof CATEGORY_WEIGHTS;

const CATEGORY_KEYS: readonly CategoryKey[] = [
  'safety',
  'accessibility',
  'fifteen_minute',
  'green',
  'noise',
  'air',
  'industry',
  'education',
  'health',
];

const HISTOGRAM = [3, 5, 8, 12, 15, 20, 24, 30, 28, 25, 22, 18, 14, 10, 8, 6, 4, 3, 2, 1];

function categorySummary(key: CategoryKey, overrides: CategorySummaryOverrides = {}) {
  const score = overrides.score === undefined ? null : overrides.score;
  return {
    score,
    percentile: overrides.percentile ?? (score === null ? null : 50),
    city_avg: overrides.city_avg ?? (score === null ? null : 50),
    histogram: score === null ? [] : HISTOGRAM,
    weight: overrides.weight ?? CATEGORY_WEIGHTS[key],
  };
}

export function buildReportResult(
  categories: Partial<Record<CategoryKey, CategorySummaryOverrides>> = {},
  zone: { score?: number | null; percentile?: number | null } = {},
) {
  return {
    schema_version: 1,
    city: { slug: 'timisoara', name: 'Timișoara' },
    snapshot: { period: '2026-11-01', source_dates: { osm: '2026-10-31', unknown_source: 'x' } },
    formula: { label: 'v1', weights: CATEGORY_WEIGHTS },
    zone: {
      score: zone.score === undefined ? 72 : zone.score,
      percentile: zone.percentile === undefined ? 81 : zone.percentile,
      city_avg: 55,
      histogram: HISTOGRAM,
    },
    categories: Object.fromEntries(
      CATEGORY_KEYS.map((key) => [key, categorySummary(key, categories[key])]),
    ),
  };
}

let sequence = 0;

export function buildOnlineReport(overrides: Partial<OnlineReportRow> = {}): OnlineReportRow {
  sequence += 1;
  return {
    id: `d0000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`,
    number: 10480 + sequence,
    status: 'ready',
    address_text: 'Str. Mărășești 6, Timișoara',
    latitude: 45.7546,
    longitude: 21.2303,
    declared_rooms: 3,
    declared_area_m2: 84,
    declared_floor: 2,
    declared_building_floors: 4,
    declared_construction_year: null,
    overall_score: 72,
    result: buildReportResult({
      green: { score: 84, percentile: 95, city_avg: 34 },
      noise: { score: 40, percentile: 20, city_avg: 63 },
      safety: { score: 66, percentile: 55, city_avg: 64 },
    }),
    created_at: '2026-11-03T10:00:00Z',
    generated_at: '2026-11-03T10:00:05Z',
    ...overrides,
  };
}

function square(west: number, south: number, size: number): [number, number][][] {
  return [
    [
      [west, south],
      [west + size, south],
      [west + size, south + size],
      [west, south + size],
      [west, south],
    ],
  ];
}

export function buildGreenSection() {
  return {
    schema_version: 1,
    status: 'scored',
    radii_m: [300, 500, 1000],
    near_radius_m: 500,
    wide_radius_m: 1000,
    share_cap: 0.3,
    thresholds: { small_min_ha: 0.5, small_full_m: 300, large_min_ha: 5, large_full_m: 1000 },
    share: { '300': 0.121, '500': 0.184, '1000': 0.241 },
    city_avg_share_near: 0.137,
    distance_method: 'straight_line',
    nearest_small_id: 'park-unnamed',
    nearest_large_id: 'park-central',
    components: [
      { key: 'c1', value: 0.184, points: 0.61, weight: 35 },
      { key: 'c2', value: 0.241, points: 0.8, weight: 15 },
      { key: 'c3', value: 720, points: 0.53, weight: 25 },
      { key: 'c4', value: 720, points: 1, weight: 15 },
      { key: 'c5', value: null, points: null, weight: 10 },
    ],
    parks: [
      {
        id: 'park-unnamed',
        name: null,
        kind: 'other',
        area_ha: 0.6,
        amenities: [],
        walk_m: 300,
        center: [21.232, 45.755],
      },
      {
        id: 'park-central',
        name: 'Parcul Central',
        kind: 'park',
        area_ha: 8.2,
        amenities: ['playground'],
        walk_m: 720,
        center: [21.222, 45.753],
      },
      {
        id: 'park-rozelor',
        name: 'Parcul Rozelor',
        kind: 'park',
        area_ha: 6,
        amenities: ['dog_park'],
        walk_m: 1100,
        center: [21.236, 45.749],
      },
    ],
    areas: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { id: 'park-central' },
          geometry: { type: 'Polygon', coordinates: square(21.22, 45.751, 0.004) },
        },
      ],
    },
  };
}
