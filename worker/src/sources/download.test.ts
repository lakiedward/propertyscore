import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { downloadOsmExtract } from './osm.ts';

describe('downloadOsmExtract', () => {
  let server: Server;
  let baseUrl: string;
  let requests = 0;
  let sourcesDir: string;

  beforeAll(async () => {
    sourcesDir = await mkdtemp(join(tmpdir(), 'sources-test-'));
    server = createServer((request, response) => {
      requests += 1;
      if (request.url === '/romania.osm.pbf') {
        response.writeHead(200, { 'content-type': 'application/octet-stream' });
        response.end('pbf-bytes');
        return;
      }
      response.writeHead(404);
      response.end();
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (address === null || typeof address === 'string') throw new Error('server has no port');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(sourcesDir, { recursive: true, force: true });
  });

  it('stores the extract once per month and reuses it', async () => {
    const first = await downloadOsmExtract(`${baseUrl}/romania.osm.pbf`, sourcesDir, '2026-11-01');
    const second = await downloadOsmExtract(`${baseUrl}/romania.osm.pbf`, sourcesDir, '2026-11-01');

    expect(first).toBe(join(sourcesDir, 'osm', 'romania-2026-11.osm.pbf'));
    expect(second).toBe(first);
    expect(await readFile(first, 'utf8')).toBe('pbf-bytes');
    expect(requests).toBe(1);
  });

  it('fails with a code and leaves no partial file when the source is missing', async () => {
    await expect(
      downloadOsmExtract(`${baseUrl}/missing.osm.pbf`, sourcesDir, '2026-12-01'),
    ).rejects.toMatchObject({ code: 'source_download_failed' });
    await expect(stat(join(sourcesDir, 'osm', 'romania-2026-12.osm.pbf.part'))).rejects.toThrow();
  });
});
