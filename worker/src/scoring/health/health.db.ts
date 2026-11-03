import type { JsonObject, Sql } from '../../db/sql.ts';
import type { CnasProvider, CnasProviderKind, HealthPoi, Point } from './health.sources.ts';

export type EmergencyHospital = {
  id: string;
  name: string;
  level: 'upu' | 'cpu';
  isPediatric: boolean;
  osmId: string | null;
  sourceRef: string;
  validFrom: string;
  location: Point;
};

export type CnasList = {
  providers: CnasProvider[];
  listDate: string | null;
};

export type PoiRow = {
  source_ref: string;
  category: string;
  name: string | null;
  longitude: number;
  latitude: number;
  opening_hours: string | null;
  is_24h: boolean | null;
  tags: JsonObject;
};

export async function listEmergencyHospitals(
  sql: Sql,
  cityId: string,
  on: string,
): Promise<EmergencyHospital[]> {
  const rows = await sql<
    {
      id: string;
      name: string;
      level: 'upu' | 'cpu';
      is_pediatric: boolean;
      osm_id: string | null;
      source_ref: string;
      valid_from: string;
      longitude: number;
      latitude: number;
    }[]
  >`
    select id, name, level, is_pediatric, osm_id::text, source_ref,
      to_char(valid_from, 'YYYY-MM-DD') as valid_from, longitude, latitude
    from private.list_emergency_hospitals(${cityId}, ${on}::date)
  `;
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    level: row.level,
    isPediatric: row.is_pediatric,
    osmId: row.osm_id,
    sourceRef: row.source_ref,
    validFrom: row.valid_from,
    location: { lng: row.longitude, lat: row.latitude },
  }));
}

export async function listCnasProviders(sql: Sql, cityId: string, on: string): Promise<CnasList> {
  const rows = await sql<
    {
      id: string;
      kind: CnasProviderKind;
      name: string;
      list_date: string;
      longitude: number | null;
      latitude: number | null;
    }[]
  >`
    select id, kind, name, to_char(list_date, 'YYYY-MM-DD') as list_date, longitude, latitude
    from private.list_cnas_providers(${cityId}, ${on}::date)
  `;
  return {
    listDate: rows[0]?.list_date ?? null,
    providers: rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      name: row.name,
      location:
        row.longitude === null || row.latitude === null
          ? null
          : { lng: row.longitude, lat: row.latitude },
    })),
  };
}

export function healthPoiRows(pois: readonly HealthPoi[], nightCategory: string): PoiRow[] {
  return pois.flatMap((poi) => {
    const row: PoiRow = {
      source_ref: poi.sourceRef,
      category: poi.category,
      name: poi.name,
      longitude: poi.location.lng,
      latitude: poi.location.lat,
      opening_hours: poi.openingHours,
      is_24h: poi.isAlwaysOpen,
      tags: {
        cnas_contract: poi.cnasContract,
        sources: poi.sources,
        speciality: poi.speciality,
        cnas_ref: poi.cnasRef,
      },
    };
    if (poi.category === 'health_pharmacy' && poi.isAlwaysOpen === true) {
      return [row, { ...row, category: nightCategory }];
    }
    return [row];
  });
}

export function emergencyPoiRows(
  hospitals: readonly EmergencyHospital[],
  adultCategory: string,
  pediatricCategory: string,
): PoiRow[] {
  return hospitals.map((hospital) => ({
    source_ref: `ms_upu:${hospital.id}`,
    category: hospital.isPediatric ? pediatricCategory : adultCategory,
    name: hospital.name,
    longitude: hospital.location.lng,
    latitude: hospital.location.lat,
    opening_hours: '24/7',
    is_24h: true,
    tags: {
      level: hospital.level,
      is_pediatric: hospital.isPediatric,
      osm_id: hospital.osmId,
      source: hospital.sourceRef,
      valid_from: hospital.validFrom,
    },
  }));
}

const BATCH_SIZE = 1000;

export async function insertPois(
  sql: Sql,
  snapshotId: string,
  cityId: string,
  rows: readonly PoiRow[],
): Promise<number> {
  let inserted = 0;
  for (let start = 0; start < rows.length; start += BATCH_SIZE) {
    const batch = rows.slice(start, start + BATCH_SIZE);
    const result = await sql`
      insert into private.poi_features
        (snapshot_id, city_id, source_ref, category, name, location, opening_hours, is_24h, tags)
      select
        ${snapshotId},
        ${cityId},
        poi.source_ref,
        poi.category,
        poi.name,
        extensions.st_point(poi.longitude, poi.latitude, 4326)::extensions.geography,
        poi.opening_hours,
        poi.is_24h,
        poi.tags
      from jsonb_to_recordset(${sql.json(batch)}::jsonb) as poi (
        source_ref text, category text, name text, longitude double precision,
        latitude double precision, opening_hours text, is_24h boolean, tags jsonb
      )
      on conflict (snapshot_id, source_ref, category) do nothing
    `;
    inserted += result.count;
  }
  return inserted;
}

export async function countCityPois(
  sql: Sql,
  snapshotId: string,
  cityId: string,
  categories: readonly string[],
): Promise<Record<string, number>> {
  const rows = await sql<{ category: string; count: number }[]>`
    select category, count(*)::integer as count
    from private.poi_features
    where snapshot_id = ${snapshotId}
      and city_id = ${cityId}
      and category in ${sql([...categories])}
    group by category
  `;
  const counts: Record<string, number> = {};
  for (const category of categories) counts[category] = 0;
  for (const row of rows) counts[row.category] = row.count;
  return counts;
}

export async function writeHealthCityStats(
  sql: Sql,
  snapshotId: string,
  stats: Record<string, JsonObject>,
): Promise<void> {
  await sql`
    update public.score_snapshots
    set stats = stats || jsonb_build_object('health', coalesce(stats -> 'health', '{}'::jsonb) || ${sql.json(stats)}::jsonb)
    where id = ${snapshotId}
  `;
}
