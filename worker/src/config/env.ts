import { z } from 'zod';

import { WorkerError } from '../lib/errors.ts';

const envSchema = z
  .object({
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    SOURCES_DIR: z.string().min(1).default('/tmp/propertyscore-sources'),
    OSM_EXTRACT_URL: z
      .url({ protocol: /^https$/ })
      .default('https://download.geofabrik.de/europe/romania-latest.osm.pbf'),
    OSM_EXTRACT_API_KEY: z.string().min(1).optional(),
    SOURCE_MIRROR_URL: z.url({ protocol: /^https$/ }).optional(),
    VALHALLA_URL: z.url({ protocol: /^https?$/ }).optional(),
    VALHALLA_REGISTRY_URL: z.url({ protocol: /^https?$/ }).optional(),
    VALHALLA_REGISTRY_ROUTING_TOKEN: z.string().min(1).optional(),
    VALHALLA_REGISTRY_CONTROL_TOKEN: z.string().min(1).optional(),
    RAILWAY_DEPLOYMENT_ID: z.uuid().optional(),
    RAILWAY_REPLICA_ID: z.uuid().optional(),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    ADS_API_URL: z.url({ protocol: /^https$/ }).default('https://ads.atmosphere.copernicus.eu/api'),
    ADS_API_KEY: z.string().min(1).optional(),
    AIR_EEA_MAP_YEAR: z
      .string()
      .regex(/^\d{4}$/)
      .optional(),
    AIR_EEA_PM25_MAP_URL: z.url({ protocol: /^https$/ }).optional(),
    AIR_EEA_NO2_MAP_URL: z.url({ protocol: /^https$/ }).optional(),
    MARKET_SOURCE_CONTACT: z.email().optional(),
    CHROMIUM_PATH: z.string().min(1).optional(),
    SUPABASE_URL: z.url({ protocol: /^https?$/ }).optional(),
    SUPABASE_SECRET_KEY: z.string().min(1).optional(),
  })
  .refine((env) => !env.SOURCE_MIRROR_URL || env.OSM_EXTRACT_API_KEY, {
    path: ['OSM_EXTRACT_API_KEY'],
  });

const documentEnvSchema = z.object({
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  CHROMIUM_PATH: z.string().min(1).optional(),
});

const httpsOrLoopback = z.url({ protocol: /^https?$/ }).refine((endpoint) => {
  const url = new URL(endpoint);
  return url.protocol === 'https:' || ['127.0.0.1', '[::1]', 'localhost'].includes(url.hostname);
});

const snapshotStatusEnvSchema = z
  .object({
    SNAPSHOT_STATUS_DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    SNAPSHOT_STATUS_TOKEN: z.string().min(32),
    SNAPSHOT_STATUS_HOST: z.string().min(1).default('127.0.0.1'),
    SNAPSHOT_STATUS_PORT: z.coerce.number().int().min(1).max(65535).default(8080),
    SNAPSHOT_REPLICA_INSPECTOR_URL: z.url({ protocol: /^https?$/ }).optional(),
    SNAPSHOT_REPLICA_INSPECTOR_READ_TOKEN: z.string().min(1).optional(),
    VALHALLA_REGISTRY_URL: z.url({ protocol: /^https?$/ }).optional(),
    VALHALLA_REGISTRY_READ_TOKEN: z.string().min(1).optional(),
    ADS_API_URL: httpsOrLoopback.default('https://ads.atmosphere.copernicus.eu/api'),
    ADS_API_KEY: z.string().min(1).optional(),
  })
  .refine(
    (env) =>
      Boolean(env.SNAPSHOT_REPLICA_INSPECTOR_URL) ===
      Boolean(env.SNAPSHOT_REPLICA_INSPECTOR_READ_TOKEN),
    { path: ['SNAPSHOT_REPLICA_INSPECTOR_READ_TOKEN'] },
  )
  .refine(
    (env) => Boolean(env.VALHALLA_REGISTRY_URL) === Boolean(env.VALHALLA_REGISTRY_READ_TOKEN),
    { path: ['VALHALLA_REGISTRY_READ_TOKEN'] },
  );

export type Env = z.infer<typeof envSchema>;
export type DocumentEnv = z.infer<typeof documentEnvSchema>;

export function readEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new WorkerError('invalid_environment', `Invalid worker environment: ${fields}`);
  }
  return parsed.data;
}

export function readDocumentEnv(source: NodeJS.ProcessEnv = process.env): DocumentEnv {
  const parsed = documentEnvSchema.safeParse(source);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new WorkerError('invalid_environment', `Invalid worker environment: ${fields}`);
  }
  return parsed.data;
}

export function readSnapshotStatusEnv(source: NodeJS.ProcessEnv = process.env) {
  const parsed = snapshotStatusEnvSchema.safeParse(source);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new WorkerError('invalid_environment', `Invalid snapshot reader environment: ${fields}`);
  }
  return parsed.data;
}
