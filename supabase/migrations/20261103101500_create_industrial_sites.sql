create table private.industrial_sites (
  id uuid primary key default gen_random_uuid(),
  source_facility_id text not null check (char_length(source_facility_id) between 1 and 200),
  reporting_year smallint not null check (reporting_year between 2007 and 2100),
  name text not null check (char_length(name) between 1 and 300),
  location extensions.geography(Point, 4326) not null,
  reported_location extensions.geography(Point, 4326) not null,
  city_id uuid references public.cities (id) on delete set null,
  sector_code text not null check (
    sector_code in (
      'energy', 'metals', 'minerals', 'chemicals', 'waste_water',
      'paper_wood', 'livestock', 'food', 'other'
    )
  ),
  main_activity_code text not null check (char_length(main_activity_code) between 1 and 40),
  impact_codes text[] not null default '{}' check (
    impact_codes <@ array['air', 'water', 'odour', 'seasonal_winter']::text[]
  ),
  air_releases jsonb not null default '{}' check (jsonb_typeof(air_releases) = 'object'),
  is_top_emitter boolean not null default false,
  is_seveso boolean,
  coordinate_status text not null default 'ok' check (coordinate_status in ('ok', 'suspect', 'corrected')),
  source_version text not null check (char_length(source_version) between 1 and 40),
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint industrial_sites_facility_year_key unique (source_facility_id, reporting_year)
);

comment on table private.industrial_sites is 'Romanian facilities from the EEA industrial emissions register (IED / E-PRTR), one row per facility and reporting year; the Industry score input.';

create index industrial_sites_location_idx on private.industrial_sites using gist (location);
create index industrial_sites_year_idx on private.industrial_sites (reporting_year, source_version);
create index industrial_sites_city_id_idx on private.industrial_sites (city_id);

alter table private.industrial_sites enable row level security;

create trigger industrial_sites_set_updated_at
  before update on private.industrial_sites
  for each row execute function private.set_updated_at();

revoke all on private.industrial_sites from anon, authenticated;

create table private.industrial_site_overrides (
  id uuid primary key default gen_random_uuid(),
  source_facility_id text not null unique check (char_length(source_facility_id) between 1 and 200),
  location extensions.geography(Point, 4326),
  name_override text check (char_length(name_override) between 1 and 300),
  note text check (char_length(note) between 1 and 1000),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint industrial_site_overrides_changes_something check (location is not null or name_override is not null)
);

comment on table private.industrial_site_overrides is 'Manual corrections of EEA facility positions and names, applied again after every import.';

create index industrial_site_overrides_created_by_idx on private.industrial_site_overrides (created_by);

alter table private.industrial_site_overrides enable row level security;

create trigger industrial_site_overrides_set_updated_at
  before update on private.industrial_site_overrides
  for each row execute function private.set_updated_at();

revoke all on private.industrial_site_overrides from anon, authenticated;

