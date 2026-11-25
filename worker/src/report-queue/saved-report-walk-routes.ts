import { z } from 'zod';

import type { Sql } from '../db/sql.ts';
import { errorCode } from '../lib/errors.ts';
import type { Logger } from '../lib/logger.ts';
import type { ValhallaClient } from '../routing/valhalla.ts';
import { createWorkSignal } from './work-signal.ts';

const QUEUE_CHANNEL = 'saved_report_walk_route_queued';
const POLL_INTERVAL_MS = 10_000;
const ROUTE_TIMEOUT_MS = 4_000;
const DEFAULT_WALK_SPEED_KMH = 4.5;

const coordinatesSchema = z.object({
  lng: z.number().min(-180).max(180),
  lat: z.number().min(-90).max(90),
});
const routePointsSchema = z.object({
  origin: coordinatesSchema,
  destination: coordinatesSchema,
  walkSpeedKmh: z.number().min(2).max(8).catch(DEFAULT_WALK_SPEED_KMH),
});
const polylineSchema = z
  .string()
  .min(4)
  .max(32768)
  .regex(/^[?-~]+$/u);

export async function processSavedReportWalkRoute(
  sql: Sql,
  route: ValhallaClient['route'],
  logger: Logger,
): Promise<boolean> {
  const [job] = await sql<
    { id: string; claim_token: string; origin: unknown; destination: unknown; speed: unknown }[]
  >`select * from private.claim_next_saved_report_walk_route()`;
  if (!job) return false;

  const points = routePointsSchema.safeParse({
    origin: job.origin,
    destination: job.destination,
    walkSpeedKmh: job.speed,
  });
  let polyline6: string | null = null;
  if (points.success) {
    try {
      const result = await route({
        ...points.data,
        signal: AbortSignal.timeout(ROUTE_TIMEOUT_MS),
      });
      polyline6 = polylineSchema.safeParse(result?.polyline6).data ?? null;
    } catch (error) {
      logger.warn('saved report walk route unavailable', { code: errorCode(error) });
    }
  }
  const [result] = await sql<{ completed: boolean }[]>`
    select private.complete_saved_report_walk_route(${job.id}, ${job.claim_token}, ${polyline6}) as completed
  `;
  if (!result?.completed) logger.warn('saved report walk route claim lost', { job_id: job.id });
  return true;
}

export async function serveSavedReportWalkRoutes(
  sql: Sql,
  route: ValhallaClient['route'],
  stop: AbortSignal,
  logger: Logger,
): Promise<void> {
  const work = createWorkSignal();
  const listener = await sql.listen(QUEUE_CHANNEL, work.notify).catch((error: unknown) => {
    logger.warn('saved report walk route notifications unavailable', { code: errorCode(error) });
    return null;
  });
  try {
    while (!stop.aborted) {
      try {
        if (await processSavedReportWalkRoute(sql, route, logger)) continue;
      } catch (error) {
        logger.error('saved report walk route queue unavailable', { code: errorCode(error) });
      }
      await work.wait(POLL_INTERVAL_MS, stop);
    }
  } finally {
    await listener?.unlisten();
  }
}
