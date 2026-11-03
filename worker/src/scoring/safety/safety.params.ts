import { z } from 'zod';

export const SAFETY_TYPES = [
  'lighting',
  'shop',
  'nonstop',
  'mixed_use',
  'police',
  'fire_station',
  'diplomatic',
  'bar',
  'park',
  'park_lit',
  'isolated_passage',
  'train_station',
  'train_halt',
  'transit_stop',
] as const;

export type SafetyType = (typeof SAFETY_TYPES)[number];

export type NightState = 'open' | 'closed' | 'unknown';

export type Moment = 'day' | 'night';

const typeParamsSchema = z.object({
  radius_m: z.number().positive().max(2000),
  weight_day: z.number().min(-10).max(10),
  weight_night: z.number().min(-10).max(10),
  cap: z.number().positive().max(50),
  walking: z.boolean().default(false),
  night_activity: z
    .object({
      open: z.number().min(0).max(1),
      closed: z.number().min(0).max(1),
      unknown: z.number().min(0).max(1),
    })
    .default({ open: 1, closed: 1, unknown: 1 }),
});

export type SafetyTypeParams = z.infer<typeof typeParamsSchema>;

export const safetyParamsSchema = z
  .object({
    start: z.number().min(0).max(100),
    k: z.number().positive().max(100),
    night_offset: z.number().min(-50).max(50),
    moment_weights: z.object({ day: z.number().min(0), night: z.number().min(0) }),
    smoothing: z.object({ self: z.number().min(0).max(1), neighbours: z.number().min(0).max(1) }),
    reach_factor: z.number().min(1).max(5),
    walk_detour_factor: z.number().min(1).max(3),
    night_check_minute: z.number().int().min(0).max(1439),
    min_open_nights: z.number().int().min(1).max(7),
    lighting_coverage_ratio: z.number().min(0).max(1),
    calibration: z.object({
      median_day: z.number().min(0).max(100),
      p90_day: z.number().min(0).max(100),
    }),
    types: z.record(z.enum(SAFETY_TYPES), typeParamsSchema),
  })
  .refine((params) => params.moment_weights.day + params.moment_weights.night > 0, {
    message: 'moment_weights must not both be zero',
    path: ['moment_weights'],
  })
  .refine((params) => Math.abs(params.smoothing.self + params.smoothing.neighbours - 1) < 1e-9, {
    message: 'smoothing.self and smoothing.neighbours must add up to 1',
    path: ['smoothing'],
  })
  .refine((params) => SAFETY_TYPES.every((type) => type in params.types), {
    message: 'every safety type needs its parameters',
    path: ['types'],
  });

export type SafetyParams = z.infer<typeof safetyParamsSchema>;
