import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createSql, type Sql } from '../../db/sql.ts';
import { createLogger } from '../../lib/logger.ts';
import { prepareCityCells } from '../../snapshot/snapshot.db.ts';
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
  let city = { id: '', slug: 'craiova', name: 'Craiova' };
  let hadCityCells = false;

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
      where v.kind = 'online' and v.label = 'v1' and c.slug = 'craiova'
    `;
    if (!row) throw new Error('v1 or Craiova is missing from the local database');
    hadCityCells = row.has_cells;
    city = { ...city, id: row.city_id };
    params = {
      ...row.params,
      dataset: { ...(row.params.dataset as object), version: VERSION },
    };
    const [snapshot] = await sql<{ id: string }[]>`
      insert into public.score_snapshots (scoring_version_id, period, status, finished_at, error_code)
      select id, '2026-11-01', 'failed', now(), 'industry_test_fixture'
      from public.scoring_versions
      where kind = 'online' and label = 'v1'
      returning id
    `;
    snapshotId = snapshot?.id ?? '';
    await prepareCityCells(sql, snapshotId, city.id, 175);
  });

  afterAll(async () => {
    await sql`delete from private.industrial_sites where source_version = ${VERSION}`;
    if (snapshotId) {
      await sql`delete from public.score_snapshots where id = ${snapshotId}`;
    }
    if (!hadCityCells) {
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
          longitude: 23.82,
          latitude: 44.33,
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
          longitude: 25,
          latitude: 46,
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
      osmExtract: { url: 'https://example.test/romania.osm.pbf', apiKey: null },
      router: null,
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
    expect(stats?.industry).toEqual({ craiova: { sites_in_buffer: 1, suspect: 0, corrected: 0 } });

    const report = await buildIndustryReport(sql, {
      longitude: 23.81,
      latitude: 44.33,
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
