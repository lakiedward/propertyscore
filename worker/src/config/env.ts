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

const snapshotReaderEnvSchema = z.object({
  SNAPSHOT_STATUS_DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
});

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

export function readSnapshotReaderEnv(source: NodeJS.ProcessEnv = process.env) {
  const parsed = snapshotReaderEnvSchema.safeParse(source);
  if (!parsed.success) {
    throw new WorkerError(
      'invalid_environment',
      'Invalid worker environment: SNAPSHOT_STATUS_DATABASE_URL',
    );
  }
  return parsed.data;
}
