create function private.green_park_walk_candidates(p_snapshot_id uuid, p_city_id uuid, p_targets jsonb)
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
        min_ha numeric,
        search_radius_m integer,
        max_candidates integer
      )
      cross join lateral (
        select
          ga.id,
          extensions.st_closestpoint(ga.geometry::extensions.geometry, g.center::extensions.geometry) as point,
          extensions.st_distance(ga.geometry, g.center) as straight_m
        from private.green_areas ga
        where ga.snapshot_id = p_snapshot_id
          and ga.city_id = p_city_id
          and ga.area_ha >= target.min_ha
          and extensions.st_dwithin(ga.geometry, g.center, target.search_radius_m)
        order by straight_m
        limit target.max_candidates
      ) as candidate
    ), '[]'::jsonb)
  from private.cell_scores cs
  join private.grid_cells g on g.id = cs.cell_id
  where cs.snapshot_id = p_snapshot_id and g.city_id = p_city_id
  order by g.id;
$$;
