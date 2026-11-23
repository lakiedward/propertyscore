import type { JsonObject, Sql, SqlQueries } from '../db/sql.ts';
import { WorkerError } from '../lib/errors.ts';
import type { AddressScores } from './address-scores.ts';
import type { DeclaredDetails } from './declared.ts';

export type StartedReport = {
  snapshotId: string;
  cellId: string;
  citySlug: string;
  latitude: number;
  longitude: number;
  params: unknown;
  weights: unknown;
};

export type ReportRequest = {
  ownerEmail: string;
  latitude: number;
  longitude: number;
  addressText: string;
  locale: 'ro' | 'en';
  declared?: DeclaredDetails;
};

export async function beginReport(sql: Sql, reportId: string): Promise<StartedReport> {
  const [row] = await sql<
    {
      snapshot_id: string;
      cell_id: string;
      city_slug: string;
      latitude: number;
      longitude: number;
      params: unknown;
      weights: unknown;
    }[]
  >`
    select started.*, v.params, v.weights
    from private.begin_online_report(${reportId}) as started
    join public.score_snapshots s on s.id = started.snapshot_id
    join public.scoring_versions v on v.id = s.scoring_version_id
  `;
  if (!row) throw new WorkerError('report_not_started', 'begin_online_report returned no row');
  return {
    snapshotId: row.snapshot_id,
    cellId: row.cell_id,
    citySlug: row.city_slug,
    latitude: row.latitude,
    longitude: row.longitude,
    params: row.params,
    weights: row.weights,
  };
}

export async function completeReport(
  sql: SqlQueries,
  reportId: string,
  started: StartedReport,
  sections: JsonObject,
  scores: AddressScores,
): Promise<void> {
  await sql`
    select private.complete_online_report(
      ${reportId}, ${started.snapshotId}, ${started.cellId}, ${sql.json(sections)}::jsonb,
      ${sql.json(scores)}::jsonb
    )
  `;
}

export async function failReport(sql: Sql, reportId: string, code: string): Promise<void> {
  await sql`select private.fail_online_report(${reportId}, ${code})`;
}

export async function insertReport(sql: Sql, request: ReportRequest): Promise<string> {
  const [owner] = await sql<{ id: string }[]>`
    select id from auth.users where lower(email) = lower(${request.ownerEmail})
  `;
  if (!owner) throw new WorkerError('report_owner_not_found', 'No user with this email');

  const [city] = await sql<{ id: string }[]>`
    select id
    from public.cities
    where has_online_coverage
      and extensions.st_intersects(
        boundary,
        extensions.st_point(${request.longitude}, ${request.latitude}, 4326)::extensions.geography
      )
    order by position
    limit 1
  `;
  if (!city) throw new WorkerError('outside_coverage', 'The address is in no covered city');

  const declared = request.declared;
  const [report] = await sql<{ id: string }[]>`
    insert into public.online_reports (
      owner_id, city_id, location, address_text, locale,
      declared_area_m2, declared_rooms, declared_floor, declared_building_floors,
      declared_has_elevator, declared_construction_year
    )
    values (
      ${owner.id},
      ${city.id},
      extensions.st_point(${request.longitude}, ${request.latitude}, 4326)::extensions.geography,
      ${request.addressText},
      ${request.locale},
      ${declared?.areaM2 ?? null},
      ${declared?.rooms ?? null},
      ${declared?.floor ?? null},
      ${declared?.buildingFloors ?? null},
      ${declared?.hasElevator ?? null},
      ${declared?.constructionYear ?? null}
    )
    returning id
  `;
  if (!report) throw new WorkerError('report_not_created', 'The report row was not created');
  return report.id;
}
