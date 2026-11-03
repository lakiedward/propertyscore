create function private.is_category_scores(p_value jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p_value) = 'object'
    and not exists (
      select 1
      from jsonb_each(p_value) as entry (key, value)
      where entry.key not in (
          'safety', 'accessibility', 'fifteen_minute', 'green', 'noise',
          'air', 'industry', 'education', 'health'
        )
        or (
          jsonb_typeof(entry.value) <> 'null'
          and (
            jsonb_typeof(entry.value) <> 'number'
            or (entry.value)::numeric not between 0 and 100
          )
        )
    );
$$;

create table private.grid_cells (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities (id) on delete cascade,
  cell_key text not null unique check (cell_key ~ '^[0-9]+:-?[0-9]+:-?[0-9]+$'),
  size_m integer not null check (size_m between 50 and 2000),
  center extensions.geography(Point, 4326) not null,
  geometry extensions.geography(Polygon, 4326) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table private.grid_cells is 'Hexagonal cells (EPSG:3844 hexagon grid, key size:i:j) every SmartCheck score is computed on.';

create index grid_cells_city_id_idx on private.grid_cells (city_id, size_m);
create index grid_cells_geometry_idx on private.grid_cells using gist (geometry);

alter table private.grid_cells enable row level security;

create trigger grid_cells_set_updated_at
  before update on private.grid_cells
  for each row execute function private.set_updated_at();

create table private.cell_scores (
  snapshot_id uuid not null references public.score_snapshots (id) on delete cascade,
  cell_id uuid not null references private.grid_cells (id) on delete cascade,
  is_residential boolean,
  overall smallint check (overall between 0 and 100),
  categories jsonb not null default '{}' check (private.is_category_scores(categories)),
  safety_layers jsonb check (jsonb_typeof(safety_layers) = 'object'),
  inputs jsonb not null default '{}' check (jsonb_typeof(inputs) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (snapshot_id, cell_id)
);

comment on table private.cell_scores is 'One row per cell and snapshot: the 9 category scores (null = no data), the zone score and the audit inputs.';

create index cell_scores_cell_id_idx on private.cell_scores (cell_id);

alter table private.cell_scores enable row level security;

create trigger cell_scores_set_updated_at
  before update on private.cell_scores
  for each row execute function private.set_updated_at();

create table private.poi_features (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.score_snapshots (id) on delete cascade,
  city_id uuid not null references public.cities (id) on delete cascade,
  source_ref text not null check (char_length(source_ref) between 1 and 120),
  category text not null check (category ~ '^[a-z0-9_]+$'),
  name text check (char_length(name) between 1 and 300),
  location extensions.geography(Point, 4326) not null,
  tags jsonb not null default '{}' check (jsonb_typeof(tags) = 'object'),
  opening_hours text check (char_length(opening_hours) between 1 and 500),
  is_24h boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint poi_features_snapshot_ref_category_key unique (snapshot_id, source_ref, category)
);

comment on table private.poi_features is 'Points of interest frozen per snapshot (OSM and official registers), shared by every score.';

create index poi_features_city_category_idx on private.poi_features (snapshot_id, city_id, category);
create index poi_features_city_id_idx on private.poi_features (city_id);
create index poi_features_location_idx on private.poi_features using gist (location);

alter table private.poi_features enable row level security;

create trigger poi_features_set_updated_at
  before update on private.poi_features
  for each row execute function private.set_updated_at();

create function private.build_grid_cells(p_city_id uuid, p_size_m integer)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_count integer;
begin
  if not exists (select 1 from public.cities c where c.id = p_city_id) then
    raise exception using errcode = 'P0001', message = 'city_not_found';
  end if;

  insert into private.grid_cells (city_id, cell_key, size_m, center, geometry)
  select
    c.id,
    format('%s:%s:%s', p_size_m, hex.i, hex.j),
    p_size_m,
    extensions.st_transform(extensions.st_centroid(hex.geom), 4326)::extensions.geography,
    extensions.st_transform(hex.geom, 4326)::extensions.geography
  from public.cities c
  cross join lateral extensions.st_transform(c.boundary::extensions.geometry, 3844) as area (geom)
  cross join lateral extensions.st_hexagongrid(p_size_m, area.geom) as hex
  where c.id = p_city_id
    and extensions.st_intersects(hex.geom, area.geom)
  on conflict (cell_key) do nothing;

  select count(*) into v_count
  from private.grid_cells g
  where g.city_id = p_city_id and g.size_m = p_size_m;

  return v_count;
end;
$$;

create function private.find_grid_cell(p_location extensions.geography, p_size_m integer)
returns uuid
language sql
stable
set search_path = ''
as $$
  select g.id
  from private.grid_cells g
  where g.size_m = p_size_m
    and extensions.st_intersects(g.geometry, p_location)
  order by g.cell_key
  limit 1;
$$;

create function private.seed_cell_scores(p_snapshot_id uuid, p_city_id uuid)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_size_m integer;
  v_count integer;
begin
  select (v.params ->> 'cell_size_m')::integer into v_size_m
  from public.score_snapshots s
  join public.scoring_versions v on v.id = s.scoring_version_id
  where s.id = p_snapshot_id;

  if v_size_m is null then
    raise exception using errcode = 'P0001', message = 'cell_size_missing';
  end if;

  insert into private.cell_scores (snapshot_id, cell_id)
  select p_snapshot_id, g.id
  from private.grid_cells g
  where g.city_id = p_city_id and g.size_m = v_size_m
  on conflict (snapshot_id, cell_id) do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create function private.compute_overall_scores(p_snapshot_id uuid)
returns void
language sql
set search_path = ''
as $$
  update private.cell_scores cs
  set overall = scored.overall
  from (
    select
      cs2.cell_id,
      round(
        sum((weight.value)::numeric * (cs2.categories ->> weight.key)::numeric)
          / nullif(sum((weight.value)::numeric), 0)
      )::smallint as overall
    from private.cell_scores cs2
    join public.score_snapshots s on s.id = cs2.snapshot_id
    join public.scoring_versions v on v.id = s.scoring_version_id
    left join lateral jsonb_each(v.weights) as weight (key, value)
      on jsonb_typeof(cs2.categories -> weight.key) = 'number'
    where cs2.snapshot_id = p_snapshot_id
    group by cs2.cell_id
  ) as scored
  where cs.snapshot_id = p_snapshot_id and cs.cell_id = scored.cell_id;
$$;

create function private.score_histogram(p_scores numeric[])
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(jsonb_agg(coalesce(bucket.count, 0) order by bins.bin), '[]'::jsonb)
  from generate_series(0, 19) as bins (bin)
  left join (
    select least(floor(score / 5), 19)::integer as bin, count(*) as count
    from unnest(p_scores) as score
    where score is not null
    group by 1
  ) as bucket on bucket.bin = bins.bin;
$$;

create function private.compute_snapshot_stats(p_snapshot_id uuid)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_stats jsonb;
begin
  with cells as (
    select c.slug, cs.is_residential, cs.overall, cs.categories
    from private.cell_scores cs
    join private.grid_cells g on g.id = cs.cell_id
    join public.cities c on c.id = g.city_id
    where cs.snapshot_id = p_snapshot_id
  ),
  category_keys as (
    select unnest(array[
      'safety', 'accessibility', 'fifteen_minute', 'green', 'noise',
      'air', 'industry', 'education', 'health'
    ]) as key
  ),
  per_category as (
    select
      cells.slug,
      category_keys.key,
      jsonb_build_object(
        'scored', count(*) filter (where jsonb_typeof(cells.categories -> category_keys.key) = 'number'),
        'no_data', count(*) filter (where jsonb_typeof(cells.categories -> category_keys.key) is distinct from 'number'),
        'avg', round(avg((cells.categories ->> category_keys.key)::numeric)
          filter (where cells.is_residential is not false
            and jsonb_typeof(cells.categories -> category_keys.key) = 'number')),
        'histogram', private.score_histogram(
          array_agg((cells.categories ->> category_keys.key)::numeric)
            filter (where cells.is_residential is not false
              and jsonb_typeof(cells.categories -> category_keys.key) = 'number')
        )
      ) as stats
    from cells
    cross join category_keys
    group by cells.slug, category_keys.key
  ),
  per_city as (
    select
      cells.slug,
      jsonb_build_object(
        'cells', count(*),
        'residential_cells', count(*) filter (where cells.is_residential is not false),
        'overall', jsonb_build_object(
          'scored', count(cells.overall),
          'avg', round(avg(cells.overall) filter (where cells.is_residential is not false)),
          'histogram', private.score_histogram(
            array_agg(cells.overall::numeric) filter (where cells.is_residential is not false)
          )
        )
      ) as stats
    from cells
    group by cells.slug
  )
  select coalesce(
    jsonb_object_agg(
      per_city.slug,
      per_city.stats || jsonb_build_object(
        'categories',
        (select jsonb_object_agg(pc.key, pc.stats) from per_category pc where pc.slug = per_city.slug)
      )
    ),
    '{}'::jsonb
  )
  into v_stats
  from per_city;

  update public.score_snapshots
  set stats = stats || jsonb_build_object('cities', v_stats)
  where id = p_snapshot_id;

  return v_stats;
end;
$$;
