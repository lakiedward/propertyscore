import { z } from 'zod';
import { featureCollectionSchema } from './shared.schemas';

export const noiseSectionSchema = z.object({
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
    lines: featureCollectionSchema.optional(),
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
