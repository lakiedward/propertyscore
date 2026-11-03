create function private.describe_green_surroundings(
  p_snapshot_id uuid,
  p_location extensions.geography,
  p_parks_radius_m integer,
  p_park_limit integer,
  p_map_radius_m integer
)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_point extensions.geometry;
  v_parks jsonb;
  v_areas jsonb;
begin
  if p_parks_radius_m is null or p_parks_radius_m not between 100 and 5000
    or p_map_radius_m is null or p_map_radius_m not between 100 and 3000
    or p_park_limit is null or p_park_limit not between 1 and 20 then
    raise exception using errcode = 'P0001', message = 'green_surroundings_invalid';
  end if;

  v_point := extensions.st_transform(p_location::extensions.geometry, 3844);

  select coalesce(jsonb_agg(park order by (park ->> 'distance_m')::numeric, park ->> 'id'), '[]'::jsonb)
  into v_parks
  from (
    select jsonb_build_object(
      'id', ga.id,
      'name', ga.name,
      'kind', ga.kind,
      'area_ha', ga.area_ha,
      'amenities', to_jsonb(ga.amenities),
      'distance_m', round(extensions.st_distance(ga.shape, v_point)::numeric),
      'center', jsonb_build_array(
        round(extensions.st_x(extensions.st_pointonsurface(ga.geometry::extensions.geometry))::numeric, 6),
        round(extensions.st_y(extensions.st_pointonsurface(ga.geometry::extensions.geometry))::numeric, 6)
      )
    ) as park
    from private.green_areas ga
    where ga.snapshot_id = p_snapshot_id
      and extensions.st_dwithin(ga.shape, v_point, p_parks_radius_m)
    order by ga.shape operator(extensions.<->) v_point, ga.id
    limit p_park_limit
  ) as nearest;

  select jsonb_build_object(
    'type', 'FeatureCollection',
    'features', coalesce(jsonb_agg(
      jsonb_build_object(
        'type', 'Feature',
        'properties', jsonb_build_object('id', clipped.id),
        'geometry', extensions.st_asgeojson(clipped.geom, 6)::jsonb
      )
      order by clipped.id
    ), '[]'::jsonb)
  )
  into v_areas
  from (
    select
      ga.id,
      extensions.st_transform(
        extensions.st_simplifypreservetopology(
          extensions.st_collectionextract(
            extensions.st_intersection(ga.shape, extensions.st_buffer(v_point, p_map_radius_m, 32)),
            3
          ),
          4
        ),
        4326
      ) as geom
    from private.green_areas ga
    where ga.snapshot_id = p_snapshot_id
      and extensions.st_dwithin(ga.shape, v_point, p_map_radius_m)
  ) as clipped
  where not extensions.st_isempty(clipped.geom);

  return jsonb_build_object('parks', v_parks, 'areas', v_areas);
end;
$$;

comment on function private.describe_green_surroundings(uuid, extensions.geography, integer, integer, integer) is
  'Green areas around an exact address for the online report: the nearest parks with straight-line distance and the polygons clipped to the map radius.';

