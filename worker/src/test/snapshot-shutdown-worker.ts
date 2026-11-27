import { join } from 'node:path';

import { WorkerError } from '../lib/errors.ts';
import { createLogger } from '../lib/logger.ts';
import { createValhallaClient } from '../routing/valhalla.ts';
import { runTransitRouting } from '../scoring/accessibility/routing.ts';
import { buildSnapshotOnSignals } from '../snapshot/build-snapshot.ts';

const { DATABASE_URL, SNAPSHOT_TEST_SOURCES_DIR, SNAPSHOT_TEST_ROUTER_URL } = process.env;
if (!DATABASE_URL || !SNAPSHOT_TEST_SOURCES_DIR || !SNAPSHOT_TEST_ROUTER_URL || !process.send) {
  throw new Error('Missing snapshot crash test configuration');
}

await buildSnapshotOnSignals({
  databaseUrl: DATABASE_URL,
  period: '2026-11-01',
  citySlugs: ['sibiu'],
  scoreKeys: [],
  sourcesDir: SNAPSHOT_TEST_SOURCES_DIR,
  osmExtract: { url: 'https://example.test/romania.osm.pbf', apiKey: null },
  createRouter: (requestScope) => createValhallaClient(SNAPSHOT_TEST_ROUTER_URL, { requestScope }),
  logger: createLogger('info'),
  modules: [
    {
      key: 'fifteen_minute',
      run: async ({ router, snapshotId, signal, routingScope }) => {
        if (!router) throw new Error('Missing test router');
        await new Promise<void>((resolve, reject) => {
          process.send?.(snapshotId, (error) => (error ? reject(error) : resolve()));
        });
        const point = { lng: 24.15, lat: 45.79 };
        const job = { costing: 'pedestrian' as const, sources: [point], targets: [point] };
        const routing = async () => {
          await router.matrix(job);
          await router.matrix(job);
        };
        const route = process.env.SNAPSHOT_TEST_R5
          ? runTransitRouting({
              osmPbf: 'unused',
              gtfs: [],
              date: '2026-11-01',
              windowStart: '07:45',
              windowMinutes: 30,
              detailDeparture: '08:00',
              walkSpeedKmh: 4.5,
              maxMinutes: 90,
              maxRides: 3,
              stopWalkMaxMinutes: 11,
              origins: [],
              stops: [],
              destinations: [],
              withMatrix: true,
              withItineraries: false,
              workDir: join(SNAPSHOT_TEST_SOURCES_DIR, 'shutdown-routing'),
              signal,
              scope: routingScope,
            })
          : Promise.resolve();
        await Promise.all([route, routing()]);
        return { sourceDates: {} };
      },
    },
  ],
}).catch((error: unknown) => {
  if (!(error instanceof WorkerError) || error.code !== 'snapshot_stopping') throw error;
  process.exitCode = 1;
});
