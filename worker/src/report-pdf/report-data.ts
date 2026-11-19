import { z } from 'zod';

import { CATEGORY_KEYS, type CategoryKey } from '../scoring/categories.ts';

const score = z.number().min(0).max(100);
const position = z.tuple([z.number(), z.number()]);
const geometry = z.looseObject({ type: z.string() });
const featureCollection = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(
    z.object({
      type: z.literal('Feature'),
      properties: z.record(z.string(), z.unknown()).nullable(),
      geometry,
    }),
  ),
});

const categorySummarySchema = z.object({
  score: score.nullable(),
  percentile: z.number().nullable(),
  city_avg: score.nullable(),
  city_min: score.nullable().optional(),
  city_max: score.nullable().optional(),
  histogram: z.array(z.number()),
  weight: z.number().min(0),
});

const safetyMomentSchema = z.object({
  score,
  contributions: z.array(
    z.object({
      type: z.string(),
      points: z.number(),
      count: z.number(),
      nearest_m: z.number().nullable(),
    }),
  ),
  far_types: z.array(z.string()).default([]),
});

const safetySchema = z.object({
  status: z.literal('scored'),
  day: score,
  night: score,
  address: z.object({
    score,
    start: z.number(),
    day: safetyMomentSchema,
    night: safetyMomentSchema,
  }),
  landmarks: z.array(
    z.object({
      id: z.string(),
      type: z.string(),
      name: z.string().nullable(),
      location: position,
      distance_m: z.number(),
    }),
  ),
  heat: z
    .object({
      cell_size_m: z.number().positive(),
      cells: z.array(z.tuple([z.number(), z.number(), score, score])),
    })
    .optional(),
});

const accessibilitySchema = z.object({
  status: z.literal('scored'),
  data_quality: z.enum(['gtfs', 'osm_only']),
  reference_date: z.string().nullable(),
  stops: z.array(
    z.object({
      id: z.string(),
      name: z.string().nullable(),
      location: position,
      walk_min: z.number(),
      routes: z.array(z.string()),
    }),
  ),
  routes: z.array(
    z.object({
      key: z.string(),
      ref: z.string().nullable(),
      mode: z.string(),
      peak_per_hour: z.number().nullable(),
    }),
  ),
  destinations: z.array(
    z.object({
      id: z.string(),
      kind: z.string(),
      label: z.object({ ro: z.string(), en: z.string() }),
      location: position,
      minutes: z.number().nullable(),
      by_walking: z.boolean(),
      walk: z.number().nullable(),
      wait: z.number().nullable(),
      ride: z.number().nullable(),
      transfers: z.number().nullable(),
      route: z
        .object({
          ref: z.string().nullable(),
          mode: z.string(),
          colour: z.string().nullable().optional(),
        })
        .nullable(),
      path: z
        .array(z.object({ mode: z.enum(['walk', 'transit']), coordinates: z.array(position) }))
        .default([]),
    }),
  ),
  reach: z
    .object({
      minutes: z.number(),
      share_pct: z.number(),
      neighbourhoods_reached: z.number(),
      neighbourhoods_total: z.number(),
      isochrones: z.array(z.object({ minutes: z.number(), geometry })),
      neighbourhoods: z.array(
        z.object({ name: z.string(), location: position, minutes: z.number().nullable() }),
      ),
    })
    .nullable()
    .default(null),
});

const fifteenMinuteSchema = z.object({
  status: z.literal('scored'),
  covered: z.number(),
  total: z.number(),
  distance_method: z.string(),
  groups: z.array(
    z.object({ key: z.string(), n15: z.number(), typical_n15: z.number().nullable().optional() }),
  ),
  categories: z.array(
    z.object({
      key: z.string(),
      group: z.string().optional(),
      t1_min: z.number().nullable(),
      n15: z.number(),
      status: z.string(),
    }),
  ),
  places: z.array(
    z.object({
      id: z.string(),
      category: z.string(),
      name: z.string().nullable(),
      lat: z.number(),
      lng: z.number(),
      minutes: z.number(),
    }),
  ),
  isochrones: z.array(z.object({ minutes: z.number(), geometry })),
});

