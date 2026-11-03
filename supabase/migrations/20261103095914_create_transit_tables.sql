create table private.transit_feed_sources (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities (id) on delete cascade,
  operator text not null check (char_length(operator) between 1 and 120),
  url text not null check (url ~ '^https://' and char_length(url) <= 2000),
  license text check (char_length(license) between 1 and 300),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transit_feed_sources_city_url_key unique (city_id, url)
);

comment on table private.transit_feed_sources is 'Official GTFS feeds per city, curated by the admin; a city without an active feed is scored from OpenStreetMap only.';

alter table private.transit_feed_sources enable row level security;

create trigger transit_feed_sources_set_updated_at
  before update on private.transit_feed_sources
  for each row execute function private.set_updated_at();

create table private.transit_feeds (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.score_snapshots (id) on delete cascade,
  city_id uuid not null references public.cities (id) on delete cascade,
  source text not null check (source in ('gtfs', 'osm')),
  operator text check (char_length(operator) between 1 and 120),
  source_url text not null check (char_length(source_url) between 1 and 2000),
  license text check (char_length(license) between 1 and 300),
  feed_version text check (char_length(feed_version) between 1 and 120),
  valid_from date,
  valid_to date,
  reference_date date,
  sha256 text check (sha256 ~ '^[0-9a-f]{64}$'),
  fetched_at timestamptz not null default now(),
  status text not null check (status in ('used', 'expired', 'failed')),
  error_code text check (char_length(error_code) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transit_feeds_snapshot_city_url_key unique (snapshot_id, city_id, source, source_url),
  constraint transit_feeds_error_when_not_used check ((status = 'used') = (error_code is null)),
  constraint transit_feeds_valid_range check (valid_to is null or valid_from is null or valid_to >= valid_from)
);

comment on table private.transit_feeds is 'Transit data that entered each snapshot per city, with its validity and reference weekday.';

create index transit_feeds_city_id_idx on private.transit_feeds (city_id);

alter table private.transit_feeds enable row level security;

create trigger transit_feeds_set_updated_at
  before update on private.transit_feeds
  for each row execute function private.set_updated_at();

create table private.transit_stops (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.score_snapshots (id) on delete cascade,
  city_id uuid not null references public.cities (id) on delete cascade,
  stop_key text not null check (char_length(stop_key) between 1 and 200),
  name text check (char_length(name) between 1 and 300),
  location extensions.geography(Point, 4326) not null,
  modes text[] not null check (
    cardinality(modes) between 1 and 4
    and modes <@ array['bus', 'trolleybus', 'tram', 'subway']
  ),
  wheelchair_boarding smallint check (wheelchair_boarding between 0 and 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transit_stops_snapshot_city_key unique (snapshot_id, city_id, stop_key)
);

comment on table private.transit_stops is 'Transit stops per snapshot, the platforms of both directions grouped into one displayed point.';

create index transit_stops_city_id_idx on private.transit_stops (city_id);
create index transit_stops_location_idx on private.transit_stops using gist (location);

alter table private.transit_stops enable row level security;

create trigger transit_stops_set_updated_at
  before update on private.transit_stops
  for each row execute function private.set_updated_at();

create table private.transit_routes (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.score_snapshots (id) on delete cascade,
  city_id uuid not null references public.cities (id) on delete cascade,
  route_key text not null check (char_length(route_key) between 1 and 200),
  ref text check (char_length(ref) between 1 and 40),
  mode text not null check (mode in ('bus', 'trolleybus', 'tram', 'subway')),
  long_name text check (char_length(long_name) between 1 and 300),
  colour text check (colour ~ '^#[0-9A-F]{6}$'),
  text_colour text check (text_colour ~ '^#[0-9A-F]{6}$'),
  geometry extensions.geography(MultiLineString, 4326),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transit_routes_snapshot_city_key unique (snapshot_id, city_id, route_key)
);

comment on table private.transit_routes is 'Transit lines per snapshot with their simplified path for the report map.';

create index transit_routes_city_id_idx on private.transit_routes (city_id);
create index transit_routes_geometry_idx on private.transit_routes using gist (geometry);

alter table private.transit_routes enable row level security;

create trigger transit_routes_set_updated_at
  before update on private.transit_routes
  for each row execute function private.set_updated_at();

create table private.transit_stop_routes (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null,
  city_id uuid not null,
  stop_key text not null,
  route_key text not null,
  direction_label text not null check (char_length(direction_label) between 1 and 300),
  peak_departures_per_hour numeric(6, 2) check (peak_departures_per_hour >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transit_stop_routes_stop_fkey foreign key (snapshot_id, city_id, stop_key)
    references private.transit_stops (snapshot_id, city_id, stop_key) on delete cascade,
  constraint transit_stop_routes_route_fkey foreign key (snapshot_id, city_id, route_key)
    references private.transit_routes (snapshot_id, city_id, route_key) on delete cascade,
  constraint transit_stop_routes_key unique (snapshot_id, city_id, stop_key, route_key, direction_label)
);

comment on table private.transit_stop_routes is 'Which line stops where, per direction, and how often it leaves at the morning peak (null = unknown, OpenStreetMap only).';

create index transit_stop_routes_route_idx on private.transit_stop_routes (snapshot_id, city_id, route_key);

alter table private.transit_stop_routes enable row level security;

create trigger transit_stop_routes_set_updated_at
  before update on private.transit_stop_routes
  for each row execute function private.set_updated_at();

create table private.key_destinations (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities (id) on delete cascade,
  kind text not null check (kind in ('center', 'station', 'university', 'hospital', 'mall', 'airport')),
  label_ro text not null check (char_length(label_ro) between 1 and 120),
  label_en text not null check (char_length(label_en) between 1 and 120),
  location extensions.geography(Point, 4326) not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table private.key_destinations is 'Key places of each city the door-to-door transit time is measured to; copied into the snapshot when it is built.';

create index key_destinations_city_id_idx on private.key_destinations (city_id) where is_active;

alter table private.key_destinations enable row level security;

create trigger key_destinations_set_updated_at
  before update on private.key_destinations
  for each row execute function private.set_updated_at();

create table private.cell_transit (
  snapshot_id uuid not null references public.score_snapshots (id) on delete cascade,
  cell_id uuid not null references private.grid_cells (id) on delete cascade,
  access_index numeric(8, 3) check (access_index >= 0),
  s_access numeric(4, 3) check (s_access between 0 and 1),
  s_travel numeric(4, 3) check (s_travel between 0 and 1),
  s_coverage numeric(4, 3) check (s_coverage between 0 and 1),
  stops jsonb not null default '[]' check (jsonb_typeof(stops) = 'array'),
  destinations jsonb not null default '[]' check (jsonb_typeof(destinations) = 'array'),
  directions smallint check (directions between 0 and 8),
  data_quality text not null check (data_quality in ('gtfs', 'osm_only')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (snapshot_id, cell_id)
);

comment on table private.cell_transit is 'Raw accessibility result per cell and snapshot: the three components, nearby stops and times to the key destinations.';

create index cell_transit_cell_id_idx on private.cell_transit (cell_id);

alter table private.cell_transit enable row level security;

create trigger cell_transit_set_updated_at
  before update on private.cell_transit
  for each row execute function private.set_updated_at();

create table private.cell_travel_matrix (
  snapshot_id uuid not null references public.score_snapshots (id) on delete cascade,
  city_id uuid not null references public.cities (id) on delete cascade,
  origin_cell_id uuid not null references private.grid_cells (id) on delete cascade,
  minutes bytea not null check (octet_length(minutes) % 2 = 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (snapshot_id, origin_cell_id)
);

comment on table private.cell_travel_matrix is 'Transit minutes from one cell to every cell of its city at 8:00: one big-endian uint16 per destination cell, in cell_key order of the snapshot cells, 65535 = not reachable.';

create index cell_travel_matrix_city_idx on private.cell_travel_matrix (snapshot_id, city_id);
create index cell_travel_matrix_origin_cell_id_idx on private.cell_travel_matrix (origin_cell_id);

alter table private.cell_travel_matrix enable row level security;

create trigger cell_travel_matrix_set_updated_at
  before update on private.cell_travel_matrix
  for each row execute function private.set_updated_at();

create function private.transit_minutes(
  p_snapshot_id uuid,
  p_origin_cell_id uuid,
  p_destination_cell_id uuid
)
returns smallint
language sql
stable
set search_path = ''
as $$
  with matrix as (
    select m.minutes, m.city_id
    from private.cell_travel_matrix m
    where m.snapshot_id = p_snapshot_id and m.origin_cell_id = p_origin_cell_id
  ),
  ordered as (
    select g.id, row_number() over (order by g.cell_key) - 1 as position
    from private.cell_scores cs
    join private.grid_cells g on g.id = cs.cell_id
    join matrix on matrix.city_id = g.city_id
    where cs.snapshot_id = p_snapshot_id
  ),
  decoded as (
    select get_byte(matrix.minutes, (2 * ordered.position)::integer) * 256
      + get_byte(matrix.minutes, (2 * ordered.position + 1)::integer) as minutes
    from matrix
    join ordered on ordered.id = p_destination_cell_id
    where octet_length(matrix.minutes) > 2 * ordered.position + 1
  )
  select nullif(decoded.minutes, 65535)::smallint from decoded;
$$;

update public.scoring_versions
set params = params || jsonb_build_object(
  'accessibility',
  '{
    "weights": { "access": 40, "travel": 45, "coverage": 15 },
    "walk_speed_kmh": 4.5,
    "reference": {
      "weekdays": [2, 3],
      "peak_start": "07:30",
      "peak_end": "08:30",
      "window_start": "07:45",
      "window_end": "08:15",
      "detail_departure": "08:00"
    },
    "modes": {
      "bus": { "radius_m": 400, "reliability_min": 2, "osm_departures_per_hour": 4, "osm_speed_kmh": 18 },
      "trolleybus": { "radius_m": 400, "reliability_min": 2, "osm_departures_per_hour": 4, "osm_speed_kmh": 18 },
      "tram": { "radius_m": 600, "reliability_min": 1, "osm_departures_per_hour": 5, "osm_speed_kmh": 20 },
      "subway": { "radius_m": 800, "reliability_min": 0.75, "osm_departures_per_hour": 10, "osm_speed_kmh": 35 }
    },
    "access": { "ai_min": 1, "ai_max": 40 },
    "travel": {
      "full_at_min": 10,
      "zero_at_min": 60,
      "airport_full_at_min": 20,
      "airport_zero_at_min": 75,
      "max_minutes": 90,
      "max_transfers": 2,
      "kind_weights": { "center": 30, "station": 15, "university": 15, "hospital": 15, "mall": 15, "airport": 10 }
    },
    "coverage": { "sectors": 8, "min_distance_m": 1500, "multimodal_bonus": 0.1 },
    "smoothing": { "cell": 0.7, "neighbours": 0.3 },
    "matrix": { "max_minutes": 90 }
  }'::jsonb
)
where kind = 'online' and label = 'v1';
