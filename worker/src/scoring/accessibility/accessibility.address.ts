import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { Sql } from '../../db/sql.ts';
import { errorCode } from '../../lib/errors.ts';
import type { Logger } from '../../lib/logger.ts';
import { readRoutingBundle } from './accessibility.db.ts';
import type { AccessibilityParams } from './accessibility.params.ts';
import { exportEducationPlaces, type EducationPlace } from './education-places.ts';
import { exportNeighbourhoodPlaces, type NeighbourhoodPlace } from './osm-transit.ts';
import {
  routingSettings,
  runTransitRouting,
  type DestinationTiming,
  type Itinerary,
  type RoutingRunner,
} from './routing.ts';
import type { LngLat } from './transit.types.ts';

const ADDRESS_ID = 'address';
const EDUCATION_PLACES_PER_KIND = 40;

export type AddressTripsInput = {
  sql: Sql;
  logger: Logger;
  snapshotId: string;
  cityId: string;
  address: LngLat;
  destinations: readonly (LngLat & { id: string })[];
  params: AccessibilityParams;
  runner?: RoutingRunner;
  education?: (osmPbf: string, workDir: string) => Promise<EducationPlace[]>;
};

export type AddressNetwork = {
  trips: Map<string, Itinerary>;
  timings: Map<string, DestinationTiming>;
  places: NeighbourhoodPlace[];
  education: EducationPlace[];
};

type PlannedTrips = Pick<AddressNetwork, 'trips' | 'timings'>;

const NO_TRIPS: PlannedTrips = { trips: new Map(), timings: new Map() };

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

async function readEducation(input: AddressTripsInput, osmPbf: string, workDir: string) {
  try {
    return input.education
      ? await input.education(osmPbf, workDir)
      : await exportEducationPlaces({
          osmPbf,
          workDir,
          origin: input.address,
          limitPerKind: EDUCATION_PLACES_PER_KIND,
        });
  } catch (error) {
    input.logger.warn('education places unavailable', {
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
  destinations: readonly (LngLat & { id: string })[],
): Promise<PlannedTrips> {
  if (destinations.length === 0) return NO_TRIPS;
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
        destinations: destinations.map(({ id, lng, lat }) => ({ id, lng, lat })),
        withMatrix: false,
        withItineraries: true,
        workDir,
      },
      input.runner,
    );
    return {
      trips: routing.itineraries.get(ADDRESS_ID) ?? new Map<string, Itinerary>(),
      timings: routing.destinations.get(ADDRESS_ID) ?? new Map<string, DestinationTiming>(),
    };
  } catch (error) {
    input.logger.warn('address trips unavailable', {
      snapshot_id: input.snapshotId,
      code: errorCode(error),
    });
    return NO_TRIPS;
  }
}

export async function routeFromAddress(input: AddressTripsInput): Promise<AddressNetwork> {
  const bundle = await readRoutingBundle(input.sql, input.snapshotId, input.cityId);
  if (!bundle) return { ...NO_TRIPS, places: [], education: [] };
  const workDir = await mkdtemp(join(tmpdir(), 'address-trips-'));
  try {
    const osmPbf = join(workDir, 'network.osm.pbf');
    await writeFile(osmPbf, bundle.osmPbf);
    const places = await readPlaces(input, osmPbf, workDir);
    const education = await readEducation(input, osmPbf, workDir);
    const planned = await planTrips(input, bundle, osmPbf, workDir, [
      ...input.destinations,
      ...education,
    ]);
    return { ...planned, places, education };
  } catch (error) {
    input.logger.warn('address network unavailable', {
      snapshot_id: input.snapshotId,
      code: errorCode(error),
    });
    return { ...NO_TRIPS, places: [], education: [] };
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
