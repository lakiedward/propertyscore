import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createSql, type Sql } from '../../db/sql.ts';
import { writeCategoryScores } from '../write-category-scores.ts';
import { cellNoiseSamples, freezeNoiseDatasets, replaceNoiseSources } from './noise.db.ts';
import { NOISE_PARAMS } from './noise.fixtures.ts';
import { scoreCells } from './noise.module.ts';
import { parseNoiseParams } from './noise.params.ts';
import { assessNoiseAtAddress } from './noise.report.ts';

describe('scoreCells', () => {
  it('scores every cell from its seven sample points and records the audit trail', () => {
    const samples = Array.from({ length: 7 }, (_, pointIndex) => ({
      cellId: 'cell-a',
      pointIndex,
      sample: {
        measure: 'contour' as const,
        kind: 'road' as const,
        indicator: 'lden' as const,
        datasetId: 'road-lden',
        dbLow: pointIndex < 4 ? 55 : 70,
      },
    }));
    const [scored, empty] = scoreCells(
      ['cell-a', 'cell-b'],
      samples,
      { hasMaps: true, hasProxySources: false },
      NOISE_PARAMS,
    );

    expect(scored).toMatchObject({
      cellId: 'cell-a',
      score: 51,
      inputs: { lden: 57.5, precision: 'street', dataset_ids: ['road-lden'] },
    });
    expect(scored?.inputs.points).toHaveLength(7);
    expect(empty).toMatchObject({ cellId: 'cell-b', score: 73 });
  });

  it('leaves cells empty with a reason when the city has no noise data', () => {
    const [row] = scoreCells(
      ['cell-a'],
      [],
      { hasMaps: false, hasProxySources: false },
      NOISE_PARAMS,
    );
    expect(row).toEqual({
      cellId: 'cell-a',
      score: null,
      inputs: { reason: 'no_source_data', dataset_ids: [] },
    });
  });
});

const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)('noise scoring against the local database', () => {
  let sql: Sql;
  let snapshotId = '';
  let cityId = '';
  let datasetId = '';
  let hadSibiuCells = false;
  const center = { lon: 24.15192, lat: 45.79705 };

  beforeAll(async () => {
    sql = createSql(databaseUrl ?? '');
    const [city] = await sql<{ id: string; has_cells: boolean }[]>`
      select c.id, exists (select 1 from private.grid_cells g where g.city_id = c.id) as has_cells
      from public.cities c
      where c.slug = 'sibiu'
    `;
    cityId = city?.id ?? '';
    hadSibiuCells = city?.has_cells ?? false;
    await sql`
      update public.score_snapshots set status = 'failed', finished_at = now(), error_code = 'test_setup'
      where status = 'building'
    `;
    const [snapshot] = await sql<{ id: string }[]>`
      select private.start_score_snapshot('2026-11-01') as id
    `;
    snapshotId = snapshot?.id ?? '';
    await sql`select private.build_grid_cells(${cityId}, 175)`;
    await sql`select private.seed_cell_scores(${snapshotId}, ${cityId})`;
    const [dataset] = await sql<{ id: string }[]>`
      insert into private.noise_datasets (city_id, source_type, indicator, round, provider)
      values (${cityId}, 'rail', 'lden', 2022, 'Test')
      returning id
    `;
    datasetId = dataset?.id ?? '';
    await sql`
      insert into private.noise_contours (dataset_id, db_low, db_high, geometry)
      values (
        ${datasetId},
        60,
        64,
        extensions.st_multi(
          extensions.st_buffer(extensions.st_point(${center.lon}, ${center.lat}, 4326)::extensions.geography, 50)::extensions.geometry
        )::extensions.geography
      )
    `;
  });

  afterAll(async () => {
    await sql`delete from public.score_snapshots where id = ${snapshotId}`;
    await sql`delete from private.noise_datasets where id = ${datasetId}`;
    if (!hadSibiuCells) {
      await sql`delete from private.grid_cells where city_id = ${cityId}`;
    }
    await sql.end({ timeout: 5 });
  });

  it('reads the formula parameters the migration added to v1', async () => {
    const [version] = await sql<{ noise: unknown }[]>`
      select params -> 'noise' as noise
      from public.scoring_versions
      where kind = 'online' and label = 'v1'
    `;
    expect(parseNoiseParams(version?.noise)).toEqual(NOISE_PARAMS);
  });

  it('mixes the rail map with the OSM road estimate and freezes it for the address', async () => {
    await replaceNoiseSources(sql, snapshotId, cityId, [
      {
        kind: 'road',
        sourceClass: 'primary',
        sourceRef: 'osm:way/1',
        name: 'Bulevardul Test',
        geometry: {
          type: 'LineString',
          coordinates: [
            [center.lon - 0.01, center.lat + 0.0011],
            [center.lon + 0.01, center.lat + 0.0011],
          ],
        },
      },
    ]);
    const coverage = await freezeNoiseDatasets(sql, snapshotId, cityId);
    expect(coverage.datasets.map((dataset) => dataset.id)).toEqual([datasetId]);

    const { cellIds, samples } = await cellNoiseSamples(sql, snapshotId, cityId, 100, 1500);
    const rows = scoreCells(
      cellIds,
      samples,
      { hasMaps: true, hasProxySources: true },
      NOISE_PARAMS,
    );
    expect(rows).toHaveLength(cellIds.length);
    expect(await writeCategoryScores(sql, snapshotId, 'noise', rows)).toBe(cellIds.length);

    const block = await assessNoiseAtAddress(
      sql,
      { snapshotId, cityId, location: center },
      NOISE_PARAMS,
    );
    expect(block).toMatchObject({ precision: 'estimate', method: 'mixed', round: 2022 });
    expect(block.per_source.map((source) => source.kind).sort()).toEqual(['rail', 'road']);
    expect(block.sources[0]).toMatchObject({ kind: 'road', name: 'Bulevardul Test' });
    expect(block.sources[0]?.distance_m).toBeGreaterThan(110);
    expect(block.sources[0]?.distance_m).toBeLessThan(135);
  });
});
