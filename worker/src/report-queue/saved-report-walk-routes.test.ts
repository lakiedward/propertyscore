import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { createSql, type Sql } from '../db/sql.ts';
import { createLogger } from '../lib/logger.ts';
import { createValhallaClient } from '../routing/valhalla.ts';
import { processSavedReportWalkRoute } from './saved-report-walk-routes.ts';

const databaseUrl = process.env.DATABASE_URL;
const ownerId = 'ed000000-0000-4000-8000-000000000001';
const snapshotId = 'ed000000-0000-4000-8000-000000000002';
const reportId = 'ed000000-0000-4000-8000-000000000003';
const logger = createLogger('error', () => undefined);

describe.skipIf(!databaseUrl)('saved report walking route worker', () => {
  let sql: Sql;

  beforeAll(async () => {
    sql = createSql(databaseUrl ?? '');
    await sql`insert into auth.users (id, email) values (${ownerId}, 'saved-walk@example.test')`;
    await sql`
      insert into public.score_snapshots (id, scoring_version_id, period, status, finished_at)
      select ${snapshotId}, id, '2026-10-01', 'superseded', now()
      from public.scoring_versions where kind = 'online' and label = 'v1'
    `;
    await sql`
      insert into public.online_reports (
        id, owner_id, city_id, location, address_text, status, scoring_version_id, snapshot_id,
        overall_score, result, generated_at
      )
      select ${reportId}, ${ownerId}, c.id, extensions.st_point(20, 45, 4326)::extensions.geography,
        'Test Route Address', 'ready', s.scoring_version_id, s.id, 45,
        '{
          "fifteen_minute": {
            "status": "scored",
            "walk_speed_kmh": 4.2,
            "categories": [{"key": "park", "t1_min": 14}, {"key": "pharmacy", "t1_min": 12}],
            "places": [
              {"id": "open", "category": "park", "lng": 20.01, "lat": 45.01, "minutes": 14},
              {"id": "unreachable", "category": "pharmacy", "lng": 20.02, "lat": 45.02, "minutes": 12},
              {"id": "expired", "lng": 20.03, "lat": 45.03, "minutes": 13}
            ]
          }
        }', now()
      from public.cities c cross join public.score_snapshots s
      where c.slug = 'timisoara' and s.id = ${snapshotId}
    `;
  });

  afterAll(async () => {
    await sql`delete from auth.users where id = ${ownerId}`;
    await sql`delete from public.score_snapshots where id = ${snapshotId}`;
    await sql.end({ timeout: 5 });
  });

  it('routes to frozen points and stores only the shape; skips expired requests', async () => {
    await sql.begin(async (transaction) => {
      await transaction`set local role authenticated`;
      await transaction`
        select set_config('request.jwt.claims', ${JSON.stringify({ sub: ownerId, role: 'authenticated' })}, true)
      `;
      const [requested] = await transaction`
        select public.request_saved_report_walk_route(${reportId}, 'park') as park,
          public.request_saved_report_walk_route(${reportId}, 'pharmacy') as pharmacy
      `;
      expect(requested).toEqual({ park: { status: 'pending' }, pharmacy: { status: 'pending' } });
    });
    await sql`
      update private.saved_report_walk_routes set requested_at = now() - interval '2 seconds'
      where report_id = ${reportId} and place_id = 'open'
    `;
    await sql`
      insert into private.saved_report_walk_routes (report_id, place_id, requested_at)
      values (${reportId}, 'expired', now() - interval '2 minutes')
    `;
    const before = await sql`
      select result, overall_score, pdf_path, updated_at from public.online_reports where id = ${reportId}
    `;
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        Response.json({
          trip: { summary: { length: 0.12, time: 120 }, legs: [{ shape: '??AA' }] },
        }),
      )
      .mockResolvedValueOnce(Response.json({ error_code: 442 }, { status: 400 }));
    const { route } = createValhallaClient('http://valhalla.test', { fetch });

    expect(await processSavedReportWalkRoute(sql, route, logger)).toBe(true);
    expect(await processSavedReportWalkRoute(sql, route, logger)).toBe(true);
    expect(await processSavedReportWalkRoute(sql, route, logger)).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      'http://valhalla.test/route',
      expect.objectContaining({
        body: JSON.stringify({
          locations: [
            { lat: 45, lon: 20 },
            { lat: 45.01, lon: 20.01 },
          ],
          costing: 'pedestrian',
          costing_options: { pedestrian: { walking_speed: 4.2 } },
          units: 'kilometers',
          directions_type: 'none',
        }),
      }),
    );
    expect(fetch.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
    expect(
      await sql`
      select place_id, polyline6, completed_at is not null as completed
      from private.saved_report_walk_routes where report_id = ${reportId} order by requested_at desc
    `,
    ).toMatchObject([
      { place_id: 'unreachable', polyline6: null, completed: true },
      { place_id: 'open', polyline6: '??AA', completed: true },
      { place_id: 'expired', polyline6: null, completed: false },
    ]);
    expect(
      await sql`
      select result, overall_score, pdf_path, updated_at from public.online_reports where id = ${reportId}
    `,
    ).toEqual(before);
  });
});
