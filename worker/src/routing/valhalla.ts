import { z } from 'zod';

import { WorkerError } from '../lib/errors.ts';

export type LngLat = { lng: number; lat: number };

export type Leg = { seconds: number; meters: number };

type Costing = 'pedestrian' | 'auto';

type MatrixRequest = {
  costing: Costing;
  sources: readonly LngLat[];
  targets: readonly LngLat[];
  walkSpeedKmh?: number;
};

type IsochroneRequest = {
  origin: LngLat;
  minutes: readonly number[];
  walkSpeedKmh: number;
};

type IsochroneFeature = {
  minutes: number;
  geometry: { type: string; coordinates: unknown };
};

type RouteRequest = {
  origin: LngLat;
  destination: LngLat;
  signal?: AbortSignal;
} & ({ costing?: 'pedestrian'; walkSpeedKmh: number } | { costing: 'auto'; walkSpeedKmh?: never });

type Route = Leg & { polyline6: string };

export type ValhallaClient = {
  matrix: (request: MatrixRequest) => Promise<(Leg | null)[][]>;
  isochrones: (request: IsochroneRequest) => Promise<IsochroneFeature[]>;
  route: (request: RouteRequest) => Promise<Route | null>;
  tilesetDate: () => Promise<string | null>;
};

type Fetch = typeof fetch;
type ResponseReader = (status: number, json: unknown) => unknown;
type CheckpointFetch = (
  url: string,
  init: RequestInit,
  validate: ResponseReader,
) => Promise<Response>;

const NO_ROUTE_ERROR_CODES = new Set([171, 442, 443]);

const matrixCellSchema = z.object({
  distance: z.number().nullish(),
  time: z.number().nullish(),
});

const matrixResponseSchema = z.object({
  sources_to_targets: z.array(z.array(matrixCellSchema)),
});

const isochroneResponseSchema = z.object({
  features: z.array(
    z.object({
      properties: z.looseObject({ contour: z.number() }),
      geometry: z.object({ type: z.string(), coordinates: z.unknown() }),
    }),
  ),
});

const routeResponseSchema = z.object({
  trip: z.object({
    summary: z.object({ length: z.number(), time: z.number() }),
    legs: z.array(z.object({ shape: z.string() })),
  }),
});

const errorResponseSchema = z.object({ error_code: z.number() });

const statusResponseSchema = z.object({ tileset_last_modified: z.number().optional() });

function location(point: LngLat) {
  return { lat: point.lat, lon: point.lng };
}

function costingOptions(costing: Costing, walkSpeedKmh: number | undefined) {
  if (costing !== 'pedestrian' || walkSpeedKmh === undefined) return {};
  return { pedestrian: { walking_speed: walkSpeedKmh } };
}

export function legFromMatrixCell(cell: z.infer<typeof matrixCellSchema>): Leg | null {
  if (cell.time == null || cell.distance == null) return null;
  return { seconds: Math.round(cell.time), meters: Math.round(cell.distance * 1000) };
}

export function chunkTargets<T>(targets: readonly T[], sources: number, maxPairs: number): T[][] {
  const size = Math.max(1, Math.floor(maxPairs / Math.max(1, sources)));
  const chunks: T[][] = [];
  for (let start = 0; start < targets.length; start += size) {
    chunks.push(targets.slice(start, start + size));
  }
  return chunks;
}

