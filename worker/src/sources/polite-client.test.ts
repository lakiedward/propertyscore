import { describe, expect, it } from 'vitest';

import { createPoliteClient } from './polite-client.ts';

type Call = { url: string; userAgent: string | null; redirect: string | undefined };

function harness(respond: (path: string, attempt: number) => Response) {
  const calls: Call[] = [];
  const waits: number[] = [];
  const attempts = new Map<string, number>();
  let clock = 0;
  const client = createPoliteClient({
    origin: 'https://stats.example.test',
    userAgent: 'PropertyScore/1.0 (+https://propertyscore.example.test)',
    productToken: 'PropertyScore',
    allowedPaths: [/^\/statistici\/[a-z-]+$/],
    minIntervalMs: 2000,
    now: () => clock,
    wait: (milliseconds) => {
      waits.push(milliseconds);
      clock += milliseconds;
      return Promise.resolve();
    },
    fetch: (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const path = new URL(url).pathname;
      const attempt = (attempts.get(path) ?? 0) + 1;
      attempts.set(path, attempt);
      calls.push({
        url,
        userAgent: new Headers(init?.headers).get('user-agent'),
        redirect: init?.redirect,
      });
      clock += 100;
      return Promise.resolve(respond(path, attempt));
    },
  });
  return { client, calls, waits };
}

const ROBOTS = 'User-agent: *\nAllow: /\nDisallow: /statistici/secret\n';

describe('createPoliteClient', () => {
  it('reads robots.txt once, names itself and never follows a redirect', async () => {
    const { client, calls } = harness((path) =>
      path === '/robots.txt' ? new Response(ROBOTS) : new Response('<p>ok</p>'),
    );
    expect(await client.get('/statistici/oras')).toEqual({ status: 'ok', body: '<p>ok</p>' });
    await client.get('/statistici/zona');
    expect(calls.map((call) => new URL(call.url).pathname)).toEqual([
      '/robots.txt',
      '/statistici/oras',
      '/statistici/zona',
    ]);
    expect(calls.every((call) => call.userAgent?.startsWith('PropertyScore/1.0 (+'))).toBe(true);
    expect(calls.every((call) => call.redirect === 'manual')).toBe(true);
    expect(client.requestCount()).toBe(3);
  });

  it('sends one request at a time, at least the interval apart', async () => {
    const { client, waits } = harness((path) =>
      path === '/robots.txt' ? new Response(ROBOTS) : new Response('ok'),
    );
    await Promise.all([client.get('/statistici/a'), client.get('/statistici/b')]);
    expect(waits).toEqual([2000, 2000]);
  });

  it('refuses a path outside the agreed pages without a request', async () => {
    const { client, calls } = harness(() => new Response('ok'));
    await expect(client.get('/anunt/1')).rejects.toMatchObject({ code: 'source_path_not_allowed' });
    expect(calls).toHaveLength(0);
  });

  it('refuses a path robots.txt disallows', async () => {
    const { client, calls } = harness((path) =>
      path === '/robots.txt' ? new Response(ROBOTS) : new Response('ok'),
    );
    await expect(client.get('/statistici/secret')).rejects.toMatchObject({
      code: 'source_disallowed_by_robots',
    });
    expect(calls).toHaveLength(1);
  });

  it('reports a redirect and a missing page instead of following or failing', async () => {
    const { client } = harness((path) => {
      if (path === '/robots.txt') return new Response('', { status: 404 });
      if (path === '/statistici/mutat') {
        return new Response(null, { status: 302, headers: { location: '/statistici/oras' } });
      }
      return new Response('', { status: 404 });
    });
    expect(await client.get('/statistici/mutat')).toEqual({
      status: 'redirect',
      location: '/statistici/oras',
    });
    expect(await client.get('/statistici/lipsa')).toEqual({ status: 'missing' });
  });

  it('retries a busy server with a longer pause, then gives up', async () => {
    const { client, waits } = harness((path, attempt) => {
      if (path === '/robots.txt') return new Response(ROBOTS);
      if (path === '/statistici/ocupat' && attempt < 3) return new Response('', { status: 503 });
      if (path === '/statistici/cazut') return new Response('', { status: 500 });
      return new Response('ok');
    });
    expect(await client.get('/statistici/ocupat')).toEqual({ status: 'ok', body: 'ok' });
    expect(waits).toEqual([2000, 4000, 8000]);
    await expect(client.get('/statistici/cazut')).rejects.toMatchObject({
      code: 'source_download_failed',
    });
  });
});
