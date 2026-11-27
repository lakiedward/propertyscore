import { createHash, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';

import { z } from 'zod';

import type { Sql } from '../db/sql.ts';
import { inspectSnapshotRuntime, type SnapshotRuntimeReaders } from './snapshot-runtime.ts';

type Options = {
  sql: Sql;
  token: string;
  readers: SnapshotRuntimeReaders;
};

function digest(value: string) {
  return createHash('sha256').update(value).digest();
}

export function createSnapshotStatusServer(options: Options) {
  const credential = digest(`Bearer ${z.string().min(32).parse(options.token)}`);
  return createServer((request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Type', 'application/json');
    const reply = (statusCode: number, body: unknown) => {
      response.statusCode = statusCode;
      response.end(JSON.stringify(body));
    };
    if (!timingSafeEqual(credential, digest(request.headers.authorization ?? ''))) {
      reply(401, { code: 'unauthorized' });
      return;
    }
    if (request.method !== 'GET') {
      response.setHeader('Allow', 'GET');
      reply(405, { code: 'method_not_allowed' });
      return;
    }
    const match = /^\/runs\/([a-f0-9-]+)$/i.exec(request.url ?? '');
    const id = z.uuid().safeParse(match?.[1]?.toLowerCase());
    if (!id.success) {
      reply(404, { code: 'not_found' });
      return;
    }
    void inspectSnapshotRuntime(
      options.sql,
      id.data,
      options.readers,
      AbortSignal.timeout(10_000),
    ).then(
      (result) => {
        if (result) reply(200, result);
        else reply(404, { code: 'snapshot_not_found' });
      },
      () => reply(503, { code: 'snapshot_evidence_unavailable' }),
    );
  });
}
