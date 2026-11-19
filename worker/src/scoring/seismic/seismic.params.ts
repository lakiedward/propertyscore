import { z } from 'zod';

import { WorkerError } from '../../lib/errors.ts';

const HAZARD_LEVELS = ['low', 'moderate', 'high', 'very_high'] as const;

export type HazardLevel = (typeof HAZARD_LEVELS)[number];

const levelSchema = z.enum(HAZARD_LEVELS);

const levelsSchema = z
  .array(z.tuple([z.number().positive(), levelSchema]))
  .min(1)
  .refine(
    (levels) =>
      levels.every((level, index) => index === 0 || level[0] > (levels[index - 1]?.[0] ?? 0)),
    { message: 'Level thresholds must increase' },
  );

const codeSchema = z.string().regex(/^[a-z][a-z0-9_]{0,79}$/);

const buildingPeriodsSchema = z
  .array(
    z.object({
      key: codeSchema,
      until_year: z.int().min(1800).max(2100).nullable(),
      codes: z.array(z.string().min(1).max(40)),
      question_codes: z.array(codeSchema),
    }),
  )
  .min(1)
  .refine(
    (periods) =>
      periods.every((period, index) => {
        const isLast = index === periods.length - 1;
        if (isLast) return period.until_year === null;
        const previous = index === 0 ? null : (periods[index - 1]?.until_year ?? null);
        return period.until_year !== null && (previous === null || period.until_year > previous);
      }),
    { message: 'Building periods must grow and end open' },
  );

export type BuildingPeriod = z.infer<typeof buildingPeriodsSchema>[number];

const seismicParamsSchema = z.object({
  code: z.string().min(1).max(40),
  return_period_years: z.number().int().positive(),
  exceedance: z.object({
    probability: z.number().gt(0).lt(1),
    years: z.number().int().positive(),
  }),
  precision: z.enum(['address', 'city']),
  snap_m: z.number().int().min(0).max(5000),
  levels: levelsSchema,
  top_level: levelSchema,
  question_codes: z.array(codeSchema),
  building_periods: buildingPeriodsSchema.optional(),
  source: z.object({
    dataset: z.string().min(1).max(80),
    digitized_by: z.string().min(1).max(80),
  }),
});

export type SeismicParams = z.infer<typeof seismicParamsSchema>;

export function parseSeismicParams(value: unknown): SeismicParams {
  const parsed = seismicParamsSchema.safeParse(value);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new WorkerError('invalid_seismic_params', `Invalid params.seismic: ${fields}`);
  }
  return parsed.data;
}
