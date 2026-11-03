begin;

create extension if not exists pgtap with schema extensions;

select plan(19);

update public.score_snapshots set status = 'failed', finished_at = now(), error_code = 'test_setup'
where status = 'building';

select id as sibiu_id from public.cities where slug = 'sibiu' \gset

select private.start_score_snapshot('2026-11-01') as snapshot_id \gset

select results_eq(
  $$
    select bool_and(c.relrowsecurity)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'private'
      and c.relname in ('noise_datasets', 'noise_contours', 'noise_snapshot_datasets', 'noise_sources', 'noise_buildings')
  $$,
  $$ values (true) $$,
  'Every noise table has row level security enabled'
);

select is(
  (select jsonb_typeof(params -> 'noise') from public.scoring_versions where kind = 'online' and label = 'v1'),
  'object',
  'The v1 formula carries the noise parameters'
);

insert into private.noise_datasets (id, city_id, source_type, indicator, round, provider)
values
  ('a0000000-0000-4000-8000-000000000001', :'sibiu_id', 'road', 'lden', 2022, 'Test'),
  ('a0000000-0000-4000-8000-000000000002', :'sibiu_id', 'road', 'lnight', 2022, 'Test');

insert into private.noise_contours (dataset_id, db_low, db_high, geometry)
values
  (
    'a0000000-0000-4000-8000-000000000001', 55, 59,
    extensions.st_multi(extensions.st_buffer(extensions.st_point(24.15, 45.79, 4326)::extensions.geography, 200)::extensions.geometry)::extensions.geography
  ),
  (
    'a0000000-0000-4000-8000-000000000001', 65, 69,
    extensions.st_multi(extensions.st_buffer(extensions.st_point(24.15, 45.79, 4326)::extensions.geography, 50)::extensions.geometry)::extensions.geography
  );

select throws_ok(
  $$
    insert into private.noise_datasets (city_id, source_type, indicator, round, provider)
    select id, 'road', 'lden', 2017, 'Test' from public.cities where slug = 'sibiu'
  $$,
  '23505',
  null,
  'A city has one active dataset per source and indicator'
);

select throws_ok(
  $$
    insert into private.noise_contours (dataset_id, db_low, db_high, geometry)
    values ('a0000000-0000-4000-8000-000000000001', 70, 65, extensions.st_multi(extensions.st_buffer(extensions.st_point(24.15, 45.79, 4326)::extensions.geography, 10)::extensions.geometry)::extensions.geography)
  $$,
  '23514',
  null,
  'A noise band cannot end below its start'
);

select is(
  private.freeze_noise_datasets(:'snapshot_id', :'sibiu_id'),
  1,
  'The snapshot freezes only the datasets that have contours'
);

select is(
  private.freeze_noise_datasets(:'snapshot_id', :'sibiu_id'),
  1,
  'Freezing twice keeps a single row per dataset'
);

select results_eq(
  format($$
    select measure, kind::text, indicator::text, db_low
    from private.noise_samples(%L, %L, array[
      extensions.st_point(24.15, 45.79, 4326)::extensions.geography,
      extensions.st_point(24.15, 45.7915, 4326)::extensions.geography,
      extensions.st_point(24.20, 45.79, 4326)::extensions.geography
    ], 1500)
    order by point_no
  $$, :'snapshot_id', :'sibiu_id'),
  $$ values ('contour', 'road', 'lden', 65::smallint), ('contour', 'road', 'lden', 55::smallint), ('contour', 'road', 'lden', null::smallint) $$,
  'A point takes the loudest band it falls in and none outside the map'
);

insert into private.noise_sources (snapshot_id, city_id, kind, source_class, source_ref, name, geometry)
values
  (
    :'snapshot_id', :'sibiu_id', 'road', 'primary', 'osm:way/1', 'Bulevardul Test',
    extensions.st_makeline(extensions.st_point(24.14, 45.7909, 4326), extensions.st_point(24.16, 45.7909, 4326))::extensions.geography
  ),
  (
    :'snapshot_id', :'sibiu_id', 'rail', 'rail', 'osm:way/2', 'Calea ferată',
    extensions.st_makeline(extensions.st_point(24.14, 45.7990, 4326), extensions.st_point(24.16, 45.7990, 4326))::extensions.geography
  );

