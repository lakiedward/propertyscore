import { z } from 'zod';

import { WorkerError } from '../../lib/errors.ts';

const range = z
  .tuple([z.number().nonnegative(), z.number().positive()])
  .refine(([low, high]) => low < high, 'range must grow');

const investmentParamsSchema = z.object({
  window_days: z.int().positive(),
  radii_m: z.array(z.int().positive()).min(1),
  sale_min_count: z.int().positive(),
  rent_min_count: z.int().positive(),
  city_min_count: z.int().positive(),
  rooms_filter_min_count: z.int().positive(),
  detail_filter_min_count: z.int().positive(),
  building_period_bounds: z.array(z.int().min(1800).max(2100)),
  rent_same_rooms_min_count: z.int().positive(),
  change_min_count: z.int().positive(),
  outlier_iqr_factor: z.number().positive(),
  histogram_bin_eur_m2: z.int().positive(),
  histogram_max_bins: z.int().min(3),
  gone_after_days: z.int().nonnegative(),
  days_listed_min_count: z.int().positive(),
  city_buffer_m: z.int().nonnegative(),
  duplicate: z.object({
    distance_m: z.number().nonnegative(),
    area_ratio: z.number().nonnegative(),
    price_ratio: z.number().nonnegative(),
  }),
  plausible: z.object({
    area_m2: range,
    rooms: range,
    sale_eur_m2: range,
    rent_eur_m2: range,
  }),
});

export type InvestmentParams = z.infer<typeof investmentParamsSchema>;

export function parseInvestmentParams(value: unknown): InvestmentParams {
  const parsed = investmentParamsSchema.safeParse(value);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new WorkerError('invalid_investment_params', `Invalid params.investment: ${fields}`);
  }
  const bounds = parsed.data.building_period_bounds;
  if (bounds.some((bound, index) => index > 0 && bound <= (bounds[index - 1] ?? 0))) {
    throw new WorkerError(
      'invalid_investment_params',
      'params.investment.building_period_bounds must grow',
    );
  }
  const radii = parsed.data.radii_m;
  if (radii.some((radius, index) => index > 0 && radius <= (radii[index - 1] ?? 0))) {
    throw new WorkerError('invalid_investment_params', 'params.investment.radii_m must grow');
  }
  return parsed.data;
}
