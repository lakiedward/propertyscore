create function private.report_nearest_cells(p_snapshot_id uuid, p_cell_id uuid, p_location extensions.geography)
returns table (
  cell_id uuid,
  center_x double precision,
  center_y double precision,
  point_x double precision,
  point_y double precision,
  categories jsonb
)
language sql
stable
set search_path = ''
as $$
  with target as (
    select g.city_id, g.size_m,
      extensions.st_transform(p_location::extensions.geometry, 3844) as point
    from private.grid_cells g
    where g.id = p_cell_id
  )
  select
    g.id,
    extensions.st_x(extensions.st_transform(g.center::extensions.geometry, 3844)),
    extensions.st_y(extensions.st_transform(g.center::extensions.geometry, 3844)),
    extensions.st_x(target.point),
    extensions.st_y(target.point),
    cs.categories
  from target
  join private.grid_cells g
    on g.city_id = target.city_id
    and g.size_m = target.size_m
    and extensions.st_dwithin(g.center, p_location, 2 * target.size_m)
  join private.cell_scores cs on cs.cell_id = g.id and cs.snapshot_id = p_snapshot_id
  order by extensions.st_distance(g.center, p_location), g.id
  limit 3;
$$;

comment on function private.report_nearest_cells(uuid, uuid, extensions.geography) is
  'The three scored cells whose centres are nearest to a report address, with the centres and the address in EPSG:3844, to interpolate the address scores.';

create function private.report_cell_neighbours(p_snapshot_id uuid, p_cell_id uuid)
returns table (cell_id uuid, inputs jsonb)
language sql
stable
set search_path = ''
as $$
  select n.id, cs.inputs
  from private.grid_cells g
  join private.grid_cells n
    on n.city_id = g.city_id
    and n.size_m = g.size_m
    and n.id <> g.id
    and extensions.st_dwithin(n.geometry, g.center, g.size_m)
  join private.cell_scores cs on cs.cell_id = n.id and cs.snapshot_id = p_snapshot_id
  where g.id = p_cell_id
  order by n.id;
$$;

