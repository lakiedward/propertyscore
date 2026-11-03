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
  city_min?: number | null;
  city_max?: number | null;
  weight?: number;
};

type ZoneOverrides = {
  score?: number | null;
  percentile?: number | null;
  city_min?: number | null;
  city_max?: number | null;
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
    city_min: overrides.city_min ?? (score === null ? null : 10),
    city_max: overrides.city_max ?? (score === null ? null : 95),
    histogram: score === null ? [] : HISTOGRAM,
    weight: overrides.weight ?? CATEGORY_WEIGHTS[key],
  };
}

export function buildReportResult(
  categories: Partial<Record<CategoryKey, CategorySummaryOverrides>> = {},
  zone: ZoneOverrides = {},
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
      city_min: zone.city_min === undefined ? 12 : zone.city_min,
      city_max: zone.city_max === undefined ? 94 : zone.city_max,
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

export function buildNoiseSection() {
  return {
    schema_version: 1,
    status: 'scored',
    score: 58,
    precision: 'street',
    method: 'strategic_map',
    round: 4,
    lden: 61,
    lnight: 52,
    band: '55_65',
    bands_db: [45, 55, 65, 70],
    map_radius_m: 1000,
    who: {
      road: { lden: 53, lnight: 45 },
      rail: { lden: 54, lnight: 44 },
      air: { lden: 45, lnight: 40 },
    },
    per_source: [{ kind: 'road', method: 'strategic_map', lden: 61, lnight: 52 }],
    sources: [
      {
        kind: 'road',
        source_class: 'primary',
        name: 'Bulevardul Revoluției',
        distance_m: 120,
        lden_band: [60, 65],
      },
      { kind: 'tram', source_class: 'tram', name: null, distance_m: 340, lden_band: null },
    ],
    map: {
      contours: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { source_type: 'road', indicator: 'lden', db_low: 60, db_high: 65 },
            geometry: { type: 'Polygon', coordinates: square(21.229, 45.754, 0.002) },
          },
        ],
      },
      lines: { type: 'FeatureCollection', features: [] },
    },
    sources_meta: [{ provider: 'Primăria Timișoara', licence: null, round: 4, indicator: 'lden' }],
  };
}

export function buildAirSection() {
  return {
    schema_version: 1,
    status: 'scored',
    data_status: 'ok',
    calibrated: { pm25: true, no2: true },
    spatial_method: 'eea_1km',
    months: ['2025-11', '2025-12', '2026-01', '2026-02'],
    pm25_monthly: [14.2, 18.5, 21.3, null],
    no2_monthly: [22, 24, 25, null],
    pm25_annual: 13.4,
    no2_annual: 21.5,
    months_over_limit: { pm25: 3, no2: 4 },
    limits: { pm25: 10, no2: 20 },
    weights: { pm25: 0.7, no2: 0.3 },
    sub_scores: { pm25: 70, no2: 78 },
    verdict_code: 'winter_peaks',
    watch_item: false,
    city_avg: { pm25: 14.1, no2: 23.2 },
  };
}

export function buildIndustrySection() {
  return {
    schema_version: 1,
    status: 'scored',
    score: 88,
    nearest_m: 820,
    count_near: 1,
    count_radius: 2,
    near_m: 1000,
    radius_m: 5000,
    sites: [
      {
        id: 'site-1',
        name: 'Fabrica de bere',
        sector_code: 'food',
        impact_codes: ['air', 'odour'],
        distance_m: 820,
        bearing_deg: 45,
        location: [21.238, 45.759],
        points_lost: 6,
        reporting_year: 2024,
      },
      {
        id: 'site-2',
        name: 'Centrala termică Sud',
        sector_code: 'energy',
        impact_codes: ['air'],
        distance_m: 3100,
        bearing_deg: 190,
        location: [21.225, 45.727],
        points_lost: 0,
        reporting_year: 2024,
      },
    ],
    source: { dataset: 'eea_ied_eprtr', version: 'v14', reporting_year: 2024 },
  };
}

