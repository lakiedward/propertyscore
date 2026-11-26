create or replace function private.publish_score_snapshot(p_snapshot_id uuid, p_source_dates jsonb)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_status public.snapshot_status;
  v_city_stats jsonb;
  v_cell_size_m integer;
  v_missing_cities text;
begin
  select s.status, s.stats -> 'cities', (v.params ->> 'cell_size_m')::integer
  into v_status, v_city_stats, v_cell_size_m
  from public.score_snapshots s
  join public.scoring_versions v on v.id = s.scoring_version_id
  where s.id = p_snapshot_id
  for update of s;

  if v_status is null then
    raise exception using errcode = 'P0001', message = 'snapshot_not_found';
  end if;

  if v_status <> 'building' then
    raise exception using errcode = 'P0001', message = 'snapshot_not_building';
  end if;

  select string_agg(c.slug, ', ' order by c.position) into v_missing_cities
  from public.cities c
  where c.has_online_coverage
    and coalesce((v_city_stats #>> array[c.slug, 'overall', 'scored'])::integer, 0) <= 0;

  if v_missing_cities is not null then
    raise exception using errcode = 'P0001', message = 'snapshot_incomplete_city_coverage', detail = v_missing_cities;
  end if;

  select string_agg(distinct c.slug, ', ' order by c.slug) into v_missing_cities
  from public.cities c
  left join private.key_destinations d on d.city_id = c.id and d.kind = 'station' and d.is_active
  where c.has_online_coverage
    and (
      d.id is null
      or extensions.st_intersects(c.boundary, d.location) is not true
      or (
        select cs.overall
        from private.grid_cells g
        join private.cell_scores cs on cs.cell_id = g.id and cs.snapshot_id = p_snapshot_id
        where g.city_id = c.id
          and g.size_m = v_cell_size_m
          and extensions.st_intersects(g.geometry, d.location)
        order by g.cell_key
        limit 1
      ) is null
    );

  if v_missing_cities is not null then
    raise exception using errcode = 'P0001', message = 'snapshot_unscored_reference_points', detail = v_missing_cities;
  end if;

  update public.score_snapshots
  set status = 'superseded'
  where status = 'ready';

  update public.score_snapshots
  set status = 'ready', finished_at = now(), source_dates = coalesce(p_source_dates, '{}')
  where id = p_snapshot_id;
end;
$$;
