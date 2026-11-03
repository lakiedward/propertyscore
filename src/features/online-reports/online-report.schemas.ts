import { z } from 'zod';
import { CHAPTER_IDS } from './online-report.utils';

const scoreSchema = z.number().min(0).max(100);

const categorySummarySchema = z.object({
  score: scoreSchema.nullable(),
  percentile: z.number().min(0).max(100).nullable(),
  city_avg: scoreSchema.nullable(),
  histogram: z.array(z.number().int().min(0)),
  weight: z.number().min(0),
});

const categoriesSchema = z.object({
  safety: categorySummarySchema,
  accessibility: categorySummarySchema,
  fifteen_minute: categorySummarySchema,
  green: categorySummarySchema,
  noise: categorySummarySchema,
  air: categorySummarySchema,
  industry: categorySummarySchema,
  education: categorySummarySchema,
  health: categorySummarySchema,
});

const position = z.tuple([z.number(), z.number()]);

const polygonGeometrySchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('Polygon'), coordinates: z.array(z.array(position)) }),
  z.object({ type: z.literal('MultiPolygon'), coordinates: z.array(z.array(z.array(position))) }),
]);

const share = z.number().min(0).max(1);

const scoredGreenSectionSchema = z.object({
  schema_version: z.literal(1),
  status: z.literal('scored'),
  radii_m: z.array(z.number().int().positive()).min(1),
  near_radius_m: z.number().int().positive(),
  wide_radius_m: z.number().int().positive(),
  share_cap: z.number().positive().max(1),
  thresholds: z.object({
    small_min_ha: z.number().positive(),
    small_full_m: z.number().min(0),
    large_min_ha: z.number().positive(),
    large_full_m: z.number().min(0),
  }),
  share: z.record(z.string(), share),
  city_avg_share_near: share.nullable(),
  distance_method: z.string(),
  nearest_small_id: z.string().nullable(),
  nearest_large_id: z.string().nullable(),
  components: z.array(
    z.object({
      key: z.enum(['c1', 'c2', 'c3', 'c4', 'c5']),
      value: z.number().nullable(),
      points: z.number().min(0).max(1).nullable(),
      weight: z.number().min(0),
    }),
  ),
  parks: z.array(
    z.object({
      id: z.string(),
      name: z.string().nullable(),
      kind: z.string(),
      area_ha: z.number().positive(),
      amenities: z.array(z.string()),
      walk_m: z.number().min(0),
      center: position,
    }),
  ),
  areas: z.object({
    type: z.literal('FeatureCollection'),
    features: z.array(
      z.object({
        type: z.literal('Feature'),
        properties: z.object({ id: z.string() }),
        geometry: polygonGeometrySchema,
      }),
    ),
  }),
});

export const greenSectionSchema = z.discriminatedUnion('status', [
  z.object({ schema_version: z.literal(1), status: z.literal('no_data'), reason: z.string() }),
  scoredGreenSectionSchema,
]);

const lineGeometrySchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('LineString'), coordinates: z.array(position) }),
  z.object({ type: z.literal('MultiLineString'), coordinates: z.array(z.array(position)) }),
  z.object({ type: z.literal('Point'), coordinates: position }),
  z.object({ type: z.literal('MultiPoint'), coordinates: z.array(position) }),
  z.object({ type: z.literal('GeometryCollection'), geometries: z.array(z.unknown()) }),
]);

const anyGeometrySchema = z.union([polygonGeometrySchema, lineGeometrySchema]);

const decibels = z.number().min(0).max(140);

const noiseGuidelineSchema = z.object({ lden: decibels, lnight: decibels });

