import { z } from 'zod';

import { WorkerError } from '../../lib/errors.ts';

const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const minutes = z.number().positive().max(240);

const modeSchema = z.object({
  radius_m: z.number().int().min(50).max(2000),
  reliability_min: z.number().min(0).max(10),
  osm_departures_per_hour: z.number().positive().max(60),
  osm_speed_kmh: z.number().positive().max(80),
});

export const accessibilityParamsSchema = z.object({
  weights: z.object({
    access: z.number().min(0),
    travel: z.number().min(0),
    coverage: z.number().min(0),
  }),
  walk_speed_kmh: z.number().min(2).max(7),
  reference: z.object({
    weekdays: z.array(z.number().int().min(1).max(5)).min(1),
    peak_start: clock,
    peak_end: clock,
    window_start: clock,
    window_end: clock,
    detail_departure: clock,
  }),
  modes: z.object({
    bus: modeSchema,
    trolleybus: modeSchema,
    tram: modeSchema,
    subway: modeSchema,
  }),
  access: z
    .object({ ai_min: z.number().positive(), ai_max: z.number().positive() })
    .refine((access) => access.ai_max > access.ai_min, 'ai_max must exceed ai_min'),
  travel: z.object({
    full_at_min: minutes,
    zero_at_min: minutes,
    airport_full_at_min: minutes,
    airport_zero_at_min: minutes,
    max_minutes: minutes,
    max_transfers: z.number().int().min(0).max(4),
    kind_weights: z.object({
      center: z.number().min(0),
      station: z.number().min(0),
      university: z.number().min(0),
      hospital: z.number().min(0),
      mall: z.number().min(0),
      airport: z.number().min(0),
    }),
  }),
  coverage: z.object({
    sectors: z.number().int().min(4).max(16),
    min_distance_m: z.number().min(0).max(20000),
    multimodal_bonus: z.number().min(0).max(1),
  }),
  smoothing: z
    .object({ cell: z.number().min(0).max(1), neighbours: z.number().min(0).max(1) })
    .refine(
      (smoothing) => Math.abs(smoothing.cell + smoothing.neighbours - 1) < 1e-9,
      'smoothing weights must add up to 1',
    ),
  matrix: z.object({ max_minutes: minutes }),
});

export type AccessibilityParams = z.infer<typeof accessibilityParamsSchema>;

export function parseAccessibilityParams(value: unknown): AccessibilityParams {
  const parsed = accessibilityParamsSchema.safeParse(value);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new WorkerError(
      'invalid_accessibility_params',
      `Invalid accessibility params: ${fields}`,
    );
  }
  return parsed.data;
}
