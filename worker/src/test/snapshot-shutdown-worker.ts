import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { WorkerError } from '../lib/errors.ts';
import { createLogger } from '../lib/logger.ts';
import { createValhallaRegistry } from '../routing/valhalla-registry.ts';
import { createValhallaClient } from '../routing/valhalla.ts';
import { runTransitRouting } from '../scoring/accessibility/routing.ts';
import { downloadCamsMonth } from '../scoring/air/cams.source.ts';
import { buildSnapshotOnSignals } from '../snapshot/build-snapshot.ts';

const {
  DATABASE_URL,
  SNAPSHOT_TEST_SOURCES_DIR,
  SNAPSHOT_TEST_ROUTER_URL,
  SNAPSHOT_TEST_REPLICA_ID_FILE,
  SNAPSHOT_TEST_ROUTER_TOKEN,
  SNAPSHOT_TEST_ROUTER_CONTROL_TOKEN,
  SNAPSHOT_TEST_ADS_URL,
  SNAPSHOT_TEST_ADS_KEY,
} = process.env;
if (
  !DATABASE_URL ||
  !SNAPSHOT_TEST_SOURCES_DIR ||
  !SNAPSHOT_TEST_ROUTER_URL ||
  (!process.send && !SNAPSHOT_TEST_REPLICA_ID_FILE)
) {
  throw new Error('Missing snapshot crash test configuration');
}

const recovery =
  SNAPSHOT_TEST_REPLICA_ID_FILE && SNAPSHOT_TEST_ROUTER_TOKEN && SNAPSHOT_TEST_ROUTER_CONTROL_TOKEN
    ? {
        replicaId: (await readFile(SNAPSHOT_TEST_REPLICA_ID_FILE, 'utf8')).trim(),
        registry: createValhallaRegistry(
          SNAPSHOT_TEST_ROUTER_URL,
          SNAPSHOT_TEST_ROUTER_TOKEN,
          SNAPSHOT_TEST_ROUTER_CONTROL_TOKEN,
        ),
      }
    : undefined;
if (
  SNAPSHOT_TEST_REPLICA_ID_FILE &&
  (!recovery || !SNAPSHOT_TEST_ADS_URL || !SNAPSHOT_TEST_ADS_KEY)
) {
  throw new Error('Missing authenticated recovery probe configuration');
}

await buildSnapshotOnSignals({
  databaseUrl: DATABASE_URL,
  period: '2026-11-01',
  citySlugs: ['sibiu'],
  scoreKeys: [],
  sourcesDir: SNAPSHOT_TEST_SOURCES_DIR,
  osmExtract: { url: 'https://example.test/romania.osm.pbf', apiKey: null },
  createRouter: (requestScope) => createValhallaClient(SNAPSHOT_TEST_ROUTER_URL, { requestScope }),
  recovery,
  logger: createLogger('info'),
  modules: [
    {
      key: 'fifteen_minute',
      run: async ({ router, snapshotId, signal, routingScope, recordCamsAttempt }) => {
        if (!router) throw new Error('Missing test router');
        if (process.send) {
          await new Promise<void>((resolve, reject) => {
            process.send?.(snapshotId, (error) => (error ? reject(error) : resolve()));
          });
        }
        const point = { lng: 24.15, lat: 45.79 };
        const job = { costing: 'pedestrian' as const, sources: [point], targets: [point] };
        const routing = async () => {
          if (recovery) {
            const forward = {
              origin: { lat: 45.7501, lng: 21.2201 },
              destination: { lat: 45.7519, lng: 21.2219 },
              costing: 'pedestrian' as const,
              walkSpeedKmh: 4.5,
            };
            await router.tilesetDate();
            await Promise.all([router.route(forward), router.route(forward)]);
            return;
          }
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
        const cams =
          recovery && SNAPSHOT_TEST_ADS_URL && SNAPSHOT_TEST_ADS_KEY
            ? downloadCamsMonth({
                apiUrl: SNAPSHOT_TEST_ADS_URL,
                apiKey: SNAPSHOT_TEST_ADS_KEY,
                sourcesDir: SNAPSHOT_TEST_SOURCES_DIR,
                pollutant: 'pm25',
                month: '2026-11-01',
                pollIntervalMs: 25,
                signal,
                requestScope: routingScope,
                recordAttempt: recordCamsAttempt,
              })
            : Promise.resolve();
        await Promise.all([route, routing(), cams]);
        return { sourceDates: {} };
      },
    },
  ],
}).catch((error: unknown) => {
  if (!(error instanceof WorkerError) || error.code !== 'snapshot_stopping') throw error;
  process.exitCode = 1;
});
