import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createSql, type Sql } from '../db/sql.ts';
import { WorkerError } from '../lib/errors.ts';
import { createLogger } from '../lib/logger.ts';
import { generateReport } from './generate-report.ts';
import { insertReport } from './report.db.ts';
import type { ReportSection } from './report-section.ts';
import { REPORT_SECTIONS } from './sections.ts';

const silentLogger = createLogger('error', () => undefined);

const databaseUrl = process.env.DATABASE_URL;

const OWNER_ID = 'e0000000-0000-4000-8000-0000000000aa';
const OWNER_EMAIL = 'report-owner@example.test';
const PIATA_MARE = { latitude: 45.7983, longitude: 24.152 };

const greenSection: ReportSection = {
  key: 'green',
  build: ({ citySlug, latitude }) => Promise.resolve({ city: citySlug, latitude }),
};

const brokenSection: ReportSection = {
  key: 'noise',
  build: () => Promise.reject(new WorkerError('noise_map_missing', 'No noise map')),
};

describe.skipIf(!databaseUrl)('generateReport against the local database', () => {
  let sql: Sql;
  let previousReady: string | undefined;
  let hadSibiuCells = false;
  let snapshotId = '';

  beforeAll(async () => {
    sql = createSql(databaseUrl ?? '');
    const [ready] = await sql<{ id: string }[]>`
      select id from public.score_snapshots where status = 'ready'
    `;
    previousReady = ready?.id;
    const [cells] = await sql<{ has_cells: boolean }[]>`
      select exists (
        select 1 from private.grid_cells g
        join public.cities c on c.id = g.city_id
        where c.slug = 'sibiu' and g.size_m = 175
      ) as has_cells
    `;
    hadSibiuCells = cells?.has_cells ?? false;

    await sql`insert into auth.users (id, email) values (${OWNER_ID}, ${OWNER_EMAIL})`;
    const [started] = await sql<{ id: string }[]>`
      select private.start_score_snapshot('2026-11-01') as id
    `;
    snapshotId = started?.id ?? '';
    await sql`
      select private.build_grid_cells(c.id, 175), private.seed_cell_scores(${snapshotId}, c.id)
      from public.cities c where c.slug = 'sibiu'
    `;
    await sql`
      update private.cell_scores set categories = '{"green": 70, "noise": 50}'
      where snapshot_id = ${snapshotId}
    `;
    await sql`select private.compute_overall_scores(${snapshotId})`;
    await sql`select private.compute_snapshot_stats(${snapshotId})`;
    await sql`select private.publish_score_snapshot(${snapshotId}, '{"osm": "2026-10-31"}')`;
  });

  afterAll(async () => {
    await sql`delete from public.online_reports where owner_id = ${OWNER_ID}`;
    await sql`delete from auth.users where id = ${OWNER_ID}`;
    await sql`delete from public.score_snapshots where id = ${snapshotId}`;
    if (!hadSibiuCells) {
      await sql`
        delete from private.grid_cells
        where city_id = (select id from public.cities where slug = 'sibiu')
      `;
    }
    if (previousReady) {
      await sql`update public.score_snapshots set status = 'ready' where id = ${previousReady}`;
    }
    await sql.end({ timeout: 5 });
  });

  it('freezes the zone summary and the score sections into a ready report', async () => {
    const reportId = await insertReport(sql, {
      ownerEmail: OWNER_EMAIL.toUpperCase(),
      ...PIATA_MARE,
      addressText: 'Piața Mare 1, Sibiu',
      locale: 'en',
    });
    await generateReport({ sql, reportId, sections: [greenSection], logger: silentLogger });

    const [report] = await sql<
      {
        status: string;
        overall_score: number;
        locale: string;
        snapshot_id: string;
        result: Record<string, unknown>;
      }[]
    >`
      select status, overall_score, locale, snapshot_id, result
      from public.online_reports where id = ${reportId}
    `;
    expect(report).toMatchObject({
      status: 'ready',
      overall_score: 59,
      locale: 'en',
      snapshot_id: snapshotId,
    });
    expect(report?.result).toMatchObject({
      schema_version: 1,
      city: { slug: 'sibiu', name: 'Sibiu' },
      zone: { score: 59, percentile: 50, city_avg: 59 },
      categories: { green: { score: 70, city_avg: 70, weight: 10 }, safety: { score: null } },
      green: { city: 'sibiu', latitude: PIATA_MARE.latitude },
    });
  });

  it('runs every registered section on cells without engine data', async () => {
    const reportId = await insertReport(sql, {
      ownerEmail: OWNER_EMAIL,
      ...PIATA_MARE,
      addressText: 'Piața Mare 3, Sibiu',
      locale: 'ro',
    });
    await generateReport({ sql, reportId, sections: REPORT_SECTIONS, logger: silentLogger });

    const [report] = await sql<{ status: string; result: Record<string, unknown> }[]>`
      select status, result from public.online_reports where id = ${reportId}
    `;
    expect(report?.status).toBe('ready');
    for (const key of [
      'safety',
      'accessibility',
      'fifteen_minute',
      'noise',
      'air',
      'industry',
      'education',
      'health',
    ]) {
      expect(report?.result[key]).toMatchObject({ schema_version: 1, status: 'no_data' });
    }
    expect(report?.result.seismic).toMatchObject({
      schema_version: 1,
      status: 'context',
      code: 'P100-1/2013',
      ag_g: 0.2,
      level: 'moderate',
      city: { slug: 'sibiu', ag_g: 0.2 },
    });
  });

  it('marks the report failed with the code of the section that broke', async () => {
    const reportId = await insertReport(sql, {
      ownerEmail: OWNER_EMAIL,
      ...PIATA_MARE,
      addressText: 'Piața Mare 2, Sibiu',
      locale: 'ro',
    });
    await expect(
      generateReport({ sql, reportId, sections: [brokenSection], logger: silentLogger }),
    ).rejects.toMatchObject({ code: 'noise_map_missing' });

    const [report] = await sql<{ status: string; error_code: string }[]>`
      select status, error_code from public.online_reports where id = ${reportId}
    `;
    expect(report).toEqual({ status: 'failed', error_code: 'noise_map_missing' });
  });

  it('leaves a report that another run is generating untouched', async () => {
    const reportId = await insertReport(sql, {
      ownerEmail: OWNER_EMAIL,
      ...PIATA_MARE,
      addressText: 'Piața Mare 4, Sibiu',
      locale: 'ro',
    });
    await sql`select private.begin_online_report(${reportId})`;

    await expect(
      generateReport({ sql, reportId, sections: [greenSection], logger: silentLogger }),
    ).rejects.toThrow('report_in_progress');

    const [report] = await sql<{ status: string; error_code: string | null }[]>`
      select status, error_code from public.online_reports where id = ${reportId}
    `;
    expect(report).toEqual({ status: 'generating', error_code: null });
  });

  it('refuses an address outside every covered city and an unknown owner', async () => {
    await expect(
      insertReport(sql, {
        ownerEmail: OWNER_EMAIL,
        latitude: 46.5,
        longitude: 25.5,
        addressText: 'Departe',
        locale: 'ro',
      }),
    ).rejects.toMatchObject({ code: 'outside_coverage' });
    await expect(
      insertReport(sql, {
        ownerEmail: 'nobody@example.test',
        ...PIATA_MARE,
        addressText: 'Piața Mare 3, Sibiu',
        locale: 'ro',
      }),
    ).rejects.toMatchObject({ code: 'report_owner_not_found' });
  });
});