create function private.measure_green_point(
  p_snapshot_id uuid,
  p_city_id uuid,
  p_location extensions.geography,
  p_radii_m integer[],
  p_small_min_ha numeric,
  p_large_min_ha numeric
)
returns table (
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
  with origin as (
    select extensions.st_transform(p_location::extensions.geometry, 3844) as center
  )
  select
    (
      select jsonb_object_agg(radius::text, round(coalesce(covered.share, 0)::numeric, 4))
      from unnest(p_radii_m) as radius
      cross join lateral extensions.st_buffer(origin.center, radius, 16) as disc (geom)
      cross join lateral (
        select least(
          1,
          coalesce(sum(extensions.st_area(extensions.st_intersection(disc.geom, ga.shape))), 0)
            / extensions.st_area(disc.geom)
        ) as share
        from private.green_areas ga
        where ga.snapshot_id = p_snapshot_id
          and ga.city_id = p_city_id
          and extensions.st_dwithin(ga.shape, origin.center, radius)
      ) as covered
    ),
    small.id,
    round(small.distance_m::numeric, 1),
    large.id,
    round(large.distance_m::numeric, 1)
  from origin
  left join lateral (
    select ga.id, extensions.st_distance(ga.shape, origin.center) as distance_m
    from private.green_areas ga
    where ga.snapshot_id = p_snapshot_id
      and ga.city_id = p_city_id
      and ga.area_ha >= p_small_min_ha
    order by ga.shape operator(extensions.<->) origin.center
    limit 1
  ) as small on true
  left join lateral (
    select ga.id, extensions.st_distance(ga.shape, origin.center) as distance_m
    from private.green_areas ga
    where ga.snapshot_id = p_snapshot_id
      and ga.city_id = p_city_id
      and ga.area_ha >= p_large_min_ha
    order by ga.shape operator(extensions.<->) origin.center
    limit 1
  ) as large on true;
$$;

drop function private.complete_online_report(uuid, uuid, uuid, jsonb);
drop function private.summarize_report_zone(uuid, uuid);

create function private.summarize_report_zone(
  p_snapshot_id uuid,
  p_cell_id uuid,
  p_scores jsonb default null
)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with cell as (
    select cs.overall, cs.categories, g.city_id, c.slug, c.name
    from private.cell_scores cs
    join private.grid_cells g on g.id = cs.cell_id
    join public.cities c on c.id = g.city_id
    where cs.snapshot_id = p_snapshot_id and cs.cell_id = p_cell_id
  ),
  target as (
    select
      cell.*,
      case when p_scores is null then cell.overall else (p_scores ->> 'overall')::numeric end as score,
      case when p_scores is null then cell.categories else coalesce(p_scores -> 'categories', '{}'::jsonb) end as scores
    from cell
  ),
  context as (
    select s.period, s.source_dates, s.stats -> 'cities' -> target.slug as city_stats, v.label, v.weights
    from public.score_snapshots s
    join public.scoring_versions v on v.id = s.scoring_version_id
    cross join target
    where s.id = p_snapshot_id
  ),
  peers as (
    select cs.overall, cs.categories
    from private.cell_scores cs
    join private.grid_cells g on g.id = cs.cell_id
    join target on target.city_id = g.city_id
    where cs.snapshot_id = p_snapshot_id and cs.is_residential is not false
  ),
  category_keys as (
    select key, position
    from unnest(array[
      'safety', 'accessibility', 'fifteen_minute', 'green', 'noise',
      'air', 'industry', 'education', 'health'
    ]) with ordinality as keys (key, position)
  ),
  category_range as (
    select
      category_keys.key,
      min((peers.categories ->> category_keys.key)::numeric)
        filter (where jsonb_typeof(peers.categories -> category_keys.key) = 'number') as city_min,
      max((peers.categories ->> category_keys.key)::numeric)
        filter (where jsonb_typeof(peers.categories -> category_keys.key) = 'number') as city_max
    from category_keys
    left join peers on true
    group by category_keys.key
  ),
  per_category as (
    select
      category_keys.key,
      jsonb_build_object(
        'score', coalesce(target.scores -> category_keys.key, 'null'::jsonb),
        'cell_score', coalesce(target.categories -> category_keys.key, 'null'::jsonb),
        'percentile', case when jsonb_typeof(target.scores -> category_keys.key) = 'number' then (
          select round(
            100.0 * (
              count(*) filter (where (peers.categories ->> category_keys.key)::numeric < (target.scores ->> category_keys.key)::numeric)
              + 0.5 * count(*) filter (where (peers.categories ->> category_keys.key)::numeric = (target.scores ->> category_keys.key)::numeric)
            ) / nullif(count(*) filter (where jsonb_typeof(peers.categories -> category_keys.key) = 'number'), 0)
          )
          from peers
        ) end,
        'city_avg', context.city_stats -> 'categories' -> category_keys.key -> 'avg',
        'city_min', category_range.city_min,
        'city_max', category_range.city_max,
        'histogram', coalesce(context.city_stats -> 'categories' -> category_keys.key -> 'histogram', '[]'::jsonb),
        'weight', coalesce(context.weights -> category_keys.key, '0'::jsonb)
      ) as summary
    from category_keys
    join category_range on category_range.key = category_keys.key
    cross join target
    cross join context
  )
  select jsonb_build_object(
    'schema_version', 1,
    'city', jsonb_build_object('slug', target.slug, 'name', target.name),
    'snapshot', jsonb_build_object('period', to_char(context.period, 'YYYY-MM-DD'), 'source_dates', context.source_dates),
    'formula', jsonb_build_object('label', context.label, 'weights', context.weights),
    'zone', jsonb_build_object(
      'score', target.score,
      'cell_score', target.overall,
      'precision', case when p_scores is null then 'cell' else 'address' end,
      'percentile', case when target.score is not null then (
        select round(
          100.0 * (
            count(*) filter (where peers.overall < target.score)
            + 0.5 * count(*) filter (where peers.overall = target.score)
          ) / nullif(count(peers.overall), 0)
        )
        from peers
      ) end,
      'city_avg', context.city_stats -> 'overall' -> 'avg',
      'city_min', (select min(peers.overall) from peers),
      'city_max', (select max(peers.overall) from peers),
      'histogram', coalesce(context.city_stats -> 'overall' -> 'histogram', '[]'::jsonb)
    ),
    'categories', (select jsonb_object_agg(per_category.key, per_category.summary) from per_category)
  )
  from target
  cross join context;
$$;

create function private.complete_online_report(
  p_report_id uuid,
  p_snapshot_id uuid,
  p_cell_id uuid,
  p_sections jsonb,
  p_scores jsonb default null
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_summary jsonb;
begin
  if jsonb_typeof(p_sections) is distinct from 'object' then
    raise exception using errcode = 'P0001', message = 'report_sections_invalid';
  end if;

  if p_scores is not null and (
    jsonb_typeof(p_scores -> 'categories') is distinct from 'object'
    or jsonb_typeof(p_scores -> 'overall') not in ('number', 'null')
  ) then
    raise exception using errcode = 'P0001', message = 'report_scores_invalid';
  end if;

  v_summary := private.summarize_report_zone(p_snapshot_id, p_cell_id, p_scores);
  if v_summary is null then
    raise exception using errcode = 'P0001', message = 'report_cell_not_scored';
  end if;

  update public.online_reports r
  set
    status = 'ready',
    snapshot_id = p_snapshot_id,
    scoring_version_id = s.scoring_version_id,
    overall_score = (v_summary -> 'zone' ->> 'score')::smallint,
    category_scores = (
      select coalesce(jsonb_object_agg(entry.key, entry.value -> 'score'), '{}'::jsonb)
      from jsonb_each(v_summary -> 'categories') as entry (key, value)
    ),
    result = p_sections || v_summary,
    error_code = null,
    generated_at = now()
  from public.score_snapshots s
  where r.id = p_report_id and s.id = p_snapshot_id and r.status = 'generating';

  if not found then
    raise exception using errcode = 'P0001', message = 'report_not_generating';
  end if;
end;
$$;
