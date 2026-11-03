import { z } from 'zod';

const nearestSchema = z
  .object({
    full_at_min: z.number().nonnegative(),
    zero_at_min: z.number().positive(),
  })
  .refine((range) => range.zero_at_min > range.full_at_min, {
    message: 'zero_at_min must be above full_at_min',
  });

const countWithinSchema = z.union([z.literal(5), z.literal(10), z.literal(15)]);

const walkLayerSchema = z.object({
  weight: z.number().nonnegative(),
  nearest: nearestSchema,
  nearest_share: z.number().min(0).max(1),
  count_within_min: countWithinSchema,
  count_full_at: z.number().int().positive(),
});

export const healthParamsSchema = z.object({
  walk_speed_kmh: z.number().min(2).max(8),
  walk_detour_factor: z.number().min(1).max(3),
  car_speed_kmh: z.number().min(5).max(90),
  car_detour_factor: z.number().min(1).max(3),
  osm_cnas_match_radius_m: z.number().positive().max(500),
  search_radius_m: z.number().int().min(200).max(10000),
  max_candidates: z.number().int().min(1).max(50),
  car_search_radius_m: z.number().int().min(1000).max(100000),
  car_max_candidates: z.number().int().min(1).max(10),
  layers: z.object({
    h1: walkLayerSchema,
    h2: walkLayerSchema,
    h3: walkLayerSchema,
    h4: z.object({ weight: z.number().nonnegative(), nearest: nearestSchema }),
    h5: z.object({
      weight: z.number().nonnegative(),
      nearest: nearestSchema,
      car_only_points: z.number().min(0).max(1),
      car_only_max_min: z.number().positive(),
    }),
  }),
});

export type HealthParams = z.infer<typeof healthParamsSchema>;

export type WalkLayerParams = z.infer<typeof walkLayerSchema>;

export type CountWithin = z.infer<typeof countWithinSchema>;
