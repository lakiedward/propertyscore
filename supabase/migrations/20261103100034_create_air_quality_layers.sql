create table private.air_stations (
  id uuid primary key default gen_random_uuid(),
  eoi_code text not null unique check (eoi_code ~ '^[A-Z]{2}[0-9A-Z]{3,10}$'),
  city_id uuid references public.cities (id) on delete set null,
  station_type text not null check (station_type in ('traffic', 'background', 'industrial')),
  area_type text not null check (area_type in ('urban', 'suburban', 'rural')),
  location extensions.geography(Point, 4326) not null,
  active_from date,
  active_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint air_stations_active_range check (active_to is null or active_from is null or active_to >= active_from)
);

comment on table private.air_stations is 'Air quality monitoring stations (EEA register of the national network); city_id is the covered city whose boundary contains the station.';

create index air_stations_city_id_idx on private.air_stations (city_id);
create index air_stations_location_idx on private.air_stations using gist (location);

alter table private.air_stations enable row level security;

create trigger air_stations_set_updated_at
  before update on private.air_stations
  for each row execute function private.set_updated_at();

create table private.air_station_months (
  station_id uuid not null references private.air_stations (id) on delete cascade,
  pollutant text not null check (pollutant in ('pm25', 'no2')),
  month date not null check (month = date_trunc('month', month)::date),
  mean numeric(7, 2) not null check (mean >= 0),
  valid_days smallint not null check (valid_days between 0 and 31),
  source text not null check (source in ('eea_e1a', 'eea_e2a')),
  imported_at timestamptz not null default now(),
  primary key (station_id, pollutant, month)
);

comment on table private.air_station_months is 'Monthly means of daily station measurements (µg/m³), from verified E1a data where available, otherwise up-to-date E2a data.';

alter table private.air_station_months enable row level security;

create table private.air_city_calibration (
  snapshot_id uuid not null references public.score_snapshots (id) on delete cascade,
  city_id uuid not null references public.cities (id) on delete cascade,
  pollutant text not null check (pollutant in ('pm25', 'no2')),
  factor numeric(5, 3) not null check (factor > 0),
  stations_used smallint not null check (stations_used >= 0),
  station_mean numeric(7, 2),
  model_mean numeric(7, 2),
  status text not null check (status in ('calibrated', 'uncalibrated')),
  created_at timestamptz not null default now(),
  primary key (snapshot_id, city_id, pollutant),
  constraint air_city_calibration_status_matches check ((status = 'calibrated') = (stations_used > 0))
);

comment on table private.air_city_calibration is 'Per snapshot, city and pollutant: the factor that scales the CAMS model to the urban background stations of the city.';

create index air_city_calibration_city_id_idx on private.air_city_calibration (city_id);

alter table private.air_city_calibration enable row level security;

create function private.is_monthly_series(p_values numeric[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select array_ndims(p_values) = 1
    and cardinality(p_values) = 12
    and not exists (select 1 from unnest(p_values) as value where value < 0);
$$;

create table private.cell_air (
  snapshot_id uuid not null references public.score_snapshots (id) on delete cascade,
  cell_id uuid not null references private.grid_cells (id) on delete cascade,
  period_start date not null check (period_start = date_trunc('month', period_start)::date),
  period_end date not null,
  pm25_monthly numeric[] not null check (private.is_monthly_series(pm25_monthly)),
  no2_monthly numeric[] not null check (private.is_monthly_series(no2_monthly)),
  pm25_annual numeric(6, 2) check (pm25_annual >= 0),
  no2_annual numeric(6, 2) check (no2_annual >= 0),
  pm25_valid_months smallint not null check (pm25_valid_months between 0 and 12),
  no2_valid_months smallint not null check (no2_valid_months between 0 and 12),
  pm25_months_over_eu2030 smallint check (pm25_months_over_eu2030 between 0 and 12),
  no2_months_over_eu2030 smallint check (no2_months_over_eu2030 between 0 and 12),
  spatial_method text not null check (spatial_method in ('eea_1km', 'cams_10km')),
  sub_scores jsonb not null default '{}' check (jsonb_typeof(sub_scores) = 'object'),
  score_raw smallint check (score_raw between 0 and 100),
  score_display smallint check (score_display between 0 and 100),
  verdict_code text check (verdict_code in ('clean_all_year', 'winter_peaks', 'above_limit_most_year', 'moderate')),
  watch_item boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (snapshot_id, cell_id),
  constraint cell_air_period_order check (period_end > period_start),
  constraint cell_air_display_needs_raw check (score_display is null or score_raw is not null)
);

comment on table private.cell_air is 'Air score inputs per cell and snapshot: 12 calibrated monthly means (oldest first, null without data), annual means, sub-scores and the displayed score.';

create index cell_air_cell_id_idx on private.cell_air (cell_id);

alter table private.cell_air enable row level security;

create function private.upsert_air_stations(p_stations jsonb)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_count integer;
begin
  insert into private.air_stations (eoi_code, station_type, area_type, location, active_from, active_to)
  select
    station.eoi_code,
    station.station_type,
    station.area_type,
    extensions.st_point(station.longitude, station.latitude, 4326)::extensions.geography,
    station.active_from,
    station.active_to
  from jsonb_to_recordset(p_stations) as station (
    eoi_code text,
    station_type text,
    area_type text,
    longitude double precision,
    latitude double precision,
    active_from date,
    active_to date
  )
  on conflict (eoi_code) do update
  set
    station_type = excluded.station_type,
    area_type = excluded.area_type,
    location = excluded.location,
    active_from = excluded.active_from,
    active_to = excluded.active_to;

  get diagnostics v_count = row_count;

  update private.air_stations s
  set city_id = covering.city_id
  from (
    select s2.id, (
      select c.id
      from public.cities c
      where extensions.st_covers(c.boundary, s2.location)
      order by c.position
      limit 1
    ) as city_id
    from private.air_stations s2
  ) as covering
  where s.id = covering.id and s.city_id is distinct from covering.city_id;

  return v_count;
end;
$$;

update public.scoring_versions
set params = params || jsonb_build_object(
  'air',
  '{
    "pm25_points": [[5, 100], [10, 80], [15, 60], [25, 20], [35, 0]],
    "no2_points": [[10, 100], [20, 80], [30, 50], [40, 20], [50, 0]],
    "weights": {"pm25": 0.7, "no2": 0.3},
    "eu2030_limits": {"pm25": 10, "no2": 20},
    "calibration_factor_range": [0.7, 1.5],
    "spatial_factor_range": [0.6, 1.6],
    "calibration_station_areas": ["urban"],
    "min_valid_hours_per_day": 18,
    "min_valid_days": 20,
    "min_valid_months": 9,
    "winter_peak_ratio": 1.6,
    "winter_peak_min_months": 2,
    "most_year_months": 7,
    "heavy_winter_pm25": 20,
    "neighbour_blend": 0.4
  }'::jsonb
)
where kind = 'online' and label = 'v1';
