import { z } from 'zod';

import { type Sql, withLongStatements } from '../../db/sql.ts';
import { candidateSchema, type CellCandidates } from '../../routing/walk-access.ts';
import type { GreenAmenity, GreenAreaKind } from './green.osm.ts';

export type GreenSourceRow = {
  source_ref: string;
  name: string | null;
  kind: GreenAreaKind;
  is_public: boolean;
  geojson: string;
};

export type GreenAmenityRow = {
  source_ref: string;
  category: GreenAmenity;
  name: string | null;
  geojson: string;
};

export type GreenCellMeasure = {
  cell_id: string;
  shares: Record<string, number>;
  nearest_small_id: string | null;
  nearest_small_m: number | null;
  nearest_large_id: string | null;
  nearest_large_m: number | null;
};

export type ParkSize = 'small' | 'large';

export type ParkWalkTarget = {
  key: ParkSize;
  minHa: number;
  searchRadiusM: number;
  maxCandidates: number;
};

const parkCandidateSchema = candidateSchema.extend({ key: z.enum(['small', 'large']) });

export type ParkCandidate = z.infer<typeof parkCandidateSchema>;

const parkCellSchema = z.object({
  cell_id: z.string(),
  lng: z.number(),
  lat: z.number(),
  candidates: z.array(parkCandidateSchema),
});

export async function listParkWalkCandidates(
  sql: Sql,
  snapshotId: string,
  cityId: string,
  targets: readonly ParkWalkTarget[],
): Promise<CellCandidates<ParkCandidate>[]> {
  const payload = targets.map((target) => ({
    key: target.key,
    min_ha: target.minHa,
    search_radius_m: target.searchRadiusM,
    max_candidates: target.maxCandidates,
  }));
  const rows = await withLongStatements(sql, async (transaction) => [
    ...(await transaction`
      select cell_id, lng, lat, candidates
      from private.green_park_walk_candidates(${snapshotId}, ${cityId}, ${transaction.json(payload)}::jsonb)
    `),
  ]);
  return z.array(parkCellSchema).parse(rows);
}

export async function saveGreenSources(
  sql: Sql,
  snapshotId: string,
  cityId: string,
  rows: readonly GreenSourceRow[],
): Promise<void> {
  if (rows.length === 0) return;
  await sql`
    insert into private.green_area_sources
      (snapshot_id, city_id, source, source_ref, name, kind, is_public, geometry)
    select
      ${snapshotId},
      ${cityId},
      'osm',
      row.source_ref,
      row.name,
      row.kind::private.green_area_kind,
      row.is_public,
      extensions.st_multi(
        extensions.st_collectionextract(
          extensions.st_makevalid(
            extensions.st_setsrid(extensions.st_geomfromgeojson(row.geojson), 4326)
          ),
          3
        )
      )::extensions.geography
    from jsonb_to_recordset(${sql.json([...rows])}::jsonb)
      as row (source_ref text, name text, kind text, is_public boolean, geojson text)
    on conflict (snapshot_id, source, source_ref) do update
    set name = excluded.name, kind = excluded.kind, is_public = excluded.is_public,
      geometry = excluded.geometry
  `;
}

export async function saveGreenAmenities(
  sql: Sql,
  snapshotId: string,
  cityId: string,
  rows: readonly GreenAmenityRow[],
): Promise<void> {
  if (rows.length === 0) return;
  await sql`
    insert into private.poi_features (snapshot_id, city_id, source_ref, category, name, location)
    select
      ${snapshotId},
      ${cityId},
      row.source_ref,
      row.category,
      row.name,
      extensions.st_pointonsurface(
        extensions.st_makevalid(
          extensions.st_setsrid(extensions.st_geomfromgeojson(row.geojson), 4326)
        )
      )::extensions.geography
    from jsonb_to_recordset(${sql.json([...rows])}::jsonb)
      as row (source_ref text, category text, name text, geojson text)
    on conflict (snapshot_id, source_ref, category) do nothing
  `;
}

export async function mergeGreenAreas(
  sql: Sql,
  snapshotId: string,
  cityId: string,
  minHa: number,
): Promise<number> {
  return withLongStatements(sql, async (transaction) => {
    const [row] = await transaction<{ merged: number }[]>`
      select private.merge_green_areas(${snapshotId}, ${cityId}, ${minHa}) as merged
    `;
    return row?.merged ?? 0;
  });
}

export async function measureGreenCells(
  sql: Sql,
  snapshotId: string,
  cityId: string,
  options: { radiiM: readonly number[]; smallMinHa: number; largeMinHa: number },
): Promise<GreenCellMeasure[]> {
  return withLongStatements(sql, async (transaction) => {
    const rows = await transaction<GreenCellMeasure[]>`
      select
        cell_id,
        shares,
        nearest_small_id,
        nearest_small_m::float8 as nearest_small_m,
        nearest_large_id,
        nearest_large_m::float8 as nearest_large_m
      from private.measure_green_cells(
        ${snapshotId},
        ${cityId},
        (select array_agg(value::integer) from jsonb_array_elements_text(${transaction.json([...options.radiiM])}::jsonb)),
        ${options.smallMinHa},
        ${options.largeMinHa}
      )
    `;
    return [...rows];
  });
}

export async function writeGreenCityStats(
  sql: Sql,
  snapshotId: string,
  city: { id: string; slug: string },
  nearRadiusM: number,
): Promise<void> {
  await sql`
    update public.score_snapshots s
    set stats = s.stats || jsonb_build_object(
      'green',
      coalesce(s.stats -> 'green', '{}'::jsonb) || jsonb_build_object(${city.slug}::text, city.stats)
    )
    from (
      select jsonb_build_object(
        'avg_share_near', round(avg((cs.inputs #>> array['green', 'share', ${String(nearRadiusM)}])::numeric)
          filter (where cs.is_residential is not false), 4),
        'near_radius_m', ${nearRadiusM}::integer,
        'cells_no_data', count(*) filter (where jsonb_typeof(cs.categories -> 'green') is distinct from 'number')
      ) as stats
      from private.cell_scores cs
      join private.grid_cells g on g.id = cs.cell_id
      where cs.snapshot_id = ${snapshotId} and g.city_id = ${city.id}
    ) as city
    where s.id = ${snapshotId}
  `;
}
