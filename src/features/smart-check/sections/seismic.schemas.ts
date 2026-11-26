import { z } from 'zod';
import { httpsUrlSchema, positionSchema } from './shared.schemas';

export const seismicSectionSchema = z.object({
  status: z.literal('context'),
  code: z.string(),
  precision: z.enum(['address', 'city']),
  ag_g: z.number(),
  level: z.string().nullable(),
  comparison: z.array(z.object({ slug: z.string(), ag_g: z.number() })),
  building: z.object({ construction_year: z.number(), period: z.string() }).nullable(),
  earthquakes: z
    .object({
      catalogue: z.string(),
      since_year: z.number(),
      radius_km: z.number(),
      min_magnitude: z.number(),
      retrieved_on: z.string().nullable().default(null),
      sources: z
        .array(
          z.object({
            key: z.enum(['usgs', 'emsc']).optional(),
            name: z.string(),
            license: z.string(),
            url: httpsUrlSchema,
          }),
        )
        .default([]),
      events: z.array(
        z.object({
          date: z.string(),
          magnitude: z.number(),
          distance_km: z.number(),
          place: z.string().nullable(),
          location: positionSchema,
        }),
      ),
    })
    .nullable()
    .default(null),
});
