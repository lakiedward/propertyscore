create function private.safety_walk_candidates(p_snapshot_id uuid, p_city_id uuid, p_targets jsonb)
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
          'straight_m', round(candidate.straight_m),
          'night_state', candidate.night_state
        )
        order by target.key, candidate.straight_m
      )
      from jsonb_to_recordset(p_targets) as target (
        key text,
        search_radius_m integer,
        max_candidates integer
      )
      cross join lateral (
        select
          f.id,
          f.night_state,
          extensions.st_closestpoint(f.geometry::extensions.geometry, g.center::extensions.geometry) as point,
          extensions.st_distance(f.geometry, g.center, false) as straight_m
        from private.safety_features f
        where f.snapshot_id = p_snapshot_id
          and f.city_id = p_city_id
          and f.feature_type = target.key
          and extensions.st_dwithin(f.geometry, g.center, target.search_radius_m, false)
        order by straight_m
        limit target.max_candidates
      ) as candidate
    ), '[]'::jsonb)
  from private.cell_scores cs
  join private.grid_cells g on g.id = cs.cell_id
  where cs.snapshot_id = p_snapshot_id and g.city_id = p_city_id
  order by g.id;
$$;
