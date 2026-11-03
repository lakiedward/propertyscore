import type { JsonObject, Sql } from '../../db/sql.ts';
import type { NightState, SafetyType } from './safety.params.ts';

export type SafetyFeatureRow = {
  sourceRef: string;
  type: SafetyType;
  name: string | null;
  geometry: { type: string; coordinates: unknown };
  nightState: NightState;
};

export type CellInputRow = {
  cell_id: string;
  feature_type: SafetyType;
  distances: number[];
  night_states: NightState[];
};

export type CellNeighbours = {
  cell_id: string;
  neighbour_ids: string[];
  is_residential: boolean | null;
};

export type SafetyLayersRow = {
  cellId: string;
  layers: JsonObject;
};

const BATCH_SIZE = 1000;

export async function clearSafetyFeatures(
  sql: Sql,
  snapshotId: string,
  cityId: string,
): Promise<void> {
  await sql`
    delete from private.safety_features
    where snapshot_id = ${snapshotId} and city_id = ${cityId}
  `;
}

export async function insertSafetyFeatures(
  sql: Sql,
  snapshotId: string,
  cityId: string,
  rows: readonly SafetyFeatureRow[],
): Promise<number> {
  if (rows.length === 0) return 0;
  const batch = rows.map((row) => ({
    source_ref: row.sourceRef,
    feature_type: row.type,
    name: row.name,
    geometry: JSON.stringify(row.geometry),
    night_state: row.nightState,
  }));
  const result = await sql`
    insert into private.safety_features (snapshot_id, city_id, source_ref, feature_type, name, geometry, night_state)
    select
      ${snapshotId},
      ${cityId},
      row.source_ref,
      row.feature_type,
      row.name,
      extensions.st_setsrid(extensions.st_geomfromgeojson(row.geometry), 4326)::extensions.geography,
      row.night_state
    from jsonb_to_recordset(${sql.json(batch)}::jsonb)
      as row (source_ref text, feature_type text, name text, geometry text, night_state text)
    on conflict (snapshot_id, source_ref, feature_type) do nothing
  `;
  return result.count;
}

export async function listCellInputs(
  sql: Sql,
  snapshotId: string,
  cityId: string,
  reachM: Partial<Record<SafetyType, number>>,
): Promise<CellInputRow[]> {
  const rows = await sql<CellInputRow[]>`
    select cell_id, feature_type, distances, night_states
    from private.safety_cell_inputs(${snapshotId}, ${cityId}, ${sql.json(reachM)}::jsonb)
  `;
  return [...rows];
}

export async function listCellNeighbours(
  sql: Sql,
  snapshotId: string,
  cityId: string,
): Promise<CellNeighbours[]> {
  const rows = await sql<CellNeighbours[]>`
    select n.cell_id, n.neighbour_ids, cs.is_residential
    from private.grid_cell_neighbours(${snapshotId}, ${cityId}) as n
    join private.cell_scores cs on cs.cell_id = n.cell_id and cs.snapshot_id = ${snapshotId}
    order by n.cell_id
  `;
  return [...rows];
}

export async function writeSafetyLayers(
  sql: Sql,
  snapshotId: string,
  rows: readonly SafetyLayersRow[],
): Promise<number> {
  let written = 0;
  for (let start = 0; start < rows.length; start += BATCH_SIZE) {
    const batch = rows
      .slice(start, start + BATCH_SIZE)
      .map((row) => ({ cell_id: row.cellId, layers: row.layers }));
    const result = await sql`
      update private.cell_scores as cs
      set safety_layers = batch.layers
      from jsonb_to_recordset(${sql.json(batch)}::jsonb) as batch (cell_id uuid, layers jsonb)
      where cs.snapshot_id = ${snapshotId} and cs.cell_id = batch.cell_id
    `;
    written += result.count;
  }
  return written;
}

export async function writeSafetyStats(
  sql: Sql,
  snapshotId: string,
  cities: JsonObject,
  calibration: JsonObject,
): Promise<void> {
  await sql`
    update public.score_snapshots
    set stats = stats
      || jsonb_build_object('safety', ${sql.json(cities)}::jsonb)
      || jsonb_build_object('safety_calibration', ${sql.json(calibration)}::jsonb)
    where id = ${snapshotId}
  `;
}
