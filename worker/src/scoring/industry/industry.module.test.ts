import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createSql, type Sql } from '../../db/sql.ts';
import { createLogger } from '../../lib/logger.ts';
import { failSnapshot, prepareCityCells, startSnapshot } from '../../snapshot/snapshot.db.ts';
import { storeRegisterSites } from './industry.db.ts';
import { industryModule } from './industry.module.ts';
import { buildIndustryReport } from './industry.report.ts';

const databaseUrl = process.env.DATABASE_URL;
const silentLogger = createLogger('error', () => undefined);
const VERSION = 'vitest';

describe.skipIf(!databaseUrl)('industryModule against the local database', () => {
  let sql: Sql;
  let params: Record<string, unknown>;
  let snapshotId = '';
  let city = { id: '', slug: 'sibiu', name: 'Sibiu' };
  let hadSibiuCells = false;

  beforeAll(async () => {
    sql = createSql(databaseUrl ?? '');
    const [row] = await sql<
      { params: Record<string, unknown>; city_id: string; has_cells: boolean }[]
    >`
      select
        v.params -> 'industry' as params,
        c.id as city_id,
        exists (select 1 from private.grid_cells g where g.city_id = c.id) as has_cells
      from public.scoring_versions v
      cross join public.cities c
      where v.kind = 'online' and v.label = 'v1' and c.slug = 'sibiu'
    `;
    if (!row) throw new Error('v1 or Sibiu is missing from the local database');
    hadSibiuCells = row.has_cells;
    city = { ...city, id: row.city_id };
    params = {
      ...row.params,
      dataset: { ...(row.params.dataset as object), version: VERSION },
    };
    await sql`
      update public.score_snapshots
      set status = 'failed', finished_at = now(), error_code = 'test_setup'
      where status = 'building'
    `;
    const version = await startSnapshot(sql, '2026-11-01');
    snapshotId = version.snapshotId;
    await prepareCityCells(sql, snapshotId, city.id, 175);
  });

  afterAll(async () => {
    await sql`delete from private.industrial_sites where source_version = ${VERSION}`;
    if (snapshotId) {
      await failSnapshot(sql, snapshotId, 'test_cleanup');
      await sql`delete from public.score_snapshots where id = ${snapshotId}`;
    }
    if (!hadSibiuCells) {
      await sql`delete from private.grid_cells where city_id = ${city.id}`;
    }
    await sql.end({ timeout: 5 });
  });

  it('stores the register, scores every cell and lists the sites from an address', async () => {
    const summary = await storeRegisterSites(sql, {
      version: VERSION,
      reportingYear: 2024,
      radiusM: 5000,
      suspectCenterM: 150,
      sites: [
        {
          sourceFacilityId: 'VITEST/PLANT',
          reportingYear: 2024,
          name: 'Uzina de test',
          longitude: 24.17,
          latitude: 45.8,
          sectorCode: 'metals',
          mainActivityCode: '2(b)',
          impactCodes: ['air'],
          airReleases: { nox: 5000 },
          isTopEmitter: false,
        },
        {
          sourceFacilityId: 'VITEST/FAR',
          reportingYear: 2024,
          name: 'Departe',
          longitude: 26,
          latitude: 44.5,
          sectorCode: 'energy',
          mainActivityCode: '1(c)',
          impactCodes: [],
          airReleases: {},
          isTopEmitter: false,
        },
      ],
    });
    expect(summary).toEqual({ sites: 2, in_city_buffers: 1, suspect: 0, corrected: 0 });

    const result = await industryModule.run({
      sql,
      snapshotId,
      period: '2026-11-01',
      cellSizeM: 175,
      cities: [city],
      params,
      sourcesDir: '/tmp/propertyscore-sources',
      osmExtractUrl: 'https://example.test/romania.osm.pbf',
      logger: silentLogger,
    });
    expect(result.sourceDates).toEqual({ eea_industrial: VERSION, eea_industrial_year: '2024' });

    const [scores] = await sql<{ cells: number; scored: number; min: number; max: number }[]>`
      select
        count(*)::integer as cells,
        count(categories -> 'industry')::integer as scored,
        min((categories ->> 'industry')::integer) as min,
        max((categories ->> 'industry')::integer) as max
      from private.cell_scores
      where snapshot_id = ${snapshotId}
    `;
    expect(scores?.scored).toBe(scores?.cells);
    expect(scores?.max).toBe(100);
    expect(scores?.min).toBeLessThan(80);

    const [stats] = await sql<{ industry: Record<string, unknown> }[]>`
      select stats -> 'industry' as industry from public.score_snapshots where id = ${snapshotId}
    `;
    expect(stats?.industry).toEqual({ sibiu: { sites_in_buffer: 1, suspect: 0, corrected: 0 } });

    const report = await buildIndustryReport(sql, {
      longitude: 24.16,
      latitude: 45.8,
      cellScore: 85,
      params,
    });
    expect(report).toMatchObject({
      score: 85,
      count_radius: 1,
      count_near: 1,
      source: { version: VERSION, reporting_year: 2024 },
      sites: [{ name: 'Uzina de test', sector_code: 'metals', points_lost: 15 }],
    });
    expect(report.nearest_m).toBeGreaterThan(700);
    expect(report.nearest_m).toBeLessThan(850);
  });
});
