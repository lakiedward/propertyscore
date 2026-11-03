alter table private.poi_features
  add column area extensions.geography(MultiPolygon, 4326);

comment on column private.poi_features.area is 'Outline of a point of interest that is an area (a park); walking targets use its point closest to the origin.';

create index poi_features_reach_idx on private.poi_features
  using gist ((coalesce(area, location)));

create table private.cell_walk_access (
  snapshot_id uuid not null references public.score_snapshots (id) on delete cascade,
  cell_id uuid not null references private.grid_cells (id) on delete cascade,
  category text not null check (category ~ '^[a-z0-9_]+$'),
  t_nearest_s integer check (t_nearest_s >= 0),
  d_nearest_m integer check (d_nearest_m >= 0),
  n5 smallint not null default 0 check (n5 >= 0),
  n10 smallint not null default 0 check (n10 >= n5),
  n15 smallint not null default 0 check (n15 >= n10),
  candidates smallint not null default 0 check (candidates >= n15),
  nearest_poi_id uuid references private.poi_features (id) on delete set null,
  distance_method text not null default 'pedestrian_routing'
    check (distance_method in ('pedestrian_routing', 'straight_line')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cell_walk_access_pkey primary key (snapshot_id, cell_id, category),
  constraint cell_walk_access_nearest_together check ((t_nearest_s is null) = (d_nearest_m is null))
);

comment on table private.cell_walk_access is 'Walking access from each cell centre to the nearest points of interest of a category, frozen per snapshot and shared by every score that needs it.';
comment on column private.cell_walk_access.n15 is 'Points reached within 15 minutes among the straight-line candidates the worker routed to, so a lower bound when candidates hits its limit.';

create index cell_walk_access_cell_id_idx on private.cell_walk_access (cell_id);
create index cell_walk_access_nearest_poi_id_idx on private.cell_walk_access (nearest_poi_id);

alter table private.cell_walk_access enable row level security;

create trigger cell_walk_access_set_updated_at
  before update on private.cell_walk_access
  for each row execute function private.set_updated_at();

create table private.city_category_stats (
  snapshot_id uuid not null references public.score_snapshots (id) on delete cascade,
  city_id uuid not null references public.cities (id) on delete cascade,
  category text not null check (category ~ '^[a-z0-9_]+$'),
  poi_count integer not null check (poi_count >= 0),
  is_covered boolean not null,
  avg_t_nearest_s integer check (avg_t_nearest_s >= 0),
  share_within_15 numeric(4, 3) check (share_within_15 between 0 and 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint city_category_stats_pkey primary key (snapshot_id, city_id, category)
);

comment on table private.city_category_stats is 'Per snapshot, city and walking category: how many points exist, whether the city has enough data to score the category, and the city averages reports compare against.';

create index city_category_stats_city_id_idx on private.city_category_stats (city_id);

alter table private.city_category_stats enable row level security;

create trigger city_category_stats_set_updated_at
  before update on private.city_category_stats
  for each row execute function private.set_updated_at();

create function private.walk_access_candidates(p_snapshot_id uuid, p_city_id uuid, p_targets jsonb)
returns table (cell_id uuid, lng double precision, lat double precision, candidates jsonb)
language sql
stable
set search_path = ''
as $$
  select
    g.id,
    extensions.st_x(g.center::extensions.geometry),
    extensions.st_y(g.center::extensions.geometry),
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'key', target.key,
          'poi_id', candidate.id,
          'lng', extensions.st_x(candidate.point),
          'lat', extensions.st_y(candidate.point),
          'straight_m', round(candidate.straight_m)
        )
        order by target.key, candidate.straight_m
      )
      from jsonb_to_recordset(p_targets) as target (
        key text,
        poi_categories text[],
        search_radius_m integer,
        max_candidates integer
      )
      cross join lateral (
        select
          p.id,
          case
            when p.area is null then p.location::extensions.geometry
            else extensions.st_closestpoint(p.area::extensions.geometry, g.center::extensions.geometry)
          end as point,
          extensions.st_distance(coalesce(p.area, p.location), g.center) as straight_m
        from private.poi_features p
        where p.snapshot_id = p_snapshot_id
          and p.category = any (target.poi_categories)
          and extensions.st_dwithin(coalesce(p.area, p.location), g.center, target.search_radius_m)
        order by straight_m
        limit target.max_candidates
      ) as candidate
    ), '[]'::jsonb)
  from private.cell_scores cs
  join private.grid_cells g on g.id = cs.cell_id
  where cs.snapshot_id = p_snapshot_id and g.city_id = p_city_id
  order by g.id;
$$;