const greenSchema = z.object({
  status: z.literal('scored'),
  near_radius_m: z.number(),
  share: z.record(z.string(), z.number()),
  city_avg_share_near: z.number().nullable(),
  distance_method: z.string(),
  parks: z.array(
    z.object({
      id: z.string(),
      name: z.string().nullable(),
      area_ha: z.number(),
      amenities: z.array(z.string()),
      walk_m: z.number(),
      center: position,
    }),
  ),
  areas: featureCollection,
});

const noiseSchema = z.object({
  status: z.literal('scored'),
  precision: z.string(),
  lden: z.number().nullable(),
  lnight: z.number().nullable(),
  sources: z.array(
    z.object({
      kind: z.string(),
      source_class: z.string(),
      name: z.string().nullable(),
      distance_m: z.number(),
    }),
  ),
  map: z.object({
    lines: featureCollection.optional(),
    heat: z
      .object({
        center: z.tuple([z.number(), z.number()]),
        step_m: z.number().positive(),
        columns: z.number().int().positive(),
        rows: z.number().int().positive(),
        levels: z.array(z.number()),
      })
      .optional(),
  }),
});

const airSchema = z.object({
  status: z.literal('scored'),
  months: z.array(z.string()),
  pm25_monthly: z.array(z.number().nullable()),
  pm25_annual: z.number().nullable(),
  no2_annual: z.number().nullable(),
  months_over_limit: z.object({ pm25: z.number().nullable() }),
  limits: z.object({ pm25: z.number(), no2: z.number() }),
  verdict_code: z.string().nullable(),
  city_avg: z.object({ pm25: z.number().nullable(), no2: z.number().nullable() }),
});

const industrySchema = z.object({
  status: z.literal('scored'),
  nearest_m: z.number().nullable(),
  count_radius: z.number(),
  radius_m: z.number(),
  sites: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      sector_code: z.string(),
      impact_codes: z.array(z.string()),
      distance_m: z.number(),
      location: position,
    }),
  ),
  source: z.object({ reporting_year: z.number().nullable() }),
});

const educationSchema = z.object({
  status: z.literal('scored'),
  levels: z.array(z.object({ key: z.string(), nearest_min: z.number().nullable() })),
  institutions: z.array(
    z.object({
      id: z.string(),
      name: z.string().nullable(),
      levels: z.array(z.string()),
      walk_m: z.number(),
    }),
  ),
});

const healthSchema = z.object({
  status: z.literal('scored'),
  layers: z.array(
    z.object({
      key: z.string(),
      minutes: z.number().nullable(),
      mode: z.enum(['walk', 'car']).nullable(),
      place: z.object({ name: z.string().nullable() }).nullable(),
    }),
  ),
});

const seismicSchema = z.object({
  status: z.literal('context'),
  code: z.string(),
  precision: z.enum(['address', 'city']),
  ag_g: z.number(),
  level: z.string().nullable(),
  comparison: z.array(z.object({ slug: z.string(), ag_g: z.number() })),
  building: z.object({ construction_year: z.number(), period: z.string() }).nullable(),
  earthquakes: z
    .object({
      catalogue: z.string(),
      since_year: z.number(),
      radius_km: z.number(),
      min_magnitude: z.number(),
      retrieved_on: z.string().nullable().default(null),
      sources: z
        .array(
          z.object({
            name: z.string(),
            license: z.string(),
            url: z
              .string()
              .nullable()
              .transform((value) => (value?.startsWith('https://') ? value : null)),
          }),
        )
        .default([]),
      events: z.array(
        z.object({
          date: z.string(),
          magnitude: z.number(),
          distance_km: z.number(),
          place: z.string().nullable(),
          location: position,
        }),
      ),
    })
    .nullable()
    .default(null),
});

const marketSource = z.object({
  source: z.string(),
  period: z.string(),
  url: z
    .string()
    .nullable()
    .transform((value) => (value?.startsWith('https://') ? value : null)),
  observed_on: z.string().nullable().optional(),
  label: z.string().optional(),
});

