import { z } from 'zod';

import { WorkerError } from '../lib/errors.ts';

const endpoint = z.url({ protocol: /^https?$/ }).refine((value) => {
  const url = new URL(value);
  return !url.username && !url.password && !url.search && !url.hash;
});
const valhallaToken = z.string().regex(/^[A-Za-z0-9_-]{43,128}$/);

const settingsSchema = z
  .object({
    SNAPSHOT_SESSION_DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    SNAPSHOT_INPUT_REVISION: z.string().regex(/^[0-9a-f]{64}$/),
    SNAPSHOT_REPLICA_ID: z.string().min(1).max(255),
    SNAPSHOT_VALHALLA_URL: endpoint,
    SNAPSHOT_VALHALLA_CONTROL_TOKEN: valhallaToken,
    SNAPSHOT_VALHALLA_ROUTING_TOKEN: valhallaToken,
    SNAPSHOT_REPLICA_INSPECTOR_URL: endpoint,
    SNAPSHOT_REPLICA_INSPECTOR_TOKEN: z.string().min(32),
  })
  .refine(
    (settings) =>
      new Set([
        settings.SNAPSHOT_VALHALLA_CONTROL_TOKEN,
        settings.SNAPSHOT_VALHALLA_ROUTING_TOKEN,
        settings.SNAPSHOT_REPLICA_INSPECTOR_TOKEN,
      ]).size === 3,
  );

export function readSnapshotResumeSettings(source: NodeJS.ProcessEnv = process.env) {
  const settings = settingsSchema.safeParse(source);
  if (!settings.success) {
    throw new WorkerError(
      'invalid_snapshot_recovery_config',
      'Smart Check checkpoint configuration is incomplete',
    );
  }
  return settings.data;
}

export type ResumeSettings = ReturnType<typeof readSnapshotResumeSettings>;