export const noiseSectionSchema = z.object({
  schema_version: z.literal(1),
  status: z.enum(['scored', 'no_data']),
  score: scoreSchema.nullable(),
  precision: z.enum(['street', 'estimate', 'no_data']),
  method: z.enum(['strategic_map', 'osm_proxy', 'mixed']).nullable(),
  round: z.number().int().nullable(),
  lden: decibels.nullable(),
  lnight: decibels.nullable(),
  band: z.string().nullable(),
  bands_db: z.array(decibels),
  map_radius_m: z.number().positive(),
  who: z.object({
    road: noiseGuidelineSchema,
    rail: noiseGuidelineSchema,
    air: noiseGuidelineSchema,
  }),
  per_source: z.array(
    z.object({
      kind: z.string(),
      method: z.string(),
      lden: decibels.nullable(),
      lnight: decibels.nullable(),
    }),
  ),
  sources: z.array(
    z.object({
      kind: z.enum(['road', 'tram', 'rail', 'air', 'industry', 'aggregate']),
      source_class: z.string(),
      name: z.string().nullable(),
      distance_m: z.number().min(0),
      lden_band: z.tuple([decibels, decibels.nullable()]).nullable(),
    }),
  ),
  map: z.object({
    contours: z
      .object({
        type: z.literal('FeatureCollection'),
        features: z.array(
          z.object({
            type: z.literal('Feature'),
            properties: z.object({
              source_type: z.string(),
              indicator: z.string(),
              db_low: decibels,
              db_high: decibels.nullable(),
            }),
            geometry: anyGeometrySchema,
          }),
        ),
      })
      .optional(),
    lines: z
      .object({
        type: z.literal('FeatureCollection'),
        features: z.array(
          z.object({
            type: z.literal('Feature'),
            properties: z.object({
              kind: z.string(),
              source_class: z.string().nullable(),
              name: z.string().nullable(),
            }),
            geometry: anyGeometrySchema,
          }),
        ),
      })
      .optional(),
  }),
  sources_meta: z.array(
    z.object({
      provider: z.string(),
      licence: z.string().nullable(),
      round: z.number().int(),
      indicator: z.string(),
    }),
  ),
});

const microgramsSchema = z.number().min(0);

const airScoredSectionSchema = z.object({
  schema_version: z.literal(1),
  status: z.enum(['scored', 'no_data']),
  data_status: z.enum(['ok', 'partial', 'no_data']),
  calibrated: z.object({ pm25: z.boolean(), no2: z.boolean() }),
  spatial_method: z.enum(['eea_1km', 'cams_10km']),
  months: z.array(z.string().regex(/^\d{4}-\d{2}$/)),
  pm25_monthly: z.array(microgramsSchema.nullable()),
  no2_monthly: z.array(microgramsSchema.nullable()),
  pm25_annual: microgramsSchema.nullable(),
  no2_annual: microgramsSchema.nullable(),
  months_over_limit: z.object({
    pm25: z.number().int().min(0).max(12).nullable(),
    no2: z.number().int().min(0).max(12).nullable(),
  }),
  limits: z.object({ pm25: z.number().positive(), no2: z.number().positive() }),
  weights: z.object({ pm25: z.number().min(0), no2: z.number().min(0) }),
  sub_scores: z.object({ pm25: scoreSchema.optional(), no2: scoreSchema.optional() }),
  verdict_code: z
    .enum(['clean_all_year', 'winter_peaks', 'above_limit_most_year', 'moderate'])
    .nullable(),
  watch_item: z.boolean(),
  city_avg: z.object({ pm25: microgramsSchema.nullable(), no2: microgramsSchema.nullable() }),
});

export const airSectionSchema = z.union([
  airScoredSectionSchema,
  z.object({ schema_version: z.literal(1), status: z.literal('no_data'), reason: z.string() }),
]);

export const industrySectionSchema = z.object({
  schema_version: z.literal(1),
  status: z.enum(['scored', 'no_data']),
  score: scoreSchema.nullable(),
  reason: z.string().optional(),
  nearest_m: z.number().min(0).nullable(),
  count_near: z.number().int().min(0),
  count_radius: z.number().int().min(0),
  near_m: z.number().positive(),
  radius_m: z.number().positive(),
  sites: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      sector_code: z.enum([
        'energy',
        'metals',
        'minerals',
        'chemicals',
        'waste_water',
        'paper_wood',
        'livestock',
        'food',
        'other',
      ]),
      impact_codes: z.array(z.enum(['air', 'water', 'odour', 'seasonal_winter'])),
      distance_m: z.number().min(0),
      bearing_deg: z.number().nullable(),
      location: position,
      points_lost: z.number().min(0),
      reporting_year: z.number().int(),
    }),
  ),
  source: z.object({
    dataset: z.string(),
    version: z.string(),
    reporting_year: z.number().int().nullable(),
  }),
});

const FIFTEEN_MINUTE_GROUPS = [
  'shops',
  'food_drink',
  'services',
  'pharmacies',
  'medical',
  'schools',
  'parks',
  'sport',
  'culture',
  'other',
] as const;

