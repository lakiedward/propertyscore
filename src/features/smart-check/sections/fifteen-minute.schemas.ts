import { z } from 'zod';
import { isochroneSchema } from './shared.schemas';

export const fifteenMinuteSectionSchema = z.object({
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
  isochrones: z.array(isochroneSchema),
});
