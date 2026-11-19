import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { Sql } from '../../db/sql.ts';
import { errorCode } from '../../lib/errors.ts';
import type { Logger } from '../../lib/logger.ts';
import { readRoutingBundle } from './accessibility.db.ts';
import type { AccessibilityParams } from './accessibility.params.ts';
import { exportNeighbourhoodPlaces, type NeighbourhoodPlace } from './osm-transit.ts';
import {
  routingSettings,
  runTransitRouting,
  type Itinerary,
  type RoutingRunner,
} from './routing.ts';
import type { LngLat } from './transit.types.ts';

const ADDRESS_ID = 'address';

export type AddressTripsInput = {
  sql: Sql;
  logger: Logger;
  snapshotId: string;
  cityId: string;
  address: LngLat;
  destinations: readonly (LngLat & { id: string })[];
  params: AccessibilityParams;
  runner?: RoutingRunner;
};

export type AddressNetwork = {
  trips: Map<string, Itinerary>;
  places: NeighbourhoodPlace[];
};

async function readPlaces(input: AddressTripsInput, osmPbf: string, workDir: string) {
  try {
    return await exportNeighbourhoodPlaces(osmPbf, workDir);
  } catch (error) {
    input.logger.warn('neighbourhood places unavailable', {
      snapshot_id: input.snapshotId,
      code: errorCode(error),
    });
    return [];
  }
}

async function planTrips(
  input: AddressTripsInput,
  bundle: { referenceDate: string; gtfsArchives: Buffer[] },
  osmPbf: string,
  workDir: string,
): Promise<Map<string, Itinerary>> {
  if (input.destinations.length === 0) return new Map();
  try {
    const gtfs = await Promise.all(
      bundle.gtfsArchives.map(async (archive, index) => {
        const path = join(workDir, `feed-${String(index)}.zip`);
        await writeFile(path, archive);
        return path;
      }),
    );
    const routing = await runTransitRouting(
      {
        osmPbf,
        gtfs,
        date: bundle.referenceDate,
        ...routingSettings(input.params),
        origins: [{ id: ADDRESS_ID, ...input.address }],
        stops: [],
        destinations: input.destinations.map(({ id, lng, lat }) => ({ id, lng, lat })),
        withMatrix: false,
        withItineraries: true,
        workDir,
      },
      input.runner,
    );
    return routing.itineraries.get(ADDRESS_ID) ?? new Map();
  } catch (error) {
    input.logger.warn('address trips unavailable', {
      snapshot_id: input.snapshotId,
      code: errorCode(error),
    });
    return new Map();
  }
}

export async function routeFromAddress(input: AddressTripsInput): Promise<AddressNetwork> {
  const bundle = await readRoutingBundle(input.sql, input.snapshotId, input.cityId);
  if (!bundle) return { trips: new Map(), places: [] };
  const workDir = await mkdtemp(join(tmpdir(), 'address-trips-'));
  try {
    const osmPbf = join(workDir, 'network.osm.pbf');
    await writeFile(osmPbf, bundle.osmPbf);
    const places = await readPlaces(input, osmPbf, workDir);
    const trips = await planTrips(input, bundle, osmPbf, workDir);
    return { trips, places };
  } catch (error) {
    input.logger.warn('address network unavailable', {
      snapshot_id: input.snapshotId,
      code: errorCode(error),
    });
    return { trips: new Map(), places: [] };
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