const FIFTEEN_MINUTE_CATEGORIES = [
  'supermarket',
  'convenience',
  'bakery',
  'greengrocer_market',
  'butcher',
  'drugstore',
  'restaurant',
  'cafe',
  'bank_atm',
  'post',
  'hairdresser',
  'laundry',
  'car_service',
  'public_office',
  'pharmacy',
  'doctor',
  'dentist',
  'clinic',
  'veterinary',
  'kindergarten',
  'school',
  'high_school',
  'park',
  'playground',
  'fitness',
  'sports_ground',
  'swimming_pool',
  'library',
  'cinema_theatre',
  'place_of_worship',
  'other',
] as const;

const walkCountsSchema = {
  n5: z.number().int().min(0),
  n10: z.number().int().min(0),
  n15: z.number().int().min(0),
};

export const fifteenMinuteSectionSchema = z.object({
  schema_version: z.literal(1),
  status: z.enum(['scored', 'no_data']),
  score: scoreSchema.nullable(),
  covered: z.number().int().min(0),
  total: z.number().int().min(0),
  walk_speed_kmh: z.number().positive(),
  distance_method: z.enum(['pedestrian_routing', 'straight_line']),
  groups: z.array(
    z.object({
      key: z.enum(FIFTEEN_MINUTE_GROUPS).catch('other'),
      categories: z.array(z.string()),
      ...walkCountsSchema,
    }),
  ),
  categories: z.array(
    z.object({
      key: z.enum(FIFTEEN_MINUTE_CATEGORIES).catch('other'),
      group: z.enum(FIFTEEN_MINUTE_GROUPS).catch('other'),
      t1_min: z.number().int().min(0).nullable(),
      distance_m: z.number().int().min(0).nullable(),
      ...walkCountsSchema,
      status: z.enum(['ok', 'missing', 'no_data']),
    }),
  ),
  places: z.array(
    z.object({
      id: z.string(),
      category: z.enum(FIFTEEN_MINUTE_CATEGORIES).catch('other'),
      name: z.string().nullable(),
      lat: z.number(),
      lng: z.number(),
      distance_m: z.number().int().min(0),
      minutes: z.number().int().min(0),
    }),
  ),
  isochrones: z.array(z.object({ minutes: z.number(), geometry: anyGeometrySchema })),
});

const EDUCATION_LEVELS = ['kindergarten', 'school', 'high_school'] as const;

export const educationSectionSchema = z.discriminatedUnion('status', [
  z.object({ schema_version: z.literal(1), status: z.literal('no_data') }),
  z.object({
    schema_version: z.literal(1),
    status: z.literal('scored'),
    distance_method: z.string(),
    levels: z.array(
      z.object({
        key: z.enum(EDUCATION_LEVELS),
        nearest_min: z.number().min(0).nullable(),
        second_min: z.number().min(0).nullable(),
        points: z.number().min(0).max(1),
        weight: z.number().min(0),
        full_min: z.number().positive(),
        zero_min: z.number().positive(),
      }),
    ),
    counts: z.record(z.string(), z.number().int().min(0)),
    institutions: z.array(
      z.object({
        id: z.string(),
        name: z.string().nullable(),
        levels: z.array(z.string()),
        ownership: z.enum(['public', 'private', 'unknown']),
        location: position,
        walk_m: z.number().min(0),
      }),
    ),
  }),
]);

const HEALTH_LAYERS = ['h1', 'h2', 'h3', 'h4', 'h5'] as const;

export const healthSectionSchema = z.discriminatedUnion('status', [
  z.object({ schema_version: z.literal(1), status: z.literal('no_data') }),
  z.object({
    schema_version: z.literal(1),
    status: z.literal('scored'),
    distance_method: z.string(),
    car_distance_method: z.string(),
    missing: z.array(z.string()),
    layers: z.array(
      z.object({
        key: z.enum(HEALTH_LAYERS),
        points: z.number().min(0).max(1).nullable(),
        minutes: z.number().min(0).nullable(),
        count: z.number().int().min(0).nullable(),
        mode: z.enum(['walk', 'car']).nullable(),
        weight: z.number().min(0),
        place: z
          .object({ id: z.string(), name: z.string().nullable(), location: position })
          .nullable(),
      }),
    ),
  }),
]);

const SAFETY_TYPES = [
  'lighting',
  'shop',
  'nonstop',
  'mixed_use',
  'police',
  'fire_station',
  'diplomatic',
  'bar',
  'park',
  'park_lit',
  'isolated_passage',
  'train_station',
  'train_halt',
  'transit_stop',
] as const;

