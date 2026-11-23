import { z } from 'zod';
import { positionSchema, scoreSchema } from './shared.schemas';

const safetyMomentSchema = z.object({
  score: scoreSchema,
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

export const safetySectionSchema = z.object({
  status: z.literal('scored'),
  day: scoreSchema,
  night: scoreSchema,
  address: z.object({
    score: scoreSchema,
    start: z.number(),
    day: safetyMomentSchema,
    night: safetyMomentSchema,
  }),
  landmarks: z.array(
    z.object({
      id: z.string(),
      type: z.string(),
      name: z.string().nullable(),
      location: positionSchema,
      distance_m: z.number(),
    }),
  ),
  heat: z
    .object({
      cell_size_m: z.number().positive(),
      cells: z.array(z.tuple([z.number(), z.number(), scoreSchema, scoreSchema])),
    })
    .optional(),
});