export function buildFifteenMinuteSection() {
  return {
    schema_version: 1,
    status: 'scored',
    score: 81,
    city_avg: { score: 60 },
    city_percentile: 85,
    covered: 2,
    total: 3,
    walk_speed_kmh: 4.5,
    distance_method: 'pedestrian_routing',
    groups: [
      { key: 'shops', categories: ['supermarket', 'bakery'], n5: 2, n10: 4, n15: 6 },
      { key: 'pharmacies', categories: ['pharmacy'], n5: 0, n10: 0, n15: 0 },
    ],
    categories: [
      {
        key: 'supermarket',
        group: 'shops',
        t1_min: 4,
        distance_m: 300,
        n5: 1,
        n10: 2,
        n15: 3,
        status: 'ok',
      },
      {
        key: 'bakery',
        group: 'shops',
        t1_min: 6,
        distance_m: 450,
        n5: 1,
        n10: 2,
        n15: 3,
        status: 'ok',
      },
      {
        key: 'pharmacy',
        group: 'pharmacies',
        t1_min: null,
        distance_m: null,
        n5: 0,
        n10: 0,
        n15: 0,
        status: 'missing',
      },
    ],
    missing: [{ key: 'pharmacy', nearest_min: null, nearest_m: null }],
    places: [
      {
        id: 'osm:node/1',
        category: 'supermarket',
        name: 'Profi',
        lat: 45.755,
        lng: 21.231,
        distance_m: 300,
        minutes: 4,
        is_24h: false,
        opening_hours: null,
      },
      {
        id: 'osm:node/2',
        category: 'bakery',
        name: null,
        lat: 45.753,
        lng: 21.229,
        distance_m: 450,
        minutes: 6,
        is_24h: null,
        opening_hours: null,
      },
    ],
    isochrones: [],
    routes: [],
    nonstop: [],
  };
}

export function buildSafetySection() {
  const moment = (score: number) => ({
    score,
    waterfall: [
      { key: 'start', points: 50 },
      { key: 'police', points: 10 },
      { key: 'lighting', points: 4 },
      { key: 'bar', points: -2 },
    ],
    far_types: ['diplomatic'],
    contributions: [{ type: 'police', points: 10, count: 1, nearest_m: 400 }],
  });
  return {
    schema_version: 1,
    status: 'scored',
    day: 64,
    night: 58,
    moment_weights: { day: 0.5, night: 0.5 },
    excluded_types: [],
    distance_method: 'straight_line',
    address: { score: 61, start: 50, day: moment(62), night: moment(60) },
    landmarks: [
      {
        id: 'police-1',
        type: 'police',
        name: 'Secția 1 Poliție',
        location: [21.233, 45.756],
        distance_m: 400,
      },
    ],
  };
}

export function buildAccessibilitySection() {
  return {
    schema_version: 1,
    status: 'scored',
    data_quality: 'gtfs',
    reference_date: '2026-10-28',
    components: [
      { key: 'access', points: 0.8, weight: 40 },
      { key: 'travel', points: 0.7, weight: 45 },
      { key: 'coverage', points: 0.6, weight: 15 },
    ],
    directions: 3,
    stops: [
      {
        id: 'stop-1',
        name: 'Piața Mărăști',
        modes: ['tram'],
        location: [21.231, 45.755],
        walk_min: 3.2,
        walk_m: 240,
        routes: ['1', '2'],
      },
    ],
    routes: [
      {
        key: 'tram-1',
        ref: '1',
        mode: 'tram',
        name: 'Gara de Nord – Piața Badea Cârțan',
        colour: '#C0392B',
        text_colour: '#FFFFFF',
        peak_per_hour: 8,
      },
    ],
    destinations: [
      {
        id: 'dest-1',
        kind: 'center',
        label: { ro: 'Piața Victoriei', en: 'Victory Square' },
        location: [21.226, 45.752],
        minutes: 12,
        by_walking: false,
        walk: 5,
        wait: 3,
        ride: 4,
        transfers: 0,
        route: { ref: '1', mode: 'tram', colour: '#C0392B' },
      },
    ],
  };
}