const investmentSchema = z.object({
  status: z.literal('context'),
  reference_date: z.string().nullable(),
  declared: z.object({ area_m2: z.number().nullable() }),
  sale: z
    .looseObject({
      precision: z.string(),
      count: z.number().nullable().optional(),
      median_eur_m2: z.number(),
      p25_eur_m2: z.number().nullable().optional(),
      p75_eur_m2: z.number().nullable().optional(),
      typical: z.object({ area_m2: z.number(), price_eur: z.number() }).nullable().optional(),
      estimate_eur: z.number().nullable().optional(),
      estimate_low_eur: z.number().nullable().optional(),
      estimate_high_eur: z.number().nullable().optional(),
    })
    .nullable(),
  rent: z
    .looseObject({
      median_eur: z.number().nullable().optional(),
      estimate_eur: z.number().nullable().optional(),
      is_example: z.boolean().optional(),
    })
    .nullable(),
  yield: z.object({ gross_pct: z.number().nullable(), is_example: z.boolean().optional() }),
  nearby: z
    .array(
      z.object({
        name: z.string(),
        count: z.number().nullable(),
        median_eur_m2: z.number(),
        p25_eur_m2: z.number().nullable(),
        p75_eur_m2: z.number().nullable(),
      }),
    )
    .default([]),
  history: z
    .object({ months: z.array(z.object({ period: z.string(), median_eur_m2: z.number() })) })
    .nullable()
    .default(null),
  sources: z.array(marketSource).default([]),
});

const questionsSchema = z.object({
  codes: z.array(z.string()),
});

const SECTION_SCHEMAS = {
  safety: safetySchema,
  accessibility: accessibilitySchema,
  fifteen_minute: fifteenMinuteSchema,
  green: greenSchema,
  noise: noiseSchema,
  air: airSchema,
  industry: industrySchema,
  education: educationSchema,
  health: healthSchema,
  seismic: seismicSchema,
  investment: investmentSchema,
  questions: questionsSchema,
} as const;

type SectionKey = keyof typeof SECTION_SCHEMAS;

type ReportSections = {
  [Key in SectionKey]: z.infer<(typeof SECTION_SCHEMAS)[Key]> | null;
};

const summarySchema = z.looseObject({
  city: z.object({ slug: z.string(), name: z.string() }),
  snapshot: z.object({ period: z.string(), source_dates: z.record(z.string(), z.string()) }),
  zone: z.object({
    score: score.nullable(),
    percentile: z.number().nullable(),
    city_avg: score.nullable(),
    city_min: score.nullable().optional(),
    city_max: score.nullable().optional(),
    histogram: z.array(z.number()),
  }),
  categories: z.record(z.enum(CATEGORY_KEYS), categorySummarySchema),
});

export const reportInputSchema = z.object({
  number: z.number().int().positive(),
  address_text: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  generated_at: z.string().min(1),
  result: summarySchema,
});

export type CategorySummary = z.infer<typeof categorySummarySchema>;

export type ReportData = {
  number: number;
  addressText: string;
  latitude: number;
  longitude: number;
  generatedAt: string;
  city: { slug: string; name: string };
  snapshot: { period: string; sourceDates: Record<string, string> };
  zone: z.infer<typeof summarySchema>['zone'];
  categories: Record<CategoryKey, CategorySummary>;
  sections: ReportSections;
  unreadableSections: SectionKey[];
};

function readSection<Key extends SectionKey>(
  key: Key,
  result: Record<string, unknown>,
  unreadable: SectionKey[],
): ReportSections[Key] {
  const raw = result[key];
  if (raw === undefined || raw === null) return null;
  const status = z.object({ status: z.string() }).safeParse(raw);
  if (status.success && status.data.status === 'no_data') return null;
  const parsed = SECTION_SCHEMAS[key].safeParse(raw);
  if (parsed.success) return parsed.data as ReportSections[Key];
  unreadable.push(key);
  return null;
}

export function toReportData(input: z.infer<typeof reportInputSchema>): ReportData {
  const { result } = input;
  const unreadableSections: SectionKey[] = [];
  const section = <Key extends SectionKey>(key: Key) =>
    readSection(key, result, unreadableSections);
  return {
    number: input.number,
    addressText: input.address_text,
    latitude: input.latitude,
    longitude: input.longitude,
    generatedAt: input.generated_at,
    city: result.city,
    snapshot: { period: result.snapshot.period, sourceDates: result.snapshot.source_dates },
    zone: result.zone,
    categories: result.categories,
    sections: {
      safety: section('safety'),
      accessibility: section('accessibility'),
      fifteen_minute: section('fifteen_minute'),
      green: section('green'),
      noise: section('noise'),
      air: section('air'),
      industry: section('industry'),
      education: section('education'),
      health: section('health'),
      seismic: section('seismic'),
      investment: section('investment'),
      questions: section('questions'),
    },
    unreadableSections,
  };
}
