import { type JsonObject, type Sql, withLongStatements } from '../../db/sql.ts';
import type { NoiseIndicator, NoiseSample } from './noise.formula.ts';
import type { NoiseKind } from './noise.params.ts';
import type { NoiseSourceFeature } from './noise.osm.ts';

const BATCH_SIZE = 1000;

export type NoiseSourceRow = NoiseSourceFeature & { sourceRef: string };

export type BuildingRow = { geometry: { type: string; coordinates: unknown } };

type SampleRow = {
  point_no?: number;
  cell_id?: string;
  point_index?: number;
  kind: NoiseKind;
  measure: 'contour' | 'proxy';
  indicator: NoiseIndicator | null;
  dataset_id: string | null;
  db_low: number | null;
  source_class: string | null;
  distance_m: number | null;
  buildings_crossed: number | null;
};

export type CellSample = { cellId: string; pointIndex: number; sample: NoiseSample };

export type CityNoiseCoverage = {
  datasets: {
    id: string;
    sourceType: NoiseKind;
    indicator: NoiseIndicator;
    round: number;
    provider: string;
    licence: string | null;
  }[];
  sourceCount: number;
};

export type NearestNoiseSource = {
  kind: NoiseKind;
  sourceClass: string;
  sourceRef: string;
  name: string | null;
  distanceM: number;
  ldenBand: [number, number | null] | null;
};

export async function pruneNoiseBuildings(sql: Sql): Promise<number> {
  return withLongStatements(sql, async (transaction) => {
    const [row] = await transaction<
      { pruned: number }[]
    >`select private.prune_noise_buildings() as pruned`;
    return row?.pruned ?? 0;
  });
}

export async function replaceNoiseSources(
  sql: Sql,
  snapshotId: string,
  cityId: string,
  rows: readonly NoiseSourceRow[],
): Promise<number> {
  await sql`delete from private.noise_sources where snapshot_id = ${snapshotId} and city_id = ${cityId}`;
  let written = 0;
  for (let start = 0; start < rows.length; start += BATCH_SIZE) {
    const batch = rows.slice(start, start + BATCH_SIZE).map((row) => ({
      kind: row.kind,
      source_class: row.sourceClass,
      source_ref: row.sourceRef,
      name: row.name,
      geometry: row.geometry as JsonObject,
    }));
    const result = await sql`
      insert into private.noise_sources (snapshot_id, city_id, kind, source_class, source_ref, name, geometry)
      select
        ${snapshotId},
        ${cityId},
        batch.kind::private.noise_source_kind,
        batch.source_class,
        batch.source_ref,
        batch.name,
        extensions.st_geomfromgeojson(batch.geometry)::extensions.geography
      from jsonb_to_recordset(${sql.json(batch)}::jsonb)
        as batch (kind text, source_class text, source_ref text, name text, geometry jsonb)
      on conflict (snapshot_id, city_id, source_ref) do nothing
    `;
    written += result.count;
  }
  return written;
}

export async function replaceNoiseBuildings(
  sql: Sql,
  snapshotId: string,
  cityId: string,
  rows: AsyncIterable<BuildingRow>,
): Promise<number> {
  await sql`delete from private.noise_buildings where snapshot_id = ${snapshotId} and city_id = ${cityId}`;
  let written = 0;
  let batch: JsonObject[] = [];
  const flush = async () => {
    if (batch.length === 0) return;
    const result = await sql`
      insert into private.noise_buildings (snapshot_id, city_id, geometry)
      select
        ${snapshotId},
        ${cityId},
        extensions.st_multi(
          extensions.st_collectionextract(
            extensions.st_makevalid(extensions.st_geomfromgeojson(batch.geometry)),
            3
          )
        )::extensions.geography
      from jsonb_to_recordset(${sql.json(batch)}::jsonb) as batch (geometry jsonb)
      where not extensions.st_isempty(
        extensions.st_collectionextract(
          extensions.st_makevalid(extensions.st_geomfromgeojson(batch.geometry)),
          3
        )
      )
    `;
    written += result.count;
    batch = [];
  };
  for await (const row of rows) {
    batch.push({ geometry: row.geometry as JsonObject });
    if (batch.length >= BATCH_SIZE) await flush();
  }
  await flush();
  return written;
}

export async function snapshotNoiseCoverage(
  sql: Sql,
  snapshotId: string,
  cityId: string,
): Promise<CityNoiseCoverage> {
  const datasets = await sql<
    {
      id: string;
      source_type: NoiseKind;
      indicator: NoiseIndicator;
      round: number;
      provider: string;
      licence: string | null;
    }[]
  >`
    select d.id, d.source_type, d.indicator, d.round, d.provider, d.licence
    from private.noise_snapshot_datasets sd
    join private.noise_datasets d on d.id = sd.dataset_id
    where sd.snapshot_id = ${snapshotId} and d.city_id = ${cityId}
    order by d.source_type, d.indicator
  `;
  const [sources] = await sql<{ count: number }[]>`
    select count(*)::integer as count
    from private.noise_sources
    where snapshot_id = ${snapshotId} and city_id = ${cityId}
  `;
  return {
    datasets: datasets.map((row) => ({
      id: row.id,
      sourceType: row.source_type,
      indicator: row.indicator,
      round: row.round,
      provider: row.provider,
      licence: row.licence,
    })),
    sourceCount: sources?.count ?? 0,
  };
}

