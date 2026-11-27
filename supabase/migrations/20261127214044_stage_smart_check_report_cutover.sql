set local lock_timeout = '1s';

create table private.report_industry_snapshot_inputs (
  snapshot_id uuid not null references public.score_snapshots(id) on delete cascade,
  site_id uuid not null,
  name text not null,
  location extensions.geography(Point,4326) not null,
  sector_code text not null,
  impact_codes text[] not null,
  is_top_emitter boolean not null,
  has_air_releases boolean not null,
  city_id uuid,
  coordinate_status text not null,
  reporting_year smallint not null,
  primary key (snapshot_id, site_id)
);
create index report_industry_snapshot_location_idx on private.report_industry_snapshot_inputs using gist (location);

create table private.industry_snapshot_source (
  snapshot_id uuid primary key references public.score_snapshots(id) on delete cascade,
  reporting_year smallint,
  legacy_observed_at timestamptz,
  imports_opened_at timestamptz,
  check (imports_opened_at is null or (legacy_observed_at is not null and imports_opened_at >= legacy_observed_at))
);

create index report_education_snapshot_poi_idx on private.poi_features (snapshot_id, (tags->>'institution_id'))
  where tags ? 'institution_id';

alter table private.report_industry_snapshot_inputs enable row level security;
alter table private.industry_snapshot_source enable row level security;
revoke all on private.report_industry_snapshot_inputs, private.industry_snapshot_source
  from public, anon, authenticated, service_role;

create function private.serialize_report_snapshot_writes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock_shared(pg_catalog.hashtext('propertyscore.snapshot') & 2147483647, 3);
  return null;
end
$$;

create function private.require_unpublished_report_snapshot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old_snapshot uuid;
  v_new_snapshot uuid;
begin
  if tg_op <> 'INSERT' then v_old_snapshot := old.snapshot_id; end if;
  if tg_op <> 'DELETE' then v_new_snapshot := new.snapshot_id; end if;
  if exists (
    select from public.score_snapshots s
    join private.industry_snapshot_source i on i.snapshot_id = s.id
    where s.id in (v_old_snapshot, v_new_snapshot) and s.status in ('ready', 'superseded')
  ) then
    raise exception using errcode = 'P0001', message = 'snapshot_score_not_building';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end
$$;

revoke all on function private.serialize_report_snapshot_writes(), private.require_unpublished_report_snapshot()
  from public, anon, authenticated, service_role;

create trigger serialize_report_cell_scores before insert or update or delete on private.cell_scores
  for each statement execute function private.serialize_report_snapshot_writes();
create trigger require_unpublished_cell_scores before insert or update or delete on private.cell_scores
  for each row execute function private.require_unpublished_report_snapshot();
create trigger serialize_report_poi before insert or update or delete on private.poi_features
  for each statement execute function private.serialize_report_snapshot_writes();
create trigger require_unpublished_poi before insert or update or delete on private.poi_features
  for each row execute function private.require_unpublished_report_snapshot();

create function private.freeze_checkpoint_industry_inputs(p_snapshot_id uuid, p_industry_year smallint)
returns smallint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version text;
  v_year smallint;
begin
  perform pg_catalog.pg_advisory_xact_lock_shared(pg_catalog.hashtext('propertyscore.snapshot') & 2147483647, 3);
  select v.params #>> '{industry,dataset,version}' into strict v_version
  from public.score_snapshots s join public.scoring_versions v on v.id=s.scoring_version_id
  where s.id=p_snapshot_id and s.status='building'
  for update of s;

  select reporting_year into v_year from private.industry_snapshot_source where snapshot_id=p_snapshot_id;
  if found then return v_year; end if;
  insert into private.industry_snapshot_source(snapshot_id, reporting_year) values (p_snapshot_id, p_industry_year);
  insert into private.report_industry_snapshot_inputs
    (snapshot_id, site_id, name, location, sector_code, impact_codes, is_top_emitter, has_air_releases,
     city_id, coordinate_status, reporting_year)
  select p_snapshot_id, s.id, s.name, s.location, s.sector_code, s.impact_codes,
    s.is_top_emitter, s.air_releases<>'{}'::jsonb, s.city_id, s.coordinate_status, s.reporting_year
  from private.industrial_sites s
  where s.source_version=v_version and s.reporting_year=p_industry_year;
  return p_industry_year;
