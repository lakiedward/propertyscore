begin;

create extension if not exists pgtap with schema extensions;

select plan(7);

update public.score_snapshots set status = 'failed', finished_at = now(), error_code = 'test_setup'
where status = 'building';

select id as sibiu_id from public.cities where slug = 'sibiu' \gset
select private.build_grid_cells(:'sibiu_id', 175);
select private.start_score_snapshot('2026-11-01') as snapshot_id \gset
select private.seed_cell_scores(:'snapshot_id', :'sibiu_id');

select private.find_grid_cell(extensions.st_point(24.1326, 45.80035, 4326)::extensions.geography, 175) as park_cell \gset
select private.find_grid_cell(extensions.st_point(24.08, 45.79, 4326)::extensions.geography, 175) as far_cell \gset

select is(
  private.mark_residential_cells(:'snapshot_id', :'sibiu_id', 0.1),
  0,
  'Without residential land use no cell is classified'
);

select is(
  (select count(*)::integer from private.cell_scores where snapshot_id = :'snapshot_id' and is_residential is not null),
  0,
  'Unclassified cells keep is_residential empty, so they still count in the city figures'
);

insert into private.residential_areas (snapshot_id, city_id, source, source_ref, geometry)
values (
  :'snapshot_id', :'sibiu_id', 'osm', 'osm:way/900',
  extensions.st_multi(extensions.st_makeenvelope(24.115, 45.79, 24.135, 45.806, 4326))::extensions.geography
);

select cmp_ok(
  private.mark_residential_cells(:'snapshot_id', :'sibiu_id', 0.1),
  '>',
  20,
  'Cells covered by residential land use are marked residential'
);

select results_eq(
  format($$ select is_residential from private.cell_scores where snapshot_id = %L and cell_id in (%L, %L) order by cell_id = %L desc $$,
    :'snapshot_id', :'park_cell', :'far_cell', :'park_cell'),
  $$ values (true), (false) $$,
  'A cell inside the residential area is residential, one outside is not'
);

select throws_ok(
  format($$ select private.mark_residential_cells(%L, %L, 1.5) $$, :'snapshot_id', :'sibiu_id'),
  'P0001',
  'residential_share_invalid',
  'The residential share must be between 0 and 1'
);

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select throws_ok($$ select count(*) from private.residential_areas $$, '42501', null, 'A visitor cannot read residential areas');

set local role authenticated;
set local request.jwt.claims = '{"role": "authenticated", "sub": "11111111-1111-1111-1111-111111111111"}';

select throws_ok($$ select count(*) from private.residential_areas $$, '42501', null, 'A signed-in user cannot read residential areas');

select * from finish();
rollback;
