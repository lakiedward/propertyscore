import type { z } from 'zod';

import { mapWithConcurrency } from '../../lib/concurrency.ts';
import { errorCode } from '../../lib/errors.ts';
import type { Logger } from '../../lib/logger.ts';
import { carRouteSchema } from '../../report/car-route-contract.ts';
import type { LngLat, ValhallaClient } from '../../routing/valhalla.ts';

type CarRoute = z.infer<typeof carRouteSchema>;

const CAR_ROUTE_CONCURRENCY = 4;
const CAR_ROUTES_TIMEOUT_MS = 15_000;

export async function routeByCar(
  router: Pick<ValhallaClient, 'route'> | null | undefined,
  origin: LngLat,
  destinations: readonly (LngLat & { id: string })[],
  logger: Logger,
): Promise<Map<string, CarRoute>> {
  const routes = new Map<string, CarRoute>();
  if (!router || destinations.length === 0) return routes;

  const signal = AbortSignal.timeout(CAR_ROUTES_TIMEOUT_MS);
  const failures = new Set<string>();
  await mapWithConcurrency(destinations, CAR_ROUTE_CONCURRENCY, async ({ id, lng, lat }) => {
    if (signal.aborted) return;
    try {
      const result = await router.route({
        costing: 'auto',
        origin,
        destination: { lng, lat },
        signal,
      });
      if (!result) return;
      const parsed = carRouteSchema.safeParse(result);
      if (parsed.success) routes.set(id, parsed.data);
      else failures.add('invalid_car_route');
    } catch (error) {
      failures.add(errorCode(error));
    }
  });
  if (failures.size > 0)
    logger.warn('car routes unavailable for some destinations', {
      codes: [...failures].join(','),
    });
  return routes;
}