end
$$;

revoke all on function private.freeze_checkpoint_industry_inputs(uuid, smallint) from public, anon, authenticated, service_role;

create table private.legacy_report_institutions (
  snapshot_id uuid not null references private.industry_snapshot_source(snapshot_id) on delete cascade,
  institution_id uuid not null,
  name text,
  location extensions.geography(Point,4326) not null,
  levels text[] not null,
  ownership text not null,
  primary key (snapshot_id,institution_id)
);
alter table private.legacy_report_institutions enable row level security;
revoke all on private.legacy_report_institutions from public, anon, authenticated, service_role;

create function private.require_report_cutover_for_import()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock_shared(pg_catalog.hashtext('propertyscore.snapshot') & 2147483647, 4);
  if exists (
    select from public.score_snapshots s
    join private.industry_snapshot_source i on i.snapshot_id = s.id
    where s.status = 'ready' and i.legacy_observed_at is not null and i.imports_opened_at is null
  ) then
    raise exception using errcode='P0001',message='smart_check_cutover_imports_closed';
  end if;
  return null;
end
$$;
revoke all on function private.require_report_cutover_for_import() from public, anon, authenticated, service_role;

create trigger require_report_cutover_for_build before insert on public.score_snapshots
  for each statement execute function private.require_report_cutover_for_import();
create trigger require_report_cutover_for_industry before insert or update or delete or truncate on private.industrial_sites
  for each statement execute function private.require_report_cutover_for_import();
create trigger require_report_cutover_for_education_import before insert or delete or truncate on private.education_institutions
  for each statement execute function private.require_report_cutover_for_import();
create trigger require_report_cutover_for_education_details before update of id,name,levels,ownership,location
  on private.education_institutions for each statement execute function private.require_report_cutover_for_import();

create function private.require_captured_inputs_for_publication()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and old.status = 'ready' and new.status <> 'ready' and exists (
    select from private.industry_snapshot_source
    where snapshot_id = old.id and legacy_observed_at is not null and imports_opened_at is null
  ) then
    raise exception using errcode='P0001',message='smart_check_cutover_imports_closed';
  end if;
  if new.status = 'ready' and exists (
    select from public.score_snapshots s
    join private.industry_snapshot_source i on i.snapshot_id = s.id
    where s.status in ('ready', 'superseded') or s.id = new.id
  ) and not exists (
    select from private.industry_snapshot_source
    where snapshot_id = new.id and legacy_observed_at is null
      and reporting_year is not distinct from (new.source_dates ->> 'eea_industrial_year')::smallint
  ) then
    raise exception using errcode='P0001',message='smart_check_cutover_missing_candidate_inputs';
  end if;
  return new;
end
$$;
revoke all on function private.require_captured_inputs_for_publication() from public, anon, authenticated, service_role;
create trigger require_captured_inputs_for_publication before insert or update of status on public.score_snapshots
  for each row execute function private.require_captured_inputs_for_publication();

create function private.capture_legacy_report_cutover(p_expected_snapshot uuid)
returns timestamptz
language plpgsql
set search_path = ''
as $$
declare
  v_version text;
  v_year smallint;
  v_observed timestamptz;