const safetyMomentSchema = z.object({
  score: scoreSchema,
  waterfall: z.array(
    z.object({
      key: z.enum([...SAFETY_TYPES, 'start', 'night_offset', 'far_types', 'limit']),
      points: z.number(),
    }),
  ),
  far_types: z.array(z.enum(SAFETY_TYPES)),
  contributions: z.array(
    z.object({
      type: z.enum(SAFETY_TYPES),
      points: z.number(),
      count: z.number().int().min(0),
      nearest_m: z.number().min(0).nullable(),
    }),
  ),
});

export const safetySectionSchema = z.discriminatedUnion('status', [
  z.object({ schema_version: z.literal(1), status: z.literal('no_data') }),
  z.object({
    schema_version: z.literal(1),
    status: z.literal('scored'),
    day: scoreSchema,
    night: scoreSchema,
    moment_weights: z.object({ day: z.number().min(0), night: z.number().min(0) }),
    excluded_types: z.array(z.enum(SAFETY_TYPES)),
    distance_method: z.string(),
    address: z.object({
      score: scoreSchema,
      start: z.number(),
      day: safetyMomentSchema,
      night: safetyMomentSchema,
    }),
    landmarks: z.array(
      z.object({
        id: z.string(),
        type: z.enum(SAFETY_TYPES),
        name: z.string().nullable(),
        location: position,
        distance_m: z.number().min(0),
      }),
    ),
  }),
]);

const TRANSIT_MODES = ['bus', 'trolleybus', 'tram', 'subway'] as const;

const DESTINATION_KINDS = [
  'center',
  'station',
  'university',
  'hospital',
  'mall',
  'airport',
] as const;

export const accessibilitySectionSchema = z.discriminatedUnion('status', [
  z.object({ schema_version: z.literal(1), status: z.literal('no_data') }),
  z.object({
    schema_version: z.literal(1),
    status: z.literal('scored'),
    data_quality: z.enum(['gtfs', 'osm_only']),
    reference_date: z.string().nullable(),
    components: z.array(
      z.object({
        key: z.enum(['access', 'travel', 'coverage']),
        points: z.number().min(0).max(1).nullable(),
        weight: z.number().min(0),
      }),
    ),
    directions: z.number().int().min(0).nullable(),
    stops: z.array(
      z.object({
        id: z.string(),
        name: z.string().nullable(),
        modes: z.array(z.enum(TRANSIT_MODES)),
        location: position,
        walk_min: z.number().min(0),
        walk_m: z.number().min(0),
        routes: z.array(z.string()),
      }),
    ),
    routes: z.array(
      z.object({
        key: z.string(),
        ref: z.string().nullable(),
        mode: z.enum(TRANSIT_MODES),
        name: z.string().nullable(),
        colour: z.string().nullable(),
        text_colour: z.string().nullable(),
        peak_per_hour: z.number().min(0).nullable(),
      }),
    ),
    destinations: z.array(
      z.object({
        id: z.string(),
        kind: z.enum(DESTINATION_KINDS),
        label: z.object({ ro: z.string(), en: z.string() }),
        location: position,
        minutes: z.number().min(0).nullable(),
        by_walking: z.boolean(),
        walk: z.number().nullable(),
        wait: z.number().nullable(),
        ride: z.number().nullable(),
        transfers: z.number().int().nullable(),
        route: z
          .object({
            ref: z.string().nullable(),
            mode: z.enum(TRANSIT_MODES),
            colour: z.string().nullable(),
          })
          .nullable(),
      }),
    ),
  }),
]);

export const reportResultSchema = z.looseObject({
  schema_version: z.literal(1),
  city: z.object({ slug: z.string(), name: z.string() }),
  snapshot: z.object({
    period: z.iso.date(),
    source_dates: z.record(z.string(), z.string()),
  }),
  formula: z.object({ label: z.string(), weights: z.record(z.string(), z.number()) }),
  zone: z.object({
    score: scoreSchema.nullable(),
    percentile: z.number().min(0).max(100).nullable(),
    city_avg: scoreSchema.nullable(),
    histogram: z.array(z.number().int().min(0)),
  }),
  categories: categoriesSchema,
  green: greenSectionSchema.optional(),
  noise: noiseSectionSchema.optional(),
  air: airSectionSchema.optional(),
  industry: industrySectionSchema.optional(),
  fifteen_minute: fifteenMinuteSectionSchema.optional(),
  education: educationSectionSchema.optional(),
  health: healthSectionSchema.optional(),
  safety: safetySectionSchema.optional(),
  accessibility: accessibilitySectionSchema.optional(),
});

export const onlineReportSearchSchema = z.object({
  tab: z.enum(CHAPTER_IDS).optional(),
});
