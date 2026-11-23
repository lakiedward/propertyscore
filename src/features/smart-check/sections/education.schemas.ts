import { z } from 'zod';

export const educationSectionSchema = z.object({
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