begin
  if not pg_catalog.pg_try_advisory_xact_lock(pg_catalog.hashtext('propertyscore.snapshot') & 2147483647, 4)
    or not pg_catalog.pg_try_advisory_xact_lock(pg_catalog.hashtext('propertyscore.snapshot') & 2147483647, 3) then
    raise exception using errcode='55P03',message='smart_check_cutover_busy';
  end if;
  select v.params #>> '{industry,dataset,version}' into v_version
  from public.score_snapshots s join public.scoring_versions v on v.id=s.scoring_version_id
  where s.id=p_expected_snapshot and s.status='ready'
  for update of s nowait;
  if not found then
    raise exception using errcode='P0001',message='smart_check_cutover_snapshot_changed';
  end if;
  select legacy_observed_at into v_observed from private.industry_snapshot_source where snapshot_id=p_expected_snapshot;
  if found then
    if v_observed is null then
      raise exception using errcode='P0001',message='smart_check_cutover_not_legacy';
    end if;
    return v_observed;
  end if;
  if exists (select from public.score_snapshots where status = 'building') then
    raise exception using errcode='P0001',message='smart_check_cutover_snapshot_building';
  end if;
  lock table private.industrial_sites, private.education_institutions in share mode nowait;
  select max(reporting_year) into v_year from private.industrial_sites where source_version=v_version;
  v_observed := pg_catalog.date_trunc('milliseconds',pg_catalog.clock_timestamp());
  insert into private.industry_snapshot_source(snapshot_id,reporting_year,legacy_observed_at)
  values (p_expected_snapshot,v_year,v_observed);
  insert into private.report_industry_snapshot_inputs
    (snapshot_id,site_id,name,location,sector_code,impact_codes,is_top_emitter,has_air_releases,
     city_id,coordinate_status,reporting_year)
  select p_expected_snapshot,s.id,s.name,s.location,s.sector_code,s.impact_codes,
    s.is_top_emitter,s.air_releases<>'{}'::jsonb,s.city_id,s.coordinate_status,s.reporting_year
  from private.industrial_sites s where s.source_version=v_version and s.reporting_year=v_year;
  insert into private.legacy_report_institutions(snapshot_id,institution_id,name,location,levels,ownership)
  with wanted as (
    select distinct n.id::uuid
    from private.cell_scores s
    cross join lateral pg_catalog.jsonb_array_elements_text(case
      when pg_catalog.jsonb_typeof(s.inputs #> '{education,nearest_ids}')='array' then s.inputs #> '{education,nearest_ids}'
      else '[]'::jsonb end) n(id)
    where s.snapshot_id=p_expected_snapshot and pg_catalog.jsonb_typeof(s.categories->'education')='number'
  )
  select p_expected_snapshot,i.id,i.name,i.location,i.levels::text[],i.ownership
  from private.education_institutions i join wanted w on w.id=i.id where i.location is not null;
  return v_observed;
end
$$;

create function private.open_legacy_report_cutover(p_expected_snapshot uuid, p_observed_at timestamptz)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if not pg_catalog.pg_try_advisory_xact_lock(pg_catalog.hashtext('propertyscore.snapshot') & 2147483647, 4) then
    raise exception using errcode='55P03',message='smart_check_cutover_busy';
  end if;
  perform from public.score_snapshots s where s.id=p_expected_snapshot and s.status='ready' for update nowait;
  if not found then
    raise exception using errcode='P0001',message='smart_check_cutover_snapshot_changed';
  end if;
  update private.industry_snapshot_source
  set imports_opened_at=coalesce(imports_opened_at,pg_catalog.clock_timestamp())
  where snapshot_id=p_expected_snapshot and legacy_observed_at=p_observed_at;
  if not found then
    raise exception using errcode='P0001',message='smart_check_cutover_cutoff_changed';
  end if;
end
$$;
revoke all on function private.capture_legacy_report_cutover(uuid),
  private.open_legacy_report_cutover(uuid,timestamptz) from public, anon, authenticated, service_role;

create function private.publish_checkpointed_score_snapshot(
  p_snapshot_id uuid,
  p_execution_id uuid,
  p_source_dates jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_generation uuid;
  v_ledger uuid;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('propertyscore.snapshot') & 2147483647, 3);
  perform from public.score_snapshots s
    where s.id = p_snapshot_id and s.status = 'building' and s.uses_worker_lock
    for update;
  if not found or not exists (
    select from private.score_snapshot_lock_holders() h(pid) where h.pid = pg_catalog.pg_backend_pid()
  ) then
    raise exception using errcode = 'P0001', message = 'snapshot_guard_unconfirmed';
  end if;

  select g.id, g.valhalla_ledger_id into v_generation, v_ledger
    from private.score_snapshot_generations g
    where g.snapshot_id = p_snapshot_id order by g.generation desc limit 1;
  if v_generation is null or v_generation is distinct from p_execution_id then
    raise exception using errcode = 'P0001', message = 'snapshot_generation_changed';
  end if;
  if v_ledger is null then
    raise exception using errcode = 'P0001', message = 'snapshot_valhalla_unconfirmed';
  end if;
  if not exists (
    select from private.score_snapshot_steps where snapshot_id = p_snapshot_id
  ) or exists (
    select from private.score_snapshot_steps where snapshot_id = p_snapshot_id and completed_at is null
  ) then
    raise exception using errcode = 'P0001', message = 'snapshot_steps_missing';
  end if;

  perform private.compute_overall_scores(p_snapshot_id);
  perform private.compute_snapshot_stats(p_snapshot_id);
  perform private.publish_score_snapshot(p_snapshot_id, p_source_dates);
  update public.score_snapshots set routing_pending = false where id = p_snapshot_id;
end
$$;

revoke all on function private.publish_checkpointed_score_snapshot(uuid,uuid,jsonb)
  from public, anon, authenticated, service_role;

do $$
begin
  if not exists (select from pg_catalog.pg_roles where rolname = 'smart_check_report_worker') then
    create role smart_check_report_worker nologin nosuperuser nobypassrls;
  end if;
  if not exists (select from pg_catalog.pg_roles where rolname = 'smart_check_snapshot_worker') then
    create role smart_check_snapshot_worker nologin nosuperuser nobypassrls;
  end if;
  if exists (
    select from pg_catalog.pg_roles
    where rolname in ('smart_check_report_worker', 'smart_check_snapshot_worker')
      and (rolcanlogin or rolsuper or rolcreaterole or rolcreatedb or rolreplication or rolbypassrls)
  ) then
    raise exception 'smart_check_worker_role_not_restricted';
  end if;
end
$$;

revoke execute on function private.handle_new_user() from public;
grant usage on schema public, private, extensions to smart_check_report_worker, smart_check_snapshot_worker;
grant usage on schema snapshot_diagnostics to smart_check_snapshot_worker;
grant execute on function snapshot_diagnostics.read_score_snapshot_progress(uuid) to smart_check_snapshot_worker;
grant execute on function private.start_score_snapshot(date, boolean),
  private.score_snapshot_lock_holders(), private.hold_score_snapshot(uuid, integer),
  private.freeze_checkpoint_industry_inputs(uuid, smallint),
  private.publish_checkpointed_score_snapshot(uuid, uuid, jsonb) to smart_check_snapshot_worker;

grant select on public.cities, public.scoring_versions, public.score_snapshots,
  public.online_reports to smart_check_report_worker;
grant select on private.online_report_pdf_variants to smart_check_report_worker;
grant insert (report_id, locale, storage_path), update (storage_path, failed_at)
  on private.online_report_pdf_variants to smart_check_report_worker;
grant update (status, error_code, claim_expires_at, generation_attempts, snapshot_id,
  scoring_version_id, overall_score, category_scores, result, generated_at)
  on public.online_reports to smart_check_report_worker;

create or replace function private.attach_online_report_pdf(p_report_id uuid, p_pdf_path text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_path text;
begin
  select r.status, r.pdf_path into v_status, v_path
    from public.online_reports r where r.id = p_report_id for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'report_not_found';
  end if;
  if v_status <> 'ready' then
    raise exception using errcode = 'P0001', message = 'report_not_ready';
  end if;
  if p_pdf_path is distinct from private.online_report_pdf_path(p_report_id) then
    raise exception using errcode = 'P0001', message = 'report_pdf_path_invalid';
  end if;
  if v_path is null then
    update public.online_reports set pdf_path = p_pdf_path, claim_expires_at = null where id = p_report_id;
  end if;
end
$$;
revoke all on function private.attach_online_report_pdf(uuid,text) from public, anon, authenticated, service_role;

alter function private.claim_next_saved_report_walk_route() security definer;
alter function private.complete_saved_report_walk_route(uuid, uuid, text) security definer;
revoke all on function private.claim_next_saved_report_walk_route(),
  private.complete_saved_report_walk_route(uuid, uuid, text) from public, anon, authenticated, service_role;

grant execute on function private.claim_next_online_report(), private.extend_online_report_claim(uuid),
  private.online_report_pdf_path(uuid), private.attach_online_report_pdf(uuid, text),
  private.claim_next_saved_report_walk_route(), private.complete_saved_report_walk_route(uuid, uuid, text)
  to smart_check_report_worker;

create policy "Report worker reads reports" on public.online_reports for select to smart_check_report_worker using (true);
create policy "Report worker advances undelivered reports" on public.online_reports
  for update to smart_check_report_worker
  using (status in ('queued', 'generating') and pdf_path is null)
  with check (status in ('queued', 'generating', 'ready', 'failed'));
create policy "Report worker reads ready PDF variants" on private.online_report_pdf_variants
  for select to smart_check_report_worker
  using (exists (select from public.online_reports r where r.id = report_id and r.status = 'ready'));
create policy "Report worker creates ready PDF variants" on private.online_report_pdf_variants
  for insert to smart_check_report_worker
  with check (exists (select from public.online_reports r where r.id = report_id and r.status = 'ready'));
create policy "Report worker generates pending PDF variants" on private.online_report_pdf_variants
  for update to smart_check_report_worker using (storage_path is null and failed_at is null)
  with check (exists (select from public.online_reports r where r.id = report_id and r.status = 'ready'));

create policy "Report worker reads covered cities" on public.cities for select to smart_check_report_worker
  using (has_online_coverage);
create policy "Report worker reads online formulas" on public.scoring_versions for select to smart_check_report_worker
  using (kind = 'online');
create policy "Report worker reads published snapshots" on public.score_snapshots
  for select to smart_check_report_worker using (status in ('ready', 'superseded'));

do $$
declare
  rel text;
  row_filter text;
begin
  for rel in select unnest(array[
    'grid_cells', 'industrial_sites', 'education_institutions',
    'key_destinations', 'noise_datasets', 'noise_contours',
    'market_imports', 'market_listings', 'market_area_statistics', 'market_city_averages', 'seismic_zones'
  ]) loop
    execute format('grant select on private.%I to smart_check_report_worker', rel);
    execute format('create policy "Report worker reads reference data" on private.%I for select to smart_check_report_worker using (true)', rel);
  end loop;

  for rel in select unnest(array[
    'cell_scores', 'poi_features', 'cell_air', 'air_city_calibration', 'cell_walk_access', 'city_category_stats',
    'green_areas', 'green_area_sources', 'cell_transit', 'transit_routing_bundles', 'transit_stops', 'transit_routes',
    'transit_stop_routes', 'noise_buildings', 'noise_sources', 'noise_snapshot_datasets', 'safety_features',
    'industry_snapshot_source', 'report_industry_snapshot_inputs', 'legacy_report_institutions'
  ]) loop
    row_filter := format('exists (select from public.score_snapshots s where s.id = %I.snapshot_id and s.status in (''ready'', ''superseded''))', rel);
    execute format('grant select on private.%I to smart_check_report_worker', rel);
    execute format('create policy "Report worker reads published inputs" on private.%I for select to smart_check_report_worker using (%s)', rel, row_filter);
  end loop;
end
$$;

grant select on public.cities, public.scoring_versions, public.score_snapshots to smart_check_snapshot_worker;
grant update (id) on public.scoring_versions to smart_check_snapshot_worker;
grant insert (scoring_version_id, period, uses_worker_lock), update (stats, status, finished_at, error_code, routing_pending)
  on public.score_snapshots to smart_check_snapshot_worker;
create policy "Snapshot worker reads covered cities" on public.cities
  for select to smart_check_snapshot_worker using (has_online_coverage);
create policy "Snapshot worker reads online formulas" on public.scoring_versions
  for select to smart_check_snapshot_worker using (kind = 'online');
create policy "Snapshot worker locks the active online formula" on public.scoring_versions
  for update to smart_check_snapshot_worker using (kind = 'online' and is_active) with check (false);
create policy "Snapshot worker reads snapshot state" on public.score_snapshots
  for select to smart_check_snapshot_worker using (true);
create policy "Snapshot worker starts a building snapshot" on public.score_snapshots
  for insert to smart_check_snapshot_worker with check (status = 'building');
create policy "Snapshot worker updates its build or marks it failed" on public.score_snapshots
  for update to smart_check_snapshot_worker
  using (status = 'building') with check (status in ('building', 'failed'));

grant select, insert on private.grid_cells to smart_check_snapshot_worker;
create policy "Snapshot worker reads covered grid cells" on private.grid_cells
  for select to smart_check_snapshot_worker using (exists (select from public.cities c where c.id = city_id and c.has_online_coverage));
create policy "Snapshot worker inserts covered grid cells" on private.grid_cells
  for insert to smart_check_snapshot_worker with check (exists (select from public.cities c where c.id = city_id and c.has_online_coverage));
grant select on private.key_destinations, private.transit_feed_sources to smart_check_snapshot_worker;
create policy "Snapshot worker reads active covered destinations" on private.key_destinations
  for select to smart_check_snapshot_worker using (is_active and exists (select from public.cities c where c.id = city_id and c.has_online_coverage));
create policy "Snapshot worker reads active covered transit sources" on private.transit_feed_sources
  for select to smart_check_snapshot_worker using (is_active and exists (select from public.cities c where c.id = city_id and c.has_online_coverage));

grant update (categories, inputs, overall, is_residential, safety_layers) on private.cell_scores to smart_check_snapshot_worker;
grant update (geometry) on private.residential_areas to smart_check_snapshot_worker;
grant update (operator, license, valid_from, valid_to, reference_date, feed_version, fetched_at, status, error_code, sha256)
  on private.transit_feeds to smart_check_snapshot_worker;
grant update (reference_date, osm_pbf, gtfs_archives) on private.transit_routing_bundles to smart_check_snapshot_worker;
grant update (valhalla_ledger_id) on private.score_snapshot_generations to smart_check_snapshot_worker;
grant update (started_at, started_by, completed_at, completed_by, result) on private.score_snapshot_steps to smart_check_snapshot_worker;
grant update (upstream_id, state, rejection_status, artifact_sha256) on private.score_snapshot_requests to smart_check_snapshot_worker;
grant update (location, coordinate_status, city_id, name) on private.industrial_sites to smart_check_snapshot_worker;
grant insert (city_id, siiir_code, parent_siiir_code, osm_ref, name, levels, ownership, teaching_languages,
  address_text, location, location_precision, match_status, source_date, last_seen_on),
  update (city_id, siiir_code, parent_siiir_code, osm_ref, name, levels, ownership, teaching_languages,
  address_text, location, location_precision, match_status, source_date, last_seen_on)
  on private.education_institutions to smart_check_snapshot_worker;
grant update (station_type, area_type, location, active_from, active_to)
  on private.air_stations to smart_check_snapshot_worker;
grant update (mean, valid_days, source, imported_at) on private.air_station_months to smart_check_snapshot_worker;

do $$
declare
  rel text;
  verb text;
  row_filter text;
  conditions text;
begin
  for rel, verb in
    select paths.rel, action.verb
    from (values
    ('cell_scores', 'select,insert,update'),
    ('residential_areas', 'select,insert,update'),
    ('safety_features', 'select,insert,delete'),
    ('poi_features', 'select,insert,delete'),
    ('cell_transit', 'select,insert,delete'),
    ('cell_travel_matrix', 'select,insert,delete'),
    ('transit_feeds', 'select,insert,update,delete'),
    ('transit_routes', 'select,insert,delete'),
    ('transit_stops', 'select,insert,delete'),
    ('transit_stop_routes', 'select,insert,delete'),
    ('transit_routing_bundles', 'select,insert,update,delete'),
    ('score_snapshot_generations', 'select,insert,update'),
    ('score_snapshot_steps', 'select,insert,update'),
    ('score_snapshot_requests', 'select,insert,update'),
    ('score_snapshot_progress', 'select,insert'),
    ('noise_buildings', 'select,insert,delete'),
    ('noise_sources', 'select,insert,delete'),
    ('noise_snapshot_datasets', 'select,insert,delete'),
    ('green_areas', 'select,insert,delete'),
    ('green_area_sources', 'select,insert,update'),
    ('cell_walk_access', 'select,insert,update'),
    ('city_category_stats', 'select,insert,update'),
    ('air_city_calibration', 'select,insert,update'),
    ('cell_air', 'select,insert,update'),
    ('industry_snapshot_source', 'select'),
    ('report_industry_snapshot_inputs', 'select')
    ) as paths(rel, verbs), lateral unnest(string_to_array(paths.verbs, ',')) as action(verb)
  loop
    row_filter := format('exists (select from public.score_snapshots s where s.id = %I.%I and s.status = ''building'')',
      rel, case when rel = 'score_snapshot_progress' then 'id' else 'snapshot_id' end);
    if rel in ('noise_buildings', 'transit_routing_bundles') and verb in ('select', 'delete') then
      row_filter := format('exists (select from public.score_snapshots s where s.id = %I.snapshot_id and s.status in (%s))',
        rel, case when rel = 'transit_routing_bundles' and verb = 'delete' then '''failed'', ''superseded'''
                 else '''building'', ''failed'', ''superseded''' end);
    end if;
    conditions := case when verb <> 'insert' then format(' using (%s)', row_filter) else '' end ||
                  case when verb in ('insert', 'update') then format(' with check (%s)', row_filter) else '' end;
    if verb <> 'update' or rel in ('green_area_sources', 'cell_walk_access', 'city_category_stats', 'air_city_calibration', 'cell_air') then
      execute format('grant %s on private.%I to smart_check_snapshot_worker', verb, rel);
    end if;
    execute format('create policy %I on private.%I for %s to smart_check_snapshot_worker%s',
      'Snapshot worker can ' || verb || ' build data', rel, verb, conditions);
  end loop;

  for rel, verb in
    select paths.rel, action.verb
    from (values
      ('industrial_sites', 'select,insert,update,delete'),
      ('education_institutions', 'select,insert,update,delete'),
      ('air_stations', 'select,insert,update'),
      ('air_station_months', 'select,insert,update'),
      ('industrial_site_overrides', 'select'),
      ('noise_datasets', 'select'),
      ('noise_contours', 'select'),
      ('cnas_providers', 'select'),
      ('emergency_hospitals', 'select')
    ) as paths(rel, verbs), lateral unnest(string_to_array(paths.verbs, ',')) as action(verb)
  loop
    conditions := case when rel = 'education_institutions' and verb = 'delete'
                       then ' using (siiir_code is null and osm_ref is not null and reviewed_at is null)'
                       when verb <> 'insert' then ' using (true)' else '' end ||
                  case when verb in ('insert', 'update') then ' with check (true)' else '' end;
    if verb <> 'update' and not (rel = 'education_institutions' and verb = 'insert') then
      execute format('grant %s on private.%I to smart_check_snapshot_worker', verb, rel);
    end if;
    execute format('create policy %I on private.%I for %s to smart_check_snapshot_worker%s',
      'Snapshot worker can ' || verb || ' its inputs', rel, verb, conditions);
  end loop;
end
$$;
