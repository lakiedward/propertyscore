import { z } from 'zod';

import { WorkerError } from '../../lib/errors.ts';

const decibels = z.number().min(0).max(140);

const scale = z
  .tuple([decibels, decibels])
  .refine(([quiet, loud]) => quiet < loud, 'the quiet end must be below the loud end');

const guideline = z.object({ lden: decibels, lnight: decibels });

const NOISE_KINDS = ['road', 'tram', 'rail', 'air', 'industry', 'aggregate'] as const;

export type NoiseKind = (typeof NOISE_KINDS)[number];

const noiseParamsSchema = z.object({
  scale_lden: scale,
  scale_lnight: scale,
  night_weight: z.number().min(0).max(1),
  intermittent_penalty_db: z.number().min(0).max(20),
  intermittent_kinds: z.array(z.enum(NOISE_KINDS)),
  below_mapped_db: decibels,
  band_width_db: z.number().positive().max(20),
  proxy_ref_db: z.record(z.string().regex(/^[a-z0-9_]{1,40}$/), decibels),
  proxy_ref_distance_m: z.number().positive().max(100),
  proxy_night_offset_db: z.number().min(0).max(30),
  screen_db: z.number().min(0).max(30),
  screen_max_db: z.number().min(0).max(40),
  nearest_radius_m: z.number().int().min(100).max(5000),
  sample_offset_m: z.number().int().min(10).max(500),
  map_clip_m: z.number().int().min(100).max(3000),
  display_bands_db: z
    .array(decibels)
    .min(1)
    .refine(
      (bands) => bands.every((band, index) => index === 0 || band > (bands[index - 1] ?? 0)),
      'bands must rise',
    ),
  who: z.object({ road: guideline, rail: guideline, air: guideline }),
});

export type NoiseParams = z.infer<typeof noiseParamsSchema>;

export function parseNoiseParams(value: unknown): NoiseParams {
  const parsed = noiseParamsSchema.safeParse(value);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new WorkerError('invalid_noise_params', `Invalid params.noise: ${fields}`);
  }
  return parsed.data;
}
