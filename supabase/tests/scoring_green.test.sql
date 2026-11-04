begin;

create extension if not exists pgtap with schema extensions;

select plan(24);

update public.score_snapshots set status = 'failed', finished_at = now(), error_code = 'test_setup'
where status = 'building';

select id as sibiu_id from public.cities where slug = 'sibiu' \gset
select private.build_grid_cells(:'sibiu_id', 175);
select private.start_score_snapshot('2026-11-01') as snapshot_id \gset
select private.seed_cell_scores(:'snapshot_id', :'sibiu_id');

select private.find_grid_cell(extensions.st_point(24.1326, 45.80035, 4326)::extensions.geography, 175) as park_cell \gset
select private.find_grid_cell(extensions.st_point(24.08, 45.79, 4326)::extensions.geography, 175) as far_cell \gset

select results_eq(
  $$ select (params #>> '{green,weights,c1}')::integer, (params ->> 'residential_min_share')::numeric
     from public.scoring_versions where kind = 'online' and label = 'v1' $$,
  $$ values (35, 0.1) $$,
  'The v1 formula carries the green parameters and the residential share'
);

insert into private.green_area_sources (snapshot_id, city_id, source, source_ref, name, kind, is_public, geometry)
select :'snapshot_id', :'sibiu_id', 'osm', seed.ref, seed.name, seed.kind::private.green_area_kind, seed.is_public,
  extensions.st_multi(extensions.st_makeenvelope(seed.w, seed.s, seed.e, seed.n, 4326))::extensions.geography
from (
  values
    ('osm:way/1', 'Parcul Sub Arini', 'park', true, 24.1300, 45.7990, 24.1352, 45.8017),
    ('osm:way/2', null, 'other', true, 24.1340, 45.8000, 24.1370, 45.8010),
    ('osm:way/3', 'Grădina privată', 'garden', false, 24.1200, 45.7960, 24.1210, 45.7965),
    ('osm:way/4', null, 'other', true, 24.1100, 45.7950, 24.1102, 45.7951),
    ('osm:way/5', 'Scuarul Cetății', 'park', true, 24.1250, 45.7975, 24.1260, 45.7982)
) as seed (ref, name, kind, is_public, w, s, e, n);

insert into private.poi_features (snapshot_id, city_id, source_ref, category, location)
values (:'snapshot_id', :'sibiu_id', 'osm:node/7', 'playground',
  extensions.st_point(24.1320, 45.8000, 4326)::extensions.geography);

select throws_ok(
  format($$ select private.merge_green_areas(%L, %L, -1) $$, :'snapshot_id', :'sibiu_id'),
  'P0001',
  'green_min_area_invalid',
  'The minimum polygon area cannot be negative'
);

select is(
  private.merge_green_areas(:'snapshot_id', :'sibiu_id', 0.05),
  2,
  'Overlapping sources merge, private gardens and slivers under 0.05 ha are left out'
);

select is(
  private.merge_green_areas(:'snapshot_id', :'sibiu_id', 0.05),
  2,
  'Merging twice replaces the areas instead of adding them again'
);

select results_eq(
  format($$ select name, kind::text, sources, source_refs, amenities from private.green_areas where snapshot_id = %L order by area_ha desc $$, :'snapshot_id'),
  $$ values
    ('Parcul Sub Arini'::text, 'park'::text, array['osm'], array['osm:way/1', 'osm:way/2'], array['playground']),
    ('Scuarul Cetății'::text, 'park'::text, array['osm'], array['osm:way/5'], '{}'::text[]) $$,
  'A merged area keeps the OSM name, the most specific kind, its sources and the amenities inside it'
);

select results_eq(
  format($$ select area_ha between 13 and 14.5 from private.green_areas where snapshot_id = %L and name = 'Parcul Sub Arini' $$, :'snapshot_id'),
  $$ values (true) $$,
  'The merged area is measured in hectares in the Stereo70 projection'
);

create temporary table measured on commit drop as
select * from private.measure_green_cells(:'snapshot_id', :'sibiu_id', array[300, 500, 1000], 0.5, 5);

select is(
  (select count(*)::integer from measured),
  (select count(*)::integer from private.cell_scores where snapshot_id = :'snapshot_id'),
  'Every cell of the city is measured'
);

select results_eq(
  format($$ select (shares ->> '300')::numeric > 0.3, (shares ->> '1000')::numeric > 0.03, nearest_small_m, nearest_large_m from measured where cell_id = %L $$, :'park_cell'),
  $$ values (true, true, 0.0, 0.0) $$,
  'A cell whose centre is in the park has a high share and no distance to walk'
);

select results_eq(
  format($$ select (shares ->> '300')::numeric, (shares ->> '500')::numeric, (shares ->> '1000')::numeric, nearest_large_m > 3000 from measured where cell_id = %L $$, :'far_cell'),
  $$ values (0::numeric, 0::numeric, 0::numeric, true) $$,
  'A cell with no green around it has a zero share, not a full one'
);

select results_eq(
  format($$ select nearest_small_id = nearest_large_id from measured where cell_id = %L $$, :'park_cell'),
  $$ values (true) $$,
  'The nearest small and large green area can be the same park'
);

select ok(
  (select bool_and((shares ->> '500')::numeric between 0 and 1) from measured),
  'Every share is between 0 and 1'
);

create temporary table park_walks on commit drop as
select * from private.green_park_walk_candidates(
  :'snapshot_id', :'sibiu_id',
  '[{"key": "small", "min_ha": 0.5, "search_radius_m": 1200, "max_candidates": 1},
    {"key": "large", "min_ha": 5, "search_radius_m": 3000, "max_candidates": 5}]'
);