create function private.finish_industrial_import(
  p_reporting_year smallint,
  p_source_version text,
  p_radius_m integer,
  p_suspect_center_m integer
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  update private.industrial_sites s
  set
    location = s.reported_location,
    coordinate_status = 'ok',
    city_id = null
  where s.reporting_year = p_reporting_year and s.source_version = p_source_version;

  update private.industrial_sites s
  set coordinate_status = 'suspect'
  where s.reporting_year = p_reporting_year
    and s.source_version = p_source_version
    and (
      exists (
        select 1
        from private.industrial_sites other
        where other.reporting_year = s.reporting_year
          and other.source_version = s.source_version
          and other.id <> s.id
          and extensions.st_dwithin(other.reported_location, s.reported_location, 1)
      )
      or exists (
        select 1
        from public.cities c
        where extensions.st_dwithin(c.center, s.reported_location, p_suspect_center_m)
      )
    );

  update private.industrial_sites s
  set
    location = coalesce(o.location, s.location),
    name = coalesce(o.name_override, s.name),
    coordinate_status = case when o.location is not null then 'corrected' else s.coordinate_status end
  from private.industrial_site_overrides o
  where o.source_facility_id = s.source_facility_id
    and s.reporting_year = p_reporting_year
    and s.source_version = p_source_version;

  update private.industrial_sites s
  set city_id = (
    select c.id
    from public.cities c
    where c.has_online_coverage
      and extensions.st_dwithin(c.boundary, s.location, p_radius_m)
    order by extensions.st_distance(c.boundary, s.location), c.position
    limit 1
  )
  where s.reporting_year = p_reporting_year and s.source_version = p_source_version;

  select jsonb_build_object(
    'sites', count(*),
    'in_city_buffers', count(*) filter (where s.city_id is not null),
    'suspect', count(*) filter (where s.coordinate_status = 'suspect'),
    'corrected', count(*) filter (where s.coordinate_status = 'corrected')
  )
  into v_result
  from private.industrial_sites s
  where s.reporting_year = p_reporting_year and s.source_version = p_source_version;

  return v_result;
end;
$$;

create function private.industrial_sites_near_cells(
  p_snapshot_id uuid,
  p_city_id uuid,
  p_reporting_year smallint,
  p_source_version text,
  p_radius_m integer
)
returns table (cell_id uuid, site_id uuid, distance_m double precision)
language sql
stable
set search_path = ''
as $$
  select cs.cell_id, s.id, extensions.st_distance(g.center, s.location)
  from private.cell_scores cs
  join private.grid_cells g on g.id = cs.cell_id
  join private.industrial_sites s
    on s.reporting_year = p_reporting_year
    and s.source_version = p_source_version
    and extensions.st_dwithin(g.center, s.location, p_radius_m)
  where cs.snapshot_id = p_snapshot_id and g.city_id = p_city_id
  order by cs.cell_id, 3;
$$;

create function private.industrial_sites_near(
  p_location extensions.geography,
  p_reporting_year smallint,
  p_source_version text,
  p_radius_m integer
)
returns table (
  site_id uuid,
  name text,
  sector_code text,
  impact_codes text[],
  is_top_emitter boolean,
  has_air_releases boolean,
  reporting_year smallint,
  distance_m double precision,
  bearing_deg double precision,
  longitude double precision,
  latitude double precision
)
language sql
stable
set search_path = ''
as $$
  select
    s.id,
    s.name,
    s.sector_code,
    s.impact_codes,
    s.is_top_emitter,
    s.air_releases <> '{}'::jsonb,
    s.reporting_year,
    extensions.st_distance(p_location, s.location),
    degrees(extensions.st_azimuth(p_location, s.location)),
    extensions.st_x(s.location::extensions.geometry),
    extensions.st_y(s.location::extensions.geometry)
  from private.industrial_sites s
  where s.reporting_year = p_reporting_year
    and s.source_version = p_source_version
    and extensions.st_dwithin(p_location, s.location, p_radius_m)
  order by 8, s.id;
$$;

update public.scoring_versions
set params = params || jsonb_build_object(
  'industry',
  '{
    "dataset": {
      "url": "https://sdi.eea.europa.eu/datashare/s/sptXqwkQr5g7Bp5/download?path=%2Feea_t_ied-eprtr_p_2007-2024_v16_r00&files=User%20friendly%20.csv%20files.zip",
      "version": "v16",
      "country": "Romania"
    },
    "radius_m": 5000,
    "decay": [[300, 3], [1000, 1], [3000, 0.15], [5000, 0]],
    "k": 0.14,
    "sector_weights": {
      "energy": 1.2,
      "metals": 1.3,
      "chemicals": 1.3,
      "minerals": 1.2,
      "waste_water": 0.8,
      "paper_wood": 0.9,
      "livestock": 0.8,
      "food": 0.6,
      "other": 0.7
    },
    "emission_multipliers": {"none": 0.6, "reported": 1, "top": 1.5},
    "air_pollutants": ["nh3", "nox", "sox", "pm10", "pm2_5", "nmvoc", "co", "pcdd_pcdf", "benzene", "hg", "pb", "cd", "as", "ni", "cr", "zn", "pah", "hcl", "hf"],
    "top_emitter_pollutants": ["pm10", "nox", "sox", "nmvoc"],
    "top_emitter_share": 0.1,
    "odour_sectors": ["waste_water", "livestock"],
    "winter_activities": ["1(c)"],
    "suspect_center_m": 150,
    "near_m": 1000
  }'::jsonb
)
where kind = 'online' and label = 'v1';
