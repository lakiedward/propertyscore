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
});

export const onlineReportSearchSchema = z.object({
  tab: z.enum(CHAPTER_IDS).optional(),
});