create function private.write_cell_walk_access(p_snapshot_id uuid, p_rows jsonb)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_count integer;
begin
  insert into private.cell_walk_access (
    snapshot_id, cell_id, category, t_nearest_s, d_nearest_m, n5, n10, n15, candidates,
    nearest_poi_id, distance_method
  )
  select
    p_snapshot_id, r.cell_id, r.category, r.t_nearest_s, r.d_nearest_m, r.n5, r.n10, r.n15,
    r.candidates, r.nearest_poi_id, r.distance_method
  from jsonb_to_recordset(p_rows) as r (
    cell_id uuid,
    category text,
    t_nearest_s integer,
    d_nearest_m integer,
    n5 smallint,
    n10 smallint,
    n15 smallint,
    candidates smallint,
    nearest_poi_id uuid,
    distance_method text
  )
  on conflict (snapshot_id, cell_id, category) do update set
    t_nearest_s = excluded.t_nearest_s,
    d_nearest_m = excluded.d_nearest_m,
    n5 = excluded.n5,
    n10 = excluded.n10,
    n15 = excluded.n15,
    candidates = excluded.candidates,
    nearest_poi_id = excluded.nearest_poi_id,
    distance_method = excluded.distance_method;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create function private.refresh_city_category_stats(p_snapshot_id uuid, p_city_id uuid, p_targets jsonb)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_count integer;
begin
  insert into private.city_category_stats (
    snapshot_id, city_id, category, poi_count, is_covered, avg_t_nearest_s, share_within_15
  )
  select
    p_snapshot_id,
    p_city_id,
    target.key,
    pois.poi_count,
    pois.poi_count >= target.min_poi_count,
    access.avg_t_nearest_s,
    access.share_within_15
  from jsonb_to_recordset(p_targets) as target (key text, poi_categories text[], min_poi_count integer)
  cross join lateral (
    select count(*)::integer as poi_count
    from private.poi_features p
    where p.snapshot_id = p_snapshot_id
      and p.city_id = p_city_id
      and p.category = any (target.poi_categories)
  ) as pois
  cross join lateral (
    select
      round(avg(wa.t_nearest_s))::integer as avg_t_nearest_s,
      round(avg(case when wa.t_nearest_s <= 900 then 1 else 0 end), 3) as share_within_15
    from private.cell_walk_access wa
    join private.grid_cells g on g.id = wa.cell_id
    join private.cell_scores cs on cs.snapshot_id = wa.snapshot_id and cs.cell_id = wa.cell_id
    where wa.snapshot_id = p_snapshot_id
      and wa.category = target.key
      and g.city_id = p_city_id
      and cs.is_residential is not false
  ) as access
  on conflict (snapshot_id, city_id, category) do update set
    poi_count = excluded.poi_count,
    is_covered = excluded.is_covered,
    avg_t_nearest_s = excluded.avg_t_nearest_s,
    share_within_15 = excluded.share_within_15;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create function private.grid_cell_neighbours(p_snapshot_id uuid, p_city_id uuid)
returns table (cell_id uuid, neighbour_id uuid)
language sql
stable
set search_path = ''
as $$
  select a.id, b.id
  from private.cell_scores csa
  join private.grid_cells a on a.id = csa.cell_id
  join private.cell_scores csb on csb.snapshot_id = csa.snapshot_id
  join private.grid_cells b on b.id = csb.cell_id
  where csa.snapshot_id = p_snapshot_id
    and a.city_id = p_city_id
    and b.city_id = p_city_id
    and b.size_m = a.size_m
    and b.id <> a.id
    and extensions.st_dwithin(a.center, b.center, a.size_m * 1.9);
$$;

create function private.cell_score_percentile(p_snapshot_id uuid, p_city_id uuid, p_category text, p_score numeric)
returns integer
language sql
stable
set search_path = ''
as $$
  select round(
    100.0 * count(*) filter (where (cs.categories ->> p_category)::numeric < p_score)
      / nullif(count(*), 0)
  )::integer
  from private.cell_scores cs
  join private.grid_cells g on g.id = cs.cell_id
  where cs.snapshot_id = p_snapshot_id
    and g.city_id = p_city_id
    and cs.is_residential is not false
    and jsonb_typeof(cs.categories -> p_category) = 'number';
$$;

create function private.walk_candidates_from(p_snapshot_id uuid, p_origin extensions.geography, p_targets jsonb)
returns table (
  key text,
  poi_id uuid,
  source_ref text,
  name text,
  lng double precision,
  lat double precision,
  straight_m integer,
  opening_hours text,
  is_24h boolean
)
language sql
stable
set search_path = ''
as $$
  select
    target.key,
    candidate.id,
    candidate.source_ref,
    candidate.name,
    extensions.st_x(candidate.point),
    extensions.st_y(candidate.point),
    round(candidate.straight_m)::integer,
    candidate.opening_hours,
    candidate.is_24h
  from jsonb_to_recordset(p_targets) as target (
    key text,
    poi_categories text[],
    search_radius_m integer,
    max_candidates integer
  )
  cross join lateral (
    select
      p.id,
      p.source_ref,
      p.name,
      p.opening_hours,
      p.is_24h,
      case
        when p.area is null then p.location::extensions.geometry
        else extensions.st_closestpoint(p.area::extensions.geometry, p_origin::extensions.geometry)
      end as point,
      extensions.st_distance(coalesce(p.area, p.location), p_origin) as straight_m
    from private.poi_features p
    where p.snapshot_id = p_snapshot_id
      and p.category = any (target.poi_categories)
      and extensions.st_dwithin(coalesce(p.area, p.location), p_origin, target.search_radius_m)
    order by straight_m
    limit target.max_candidates
  ) as candidate
  order by target.key, candidate.straight_m;
$$;
