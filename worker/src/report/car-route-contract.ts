import { z } from 'zod';

import { decodePolyline6 } from '../routing/polyline.ts';

export const carRouteSchema = z.object({
  seconds: z.int().positive(),
  meters: z.int().positive(),
  polyline6: z.string().refine((value) => decodePolyline6(value).length > 1),
});
