create type private.noise_source_kind as enum ('road', 'tram', 'rail', 'air', 'industry', 'aggregate');
create type private.noise_indicator as enum ('lden', 'lnight');
create type private.noise_dataset_status as enum ('active', 'superseded');

create table private.noise_datasets (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities (id) on delete cascade,
  source_type private.noise_source_kind not null,
  indicator private.noise_indicator not null,
  round smallint not null check (round between 2007 and 2100),
  provider text not null check (char_length(provider) between 1 and 200),
  licence text check (char_length(licence) between 1 and 200),
  source_url text check (source_url ~ '^https?://' and char_length(source_url) <= 1000),
  storage_path text check (char_length(storage_path) between 1 and 500),
  status private.noise_dataset_status not null default 'active',
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table private.noise_datasets is 'Strategic noise maps (END rounds) imported per city, source and indicator; superseded sets stay for the snapshots that used them.';

create unique index noise_datasets_one_active_idx
  on private.noise_datasets (city_id, source_type, indicator)
  where status = 'active';
create index noise_datasets_city_id_idx on private.noise_datasets (city_id);

alter table private.noise_datasets enable row level security;

create trigger noise_datasets_set_updated_at
  before update on private.noise_datasets
  for each row execute function private.set_updated_at();

create table private.noise_contours (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references private.noise_datasets (id) on delete cascade,
  db_low smallint not null check (db_low between 30 and 100),
  db_high smallint check (db_high between 30 and 100),
  geometry extensions.geography(MultiPolygon, 4326) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint noise_contours_band_order check (db_high is null or db_high >= db_low)
);

comment on table private.noise_contours is 'Normalised noise bands of a dataset (db_high null = open top band such as 75 dB and above).';

create index noise_contours_dataset_id_idx on private.noise_contours (dataset_id, db_low);
create index noise_contours_geometry_idx on private.noise_contours using gist (geometry);

alter table private.noise_contours enable row level security;

create trigger noise_contours_set_updated_at
  before update on private.noise_contours
  for each row execute function private.set_updated_at();

create table private.noise_snapshot_datasets (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.score_snapshots (id) on delete cascade,
  dataset_id uuid not null references private.noise_datasets (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint noise_snapshot_datasets_snapshot_dataset_key unique (snapshot_id, dataset_id)
);

comment on table private.noise_snapshot_datasets is 'The noise datasets a snapshot was scored with, so a report reads the same contours later.';

create index noise_snapshot_datasets_dataset_id_idx on private.noise_snapshot_datasets (dataset_id);

alter table private.noise_snapshot_datasets enable row level security;

create trigger noise_snapshot_datasets_set_updated_at
  before update on private.noise_snapshot_datasets
  for each row execute function private.set_updated_at();

create table private.noise_sources (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.score_snapshots (id) on delete cascade,
  city_id uuid not null references public.cities (id) on delete cascade,
  kind private.noise_source_kind not null check (kind in ('road', 'tram', 'rail', 'air')),
  source_class text not null check (source_class ~ '^[a-z0-9_]{1,40}$'),
  source_ref text not null check (char_length(source_ref) between 1 and 120),
  name text check (char_length(name) between 1 and 300),
  geometry extensions.geography(LineString, 4326) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint noise_sources_snapshot_ref_key unique (snapshot_id, city_id, source_ref)
);

comment on table private.noise_sources is 'Roads, tram lines, railways and runways from OSM, frozen per snapshot, for the proxy estimate, the nearest sources and the map.';

create index noise_sources_lookup_idx on private.noise_sources (snapshot_id, city_id, kind, source_class);
create index noise_sources_city_id_idx on private.noise_sources (city_id);
create index noise_sources_geometry_idx on private.noise_sources using gist (geometry);

alter table private.noise_sources enable row level security;

create trigger noise_sources_set_updated_at
  before update on private.noise_sources
  for each row execute function private.set_updated_at();

create table private.noise_buildings (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.score_snapshots (id) on delete cascade,
  city_id uuid not null references public.cities (id) on delete cascade,
  geometry extensions.geography(MultiPolygon, 4326) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table private.noise_buildings is 'OSM building footprints of the ready or building snapshot, used to screen the proxy estimate; pruned once a snapshot is superseded.';

create index noise_buildings_snapshot_city_idx on private.noise_buildings (snapshot_id, city_id);
create index noise_buildings_city_id_idx on private.noise_buildings (city_id);
create index noise_buildings_geometry_idx on private.noise_buildings using gist (geometry);

alter table private.noise_buildings enable row level security;

create trigger noise_buildings_set_updated_at
  before update on private.noise_buildings
  for each row execute function private.set_updated_at();

create function private.prune_noise_buildings()
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_count integer;
begin
  delete from private.noise_buildings b
  using public.score_snapshots s
  where s.id = b.snapshot_id and s.status in ('superseded', 'failed');

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create function private.freeze_noise_datasets(p_snapshot_id uuid, p_city_id uuid)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_count integer;
begin
  delete from private.noise_snapshot_datasets sd
  using private.noise_datasets d
  where sd.snapshot_id = p_snapshot_id and d.id = sd.dataset_id and d.city_id = p_city_id;

  insert into private.noise_snapshot_datasets (snapshot_id, dataset_id)
  select p_snapshot_id, d.id
  from private.noise_datasets d
  where d.city_id = p_city_id
    and d.status = 'active'
    and exists (select 1 from private.noise_contours c where c.dataset_id = d.id);

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create function private.noise_samples(
  p_snapshot_id uuid,
  p_city_id uuid,
  p_points extensions.geography[],
  p_radius_m integer
)
returns table (
  point_no integer,
  kind private.noise_source_kind,
  measure text,
  indicator private.noise_indicator,
  dataset_id uuid,
  db_low smallint,
  db_high smallint,
  source_class text,
  distance_m integer,
  buildings_crossed integer
)
language sql
stable
set search_path = ''
as $$
  with points as (
    select p.location, p.point_no::integer as point_no
    from unnest(p_points) with ordinality as p (location, point_no)
  ),
  datasets as (
    select d.id, d.source_type, d.indicator
    from private.noise_snapshot_datasets sd
    join private.noise_datasets d on d.id = sd.dataset_id
    where sd.snapshot_id = p_snapshot_id and d.city_id = p_city_id
  ),
  proxy_classes as (
    select distinct s.kind, s.source_class
    from private.noise_sources s
    where s.snapshot_id = p_snapshot_id
      and s.city_id = p_city_id
      and not exists (
        select 1 from datasets d
        where d.indicator = 'lden' and d.source_type in (s.kind, 'aggregate')
      )
  ),
  nearest as (
    select pt.point_no, pc.kind, pc.source_class, pt.location, near.geometry, near.distance_m
    from points pt
    cross join proxy_classes pc
    cross join lateral (
      select s.geometry, extensions.st_distance(s.geometry, pt.location) as distance_m
      from private.noise_sources s
      where s.snapshot_id = p_snapshot_id
        and s.city_id = p_city_id
        and s.kind = pc.kind
        and s.source_class = pc.source_class
        and extensions.st_dwithin(s.geometry, pt.location, p_radius_m)
      order by s.geometry operator(extensions.<->) pt.location
      limit 1
    ) as near
  )
  select
    pt.point_no,
    d.source_type,
    'contour',
    d.indicator,
    d.id,
    band.db_low,
    band.db_high,
    null::text,
    null::integer,
    null::integer
  from points pt
  cross join datasets d
  left join lateral (
    select c.db_low, c.db_high
    from private.noise_contours c
    where c.dataset_id = d.id and extensions.st_intersects(c.geometry, pt.location)
    order by c.db_low desc
    limit 1
  ) as band on true
  union all
  select
    n.point_no,
    n.kind,
    'proxy',
    null,
    null,
    null,
    null,
    n.source_class,
    round(n.distance_m)::integer,
    (
      select count(*)::integer
      from private.noise_buildings b
      where b.snapshot_id = p_snapshot_id
        and b.city_id = p_city_id
        and extensions.st_intersects(b.geometry, sight.line)
        and not extensions.st_intersects(b.geometry, n.location)
    )
  from nearest n
  cross join lateral (
    select extensions.st_makeline(
      n.location::extensions.geometry,
      extensions.st_closestpoint(n.geometry::extensions.geometry, n.location::extensions.geometry)
    )::extensions.geography as line
  ) as sight;
$$;

create function private.noise_cell_samples(
  p_snapshot_id uuid,
  p_city_id uuid,
  p_offset_m integer,
  p_radius_m integer
)
returns table (
  cell_id uuid,
  point_index integer,
  kind private.noise_source_kind,
  measure text,
  indicator private.noise_indicator,
  dataset_id uuid,
  db_low smallint,
  db_high smallint,
  source_class text,
  distance_m integer,
  buildings_crossed integer
)
language sql
stable
set search_path = ''
as $$
  with points as (
    select
      cs.cell_id,
      k.point_index,
      case
        when k.point_index = 0 then g.center
        else extensions.st_project(g.center, p_offset_m, radians(60 * (k.point_index - 1)))
      end as location,
      row_number() over (order by cs.cell_id, k.point_index)::integer as point_no
    from private.cell_scores cs
    join private.grid_cells g on g.id = cs.cell_id
    cross join generate_series(0, 6) as k (point_index)
    where cs.snapshot_id = p_snapshot_id and g.city_id = p_city_id
  )
  select
    points.cell_id,
    points.point_index,
    s.kind,
    s.measure,
    s.indicator,
    s.dataset_id,
    s.db_low,
    s.db_high,
    s.source_class,
    s.distance_m,
    s.buildings_crossed
  from private.noise_samples(
    p_snapshot_id,
    p_city_id,
    array(select p.location from points p order by p.point_no),
    p_radius_m
  ) as s
  join points on points.point_no = s.point_no;
$$;

create function private.noise_nearest_sources(
  p_snapshot_id uuid,
  p_city_id uuid,
  p_location extensions.geography,
  p_radius_m integer
)
returns table (
  kind private.noise_source_kind,
  source_class text,
  source_ref text,
  name text,
  distance_m integer,
  db_low smallint,
  db_high smallint
)
language sql
stable
set search_path = ''
as $$
  with classes as (
    select distinct s.kind, s.source_class
    from private.noise_sources s
    where s.snapshot_id = p_snapshot_id and s.city_id = p_city_id
  )
  select
    classes.kind,
    classes.source_class,
    near.source_ref,
    near.name,
    round(near.distance_m)::integer,
    band.db_low,
    band.db_high
  from classes
  cross join lateral (
    select s.source_ref, s.name, s.geometry, extensions.st_distance(s.geometry, p_location) as distance_m
    from private.noise_sources s
    where s.snapshot_id = p_snapshot_id
      and s.city_id = p_city_id
      and s.kind = classes.kind
      and s.source_class = classes.source_class
      and extensions.st_dwithin(s.geometry, p_location, p_radius_m)
    order by distance_m
    limit 1
  ) as near
  left join lateral (
    select c.db_low, c.db_high
    from private.noise_snapshot_datasets sd
    join private.noise_datasets d on d.id = sd.dataset_id
    join private.noise_contours c on c.dataset_id = d.id
    where sd.snapshot_id = p_snapshot_id
      and d.city_id = p_city_id
      and d.indicator = 'lden'
      and d.source_type in (classes.kind, 'aggregate')
      and extensions.st_intersects(
        c.geometry,
        extensions.st_closestpoint(near.geometry::extensions.geometry, p_location::extensions.geometry)::extensions.geography
      )
    order by c.db_low desc
    limit 1
  ) as band on true
  order by near.distance_m;
$$;

create function private.noise_map_layers(
  p_snapshot_id uuid,
  p_city_id uuid,
  p_location extensions.geography,
  p_clip_m integer
)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with area as (
    select extensions.st_buffer(p_location, p_clip_m)::extensions.geometry as geom
  )
  select jsonb_build_object(
    'contours', jsonb_build_object(
      'type', 'FeatureCollection',
      'features', coalesce((
        select jsonb_agg(jsonb_build_object(
          'type', 'Feature',
          'geometry', extensions.st_asgeojson(
            extensions.st_simplifypreservetopology(
              extensions.st_intersection(c.geometry::extensions.geometry, area.geom),
              0.00002
            ),
            6
          )::jsonb,
          'properties', jsonb_build_object(
            'source_type', d.source_type,
            'indicator', d.indicator,
            'db_low', c.db_low,
            'db_high', c.db_high
          )
        ) order by d.indicator, d.source_type, c.db_low)
        from private.noise_snapshot_datasets sd
        join private.noise_datasets d on d.id = sd.dataset_id
        join private.noise_contours c on c.dataset_id = d.id
        cross join area
        where sd.snapshot_id = p_snapshot_id
          and d.city_id = p_city_id
          and extensions.st_intersects(c.geometry, area.geom::extensions.geography)
      ), '[]'::jsonb)
    ),
    'lines', jsonb_build_object(
      'type', 'FeatureCollection',
      'features', coalesce((
        select jsonb_agg(jsonb_build_object(
          'type', 'Feature',
          'geometry', extensions.st_asgeojson(
            extensions.st_intersection(s.geometry::extensions.geometry, area.geom),
            6
          )::jsonb,
          'properties', jsonb_build_object(
            'kind', s.kind,
            'source_class', s.source_class,
            'name', s.name
          )
        ) order by s.kind, s.source_class, s.source_ref)
        from private.noise_sources s
        cross join area
        where s.snapshot_id = p_snapshot_id
          and s.city_id = p_city_id
          and extensions.st_intersects(s.geometry, area.geom::extensions.geography)
      ), '[]'::jsonb)
    )
  )
  from area;
$$;

update public.scoring_versions
set params = params || jsonb_build_object(
  'noise',
  '{
    "scale_lden": [40, 75],
    "scale_lnight": [35, 65],
    "night_weight": 0.3,
    "intermittent_penalty_db": 3,
    "intermittent_kinds": ["rail", "air"],
    "below_mapped_db": 50,
    "band_width_db": 5,
    "proxy_ref_db": {
      "motorway": 78,
      "trunk": 72,
      "primary": 72,
      "secondary": 68,
      "tertiary": 63,
      "residential": 55,
      "tram": 65,
      "rail": 70
    },
    "proxy_ref_distance_m": 10,
    "proxy_night_offset_db": 8,
    "screen_db": 5,
    "screen_max_db": 10,
    "nearest_radius_m": 1500,
    "sample_offset_m": 100,
    "map_clip_m": 1000,
    "display_bands_db": [45, 55, 65, 70],
    "who": {
      "road": {"lden": 53, "lnight": 45},
      "rail": {"lden": 54, "lnight": 44},
      "air": {"lden": 45, "lnight": 40}
    }
  }'::jsonb
)
where kind = 'online' and label = 'v1';
