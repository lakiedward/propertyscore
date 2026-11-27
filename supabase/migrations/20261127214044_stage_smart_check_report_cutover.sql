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
