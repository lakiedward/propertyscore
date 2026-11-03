import { z } from 'zod';

import { WorkerError } from '../lib/errors.ts';

const envSchema = z.object({
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  SOURCES_DIR: z.string().min(1).default('/tmp/propertyscore-sources'),
  OSM_EXTRACT_URL: z
    .url({ protocol: /^https$/ })
    .default('https://download.geofabrik.de/europe/romania-latest.osm.pbf'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

export function readEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new WorkerError('invalid_environment', `Invalid worker environment: ${fields}`);
  }
  return parsed.data;
}