select is(
  (select count(*)::integer from park_walks),
  (select count(*)::integer from private.cell_scores where snapshot_id = :'snapshot_id'),
  'Every cell of the city gets its list of parks to walk to'
);

select results_eq(
  format(
    $$ select c ->> 'poi_id' = m.nearest_large_id::text, (c ->> 'straight_m')::numeric,
         abs(extensions.st_x(g.center::extensions.geometry) - (c ->> 'lng')::float8) < 1e-9
       from park_walks w
       join measured m on m.cell_id = w.cell_id
       join private.grid_cells g on g.id = w.cell_id
       cross join lateral jsonb_array_elements(w.candidates) as c
       where w.cell_id = %L and c ->> 'key' = 'large' $$,
    :'park_cell'
  ),
  $$ values (true, 0::numeric, true) $$,
  'A cell inside a large park walks to that park from where it stands'
);

select ok(
  (select bool_and(
     (select count(*) from jsonb_array_elements(w.candidates) as c where c ->> 'key' = 'small') <= 1
     and not exists (
       select 1 from jsonb_array_elements(w.candidates) as c
       where (c ->> 'key' = 'small' and (c ->> 'straight_m')::numeric > 1200)
          or (c ->> 'key' = 'large' and (c ->> 'straight_m')::numeric > 3000)
     ))
   from park_walks w),
  'Each size keeps only its nearest parks within its search radius'
);

select is(
  (select candidates from park_walks where cell_id = :'far_cell'),
  '[]'::jsonb,
  'A cell with no park within reach has nothing to walk to'
);

create temporary table surroundings on commit drop as
select private.describe_green_surroundings(
  :'snapshot_id', extensions.st_point(24.1290, 45.7990, 4326)::extensions.geography, 1500, 5, 1000, 0.5
) as described;

select results_eq(
  $$ select
       jsonb_array_length(described -> 'parks'),
       described #>> '{parks,0,name}',
       (described #>> '{parks,0,distance_m}')::integer between 50 and 120,
       described #> '{parks,0,amenities}',
       described #>> '{parks,1,name}'
     from surroundings $$,
  $$ values (2, 'Parcul Sub Arini'::text, true, '["playground"]'::jsonb, 'Scuarul Cetății'::text) $$,
  'The parks around an address come nearest first with their distance and amenities'
);

select results_eq(
  $$ select
       described #>> '{areas,type}',
       jsonb_array_length(described #> '{areas,features}'),
       bool_and(feature #>> '{geometry,type}' in ('Polygon', 'MultiPolygon'))
     from surroundings, jsonb_array_elements(described #> '{areas,features}') as feature
     group by described $$,
  $$ values ('FeatureCollection'::text, 2, true) $$,
  'The green polygons inside the map radius come back as GeoJSON for the map'
);

select throws_ok(
  format($$ select private.describe_green_surroundings(%L, extensions.st_point(24.129, 45.799, 4326)::extensions.geography, 1500, 0, 1000, 0.5) $$, :'snapshot_id'),
  'P0001',
  'green_surroundings_invalid',
  'The surroundings need a park limit between 1 and 20'
);

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select throws_ok($$ select count(*) from private.green_areas $$, '42501', null, 'A visitor cannot read green areas');
select throws_ok($$ select count(*) from private.green_area_sources $$, '42501', null, 'A visitor cannot read green sources');

set local role authenticated;
set local request.jwt.claims = '{"role": "authenticated", "sub": "11111111-1111-1111-1111-111111111111"}';

select throws_ok($$ select count(*) from private.green_areas $$, '42501', null, 'A signed-in user cannot read green areas');
select throws_ok($$ select count(*) from private.green_area_sources $$, '42501', null, 'A signed-in user cannot read green sources');
select throws_ok(
  format($$ select private.merge_green_areas(%L, %L, 0.05) $$, :'snapshot_id', :'sibiu_id'),
  '42501',
  null,
  'A signed-in user cannot call the green functions'
);
select throws_ok(
  format($$ select private.describe_green_surroundings(%L, extensions.st_point(24.129, 45.799, 4326)::extensions.geography, 1500, 5, 1000, 0.5) $$, :'snapshot_id'),
  '42501',
  null,
  'A signed-in user cannot read the green surroundings of an address'
);

select * from finish();
rollback;
