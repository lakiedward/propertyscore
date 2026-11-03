import { z } from 'zod';

const pointSchema = z.tuple([z.number().min(0), z.number().min(0).max(100)]);

const thresholdsSchema = z
  .array(pointSchema)
  .min(2)
  .refine(
    (points) =>
      points.every((point, index) => index === 0 || point[0] > (points[index - 1]?.[0] ?? 0)),
    {
      message: 'Threshold concentrations must increase',
    },
  );

const rangeSchema = z
  .tuple([z.number().positive(), z.number().positive()])
  .refine(([low, high]) => low <= 1 && high >= 1, { message: 'The range must contain 1' });

export const airParamsSchema = z.object({
  pm25_points: thresholdsSchema,
  no2_points: thresholdsSchema,
  weights: z.object({ pm25: z.number().positive(), no2: z.number().min(0) }),
  eu2030_limits: z.object({ pm25: z.number().positive(), no2: z.number().positive() }),
  calibration_factor_range: rangeSchema,
  spatial_factor_range: rangeSchema,
  calibration_station_areas: z.array(z.enum(['urban', 'suburban', 'rural'])).min(1),
  min_valid_hours_per_day: z.number().int().min(1).max(24),
  min_valid_days: z.number().int().min(1).max(28),
  min_valid_months: z.number().int().min(1).max(12),
  winter_peak_ratio: z.number().positive(),
  winter_peak_min_months: z.number().int().min(0).max(12),
  most_year_months: z.number().int().min(1).max(12),
  heavy_winter_pm25: z.number().positive(),
  neighbour_blend: z.number().min(0).max(1),
});

export type AirParams = z.infer<typeof airParamsSchema>;

export type Pollutant = 'pm25' | 'no2';

export const POLLUTANTS: readonly Pollutant[] = ['pm25', 'no2'];