insert into private.noise_buildings (snapshot_id, city_id, geometry)
values (
  :'snapshot_id', :'sibiu_id',
  extensions.st_multi(extensions.st_makeenvelope(24.1495, 45.7903, 24.1505, 45.7906, 4326))::extensions.geography
);

select results_eq(
  format($$
    select kind::text, source_class, distance_m between 950 and 1050, buildings_crossed
    from private.noise_samples(%L, %L, array[extensions.st_point(24.15, 45.79, 4326)::extensions.geography], 1500)
    where measure = 'proxy'
  $$, :'snapshot_id', :'sibiu_id'),
  $$ values ('rail', 'rail', true, 1) $$,
  'Kinds covered by a map are not estimated; the others get the distance to the nearest line'
);

delete from private.noise_snapshot_datasets where snapshot_id = :'snapshot_id';

select results_eq(
  format($$
    select kind::text, distance_m between 90 and 110, buildings_crossed
    from private.noise_samples(%L, %L, array[extensions.st_point(24.15, 45.79, 4326)::extensions.geography], 1500)
    where measure = 'proxy'
    order by distance_m
  $$, :'snapshot_id', :'sibiu_id'),
  $$ values ('road', true, 1), ('rail', false, 1) $$,
  'Without a map the road is estimated too, and the building in each line of sight is counted'
);

select private.freeze_noise_datasets(:'snapshot_id', :'sibiu_id');

select results_eq(
  format($$
    select kind::text, name, db_low
    from private.noise_nearest_sources(%L, %L, extensions.st_point(24.15, 45.79, 4326)::extensions.geography, 1500)
  $$, :'snapshot_id', :'sibiu_id'),
  $$ values ('road', 'Bulevardul Test', 55::smallint), ('rail', 'Calea ferată', null::smallint) $$,
  'The nearest sources come closest first, with the map band where the line passes'
);

select results_eq(
  format($$
    select
      jsonb_array_length(layers #> '{contours,features}'),
      jsonb_array_length(layers #> '{lines,features}')
    from private.noise_map_layers(%L, %L, extensions.st_point(24.15, 45.79, 4326)::extensions.geography, 500) as layers
  $$, :'snapshot_id', :'sibiu_id'),
  $$ values (2, 1) $$,
  'The map layers keep only the contours and lines within the clip radius'
);

select private.build_grid_cells(:'sibiu_id', 175);

select private.seed_cell_scores(:'snapshot_id', :'sibiu_id');

select results_eq(
  format($$
    select count(distinct cell_id) = (select count(*) from private.cell_scores where snapshot_id = %L),
      bool_and(point_index between 0 and 6)
    from private.noise_cell_samples(%L, %L, 100, 1500)
  $$, :'snapshot_id', :'snapshot_id', :'sibiu_id'),
  $$ values (true, true) $$,
  'Every cell of the snapshot is sampled at its centre and six points around it'
);

update public.score_snapshots set status = 'superseded', finished_at = now() where id = :'snapshot_id';

select is(
  private.prune_noise_buildings(),
  1,
  'Buildings of a superseded snapshot are pruned'
);

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select throws_ok(
  $$ select count(*) from private.noise_datasets $$,
  '42501',
  null,
  'A visitor cannot read the noise datasets'
);

select throws_ok(
  $$ select count(*) from private.noise_contours $$,
  '42501',
  null,
  'A visitor cannot read the noise contours'
);

set local role authenticated;
set local request.jwt.claims = '{"role": "authenticated", "sub": "11111111-1111-1111-1111-111111111111"}';

select throws_ok(
  $$ select count(*) from private.noise_sources $$,
  '42501',
  null,
  'A signed-in user cannot read the noise sources'
);

select throws_ok(
  $$ select count(*) from private.noise_buildings $$,
  '42501',
  null,
  'A signed-in user cannot read the buildings'
);

select throws_ok(
  $$ select count(*) from private.noise_snapshot_datasets $$,
  '42501',
  null,
  'A signed-in user cannot read which datasets a snapshot used'
);

select throws_ok(
  $$ select private.noise_map_layers('00000000-0000-4000-8000-000000000000', '00000000-0000-4000-8000-000000000000', extensions.st_point(24.15, 45.79, 4326)::extensions.geography, 500) $$,
  '42501',
  null,
  'A signed-in user cannot call the noise functions'
);

select * from finish();
rollback;
