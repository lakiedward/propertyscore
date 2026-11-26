import { z } from 'zod';
import { accessibilitySectionSchema } from './sections/accessibility.schemas';
import { airSectionSchema } from './sections/air.schemas';
import { educationSectionSchema } from './sections/education.schemas';
import { fifteenMinuteSectionSchema } from './sections/fifteen-minute.schemas';
import { greenSectionSchema } from './sections/green.schemas';
import { healthSectionSchema } from './sections/health.schemas';
import { industrySectionSchema } from './sections/industry.schemas';
import { investmentSectionSchema } from './sections/investment.schemas';
import { noiseSectionSchema } from './sections/noise.schemas';
import { questionsSectionSchema } from './sections/questions.schemas';
import { safetySectionSchema } from './sections/safety.schemas';
import { seismicSectionSchema } from './sections/seismic.schemas';
import { scoreSchema } from './sections/shared.schemas';

export const REPORT_CATEGORY_KEYS = [
  'safety',
  'accessibility',
  'fifteen_minute',
  'green',
  'noise',
  'air',
  'industry',
  'education',
  'health',
] as const;

export const REPORT_SECTION_SCHEMAS = {
  safety: safetySectionSchema,
  accessibility: accessibilitySectionSchema,
  fifteen_minute: fifteenMinuteSectionSchema,
  green: greenSectionSchema,
  noise: noiseSectionSchema,
  air: airSectionSchema,
  industry: industrySectionSchema,
  education: educationSectionSchema,
  health: healthSectionSchema,
  seismic: seismicSectionSchema,
  investment: investmentSectionSchema,
  questions: questionsSectionSchema,
} as const;

const distributionSchema = z.object({
  score: scoreSchema.nullable(),
  cell_score: scoreSchema.nullable().optional(),
  percentile: z.number().nullable(),
  city_avg: scoreSchema.nullable(),
  city_min: scoreSchema.nullable().optional(),
  city_max: scoreSchema.nullable().optional(),
  histogram: z.array(z.number()),
});

export const reportSummarySchema = z.object({
  city: z.object({ slug: z.string(), name: z.string() }),
  snapshot: z.object({ period: z.string(), source_dates: z.record(z.string(), z.string()) }),
  formula: z
    .object({
      label: z.string(),
      weights: z.partialRecord(z.enum(REPORT_CATEGORY_KEYS), z.number()),
    })
    .nullable()
    .default(null),
  zone: distributionSchema.extend({ precision: z.enum(['address', 'cell']).optional() }),
  categories: z.partialRecord(
    z.enum(REPORT_CATEGORY_KEYS),
    distributionSchema.extend({ weight: z.number().min(0) }),
  ),
});

export const shareTokenSchema = z.string().regex(/^[0-9a-f]{48}$/u);
