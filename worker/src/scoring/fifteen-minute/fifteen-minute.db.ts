import type { JsonObject, Sql } from '../../db/sql.ts';
import type { PoiRow } from './fifteen-minute.pois.ts';

export type WalkAccessRecord = {
  cell_id: string;
  category: string;
  t_nearest_s: number | null;
  n5: number;
  n10: number;
  n15: number;
  distance_method: string;
};

export type CityCategoryStat = {
  category: string;
  poi_count: number;
  is_covered: boolean;
  avg_t_nearest_s: number | null;
  share_within_15: string | null;
};

const BATCH_SIZE = 1000;

export async function insertPoiRows(
  sql: Sql,
  snapshotId: string,
  cityId: string,
  rows: readonly PoiRow[],
): Promise<number> {
  let inserted = 0;
  for (let start = 0; start < rows.length; start += BATCH_SIZE) {
    const batch = rows.slice(start, start + BATCH_SIZE);
    const result = await sql`
      insert into private.poi_features (
        snapshot_id, city_id, source_ref, category, name, location, area, tags, opening_hours, is_24h
      )
      select
        ${snapshotId},
        ${cityId},
        r.source_ref,
        r.category,
        r.name,
        extensions.st_pointonsurface(shape.geom)::extensions.geography,
        case
          when extensions.st_dimension(shape.geom) = 2
            then extensions.st_multi(shape.geom)::extensions.geography
        end,
        r.tags,
        r.opening_hours,
        r.is_24h
      from jsonb_to_recordset(${JSON.stringify(batch)}::jsonb) as r (
        source_ref text,
        category text,
        name text,
        geometry jsonb,
        tags jsonb,
        opening_hours text,
        is_24h boolean
      )
      cross join lateral (
        select extensions.st_makevalid(
          extensions.st_setsrid(extensions.st_geomfromgeojson(r.geometry), 4326)
        ) as geom
      ) as shape
      where not extensions.st_isempty(shape.geom)
      on conflict (snapshot_id, source_ref, category) do nothing
    `;
    inserted += result.count;
  }
  return inserted;
}

export async function listWalkAccess(
  sql: Sql,
  snapshotId: string,
  cityId: string,
  categories: readonly string[],
): Promise<WalkAccessRecord[]> {
  const rows = await sql<WalkAccessRecord[]>`
    select wa.cell_id, wa.category, wa.t_nearest_s, wa.n5, wa.n10, wa.n15, wa.distance_method
    from private.cell_walk_access wa
    join private.grid_cells g on g.id = wa.cell_id
    where wa.snapshot_id = ${snapshotId}
      and g.city_id = ${cityId}
      and wa.category in ${sql([...categories])}
  `;
  return [...rows];
}

export async function listCellIds(sql: Sql, snapshotId: string, cityId: string): Promise<string[]> {
  const rows = await sql<{ cell_id: string }[]>`
    select cs.cell_id
    from private.cell_scores cs
    join private.grid_cells g on g.id = cs.cell_id
    where cs.snapshot_id = ${snapshotId} and g.city_id = ${cityId}
  `;
  return rows.map((row) => row.cell_id);
}

export async function listCityCategoryStats(
  sql: Sql,
  snapshotId: string,
  cityId: string,
  categories: readonly string[],
): Promise<CityCategoryStat[]> {
  const rows = await sql<CityCategoryStat[]>`
    select category, poi_count, is_covered, avg_t_nearest_s, share_within_15::text
    from private.city_category_stats
    where snapshot_id = ${snapshotId}
      and city_id = ${cityId}
      and category in ${sql([...categories])}
  `;
  return [...rows];
}

export async function writeCityStats(
  sql: Sql,
  snapshotId: string,
  citySlug: string,
  stats: JsonObject,
): Promise<void> {
  await sql`
    update public.score_snapshots
    set stats = jsonb_set(
      stats || jsonb_build_object('fifteen_minute', coalesce(stats -> 'fifteen_minute', '{}'::jsonb)),
      array['fifteen_minute', ${citySlug}::text],
      ${sql.json(stats)}::jsonb
    )
    where id = ${snapshotId}
  `;
}
