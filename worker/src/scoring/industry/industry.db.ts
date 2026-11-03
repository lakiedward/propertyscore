import type { JsonObject, Sql } from '../../db/sql.ts';
import type { RegisterSite } from './eea-register.ts';
import type { SectorCode } from './industry.formula.ts';

export type ImportSummary = {
  sites: number;
  in_city_buffers: number;
  suspect: number;
  corrected: number;
};

export type StoredSite = {
  id: string;
  sector_code: SectorCode;
  is_top_emitter: boolean;
  has_air_releases: boolean;
  city_id: string | null;
  coordinate_status: string;
};

export type CellSitePair = {
  cell_id: string;
  site_id: string;
  distance_m: number;
};

const BATCH_SIZE = 500;

export async function importedReportingYear(sql: Sql, version: string): Promise<number | null> {
  const [row] = await sql<{ year: number | null }[]>`
    select max(reporting_year)::integer as year
    from private.industrial_sites
    where source_version = ${version}
  `;
  return row?.year ?? null;
}

export async function storeRegisterSites(
  sql: Sql,
  options: {
    version: string;
    reportingYear: number;
    sites: readonly RegisterSite[];
    radiusM: number;
    suspectCenterM: number;
  },
): Promise<ImportSummary> {
  return sql.begin(async (transaction) => {
    await transaction`
      delete from private.industrial_sites
      where source_version = ${options.version} and reporting_year = ${options.reportingYear}
    `;
    for (let start = 0; start < options.sites.length; start += BATCH_SIZE) {
      const batch = options.sites.slice(start, start + BATCH_SIZE).map((site) => ({
        source_facility_id: site.sourceFacilityId,
        reporting_year: site.reportingYear,
        name: site.name,
        longitude: site.longitude,
        latitude: site.latitude,
        sector_code: site.sectorCode,
        main_activity_code: site.mainActivityCode,
        impact_codes: site.impactCodes,
        air_releases: site.airReleases,
        is_top_emitter: site.isTopEmitter,
      }));
      await transaction`
        insert into private.industrial_sites (
          source_facility_id, reporting_year, name, location, reported_location, sector_code,
          main_activity_code, impact_codes, air_releases, is_top_emitter, source_version
        )
        select
          b.source_facility_id,
          b.reporting_year,
          b.name,
          extensions.st_point(b.longitude, b.latitude, 4326)::extensions.geography,
          extensions.st_point(b.longitude, b.latitude, 4326)::extensions.geography,
          b.sector_code,
          b.main_activity_code,
          array(select jsonb_array_elements_text(b.impact_codes)),
          b.air_releases,
          b.is_top_emitter,
          ${options.version}
        from jsonb_to_recordset(${transaction.json(batch)}::jsonb) as b (
          source_facility_id text,
          reporting_year smallint,
          name text,
          longitude double precision,
          latitude double precision,
          sector_code text,
          main_activity_code text,
          impact_codes jsonb,
          air_releases jsonb,
          is_top_emitter boolean
        )
        on conflict (source_facility_id, reporting_year) do update set
          name = excluded.name,
          location = excluded.location,
          reported_location = excluded.reported_location,
          sector_code = excluded.sector_code,
          main_activity_code = excluded.main_activity_code,
          impact_codes = excluded.impact_codes,
          air_releases = excluded.air_releases,
          is_top_emitter = excluded.is_top_emitter,
          source_version = excluded.source_version,
          imported_at = now()
      `;
    }
    const [summary] = await transaction<{ summary: ImportSummary }[]>`
      select private.finish_industrial_import(
        ${options.reportingYear}::smallint,
        ${options.version},
        ${options.radiusM},
        ${options.suspectCenterM}
      ) as summary
    `;
    return summary?.summary ?? { sites: 0, in_city_buffers: 0, suspect: 0, corrected: 0 };
  });
}

export async function listStoredSites(
  sql: Sql,
  version: string,
  reportingYear: number,
): Promise<StoredSite[]> {
  const rows = await sql<StoredSite[]>`
    select
      id,
      sector_code,
      is_top_emitter,
      air_releases <> '{}'::jsonb as has_air_releases,
      city_id,
      coordinate_status
    from private.industrial_sites
    where source_version = ${version} and reporting_year = ${reportingYear}
  `;
  return [...rows];
}

export async function listCellSitePairs(
  sql: Sql,
  options: {
    snapshotId: string;
    cityId: string;
    reportingYear: number;
    version: string;
    radiusM: number;
  },
): Promise<CellSitePair[]> {
  const rows = await sql<CellSitePair[]>`
    select cell_id, site_id, distance_m
    from private.industrial_sites_near_cells(
      ${options.snapshotId},
      ${options.cityId},
      ${options.reportingYear}::smallint,
      ${options.version},
      ${options.radiusM}
    )
  `;
  return [...rows];
}

export async function listCityCells(
  sql: Sql,
  snapshotId: string,
  cityId: string,
): Promise<string[]> {
  const rows = await sql<{ cell_id: string }[]>`
    select cs.cell_id
    from private.cell_scores cs
    join private.grid_cells g on g.id = cs.cell_id
    where cs.snapshot_id = ${snapshotId} and g.city_id = ${cityId}
  `;
  return rows.map((row) => row.cell_id);
}

export async function writeIndustryStats(
  sql: Sql,
  snapshotId: string,
  stats: JsonObject,
): Promise<void> {
  await sql`
    update public.score_snapshots
    set stats = stats || jsonb_build_object('industry', ${sql.json(stats)}::jsonb)
    where id = ${snapshotId}
  `;
}

export type NearbySite = {
  site_id: string;
  name: string;
  sector_code: SectorCode;
  impact_codes: string[];
  is_top_emitter: boolean;
  has_air_releases: boolean;
  reporting_year: number;
  distance_m: number;
  bearing_deg: number | null;
  longitude: number;
  latitude: number;
};

export async function listSitesNear(
  sql: Sql,
  options: {
    longitude: number;
    latitude: number;
    reportingYear: number;
    version: string;
    radiusM: number;
  },
): Promise<NearbySite[]> {
  const rows = await sql<NearbySite[]>`
    select
      site_id, name, sector_code, impact_codes, is_top_emitter, has_air_releases,
      reporting_year::integer as reporting_year, distance_m, bearing_deg, longitude, latitude
    from private.industrial_sites_near(
      extensions.st_point(${options.longitude}, ${options.latitude}, 4326)::extensions.geography,
      ${options.reportingYear}::smallint,
      ${options.version},
      ${options.radiusM}
    )
  `;
  return [...rows];
}
