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
  return sql.begin(async (transaction) => {
    const [job] = await transaction<
      { id: string; origin: unknown; destination: unknown; speed: unknown }[]
    >`
      select q.id,
        jsonb_build_object('lng', r.longitude, 'lat', r.latitude) as origin,
        jsonb_path_query_first(
          r.result, '$.fifteen_minute.places[*] ? (@.id == $place_id)',
          jsonb_build_object('place_id', q.place_id), true
        ) as destination,
        r.result #> '{fifteen_minute,walk_speed_kmh}' as speed
      from private.saved_report_walk_routes q
      join public.online_reports r on r.id = q.report_id
      where q.completed_at is null and q.requested_at > now() - interval '1 minute'
        and r.status = 'ready'
      order by q.requested_at
      limit 1
      for update of q skip locked
    `;
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
    await transaction`
      update private.saved_report_walk_routes
      set completed_at = now(), polyline6 = ${polyline6}
      where id = ${job.id}
    `;
    return true;
  });
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
