begin;

create extension if not exists pgtap with schema extensions;

select plan(20);

update public.score_snapshots set status = 'failed', finished_at = now(), error_code = 'test_setup'
where status = 'building';

select id as sibiu_id from public.cities where slug = 'sibiu' \gset

select cmp_ok(
  private.build_grid_cells(:'sibiu_id', 175),
  '>',
  900,
  'The Sibiu coverage area is split into roughly 300 m hexagons'
);

select is(
  private.build_grid_cells(:'sibiu_id', 175),
  (select count(*)::integer from private.grid_cells where city_id = :'sibiu_id'),
  'Building the grid twice adds no cells'
);

select results_eq(
  $$
    select bool_and(abs(extensions.st_area(geometry) - 79566) < 800)
    from private.grid_cells
    where size_m = 175
  $$,
  $$ values (true) $$,
  'Every 175 m cell covers about 0.08 km²'
);

select isnt(
  private.find_grid_cell(extensions.st_point(24.15192, 45.79705, 4326)::extensions.geography, 175),
  null,
  'An address in central Sibiu falls in one cell'
);

select is(
  private.find_grid_cell(extensions.st_point(26.1, 44.43, 4326)::extensions.geography, 175),
  null,
  'An address in a city whose grid is not built has no cell'
);

select throws_ok(
  $$ select private.build_grid_cells('00000000-0000-4000-8000-000000000000', 175) $$,
  'P0001',
  'city_not_found',
  'The grid is built only for a known city'
);

select private.start_score_snapshot('2026-11-01') as snapshot_id \gset

select is(
  private.seed_cell_scores(:'snapshot_id', :'sibiu_id'),
  (select count(*)::integer from private.grid_cells where city_id = :'sibiu_id'),
  'Every cell gets an empty score row in the snapshot'
);

select throws_ok(
  format($$ update private.cell_scores set categories = '{"parks": 10}' where snapshot_id = %L $$, :'snapshot_id'),
  '23514',
  null,
  'Only the nine category keys are stored'
);

select throws_ok(
  format($$ update private.cell_scores set categories = '{"green": 140}' where snapshot_id = %L $$, :'snapshot_id'),
  '23514',
  null,
  'A category score stays between 0 and 100'
);

with ranked as (
  select cell_id, row_number() over (order by cell_id) as position
  from private.cell_scores
  where snapshot_id = :'snapshot_id'
)
update private.cell_scores cs
set
  categories = case
    when ranked.position = 1 then '{"green": 60, "air": 90, "noise": null}'::jsonb
    when ranked.position = 2 then '{}'::jsonb
    else '{"green": 40}'::jsonb
  end,
  is_residential = ranked.position <> 3
from ranked
where cs.snapshot_id = :'snapshot_id' and cs.cell_id = ranked.cell_id;

select private.compute_overall_scores(:'snapshot_id');

select results_eq(
  format($$
    select overall from private.cell_scores cs
    where cs.snapshot_id = %L
    order by cs.cell_id
    limit 2
  $$, :'snapshot_id'),
  $$ values (70::smallint), (null::smallint) $$,
  'The zone score weighs the categories that have data and stays empty without any'
);

select private.compute_snapshot_stats(:'snapshot_id');

select results_eq(
  format($$
    select
      (stats #>> '{cities,sibiu,cells}')::integer,
      (stats #>> '{cities,sibiu,residential_cells}')::integer,
      (stats #>> '{cities,sibiu,categories,green,no_data}')::integer,
      (stats #>> '{cities,sibiu,categories,noise,scored}')::integer,
      jsonb_array_length(stats #> '{cities,sibiu,categories,green,histogram}')
    from public.score_snapshots where id = %L
  $$, :'snapshot_id'),
  format($$ values (%s, %s, 1, 0, 20) $$,
    (select count(*) from private.grid_cells where city_id = :'sibiu_id'),
    (select count(*) - 1 from private.grid_cells where city_id = :'sibiu_id')
  ),
  'Snapshot stats count cells, residential cells and missing data per category'
);

select results_eq(
  format($$ select (stats #>> '{cities,sibiu,categories,green,avg}')::integer from public.score_snapshots where id = %L $$, :'snapshot_id'),
  $$ values (40) $$,
  'The city average uses residential cells only'
);

select results_eq(
  $$ select private.score_histogram(array[0, 4.9, 5, 99, 100, null]::numeric[]) $$,
  $$ values ('[2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2]'::jsonb) $$,
  'The histogram has 20 bins of 5 points and puts 100 in the last one'
);

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select throws_ok(
  $$ select count(*) from private.cell_scores $$,
  '42501',
  null,
  'A visitor cannot read cell scores'
);

select throws_ok(
  $$ select count(*) from private.grid_cells $$,
  '42501',
  null,
  'A visitor cannot read the grid'
);

select throws_ok(
  $$ select count(*) from private.poi_features $$,
  '42501',
  null,
  'A visitor cannot read points of interest'
);

set local role authenticated;
set local request.jwt.claims = '{"role": "authenticated", "sub": "11111111-1111-1111-1111-111111111111"}';

select throws_ok(
  $$ select count(*) from private.cell_scores $$,
  '42501',
  null,
  'A signed-in user cannot read cell scores'
);

select throws_ok(
  $$ select count(*) from private.grid_cells $$,
  '42501',
  null,
  'A signed-in user cannot read the grid'
);

select throws_ok(
  $$ select count(*) from private.poi_features $$,
  '42501',
  null,
  'A signed-in user cannot read points of interest'
);

select throws_ok(
  format($$ select private.find_grid_cell(extensions.st_point(24.15, 45.79, 4326)::extensions.geography, 175) $$),
  '42501',
  null,
  'A signed-in user cannot call the scoring functions'
);

select * from finish();
rollback;
