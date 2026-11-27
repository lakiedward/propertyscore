import { z } from 'zod';
import { positionSchema } from './shared.schemas';

export const industrySectionSchema = z.object({
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
      location: positionSchema,
    }),
  ),
  source: z.object({
    reporting_year: z.number().nullable(),
    legacy_observed_at: z.iso.datetime().optional(),
  }),
});
