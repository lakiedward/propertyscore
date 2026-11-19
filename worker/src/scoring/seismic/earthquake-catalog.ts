import { WorkerError } from '../../lib/errors.ts';
import {
  EARTHQUAKE_QUERY,
  parseEmscEvents,
  parseUsgsEvents,
  type CatalogueEvent,
} from './earthquakes.ts';

const USGS_QUERY_URL = 'https://earthquake.usgs.gov/fdsnws/event/1/query';
const EMSC_QUERY_URL = 'https://www.seismicportal.eu/fdsnws/event/1/query';
const RESPONSE_TIMEOUT_MS = 30_000;
const KM_PER_DEGREE = 111.195;
const QUERY_MARGIN_KM = 5;
const USER_AGENT = 'PropertyScore/1.0 (+https://propertyscore.ro)';

type Fetch = typeof fetch;

type EarthquakeQuery = { longitude: number; latitude: number };

type CatalogueKey = CatalogueEvent['catalogue'];

export type EarthquakeCatalog = {
  near: (query: EarthquakeQuery) => Promise<{
    usgs: CatalogueEvent[];
    emsc: CatalogueEvent[];
    failed: { catalogue: CatalogueKey; error: unknown }[];
  }>;
};

const COORDINATE_DECIMALS = 3;

function coordinate(value: number): string {
  return value.toFixed(COORDINATE_DECIMALS);
}

function usgsUrl({ longitude, latitude }: EarthquakeQuery): string {
  const params = new URLSearchParams({
    format: 'geojson',
    latitude: coordinate(latitude),
    longitude: coordinate(longitude),
    maxradiuskm: String(EARTHQUAKE_QUERY.radiusKm + QUERY_MARGIN_KM),
    minmagnitude: String(EARTHQUAKE_QUERY.minMagnitude),
    starttime: `${String(EARTHQUAKE_QUERY.startYear)}-01-01`,
    eventtype: 'earthquake',
    orderby: 'time-asc',
  });
  return `${USGS_QUERY_URL}?${params.toString()}`;
}

function emscUrl({ longitude, latitude }: EarthquakeQuery): string {
  const params = new URLSearchParams({
    format: 'json',
    lat: coordinate(latitude),
    lon: coordinate(longitude),
    maxradius: ((EARTHQUAKE_QUERY.radiusKm + QUERY_MARGIN_KM) / KM_PER_DEGREE).toFixed(3),
    minmag: String(EARTHQUAKE_QUERY.minMagnitude),
    start: `${String(EARTHQUAKE_QUERY.startYear)}-01-01`,
    limit: '5000',
    orderby: 'time-asc',
  });
  return `${EMSC_QUERY_URL}?${params.toString()}`;
}

async function readJson(
  fetchImpl: Fetch,
  url: string,
  emptyStatus: number | null,
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, RESPONSE_TIMEOUT_MS);
  try {
    const response = await fetchImpl(url, {
      headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
      signal: controller.signal,
    });
    if (emptyStatus !== null && response.status === emptyStatus) {
      await response.body?.cancel();
      return { features: [] };
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new WorkerError(
        'earthquake_catalogue_failed',
        `Earthquake catalogue answered ${String(response.status)}: ${new URL(url).host}`,
      );
    }
    return await response.json();
  } catch (error) {
    if (error instanceof WorkerError) throw error;
    throw new WorkerError(
      'earthquake_catalogue_failed',
      `Earthquake catalogue unreachable: ${new URL(url).host}`,
      { cause: error },
    );
  } finally {
    clearTimeout(timer);
  }
}

export function createEarthquakeCatalog(fetchImpl: Fetch = fetch): EarthquakeCatalog {
  return {
    near: async (query) => {
      const [usgs, emsc] = await Promise.allSettled([
        readJson(fetchImpl, usgsUrl(query), null).then(parseUsgsEvents),
        readJson(fetchImpl, emscUrl(query), 204).then(parseEmscEvents),
      ]);
      if (usgs.status === 'rejected' && emsc.status === 'rejected') throw usgs.reason;
      const failed = [
        ...(usgs.status === 'rejected'
          ? [{ catalogue: 'usgs' as const, error: usgs.reason as unknown }]
          : []),
        ...(emsc.status === 'rejected'
          ? [{ catalogue: 'emsc' as const, error: emsc.reason as unknown }]
          : []),
      ];
      return {
        usgs: usgs.status === 'fulfilled' ? usgs.value : [],
        emsc: emsc.status === 'fulfilled' ? emsc.value : [],
        failed,
      };
    },
  };
}
