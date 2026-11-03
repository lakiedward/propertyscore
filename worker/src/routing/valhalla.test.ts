import { describe, expect, it } from 'vitest';

import { WorkerError } from '../lib/errors.ts';
import { chunkTargets, createValhallaClient, legFromMatrixCell } from './valhalla.ts';

type Call = { url: string; body: Record<string, unknown> | null };

function fakeFetch(answer: (call: Call) => { status: number; json: unknown }) {
  const calls: Call[] = [];
  const fetcher = ((input: string | URL | Request, init?: RequestInit) => {
    const body =
      typeof init?.body === 'string' ? (JSON.parse(init.body) as Record<string, unknown>) : null;
    const call = { url: input instanceof Request ? input.url : input.toString(), body };
    calls.push(call);
    const { status, json } = answer(call);
    return Promise.resolve(new Response(JSON.stringify(json), { status }));
  }) as typeof fetch;
  return { fetcher, calls };
}

const origin = { lng: 21.2272, lat: 45.7489 };
const destination = { lng: 21.23, lat: 45.75 };
const targets = [destination, { lng: 21.24, lat: 45.76 }, { lng: 21.25, lat: 45.77 }];

describe('legFromMatrixCell', () => {
  it('converts kilometres to metres and keeps unreachable targets empty', () => {
    expect(legFromMatrixCell({ distance: 0.264, time: 211.6 })).toEqual({
      seconds: 212,
      meters: 264,
    });
    expect(legFromMatrixCell({ distance: null, time: null })).toBeNull();
  });
});

describe('chunkTargets', () => {
  it('keeps each request under the pair limit', () => {
    expect(chunkTargets([1, 2, 3, 4, 5], 2, 4)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunkTargets([1, 2], 10, 4)).toEqual([[1], [2]]);
  });
});

describe('createValhallaClient', () => {
  it('asks for a pedestrian matrix at the walking speed and joins the chunks', async () => {
    const { fetcher, calls } = fakeFetch((call) => {
      const count = (call.body?.targets as unknown[]).length;
      return {
        status: 200,
        json: {
          sources_to_targets: [
            Array.from({ length: count }, (_, index) =>
              index === 0 ? { distance: 0.5, time: 400 } : { distance: null, time: null },
            ),
          ],
        },
      };
    });
    const client = createValhallaClient('http://valhalla:8002/', {
      fetch: fetcher,
      maxMatrixPairs: 2,
    });

    const rows = await client.matrix({
      costing: 'pedestrian',
      sources: [origin],
      targets,
      walkSpeedKmh: 4.5,
    });

    expect(rows).toEqual([[{ seconds: 400, meters: 500 }, null, { seconds: 400, meters: 500 }]]);
    expect(calls).toHaveLength(2);
    expect(calls[0]?.url).toBe('http://valhalla:8002/sources_to_targets');
    expect(calls[0]?.body).toMatchObject({
      costing: 'pedestrian',
      costing_options: { pedestrian: { walking_speed: 4.5 } },
      sources: [{ lat: 45.7489, lon: 21.2272 }],
    });
  });

  it('sends no walking speed for car routing', async () => {
    const { fetcher, calls } = fakeFetch(() => ({
      status: 200,
      json: { sources_to_targets: [[{ distance: 3, time: 300 }]] },
    }));
    const client = createValhallaClient('http://valhalla:8002', { fetch: fetcher });
    await client.matrix({
      costing: 'auto',
      sources: [origin],
      targets: [destination],
      walkSpeedKmh: 4.5,
    });
    expect(calls[0]?.body).toMatchObject({ costing: 'auto', costing_options: {} });
  });

  it('answers an empty matrix without calling the service', async () => {
    const { fetcher, calls } = fakeFetch(() => ({ status: 500, json: {} }));
    const client = createValhallaClient('http://valhalla:8002', { fetch: fetcher });
    expect(await client.matrix({ costing: 'pedestrian', sources: [origin], targets: [] })).toEqual([
      [],
    ]);
    expect(calls).toHaveLength(0);
  });

  it('treats a no-route answer as unreachable and other errors as failures', async () => {
    const noRoute = createValhallaClient('http://valhalla:8002', {
      fetch: fakeFetch(() => ({ status: 400, json: { error_code: 442 } })).fetcher,
    });
    expect(await noRoute.matrix({ costing: 'pedestrian', sources: [origin], targets })).toEqual([
      [null, null, null],
    ]);
    expect(await noRoute.route({ origin, destination: destination, walkSpeedKmh: 4.5 })).toBeNull();

    const broken = createValhallaClient('http://valhalla:8002', {
      fetch: fakeFetch(() => ({ status: 503, json: {} })).fetcher,
    });
    await expect(
      broken.matrix({ costing: 'pedestrian', sources: [origin], targets }),
    ).rejects.toMatchObject({
      code: 'walk_routing_failed',
    });
  });

  it('reports an unreachable service with its own code', async () => {
    const client = createValhallaClient('http://valhalla:8002', {
      fetch: () => Promise.reject(new TypeError('fetch failed')),
    });
    const failure = client.isochrones({ origin, minutes: [5], walkSpeedKmh: 4.5 });
    await expect(failure).rejects.toBeInstanceOf(WorkerError);
    await expect(failure).rejects.toMatchObject({ code: 'walk_routing_unreachable' });
  });

  it('returns isochrones from the smallest contour up', async () => {
    const polygon = { type: 'Polygon', coordinates: [] };
    const { fetcher, calls } = fakeFetch(() => ({
      status: 200,
      json: {
        type: 'FeatureCollection',
        features: [
          { properties: { contour: 15 }, geometry: polygon },
          { properties: { contour: 5 }, geometry: polygon },
        ],
      },
    }));
    const client = createValhallaClient('http://valhalla:8002', { fetch: fetcher });
    const isochrones = await client.isochrones({ origin, minutes: [5, 15], walkSpeedKmh: 4.5 });
    expect(isochrones.map((isochrone) => isochrone.minutes)).toEqual([5, 15]);
    expect(calls[0]?.body).toMatchObject({ contours: [{ time: 5 }, { time: 15 }], polygons: true });
  });

  it('returns the route length, time and shape', async () => {
    const client = createValhallaClient('http://valhalla:8002', {
      fetch: fakeFetch(() => ({
        status: 200,
        json: { trip: { summary: { length: 0.26, time: 208 }, legs: [{ shape: 'abc' }] } },
      })).fetcher,
    });
    expect(await client.route({ origin, destination: destination, walkSpeedKmh: 4.5 })).toEqual({
      seconds: 208,
      meters: 260,
      polyline6: 'abc',
    });
  });

  it('reads the routing graph date from the status', async () => {
    const client = createValhallaClient('http://valhalla:8002', {
      fetch: fakeFetch(() => ({ status: 200, json: { tileset_last_modified: 1761955200 } }))
        .fetcher,
    });
    expect(await client.tilesetDate()).toBe('2025-11-01');
  });
});
