import { z } from 'zod';

export const scoreSchema = z.number().min(0).max(100);

export const positionSchema = z.tuple([z.number(), z.number()]);

export const geometrySchema = z.looseObject({ type: z.string() });

export const featureCollectionSchema = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(
    z.object({
      type: z.literal('Feature'),
      properties: z.record(z.string(), z.unknown()).nullable(),
      geometry: geometrySchema,
    }),
  ),
});

export const isochroneSchema = z.object({ minutes: z.number(), geometry: geometrySchema });

export const httpsUrlSchema = z
  .string()
  .nullable()
  .transform((value) => (value?.startsWith('https://') ? value : null));
