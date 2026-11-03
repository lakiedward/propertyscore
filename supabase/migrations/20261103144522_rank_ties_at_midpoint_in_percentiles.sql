create or replace function private.cell_score_percentile(p_snapshot_id uuid, p_city_id uuid, p_category text, p_score numeric)
returns integer
language sql
stable
set search_path = ''
as $$
  select round(
    100.0 * (
      count(*) filter (where (cs.categories ->> p_category)::numeric < p_score)
      + 0.5 * count(*) filter (where (cs.categories ->> p_category)::numeric = p_score)
    ) / nullif(count(*), 0)
  )::integer
  from private.cell_scores cs
  join private.grid_cells g on g.id = cs.cell_id
  where cs.snapshot_id = p_snapshot_id
    and g.city_id = p_city_id
    and cs.is_residential is not false
    and jsonb_typeof(cs.categories -> p_category) = 'number';
$$;

create or replace function private.summarize_report_zone(p_snapshot_id uuid, p_cell_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with target as (
    select cs.overall, cs.categories, g.city_id, c.slug, c.name
    from private.cell_scores cs
    join private.grid_cells g on g.id = cs.cell_id
    join public.cities c on c.id = g.city_id
    where cs.snapshot_id = p_snapshot_id and cs.cell_id = p_cell_id
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
  per_category as (
    select
      category_keys.key,
      jsonb_build_object(
        'score', target.categories -> category_keys.key,
        'percentile', case when jsonb_typeof(target.categories -> category_keys.key) = 'number' then (
          select round(
            100.0 * (
              count(*) filter (where (peers.categories ->> category_keys.key)::numeric < (target.categories ->> category_keys.key)::numeric)
              + 0.5 * count(*) filter (where (peers.categories ->> category_keys.key)::numeric = (target.categories ->> category_keys.key)::numeric)
            ) / nullif(count(*) filter (where jsonb_typeof(peers.categories -> category_keys.key) = 'number'), 0)
          )
          from peers
        ) end,
        'city_avg', context.city_stats -> 'categories' -> category_keys.key -> 'avg',
        'histogram', coalesce(context.city_stats -> 'categories' -> category_keys.key -> 'histogram', '[]'::jsonb),
        'weight', coalesce(context.weights -> category_keys.key, '0'::jsonb)
      ) as summary
    from category_keys
    cross join target
    cross join context
  )
  select jsonb_build_object(
    'schema_version', 1,
    'city', jsonb_build_object('slug', target.slug, 'name', target.name),
    'snapshot', jsonb_build_object('period', to_char(context.period, 'YYYY-MM-DD'), 'source_dates', context.source_dates),
    'formula', jsonb_build_object('label', context.label, 'weights', context.weights),
    'zone', jsonb_build_object(
      'score', target.overall,
      'percentile', case when target.overall is not null then (
        select round(
          100.0 * (
            count(*) filter (where peers.overall < target.overall)
            + 0.5 * count(*) filter (where peers.overall = target.overall)
          ) / nullif(count(peers.overall), 0)
        )
        from peers
      ) end,
      'city_avg', context.city_stats -> 'overall' -> 'avg',
      'histogram', coalesce(context.city_stats -> 'overall' -> 'histogram', '[]'::jsonb)
    ),
    'categories', (select jsonb_object_agg(per_category.key, per_category.summary) from per_category)
  )
  from target
  cross join context;
$$;
