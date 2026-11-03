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
});

export const shareTokenSchema = z.string().regex(/^[0-9a-f]{48}$/);

export const onlineReportSearchSchema = z.object({
  tab: z.enum(CHAPTER_IDS).optional(),
  share: shareTokenSchema.optional().catch(undefined),
});
