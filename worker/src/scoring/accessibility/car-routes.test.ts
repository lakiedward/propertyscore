import { describe, expect, it, vi } from 'vitest';

import { createLogger } from '../../lib/logger.ts';
import type { ValhallaClient } from '../../routing/valhalla.ts';
import { routeByCar } from './car-routes.ts';

describe('routeByCar', () => {
  const origin = { lng: 21.22, lat: 45.75 };
  const destinations = ['reachable', 'unreachable', 'error', 'malformed'].map((id, index) => ({
    id,
    lng: origin.lng + (index + 1) / 100,
    lat: origin.lat,
  }));
  const result = { seconds: 480, meters: 3500, polyline6: '_njgvA_idng@o}@ozD_|Bo}@' };

  it('retains only complete road routes and does not let an individual failure discard them', async () => {
    const route = vi
      .fn<ValhallaClient['route']>()
      .mockResolvedValueOnce(result)
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error('unavailable'))
      .mockResolvedValueOnce({ ...result, polyline6: '???' });
    const logger = createLogger('error');
    const routes = await routeByCar({ route }, origin, destinations, logger);

    expect(routes).toEqual(new Map([['reachable', result]]));
    expect(route.mock.calls[0]?.[0]).toMatchObject({
      origin,
      destination: { lng: destinations[0]?.lng, lat: origin.lat },
      costing: 'auto',
    });
    expect(route.mock.calls[0]?.[0].signal).toBeInstanceOf(AbortSignal);
  });

  it('does not estimate any route without a routing service', async () => {
    expect(await routeByCar(null, origin, destinations, createLogger('error'))).toEqual(new Map());
  });
});
