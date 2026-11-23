import { z } from 'zod';
import { httpsUrlSchema } from './shared.schemas';

const marketSourceSchema = z.object({
  source: z.string(),
  period: z.string(),
  url: httpsUrlSchema,
  observed_on: z.string().nullable().optional(),
  label: z.string().optional(),
});

export const investmentSectionSchema = z.object({
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
  sources: z.array(marketSourceSchema).default([]),
});
