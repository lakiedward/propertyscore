begin;

create extension if not exists pgtap with schema extensions;

select plan(19);

update public.score_snapshots set status = 'failed', finished_at = now(), error_code = 'test_setup'
where status = 'building';

select id as sibiu_id from public.cities where slug = 'sibiu' \gset

select results_eq(
  $$
    select
      jsonb_array_length(params #> '{fifteen_minute,categories}'),
      (params #>> '{fifteen_minute,walk_speed_kmh}')::numeric
    from public.scoring_versions
    where kind = 'online' and label = 'v1'
  $$,
  $$ values (30, 4.5) $$,
  'The v1 formula carries the 30 walking categories and the 4.5 km/h walking speed'
);

select private.build_grid_cells(:'sibiu_id', 175);
select private.start_score_snapshot('2026-11-01') as snapshot_id \gset
select private.seed_cell_scores(:'snapshot_id', :'sibiu_id');

select private.find_grid_cell(extensions.st_point(24.15192, 45.79705, 4326)::extensions.geography, 175) as centre_cell \gset

insert into private.poi_features (snapshot_id, city_id, source_ref, category, name, location, area)
values
  (:'snapshot_id', :'sibiu_id', 'osm:node/1', 'fifteen_minute_pharmacy', 'Farmacia Test',
    extensions.st_point(24.1525, 45.7972, 4326)::extensions.geography, null),
  (:'snapshot_id', :'sibiu_id', 'osm:node/2', 'fifteen_minute_pharmacy', 'Farmacia Departe',
    extensions.st_point(24.2500, 45.7972, 4326)::extensions.geography, null),
  (:'snapshot_id', :'sibiu_id', 'osm:way/3', 'fifteen_minute_park', 'Parcul Test',
    extensions.st_point(24.1560, 45.7985, 4326)::extensions.geography,
    extensions.st_multi(extensions.st_makeenvelope(24.1550, 45.7980, 24.1570, 45.7990, 4326))::extensions.geography);

select results_eq(
  format($$
    select jsonb_array_length(candidates)
    from private.walk_access_candidates(%L, %L, %L::jsonb)
    where cell_id = %L
  $$,
    :'snapshot_id', :'sibiu_id',
    '[{"key": "pharmacy", "poi_categories": ["fifteen_minute_pharmacy"], "search_radius_m": 1600, "max_candidates": 10},
      {"key": "park", "poi_categories": ["fifteen_minute_park"], "search_radius_m": 1600, "max_candidates": 10}]',
    :'centre_cell'),
  $$ values (2) $$,
  'A cell gets the points within the search radius of each category and none beyond it'
);

select results_eq(
  format($$
    select bool_and(abs((candidate ->> 'lng')::numeric - 24.155) < 0.000001)
    from private.walk_access_candidates(%L, %L, %L::jsonb) as cell,
      jsonb_array_elements(cell.candidates) as candidate
    where cell.cell_id = %L
  $$,
    :'snapshot_id', :'sibiu_id',
    '[{"key": "park", "poi_categories": ["fifteen_minute_park"], "search_radius_m": 1600, "max_candidates": 10}]',
    :'centre_cell'),
  $$ values (true) $$,
  'A park is reached at the edge of its outline closest to the cell, not at its centre'
);

select results_eq(
  format($$
    select count(*)::integer, count(*) filter (where jsonb_array_length(candidates) = 0)::integer
    from private.walk_access_candidates(%L, %L, %L::jsonb)
  $$,
    :'snapshot_id', :'sibiu_id',
    '[{"key": "pharmacy", "poi_categories": ["fifteen_minute_pharmacy"], "search_radius_m": 300, "max_candidates": 1}]'),
  format($$ values (%s, %s) $$,
    (select count(*) from private.grid_cells where city_id = :'sibiu_id'),
    (select count(*) from private.grid_cells g where g.city_id = :'sibiu_id'
      and not extensions.st_dwithin(g.center, extensions.st_point(24.1525, 45.7972, 4326)::extensions.geography, 300)
      and not extensions.st_dwithin(g.center, extensions.st_point(24.2500, 45.7972, 4326)::extensions.geography, 300))),
  'Every cell of the city is listed, with an empty list when nothing is in range'
);

select is(
  private.write_cell_walk_access(:'snapshot_id', format(
    '[{"cell_id": "%s", "category": "fifteen_minute_pharmacy", "t_nearest_s": 240, "d_nearest_m": 300, "n5": 1, "n10": 1, "n15": 1, "candidates": 1, "nearest_poi_id": null, "distance_method": "pedestrian_routing"}]',
    :'centre_cell')::jsonb),
  1,
  'Walking access is written for a cell and category'
);

select private.write_cell_walk_access(:'snapshot_id', format(
  '[{"cell_id": "%s", "category": "fifteen_minute_pharmacy", "t_nearest_s": 200, "d_nearest_m": 250, "n5": 2, "n10": 2, "n15": 2, "candidates": 2, "nearest_poi_id": null, "distance_method": "pedestrian_routing"}]',
  :'centre_cell')::jsonb);

select results_eq(
  format($$ select count(*)::integer, max(t_nearest_s) from private.cell_walk_access where snapshot_id = %L $$, :'snapshot_id'),
  $$ values (1, 200) $$,
  'Writing the same cell and category again overwrites it'
);

select throws_ok(
  format($$ update private.cell_walk_access set n10 = 0 where snapshot_id = %L $$, :'snapshot_id'),
  '23514',
  null,
  'The 5, 10 and 15 minute counts are cumulative'
);

select throws_ok(
  format($$ update private.cell_walk_access set d_nearest_m = null where snapshot_id = %L $$, :'snapshot_id'),
  '23514',
  null,
  'The nearest time and distance are known together'
);

select throws_ok(
  format($$ update private.cell_walk_access set distance_method = 'crow' where snapshot_id = %L $$, :'snapshot_id'),
  '23514',
  null,
  'Only the two distance methods are recorded'
);

select is(
  private.refresh_city_category_stats(:'snapshot_id', :'sibiu_id',
    '[{"key": "fifteen_minute_pharmacy", "poi_categories": ["fifteen_minute_pharmacy"], "min_poi_count": 2},
      {"key": "fifteen_minute_park", "poi_categories": ["fifteen_minute_park"], "min_poi_count": 2}]'::jsonb),
  2,
  'City statistics are written for every category'
);

select results_eq(
  format($$
    select category, poi_count, is_covered, avg_t_nearest_s, share_within_15
    from private.city_category_stats
    where snapshot_id = %L
    order by category
  $$, :'snapshot_id'),
  $$ values
    ('fifteen_minute_park'::text, 1, false, null::integer, null::numeric),
    ('fifteen_minute_pharmacy'::text, 2, true, 200, 1.000::numeric)
  $$,
  'A category with too few points in the city is not covered'
);

select results_eq(
  format($$
    select count(*)::integer
    from private.grid_cell_neighbours(%L, %L)
    where cell_id = %L
  $$, :'snapshot_id', :'sibiu_id', :'centre_cell'),
  $$ values (6) $$,
  'An inner hexagon has six neighbours'
);

update private.cell_scores cs
set categories = jsonb_build_object('fifteen_minute', case when cs.cell_id = :'centre_cell' then 80 else 40 end)
where cs.snapshot_id = :'snapshot_id';

select cmp_ok(
  private.cell_score_percentile(:'snapshot_id', :'sibiu_id', 'fifteen_minute', 80),
  '>=',
  99,
  'The best cell is better than almost every cell of its city'
);

select is(
  private.cell_score_percentile(:'snapshot_id', :'sibiu_id', 'fifteen_minute', 40),
  0,
  'The percentile counts only strictly lower scores'
);

select results_eq(
  format($$
    select key, source_ref, straight_m < 100
    from private.walk_candidates_from(%L, extensions.st_point(24.15192, 45.79705, 4326)::extensions.geography, %L::jsonb)
  $$,
    :'snapshot_id',
    '[{"key": "fifteen_minute_pharmacy", "poi_categories": ["fifteen_minute_pharmacy"], "search_radius_m": 1600, "max_candidates": 40}]'),
  $$ values ('fifteen_minute_pharmacy'::text, 'osm:node/1'::text, true) $$,
  'An address gets its candidates with the straight-line distance'
);

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select throws_ok(
  $$ select count(*) from private.cell_walk_access $$,
  '42501',
  null,
  'A visitor cannot read walking access'
);

set local role authenticated;
set local request.jwt.claims = '{"role": "authenticated", "sub": "11111111-1111-1111-1111-111111111111"}';

select throws_ok(
  $$ select count(*) from private.cell_walk_access $$,
  '42501',
  null,
  'A signed-in user cannot read walking access'
);

select throws_ok(
  $$ select count(*) from private.city_category_stats $$,
  '42501',
  null,
  'A signed-in user cannot read the city statistics'
);

select throws_ok(
  $$ select * from private.walk_candidates_from(gen_random_uuid(), extensions.st_point(24.15, 45.79, 4326)::extensions.geography, '[]') $$,
  '42501',
  null,
  'A signed-in user cannot call the walking functions'
);

select * from finish();
rollback;
