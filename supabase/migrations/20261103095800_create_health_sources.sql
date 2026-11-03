create type private.emergency_level as enum ('upu', 'cpu');
create type private.cnas_provider_kind as enum ('pharmacy', 'family_doctor', 'specialist_outpatient', 'hospital', 'dentist');

create table private.emergency_hospitals (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 300),
  location extensions.geography(Point, 4326) not null,
  level private.emergency_level not null,
  is_pediatric boolean not null default false,
  osm_id bigint check (osm_id > 0),
  source_ref text not null check (char_length(source_ref) between 1 and 500),
  valid_from date not null,
  valid_to date,
  updated_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint emergency_hospitals_valid_range check (valid_to is null or valid_to > valid_from)
);

comment on table private.emergency_hospitals is 'Hospitals with an emergency unit (UPU or CPU) per city, from the Ministry of Health orders; the Health score routes to them by car.';

create index emergency_hospitals_city_id_idx on private.emergency_hospitals (city_id, valid_from);
create index emergency_hospitals_location_idx on private.emergency_hospitals using gist (location);
create index emergency_hospitals_updated_by_idx on private.emergency_hospitals (updated_by);

alter table private.emergency_hospitals enable row level security;

create trigger emergency_hospitals_set_updated_at
  before update on private.emergency_hospitals
  for each row execute function private.set_updated_at();

create table private.cnas_providers (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities (id) on delete cascade,
  kind private.cnas_provider_kind not null,
  name text not null check (char_length(name) between 1 and 300),
  address text check (char_length(address) between 1 and 500),
  location extensions.geography(Point, 4326),
  list_date date not null,
  source_ref text not null check (char_length(source_ref) between 1 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table private.cnas_providers is 'Providers under contract with the county health insurance houses (CAS), imported per city and list date; location stays null until the address is geocoded.';

create index cnas_providers_city_kind_idx on private.cnas_providers (city_id, kind, list_date);
create index cnas_providers_location_idx on private.cnas_providers using gist (location);

alter table private.cnas_providers enable row level security;

create trigger cnas_providers_set_updated_at
  before update on private.cnas_providers
  for each row execute function private.set_updated_at();

create function private.list_emergency_hospitals(p_city_id uuid, p_on date)
returns table (
  id uuid,
  name text,
  level private.emergency_level,
  is_pediatric boolean,
  osm_id bigint,
  source_ref text,
  valid_from date,
  longitude double precision,
  latitude double precision
)
language sql
stable
set search_path = ''
as $$
  select
    h.id,
    h.name,
    h.level,
    h.is_pediatric,
    h.osm_id,
    h.source_ref,
    h.valid_from,
    extensions.st_x(h.location::extensions.geometry),
    extensions.st_y(h.location::extensions.geometry)
  from private.emergency_hospitals h
  where h.city_id = p_city_id
    and h.valid_from <= p_on
    and (h.valid_to is null or h.valid_to > p_on)
  order by h.name, h.id;
$$;

create function private.list_cnas_providers(p_city_id uuid, p_on date)
returns table (
  id uuid,
  kind private.cnas_provider_kind,
  name text,
  list_date date,
  longitude double precision,
  latitude double precision
)
language sql
stable
set search_path = ''
as $$
  with latest as (
    select p.kind, max(p.list_date) as list_date
    from private.cnas_providers p
    where p.city_id = p_city_id and p.list_date <= p_on
    group by p.kind
  )
  select
    p.id,
    p.kind,
    p.name,
    p.list_date,
    extensions.st_x(p.location::extensions.geometry),
    extensions.st_y(p.location::extensions.geometry)
  from private.cnas_providers p
  join latest on latest.kind = p.kind and latest.list_date = p.list_date
  where p.city_id = p_city_id
  order by p.kind, p.name, p.id;
$$;

update public.scoring_versions
set params = params || jsonb_build_object('health', '{
  "walk_speed_kmh": 4.8,
  "walk_detour_factor": 1.3,
  "car_speed_kmh": 30,
  "car_detour_factor": 1.4,
  "osm_cnas_match_radius_m": 50,
  "search_radius_m": 2500,
  "max_candidates": 12,
  "car_search_radius_m": 30000,
  "car_max_candidates": 3,
  "layers": {
    "h1": { "weight": 25, "nearest": { "full_at_min": 3, "zero_at_min": 15 }, "nearest_share": 0.6, "count_within_min": 10, "count_full_at": 4 },
    "h2": { "weight": 25, "nearest": { "full_at_min": 5, "zero_at_min": 20 }, "nearest_share": 0.6, "count_within_min": 15, "count_full_at": 5 },
    "h3": { "weight": 15, "nearest": { "full_at_min": 8, "zero_at_min": 25 }, "nearest_share": 0.5, "count_within_min": 15, "count_full_at": 3 },
    "h4": { "weight": 25, "nearest": { "full_at_min": 8, "zero_at_min": 30 } },
    "h5": { "weight": 10, "nearest": { "full_at_min": 10, "zero_at_min": 30 }, "car_only_points": 0.5, "car_only_max_min": 10 }
  }
}'::jsonb)
where kind = 'online' and label = 'v1';
