create type private.green_area_kind as enum ('park', 'garden', 'forest', 'square', 'recreation', 'other');

create table private.green_area_sources (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.score_snapshots (id) on delete cascade,
  city_id uuid not null references public.cities (id) on delete cascade,
  source text not null check (source in ('osm', 'urban_atlas')),
  source_ref text not null check (char_length(source_ref) between 1 and 120),
  name text check (char_length(name) between 1 and 300),
  kind private.green_area_kind not null,
  is_public boolean not null,
  geometry extensions.geography(MultiPolygon, 4326) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint green_area_sources_snapshot_source_key unique (snapshot_id, source, source_ref)
);

comment on table private.green_area_sources is 'Green polygons as each source draws them, frozen per snapshot, before they are merged into green_areas.';

create index green_area_sources_city_id_idx on private.green_area_sources (city_id);
create index green_area_sources_geometry_idx on private.green_area_sources using gist (geometry);

alter table private.green_area_sources enable row level security;

create trigger green_area_sources_set_updated_at
  before update on private.green_area_sources
  for each row execute function private.set_updated_at();

create table private.green_areas (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.score_snapshots (id) on delete cascade,
  city_id uuid not null references public.cities (id) on delete cascade,
  name text check (char_length(name) between 1 and 300),
  kind private.green_area_kind not null,
  area_ha numeric(10, 2) not null check (area_ha > 0),
  sources text[] not null check (cardinality(sources) > 0),
  source_refs text[] not null check (cardinality(source_refs) > 0),
  amenities text[] not null default '{}',
  geometry extensions.geography(MultiPolygon, 4326) not null,
  shape extensions.geometry(MultiPolygon, 3844)
    generated always as (extensions.st_transform(geometry::extensions.geometry, 3844)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table private.green_areas is 'Public green space per snapshot: the sources merged and dissolved, with the OSM name, kind and amenities.';

create index green_areas_snapshot_city_idx on private.green_areas (snapshot_id, city_id);
create index green_areas_city_id_idx on private.green_areas (city_id);
create index green_areas_geometry_idx on private.green_areas using gist (geometry);
create index green_areas_shape_idx on private.green_areas using gist (shape);

alter table private.green_areas enable row level security;

create trigger green_areas_set_updated_at
  before update on private.green_areas
  for each row execute function private.set_updated_at();

create function private.merge_green_areas(p_snapshot_id uuid, p_city_id uuid, p_min_ha numeric)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_count integer;
begin
  if p_min_ha is null or p_min_ha < 0 then
    raise exception using errcode = 'P0001', message = 'green_min_area_invalid';
  end if;

  delete from private.green_areas ga
  where ga.snapshot_id = p_snapshot_id and ga.city_id = p_city_id;

  with sources as (
    select
      s.source,
      s.source_ref,
      s.name,
      s.kind,
      extensions.st_makevalid(extensions.st_transform(s.geometry::extensions.geometry, 3844)) as shape
    from private.green_area_sources s
    where s.snapshot_id = p_snapshot_id
      and s.city_id = p_city_id
      and s.is_public
  ),
  merged as (
    select (extensions.st_dump(extensions.st_union(sources.shape))).geom as shape
    from sources
  ),
  kept as (
    select merged.shape
    from merged
    where extensions.st_area(merged.shape) >= p_min_ha * 10000
  ),
  described as (
    select
      kept.shape,
      (
        select s.name
        from sources s
        where s.name is not null and extensions.st_intersects(s.shape, kept.shape)
        order by extensions.st_area(s.shape) desc, s.source_ref
        limit 1
      ) as name,
      (
        select s.kind
        from sources s
        where extensions.st_intersects(s.shape, kept.shape)
        order by s.kind = 'other', extensions.st_area(s.shape) desc, s.source_ref
        limit 1
      ) as kind,
      (
        select array_agg(distinct s.source order by s.source)
        from sources s
        where extensions.st_intersects(s.shape, kept.shape)
      ) as sources,
      (
        select array_agg(s.source_ref order by s.source_ref)
        from sources s
        where extensions.st_intersects(s.shape, kept.shape)
      ) as source_refs,
      (
        select coalesce(array_agg(distinct p.category order by p.category), '{}')
        from private.poi_features p
        where p.snapshot_id = p_snapshot_id
          and p.city_id = p_city_id
          and p.category in ('playground', 'dog_park', 'sports')
          and extensions.st_intersects(
            extensions.st_transform(p.location::extensions.geometry, 3844),
            kept.shape
          )
      ) as amenities
    from kept
  )
  insert into private.green_areas (
    snapshot_id, city_id, name, kind, area_ha, sources, source_refs, amenities, geometry
  )
  select
    p_snapshot_id,
    p_city_id,
    described.name,
    described.kind,
    round((extensions.st_area(described.shape) / 10000)::numeric, 2),
    described.sources,
    described.source_refs,
    described.amenities,
    extensions.st_multi(extensions.st_transform(described.shape, 4326))::extensions.geography
  from described
  where described.kind is not null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create function private.measure_green_cells(
  p_snapshot_id uuid,
  p_city_id uuid,
  p_radii_m integer[],
  p_small_min_ha numeric,
  p_large_min_ha numeric
)
returns table (
  cell_id uuid,
  shares jsonb,
  nearest_small_id uuid,
  nearest_small_m numeric,
  nearest_large_id uuid,
  nearest_large_m numeric
)
language sql
stable
set search_path = ''
as $$
  with cells as (
    select g.id, extensions.st_transform(g.center::extensions.geometry, 3844) as center
    from private.cell_scores cs
    join private.grid_cells g on g.id = cs.cell_id
    where cs.snapshot_id = p_snapshot_id and g.city_id = p_city_id
  )
  select
    cells.id,
    (
      select jsonb_object_agg(radius::text, round(coalesce(covered.share, 0)::numeric, 4))
      from unnest(p_radii_m) as radius
      cross join lateral extensions.st_buffer(cells.center, radius, 16) as disc (geom)
      cross join lateral (
        select least(
          1,
          coalesce(sum(extensions.st_area(extensions.st_intersection(disc.geom, ga.shape))), 0)
            / extensions.st_area(disc.geom)
        ) as share
        from private.green_areas ga
        where ga.snapshot_id = p_snapshot_id
          and ga.city_id = p_city_id
          and extensions.st_dwithin(ga.shape, cells.center, radius)
      ) as covered
    ),
    small.id,
    round(small.distance_m::numeric, 1),
    large.id,
    round(large.distance_m::numeric, 1)
  from cells
  left join lateral (
    select ga.id, extensions.st_distance(ga.shape, cells.center) as distance_m
    from private.green_areas ga
    where ga.snapshot_id = p_snapshot_id
      and ga.city_id = p_city_id
      and ga.area_ha >= p_small_min_ha
    order by ga.shape operator(extensions.<->) cells.center
    limit 1
  ) as small on true
  left join lateral (
    select ga.id, extensions.st_distance(ga.shape, cells.center) as distance_m
    from private.green_areas ga
    where ga.snapshot_id = p_snapshot_id
      and ga.city_id = p_city_id
      and ga.area_ha >= p_large_min_ha
    order by ga.shape operator(extensions.<->) cells.center
    limit 1
  ) as large on true;
$$;

update public.scoring_versions
set params = params || jsonb_build_object(
  'green',
  '{
    "radii_m": [300, 500, 1000],
    "near_radius_m": 500,
    "wide_radius_m": 1000,
    "share_cap": 0.30,
    "small_min_ha": 0.5,
    "small_full_m": 300,
    "small_zero_m": 1200,
    "large_min_ha": 5,
    "large_full_m": 1000,
    "large_zero_m": 3000,
    "canopy_cap": 0.25,
    "min_polygon_ha": 0.05,
    "walk_detour_factor": 1.3,
    "weights": { "c1": 35, "c2": 15, "c3": 25, "c4": 15, "c5": 10 }
  }'::jsonb
)
where kind = 'online' and label = 'v1';
