create or replace function private.describe_green_surroundings(
  p_snapshot_id uuid,
  p_location extensions.geography,
  p_parks_radius_m integer,
  p_park_limit integer,
  p_map_radius_m integer,
  p_unnamed_min_ha numeric
)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_point extensions.geometry;
  v_described jsonb;
begin
  if p_parks_radius_m is null or p_parks_radius_m not between 100 and 5000
    or p_map_radius_m is null or p_map_radius_m not between 100 and 3000
    or p_park_limit is null or p_park_limit not between 1 and 20
    or p_unnamed_min_ha is null or p_unnamed_min_ha < 0 then
    raise exception using errcode = 'P0001', message = 'green_surroundings_invalid';
  end if;

  v_point := extensions.st_transform(p_location::extensions.geometry, 3844);

  with nearby as (
    select ga.id, ga.city_id, ga.name, ga.kind, ga.area_ha, ga.source_refs, ga.amenities,
      ga.shape operator(extensions.<->) v_point as distance_m
    from private.green_areas ga
    where ga.snapshot_id = p_snapshot_id
      and extensions.st_dwithin(ga.shape, v_point, p_parks_radius_m)
  ),
  park_relations as (
    select distinct on (s.id) s.id, s.city_id, s.source_ref, s.name,
      extensions.st_makevalid(extensions.st_transform(s.geometry::extensions.geometry, 3844)) as shape
    from nearby n
    join private.green_area_sources s
      on s.snapshot_id = p_snapshot_id and s.city_id = n.city_id
      and s.source_ref = any(n.source_refs)
    where n.kind = 'park' and s.kind = 'park' and s.is_public
      and s.source = 'osm' and s.source_ref like 'osm:relation/%'
      and s.name is not distinct from n.name
    order by s.id
  ),
  relation_parts as (
    select ga.id, ga.area_ha, ga.amenities, (array_agg(r.id))[1] as relation_id
    from park_relations r
    join private.green_areas ga
      on ga.snapshot_id = p_snapshot_id and ga.city_id = r.city_id
      and ga.source_refs @> array[r.source_ref]
      and ga.shape operator(extensions.&&) r.shape
      and extensions.st_relate(ga.shape, r.shape, '2********')
    where ga.kind = 'park' and ga.name is not distinct from r.name
    group by ga.id
    having count(*) = 1
  ),
  relation_parks as (
    select
      rp.relation_id,
      (array_agg(rp.id order by n.distance_m nulls last, rp.id))[1] as id,
      array_agg(rp.id order by n.distance_m nulls last, rp.id) as part_ids,
      sum(rp.area_ha) as area_ha,
      array(
        select distinct amenity
        from relation_parts sibling
        cross join lateral unnest(sibling.amenities) as amenity
        where sibling.relation_id = rp.relation_id
        order by amenity
      ) as amenities
    from relation_parts rp
    left join nearby n on n.id = rp.id
    group by rp.relation_id
    having count(n.id) > 0
  ),
  listed as (
    select n.id, n.name, n.kind, n.distance_m,
      coalesce(p.part_ids, array[n.id]) as part_ids,
      coalesce(p.area_ha, n.area_ha) as area_ha,
      coalesce(p.amenities, n.amenities) as amenities
    from nearby n
    left join relation_parts rp on rp.id = n.id
    left join relation_parks p on p.relation_id = rp.relation_id
    where (p.id is null or p.id = n.id)
      and (n.name is not null or coalesce(p.area_ha, n.area_ha) >= p_unnamed_min_ha)
    order by n.distance_m, n.id
    limit p_park_limit
  ),
  score_parks as (
    select n.id, n.distance_m
    from nearby n
    where n.name is not null or n.area_ha >= p_unnamed_min_ha
    order by n.distance_m, n.id
    limit p_park_limit
  ),
  multipart_map_parts as (
    select ga.id, p.id as park_id, ga.shape
    from listed p
    cross join lateral unnest(p.part_ids) as part (id)
    join private.green_areas ga on ga.id = part.id
    where cardinality(p.part_ids) > 1
  ),
  map_parts as (
    select id, park_id, shape as geom from multipart_map_parts
    union all
    select ga.id, ga.id as park_id,
      extensions.st_collectionextract(
        extensions.st_intersection(ga.shape, extensions.st_buffer(v_point, p_map_radius_m, 32)),
        3
      ) as geom
    from private.green_areas ga
    where ga.snapshot_id = p_snapshot_id
      and extensions.st_dwithin(ga.shape, v_point, p_map_radius_m)
      and not exists (select 1 from multipart_map_parts mp where mp.id = ga.id)
  ),
  simplified_parts as (
    select id, park_id,
      extensions.st_transform(
        extensions.st_simplifypreservetopology(geom, 4),
        4326
      ) as geom
    from map_parts
  )
  select jsonb_build_object(
    'parks', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', p.id,
        'part_ids', to_jsonb(p.part_ids),
        'name', p.name,
        'kind', p.kind,
        'area_ha', p.area_ha,
        'amenities', to_jsonb(p.amenities),
        'distance_m', round(p.distance_m::numeric),
        'center', jsonb_build_array(
          round(extensions.st_x(point.geom)::numeric, 6),
          round(extensions.st_y(point.geom)::numeric, 6)
        )
      ) order by round(p.distance_m::numeric), p.id), '[]'::jsonb)
      from listed p
      join private.green_areas ga on ga.id = p.id
      cross join lateral extensions.st_pointonsurface(ga.geometry::extensions.geometry) as point (geom)
    ),
    'score_park_ids', (select coalesce(jsonb_agg(id order by distance_m, id), '[]'::jsonb) from score_parks),
    'areas', jsonb_build_object(
      'type', 'FeatureCollection',
      'features', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'type', 'Feature',
          'properties', jsonb_build_object('id', park_id),
          'geometry', extensions.st_asgeojson(geom, 6)::jsonb
        ) order by id), '[]'::jsonb)
        from simplified_parts
        where not extensions.st_isempty(geom)
      )
    )
  ) into v_described;

  return v_described;
end;
$$;