export function createValhallaClient(
  baseUrl: string,
  options: { fetch?: Fetch; checkpointFetch?: CheckpointFetch; maxMatrixPairs?: number } = {},
): ValhallaClient {
  const request = options.fetch ?? fetch;
  const maxPairs = options.maxMatrixPairs ?? 2500;
  const root = baseUrl.replace(/\/+$/, '');

  async function call<T>(
    path: string,
    read: (status: number, json: unknown) => T,
    body: unknown,
    signal?: AbortSignal,
  ): Promise<T> {
    let response: Response;
    try {
      const init =
        body === undefined
          ? {}
          : {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify(body),
              signal,
            };
      response = options.checkpointFetch
        ? await options.checkpointFetch(`${root}${path}`, init, read)
        : await request(`${root}${path}`, init);
    } catch (error) {
      if (options.checkpointFetch && error instanceof WorkerError) throw error;
      throw new WorkerError('walk_routing_unreachable', `Routing service unreachable on ${path}`, {
        cause: error,
      });
    }
    const json: unknown = await response.json().catch(() => null);
    return read(response.status, json);
  }

  function isNoRoute(status: number, json: unknown): boolean {
    if (status < 400 || status >= 500) return false;
    const parsed = errorResponseSchema.safeParse(json);
    return parsed.success && NO_ROUTE_ERROR_CODES.has(parsed.data.error_code);
  }

  function failed(path: string, status: number): WorkerError {
    return new WorkerError('walk_routing_failed', `Routing service answered ${status} on ${path}`);
  }

  async function matrixChunk(
    costing: Costing,
    sources: readonly LngLat[],
    targets: readonly LngLat[],
    walkSpeedKmh: number | undefined,
  ): Promise<(Leg | null)[][]> {
    const path = '/sources_to_targets';
    return call(
      path,
      (status, json) => {
        if (isNoRoute(status, json)) return sources.map(() => targets.map(() => null));
        if (status !== 200) throw failed(path, status);
        const parsed = matrixResponseSchema.safeParse(json);
        if (!parsed.success || parsed.data.sources_to_targets.length !== sources.length) {
          throw new WorkerError('walk_routing_invalid', 'Unexpected matrix response');
        }
        return parsed.data.sources_to_targets.map((row) => {
          if (row.length !== targets.length) {
            throw new WorkerError('walk_routing_invalid', 'Unexpected matrix row length');
          }
          return row.map(legFromMatrixCell);
        });
      },
      {
        sources: sources.map(location),
        targets: targets.map(location),
        costing,
        costing_options: costingOptions(costing, walkSpeedKmh),
        units: 'kilometers',
        verbose: true,
      },
    );
  }

  return {
    async matrix({ costing, sources, targets, walkSpeedKmh }) {
      if (sources.length === 0) return [];
      if (targets.length === 0) return sources.map(() => []);
      const rows: (Leg | null)[][] = sources.map(() => []);
      for (const chunk of chunkTargets(targets, sources.length, maxPairs)) {
        const part = await matrixChunk(costing, sources, chunk, walkSpeedKmh);
        part.forEach((row, index) => rows[index]?.push(...row));
      }
      return rows;
    },

    isochrones({ origin, minutes, walkSpeedKmh }) {
      const path = '/isochrone';
      return call(
        path,
        (status, json) => {
          if (isNoRoute(status, json)) return [];
          if (status !== 200) throw failed(path, status);
          const parsed = isochroneResponseSchema.safeParse(json);
          if (!parsed.success)
            throw new WorkerError('walk_routing_invalid', 'Unexpected isochrone');
          return parsed.data.features
            .map((feature) => ({ minutes: feature.properties.contour, geometry: feature.geometry }))
            .sort((a, b) => a.minutes - b.minutes);
        },
        {
          locations: [location(origin)],
          costing: 'pedestrian',
          costing_options: costingOptions('pedestrian', walkSpeedKmh),
          contours: minutes.map((time) => ({ time })),
          polygons: true,
        },
      );
    },

    route({ origin, destination, costing = 'pedestrian', walkSpeedKmh, signal }) {
      const path = '/route';
      return call(
        path,
        (status, json) => {
          if (isNoRoute(status, json)) return null;
          if (status !== 200) throw failed(path, status);
          const parsed = routeResponseSchema.safeParse(json);
          if (!parsed.success) throw new WorkerError('walk_routing_invalid', 'Unexpected route');
          const { summary, legs } = parsed.data.trip;
          const [leg] = legs;
          if (!leg) throw new WorkerError('walk_routing_invalid', 'Route without legs');
          if (costing === 'auto' && legs.length !== 1) {
            throw new WorkerError('car_routing_invalid', 'Unexpected number of driving legs');
          }
          return {
            seconds: Math.round(summary.time),
            meters: Math.round(summary.length * 1000),
            polyline6: leg.shape,
          };
        },
        {
          locations: [location(origin), location(destination)],
          costing,
          costing_options: costingOptions(costing, walkSpeedKmh),
          units: 'kilometers',
          directions_type: 'none',
        },
        signal,
      );
    },

    tilesetDate() {
      return call(
        '/status',
        (status, json) => {
          if (status < 200 || status >= 300) throw failed('/status', status);
          const parsed = statusResponseSchema.safeParse(json);
          if (options.checkpointFetch && (!parsed.success || status !== 200)) {
            throw new WorkerError('walk_routing_invalid', 'Unexpected tileset status');
          }
          const seconds = parsed.success ? parsed.data.tileset_last_modified : undefined;
          return seconds === undefined ? null : new Date(seconds * 1000).toISOString().slice(0, 10);
        },
        undefined,
      );
    },
  };
}
