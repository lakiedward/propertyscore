import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { downloadOnce } from './download.ts';

describe('downloadOnce', () => {
  let server: Server;
  let baseUrl: string;
  let sourcesDir: string;
  let requests = 0;
  let failuresLeft = 0;

  beforeAll(async () => {
    sourcesDir = await mkdtemp(join(tmpdir(), 'download-once-test-'));
    server = createServer((request, response) => {
      requests += 1;
      if (request.url === '/missing') {
        response.writeHead(404);
        response.end();
        return;
      }
      if (failuresLeft > 0) {
        failuresLeft -= 1;
        response.writeHead(503);
        response.end();
        return;
      }
      response.writeHead(200, { 'content-type': 'application/octet-stream' });
      response.end('source-bytes');
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (address === null || typeof address === 'string') throw new Error('server has no port');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  beforeEach(() => {
    requests = 0;
    failuresLeft = 0;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(sourcesDir, { recursive: true, force: true });
  });

  it('retries a source that answers 503 and keeps the file once it arrives', async () => {
    failuresLeft = 2;
    const path = await downloadOnce(`${baseUrl}/flaky`, join(sourcesDir, 'flaky.bin'), {
      backoffMs: 1,
    });

    expect(await readFile(path, 'utf8')).toBe('source-bytes');
    expect(requests).toBe(3);
  });

  it('gives up after the last attempt with the download code', async () => {
    failuresLeft = 10;
    await expect(
      downloadOnce(`${baseUrl}/down`, join(sourcesDir, 'down.bin'), { attempts: 3, backoffMs: 1 }),
    ).rejects.toMatchObject({ code: 'source_download_failed' });
    expect(requests).toBe(3);
  });

  it('does not retry a source that does not exist', async () => {
    await expect(
      downloadOnce(`${baseUrl}/missing`, join(sourcesDir, 'missing.bin'), { backoffMs: 1 }),
    ).rejects.toMatchObject({ code: 'source_download_failed' });
    expect(requests).toBe(1);
  });
});
