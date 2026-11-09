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
  return romaniaRegionsSchema.parse(await response.json());
}
