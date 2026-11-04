import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { Sql } from '../../db/sql.ts';
import { errorCode } from '../../lib/errors.ts';
import type { Logger } from '../../lib/logger.ts';
import { readRoutingBundle } from './accessibility.db.ts';
import type { AccessibilityParams } from './accessibility.params.ts';
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

export async function planTripsFromAddress(
  input: AddressTripsInput,
): Promise<Map<string, Itinerary>> {
  if (input.destinations.length === 0) return new Map();
  const bundle = await readRoutingBundle(input.sql, input.snapshotId, input.cityId);
  if (!bundle) return new Map();
  const workDir = await mkdtemp(join(tmpdir(), 'address-trips-'));
  try {
    const osmPbf = join(workDir, 'network.osm.pbf');
    await writeFile(osmPbf, bundle.osmPbf);
    const gtfs = await Promise.all(
      bundle.gtfsArchives.map(async (archive, index) => {
        const path = join(workDir, `feed-${index}.zip`);
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
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
