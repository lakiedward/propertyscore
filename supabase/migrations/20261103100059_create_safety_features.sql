create table private.safety_features (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.score_snapshots (id) on delete cascade,
  city_id uuid not null references public.cities (id) on delete cascade,
  source_ref text not null check (char_length(source_ref) between 1 and 120),
  feature_type text not null check (
    feature_type in (
      'lighting', 'shop', 'nonstop', 'mixed_use', 'police', 'fire_station', 'diplomatic',
      'bar', 'park', 'park_lit', 'isolated_passage', 'train_station', 'train_halt', 'transit_stop'
    )
  ),
  name text check (char_length(name) between 1 and 300),
  geometry extensions.geography not null check (
    extensions.st_srid(geometry) = 4326
    and extensions.geometrytype(geometry) in ('POINT', 'LINESTRING', 'MULTILINESTRING', 'POLYGON', 'MULTIPOLYGON')
  ),
  night_state text not null default 'unknown' check (night_state in ('open', 'closed', 'unknown')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint safety_features_snapshot_ref_type_key unique (snapshot_id, source_ref, feature_type)
);

comment on table private.safety_features is 'OpenStreetMap elements the Safety score counts (lamps, shops, police, parks, passages…), frozen per snapshot; lines and areas keep their shape so distances are measured to the nearest edge.';

create index safety_features_snapshot_city_type_idx on private.safety_features (snapshot_id, city_id, feature_type);
create index safety_features_city_id_idx on private.safety_features (city_id);
create index safety_features_geometry_idx on private.safety_features using gist (geometry);

alter table private.safety_features enable row level security;

create trigger safety_features_set_updated_at
  before update on private.safety_features
  for each row execute function private.set_updated_at();

create function private.safety_cell_inputs(p_snapshot_id uuid, p_city_id uuid, p_reach_m jsonb)
returns table (cell_id uuid, feature_type text, distances real[], night_states text[])
language sql
stable
set search_path = ''
as $$
  select
    cs.cell_id,
    f.feature_type,
    array_agg(extensions.st_distance(g.center, f.geometry, false)::real order by f.id),
    array_agg(f.night_state order by f.id)
  from private.cell_scores cs
  join private.grid_cells g on g.id = cs.cell_id
  cross join lateral jsonb_each_text(p_reach_m) as reach (feature_type, metres)
  join private.safety_features f
    on f.snapshot_id = cs.snapshot_id
    and f.city_id = g.city_id
    and f.feature_type = reach.feature_type
    and extensions.st_dwithin(g.center, f.geometry, reach.metres::double precision, false)
  where cs.snapshot_id = p_snapshot_id
    and g.city_id = p_city_id
  group by cs.cell_id, f.feature_type;
$$;

create function private.safety_cell_neighbours(p_snapshot_id uuid, p_city_id uuid)
returns table (cell_id uuid, neighbour_ids uuid[])
language sql
stable
set search_path = ''
as $$
  select g.id, coalesce(near.ids, '{}'::uuid[])
  from private.cell_scores cs
  join private.grid_cells g on g.id = cs.cell_id
  cross join lateral (
    select array_agg(n.id order by n.cell_key) as ids
    from private.grid_cells n
    join private.cell_scores ncs on ncs.cell_id = n.id and ncs.snapshot_id = cs.snapshot_id
    where n.id <> g.id
      and n.city_id = g.city_id
      and n.size_m = g.size_m
      and extensions.st_dwithin(g.center, n.center, g.size_m * sqrt(3) * 1.2, false)
  ) as near
  where cs.snapshot_id = p_snapshot_id
    and g.city_id = p_city_id;
$$;

update public.scoring_versions
set params = params || jsonb_build_object('safety', '{
  "start": 50,
  "k": 4,
  "night_offset": -8,
  "moment_weights": { "day": 0.5, "night": 0.5 },
  "smoothing": { "self": 0.6, "neighbours": 0.4 },
  "reach_factor": 3,
  "walk_detour_factor": 1.3,
  "night_check_minute": 1380,
  "min_open_nights": 5,
  "lighting_coverage_ratio": 0.2,
  "calibration": { "median_day": 60, "p90_day": 85 },
  "types": {
    "lighting": { "radius_m": 45, "weight_day": 0.15, "weight_night": 0.6, "cap": 6 },
    "shop": { "radius_m": 120, "weight_day": 1, "weight_night": 1, "cap": 4, "night_activity": { "open": 1, "closed": 0, "unknown": 0.25 } },
    "nonstop": { "radius_m": 150, "weight_day": 0.6, "weight_night": 1.6, "cap": 2 },
    "mixed_use": { "radius_m": 100, "weight_day": 0.6, "weight_night": 0.5, "cap": 3 },
    "police": { "radius_m": 600, "weight_day": 2.2, "weight_night": 2.6, "cap": 1.5, "walking": true },
    "fire_station": { "radius_m": 800, "weight_day": 1, "weight_night": 1, "cap": 1, "walking": true },
    "diplomatic": { "radius_m": 220, "weight_day": 2, "weight_night": 2, "cap": 1 },
    "bar": { "radius_m": 120, "weight_day": 0.3, "weight_night": -1.1, "cap": 3 },
    "park": { "radius_m": 200, "weight_day": -0.3, "weight_night": -2.5, "cap": 1 },
    "park_lit": { "radius_m": 200, "weight_day": 0, "weight_night": -0.8, "cap": 1 },
    "isolated_passage": { "radius_m": 160, "weight_day": -1.4, "weight_night": -3, "cap": 1.5 },
    "train_station": { "radius_m": 300, "weight_day": 0.8, "weight_night": -1.5, "cap": 1 },
    "train_halt": { "radius_m": 200, "weight_day": 0.2, "weight_night": -0.8, "cap": 1 },
    "transit_stop": { "radius_m": 80, "weight_day": 0.4, "weight_night": 0.6, "cap": 2, "night_activity": { "open": 1, "closed": 0.33, "unknown": 0.33 } }
  }
}'::jsonb)
where kind = 'online' and label = 'v1';
