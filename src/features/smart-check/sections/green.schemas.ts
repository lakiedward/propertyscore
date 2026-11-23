import { z } from 'zod';
import { featureCollectionSchema, positionSchema } from './shared.schemas';

export const greenSectionSchema = z.object({
  status: z.literal('scored'),
  near_radius_m: z.number(),
  share: z.record(z.string(), z.number()),
  city_avg_share_near: z.number().nullable(),
  distance_method: z.string(),
  parks: z.array(
    z.object({
      id: z.string(),
      name: z.string().nullable(),
      area_ha: z.number(),
      amenities: z.array(z.string()),
      walk_m: z.number(),
      center: positionSchema,
    }),
  ),
  areas: featureCollectionSchema,
});
