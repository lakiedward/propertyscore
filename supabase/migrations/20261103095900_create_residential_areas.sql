create table private.residential_areas (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.score_snapshots (id) on delete cascade,
  city_id uuid not null references public.cities (id) on delete cascade,
  source text not null check (source in ('osm', 'urban_atlas')),
  source_ref text not null check (char_length(source_ref) between 1 and 120),
  geometry extensions.geography(MultiPolygon, 4326) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint residential_areas_snapshot_source_key unique (snapshot_id, source, source_ref)
);

comment on table private.residential_areas is 'Residential land use frozen per snapshot; decides which cells count in the city averages.';

create index residential_areas_city_id_idx on private.residential_areas (city_id);
create index residential_areas_geometry_idx on private.residential_areas using gist (geometry);

alter table private.residential_areas enable row level security;

create trigger residential_areas_set_updated_at
  before update on private.residential_areas
  for each row execute function private.set_updated_at();

create function private.mark_residential_cells(
  p_snapshot_id uuid,
  p_city_id uuid,
  p_min_share numeric
)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_count integer;
begin
  if p_min_share is null or p_min_share not between 0 and 1 then
    raise exception using errcode = 'P0001', message = 'residential_share_invalid';
  end if;

  if not exists (
    select 1
    from private.residential_areas r
    where r.snapshot_id = p_snapshot_id and r.city_id = p_city_id
  ) then
    return 0;
  end if;

  update private.cell_scores cs
  set is_residential = coalesce(covered.share, 0) >= p_min_share
  from private.grid_cells g
  left join lateral (
    select least(
      1,
      coalesce(sum(
        extensions.st_area(
          extensions.st_intersection(
            extensions.st_transform(g.geometry::extensions.geometry, 3844),
            extensions.st_transform(r.geometry::extensions.geometry, 3844)
          )
        )
      ), 0) / extensions.st_area(extensions.st_transform(g.geometry::extensions.geometry, 3844))
    ) as share
    from private.residential_areas r
    where r.snapshot_id = p_snapshot_id
      and r.city_id = p_city_id
      and extensions.st_intersects(r.geometry, g.geometry)
  ) as covered on true
  where cs.snapshot_id = p_snapshot_id
    and cs.cell_id = g.id
    and g.city_id = p_city_id;

  select count(*) into v_count
  from private.cell_scores cs
  join private.grid_cells g on g.id = cs.cell_id
  where cs.snapshot_id = p_snapshot_id and g.city_id = p_city_id and cs.is_residential;

  return v_count;
end;
$$;

update public.scoring_versions
set params = params || jsonb_build_object('residential_min_share', 0.1)
where kind = 'online' and label = 'v1';