export async function freezeNoiseDatasets(
  sql: Sql,
  snapshotId: string,
  cityId: string,
): Promise<CityNoiseCoverage> {
  await sql`select private.freeze_noise_datasets(${snapshotId}, ${cityId})`;
  return snapshotNoiseCoverage(sql, snapshotId, cityId);
}

function toSample(row: SampleRow): NoiseSample | null {
  if (row.measure === 'contour') {
    if (row.indicator === null || row.dataset_id === null) return null;
    return {
      measure: 'contour',
      kind: row.kind,
      indicator: row.indicator,
      datasetId: row.dataset_id,
      dbLow: row.db_low,
    };
  }
  if (row.source_class === null || row.distance_m === null) return null;
  return {
    measure: 'proxy',
    kind: row.kind,
    sourceClass: row.source_class,
    distanceM: row.distance_m,
    buildingsCrossed: row.buildings_crossed ?? 0,
  };
}

export async function cellNoiseSamples(
  sql: Sql,
  snapshotId: string,
  cityId: string,
  offsetM: number,
  radiusM: number,
): Promise<{ cellIds: string[]; samples: CellSample[] }> {
  const cells = await sql<{ cell_id: string }[]>`
    select cs.cell_id
    from private.cell_scores cs
    join private.grid_cells g on g.id = cs.cell_id
    where cs.snapshot_id = ${snapshotId} and g.city_id = ${cityId}
    order by cs.cell_id
  `;
  const rows = await withLongStatements(sql, async (transaction) => [
    ...(await transaction<SampleRow[]>`
      select cell_id, point_index, kind, measure, indicator, dataset_id, db_low, source_class, distance_m, buildings_crossed
      from private.noise_cell_samples(${snapshotId}, ${cityId}, ${offsetM}, ${radiusM})
    `),
  ]);
  const samples = rows.flatMap((row) => {
    const sample = toSample(row);
    if (sample === null || row.cell_id === undefined || row.point_index === undefined) return [];
    return [{ cellId: row.cell_id, pointIndex: row.point_index, sample }];
  });
  return { cellIds: cells.map((cell) => cell.cell_id), samples };
}

export async function pointNoiseSamples(
  sql: Sql,
  snapshotId: string,
  cityId: string,
  location: { lon: number; lat: number },
  radiusM: number,
): Promise<NoiseSample[]> {
  const rows = await sql<SampleRow[]>`
    select kind, measure, indicator, dataset_id, db_low, source_class, distance_m, buildings_crossed
    from private.noise_samples(
      ${snapshotId},
      ${cityId},
      array[extensions.st_point(${location.lon}, ${location.lat}, 4326)::extensions.geography],
      ${radiusM}
    )
  `;
  return rows.flatMap((row) => {
    const sample = toSample(row);
    return sample === null ? [] : [sample];
  });
}

export async function nearestNoiseSources(
  sql: Sql,
  snapshotId: string,
  cityId: string,
  location: { lon: number; lat: number },
  radiusM: number,
): Promise<NearestNoiseSource[]> {
  const rows = await sql<
    {
      kind: NoiseKind;
      source_class: string;
      source_ref: string;
      name: string | null;
      distance_m: number;
      db_low: number | null;
      db_high: number | null;
    }[]
  >`
    select kind, source_class, source_ref, name, distance_m, db_low, db_high
    from private.noise_nearest_sources(
      ${snapshotId},
      ${cityId},
      extensions.st_point(${location.lon}, ${location.lat}, 4326)::extensions.geography,
      ${radiusM}
    )
  `;
  return rows.map((row) => ({
    kind: row.kind,
    sourceClass: row.source_class,
    sourceRef: row.source_ref,
    name: row.name,
    distanceM: row.distance_m,
    ldenBand: row.db_low === null ? null : [row.db_low, row.db_high],
  }));
}

export async function noiseMapLayers(
  sql: Sql,
  snapshotId: string,
  cityId: string,
  location: { lon: number; lat: number },
  clipM: number,
): Promise<JsonObject> {
  const [row] = await sql<{ layers: JsonObject }[]>`
    select private.noise_map_layers(
      ${snapshotId},
      ${cityId},
      extensions.st_point(${location.lon}, ${location.lat}, 4326)::extensions.geography,
      ${clipM}
    ) as layers
  `;
  return row?.layers ?? {};
}

export async function writeNoiseStats(
  sql: Sql,
  snapshotId: string,
  stats: Record<string, JsonObject>,
): Promise<void> {
  await sql`
    update public.score_snapshots
    set stats = stats || jsonb_build_object('noise', coalesce(stats -> 'noise', '{}'::jsonb) || ${sql.json(stats)}::jsonb)
    where id = ${snapshotId}
  `;
}
