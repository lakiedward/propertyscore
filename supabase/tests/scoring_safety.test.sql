begin;

create extension if not exists pgtap with schema extensions;

select plan(15);

update public.score_snapshots set status = 'failed', finished_at = now(), error_code = 'test_setup'
where status = 'building';

select id as sibiu_id from public.cities where slug = 'sibiu' \gset

select private.build_grid_cells(:'sibiu_id', 175);
select private.start_score_snapshot('2026-11-01') as snapshot_id \gset
select private.seed_cell_scores(:'snapshot_id', :'sibiu_id');

select ok(
  (select params -> 'safety' ? 'types' from public.scoring_versions where kind = 'online' and label = 'v1'),
  'Formula v1 carries the Safety parameters'
);

select is(
  (select count(*)::integer from jsonb_object_keys(
    (select params -> 'safety' -> 'types' from public.scoring_versions where kind = 'online' and label = 'v1')
  )),
  14,
  'Formula v1 has a radius and day and night weights for each of the 14 element types'
);

select cell_id as centre_cell_id
from private.cell_scores
where snapshot_id = :'snapshot_id'
  and cell_id = private.find_grid_cell(extensions.st_point(24.15192, 45.79705, 4326)::extensions.geography, 175) \gset

insert into private.safety_features (snapshot_id, city_id, source_ref, feature_type, geometry, night_state)
values
  (:'snapshot_id', :'sibiu_id', 'osm:node/1', 'police',
    extensions.st_point(24.15192, 45.79705, 4326)::extensions.geography, 'unknown'),
  (:'snapshot_id', :'sibiu_id', 'osm:node/2', 'shop',
    extensions.st_point(24.15200, 45.79710, 4326)::extensions.geography, 'closed'),
  (:'snapshot_id', :'sibiu_id', 'osm:way/3', 'isolated_passage',
    extensions.st_geomfromtext('LINESTRING(24.1500 45.7980, 24.1540 45.7980)', 4326)::extensions.geography, 'unknown'),
  (:'snapshot_id', :'sibiu_id', 'osm:way/4', 'park',
    extensions.st_geomfromtext('POLYGON((24.150 45.795, 24.152 45.795, 24.152 45.796, 24.150 45.796, 24.150 45.795))', 4326)::extensions.geography, 'unknown');

select throws_ok(
  format(
    $$ insert into private.safety_features (snapshot_id, city_id, source_ref, feature_type, geometry)
       values (%L, %L, 'osm:node/9', 'casino', extensions.st_point(24.15, 45.79, 4326)::extensions.geography) $$,
    :'snapshot_id', :'sibiu_id'
  ),
  '23514',
  null,
  'Only the 14 Safety element types are stored'
);

select throws_ok(
  format(
    $$ insert into private.safety_features (snapshot_id, city_id, source_ref, feature_type, geometry, night_state)
       values (%L, %L, 'osm:node/9', 'shop', extensions.st_point(24.15, 45.79, 4326)::extensions.geography, 'maybe') $$,
    :'snapshot_id', :'sibiu_id'
  ),
  '23514',
  null,
  'The night state is open, closed or unknown'
);

select results_eq(
  format(
    $$ select i.feature_type, abs(i.distances[1] - extensions.st_distance(g.center, f.geometry, false)) < 1
       from private.safety_cell_inputs(%L, %L, '{"police": 1800, "shop": 360}') as i
       join private.grid_cells g on g.id = i.cell_id
       join private.safety_features f on f.snapshot_id = %L and f.feature_type = i.feature_type
       where i.cell_id = %L
       order by i.feature_type $$,
    :'snapshot_id', :'sibiu_id', :'snapshot_id', :'centre_cell_id'
  ),
  $$ values ('police'::text, true), ('shop'::text, true) $$,
  'A cell gets the distance from its centre to each element within reach, only for the types asked'
);

select is(
  (select night_states from private.safety_cell_inputs(:'snapshot_id', :'sibiu_id', '{"shop": 360}') where cell_id = :'centre_cell_id'),
  array['closed'],
  'Each distance comes with the element''s night state'
);

select ok(
  not exists (
    select 1 from private.safety_cell_inputs(:'snapshot_id', :'sibiu_id', '{"police": 1800}') as i, unnest(i.distances) as d
    where d > 1800
  ),
  'No element beyond the reach is returned'
);

select ok(
  (select bool_and(d < 200) from private.safety_cell_inputs(:'snapshot_id', :'sibiu_id', '{"park": 600}') as i, unnest(i.distances) as d
   where i.cell_id = private.find_grid_cell(extensions.st_point(24.151, 45.7955, 4326)::extensions.geography, 175)),
  'The distance to an area is measured to its nearest edge, zero inside it'
);

select results_eq(
  format(
    $$ select c ->> 'key', abs((c ->> 'straight_m')::numeric - extensions.st_distance(g.center, f.geometry, false)::numeric) <= 1, c ->> 'night_state'
       from private.safety_walk_candidates(%L, %L, '[{"key": "police", "search_radius_m": 1800, "max_candidates": 8}]') as w
       join private.grid_cells g on g.id = w.cell_id
       cross join lateral jsonb_array_elements(w.candidates) as c
       join private.safety_features f on f.id = (c ->> 'poi_id')::uuid
       where w.cell_id = %L $$,
    :'snapshot_id', :'sibiu_id', :'centre_cell_id'
  ),
  $$ values ('police'::text, true, 'unknown'::text) $$,
  'A cell walks only to the types asked, with each station''s night state'
);

select ok(
  (select bool_and(
     extensions.st_dwithin(
       extensions.st_point((c ->> 'lng')::float8, (c ->> 'lat')::float8, 4326)::extensions.geography,
       f.geometry, 1
     ))
   from private.safety_walk_candidates(:'snapshot_id', :'sibiu_id', '[{"key": "park", "search_radius_m": 600, "max_candidates": 8}]') as w
   cross join lateral jsonb_array_elements(w.candidates) as c
   join private.safety_features f on f.id = (c ->> 'poi_id')::uuid),
  'The walk ends on the element itself, at its nearest edge for an area'
);

select ok(
  not exists (
    select 1
    from private.safety_walk_candidates(:'snapshot_id', :'sibiu_id', '[{"key": "police", "search_radius_m": 300, "max_candidates": 8}]') as w
    cross join lateral jsonb_array_elements(w.candidates) as c
    where (c ->> 'straight_m')::numeric > 300
  ),
  'No station beyond the search radius is walked to'
);

select results_eq(
  format(
    $$ select count(*) filter (where cardinality(neighbour_ids) = 6) > count(*) / 2, max(cardinality(neighbour_ids))
       from private.safety_cell_neighbours(%L, %L) $$,
    :'snapshot_id', :'sibiu_id'
  ),
  $$ values (true, 6) $$,
  'An inner cell has its six surrounding hexagons as neighbours, never more'
);

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select throws_ok(
  $$ select count(*) from private.safety_features $$,
  '42501',
  null,
  'A visitor cannot read the Safety elements'
);

set local role authenticated;
set local request.jwt.claims = '{"role": "authenticated", "sub": "11111111-1111-1111-1111-111111111111"}';

select throws_ok(
  $$ select count(*) from private.safety_features $$,
  '42501',
  null,
  'A signed-in user cannot read the Safety elements'
);

select throws_ok(
  format($$ select * from private.safety_cell_inputs(%L, %L, '{}') $$, :'snapshot_id', :'sibiu_id'),
  '42501',
  null,
  'A signed-in user cannot call the Safety functions'
);

select * from finish();
rollback;
