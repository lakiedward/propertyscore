import { z } from 'zod';

export const airSectionSchema = z.object({
  status: z.literal('scored'),
  months: z.array(z.string()),
  pm25_monthly: z.array(z.number().nullable()),
  pm25_annual: z.number().nullable(),
  no2_annual: z.number().nullable(),
  months_over_limit: z.object({ pm25: z.number().nullable() }),
  limits: z.object({ pm25: z.number(), no2: z.number() }),
  verdict_code: z.string().nullable(),
  city_avg: z.object({ pm25: z.number().nullable(), no2: z.number().nullable() }),
});
