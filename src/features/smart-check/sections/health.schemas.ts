import { z } from 'zod';

export const healthSectionSchema = z.object({
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
