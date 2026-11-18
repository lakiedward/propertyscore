import { z } from 'zod';
import { AppError } from '@/lib/errors';

const ROMANIA_REGIONS_URL = '/geo/romania-regions.json';

const positionSchema = z.tuple([z.number(), z.number()]);
const polygonSchema = z.array(z.array(positionSchema));

const romaniaRegionsSchema = z.object({
  outline: z.array(polygonSchema),
  regions: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      coordinates: z.array(polygonSchema),
    }),
  ),
});

export async function getRomaniaRegions() {
  let response: Response;
  try {
    response = await fetch(ROMANIA_REGIONS_URL);
  } catch (error) {
    throw new AppError('network', 'Romania regions could not be fetched', { cause: error });
  }
  if (!response.ok) {
    throw new AppError('unknown', `Romania regions request failed with ${String(response.status)}`);
  }
  const body: unknown = await response.json().catch((error: unknown) => {
    throw new AppError('unknown', 'Romania regions are not JSON', { cause: error });
  });
  const parsed = romaniaRegionsSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError('unknown', 'Romania regions are malformed', { cause: parsed.error });
  }
  return parsed.data;
}
