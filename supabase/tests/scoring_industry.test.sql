begin;

create extension if not exists pgtap with schema extensions;

select plan(21);

select results_eq(
  $$
    select
      params -> 'industry' ->> 'radius_m',
      params -> 'industry' ->> 'k',
      params -> 'industry' -> 'dataset' ->> 'version'
    from public.scoring_versions
    where kind = 'online' and label = 'v1'
  $$,
  $$ values ('5000'::text, '0.14'::text, 'v16'::text) $$,
  'The v1 formula carries the Industry parameters: 5 km radius, k 0.14, EEA dataset v16'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'private.industrial_sites'::regclass)
    and (select relrowsecurity from pg_class where oid = 'private.industrial_site_overrides'::regclass),
  'Row level security is enabled on both industrial tables'
);

select id as timisoara_id from public.cities where slug = 'timisoara' \gset

insert into private.industrial_site_overrides (source_facility_id, location, note)
values (
  'TEST/CORRECTED',
  extensions.st_point(21.2000, 45.7300, 4326)::extensions.geography,
  'Moved from the town centre to the real plant'
);

insert into private.industrial_sites (
  source_facility_id, reporting_year, name, location, reported_location, sector_code,
  main_activity_code, impact_codes, air_releases, is_top_emitter, source_version
)
select
  seed.id,
  2024,
  seed.name,
  extensions.st_point(seed.lon, seed.lat, 4326)::extensions.geography,
  extensions.st_point(seed.lon, seed.lat, 4326)::extensions.geography,
  seed.sector,
  '1(c)',
  array['air'],
  '{"nox": 1000}'::jsonb,
  false,
  'test'
from (
  values
    ('TEST/PLANT', 'Plant', 21.2700, 45.7700, 'metals'),
    ('TEST/TWIN-A', 'Twin A', 21.1800, 45.7400, 'food'),
    ('TEST/TWIN-B', 'Twin B', 21.1800, 45.7400, 'food'),
    ('TEST/CORRECTED', 'Geocoded', 21.22571, 45.75372, 'energy'),
    ('TEST/FAR', 'Far away', 25.0000, 46.0000, 'energy')
) as seed (id, name, lon, lat, sector);

select is(
  private.finish_industrial_import(2024::smallint, 'test', 5000, 150),
  '{"sites": 5, "in_city_buffers": 4, "suspect": 2, "corrected": 1}'::jsonb,
  'Finishing an import counts the sites, those near a city, the suspect and the corrected ones'
);

select results_eq(
  $$ select source_facility_id, coordinate_status from private.industrial_sites where source_version = 'test' order by 1 $$,
  $$ values
    ('TEST/CORRECTED'::text, 'corrected'::text),
    ('TEST/FAR', 'ok'),
    ('TEST/PLANT', 'ok'),
    ('TEST/TWIN-A', 'suspect'),
    ('TEST/TWIN-B', 'suspect') $$,
  'Facilities sharing a position are suspect and an override wins over the centre-of-town check'
);

select ok(
  (select extensions.st_dwithin(location, extensions.st_point(21.2, 45.73, 4326)::extensions.geography, 1)
     and extensions.st_dwithin(reported_location, extensions.st_point(21.22571, 45.75372, 4326)::extensions.geography, 1)
   from private.industrial_sites where source_facility_id = 'TEST/CORRECTED'),
  'An override moves the used position and keeps the reported one'
);

select results_eq(
  $$ select source_facility_id, city_id from private.industrial_sites where source_version = 'test' and source_facility_id in ('TEST/PLANT', 'TEST/FAR') order by 1 $$,
  format($$ values ('TEST/FAR'::text, null::uuid), ('TEST/PLANT', %L::uuid) $$, :'timisoara_id'),
  'A site within 5 km of a covered city belongs to it; a distant one to none'
);

select is(
  private.finish_industrial_import(2024::smallint, 'test', 5000, 150),
  '{"sites": 5, "in_city_buffers": 4, "suspect": 2, "corrected": 1}'::jsonb,
  'Finishing the same import twice gives the same result'
);

select results_eq(
  $$
    select name, distance_m <= 5000, bearing_deg between 0 and 360
    from private.industrial_sites_near(
      extensions.st_point(21.2200, 45.7500, 4326)::extensions.geography, 2024::smallint, 'test', 5000
    )
    where name not like 'Twin%'
  $$,
  $$ values ('Geocoded'::text, true, true), ('Plant', true, true) $$,
  'Sites near an address come sorted by distance, within the radius, with a bearing'
);

select is(
  (select count(*)::integer from private.industrial_sites_near(
    extensions.st_point(21.2200, 45.7500, 4326)::extensions.geography, 2024::smallint, 'test', 5000
  )),
  4,
  'Every site within 5 km of the address is listed, the distant one is not'
);

select is(
  (select count(*)::integer from private.industrial_sites_near(
    extensions.st_point(21.2500, 45.7600, 4326)::extensions.geography, 2024::smallint, 'other', 5000
  )),
  0,
  'Only the requested dataset version is searched'
);

update public.score_snapshots set status = 'failed', finished_at = now(), error_code = 'test_setup'
where status = 'building';

select private.build_grid_cells(:'timisoara_id', 175) as timisoara_cells \gset
select private.start_score_snapshot('2026-11-01') as snapshot_id \gset
select private.seed_cell_scores(:'snapshot_id', :'timisoara_id') as seeded_cells \gset

select cmp_ok(
  (select count(*)::integer from private.industrial_sites_near_cells(:'snapshot_id', :'timisoara_id', 2024::smallint, 'test', 5000)),
  '>',
  1000,
  'Cells of the city are paired with every site within 5 km'
);

select is(
  (select count(*)::integer
   from private.industrial_sites_near_cells(:'snapshot_id', :'timisoara_id', 2024::smallint, 'test', 5000)
   where distance_m > 5000),
  0,
  'No pair is farther than the radius'
);

select is(
  (select count(*)::integer
   from private.industrial_sites_near_cells(:'snapshot_id', :'timisoara_id', 2024::smallint, 'test', 5000) p
   join private.industrial_sites s on s.id = p.site_id
   where s.source_facility_id = 'TEST/FAR'),
  0,
  'A site outside the radius of every cell is never paired'
);

select throws_ok(
  $$ insert into private.industrial_sites (source_facility_id, reporting_year, name, location, reported_location, sector_code, main_activity_code, source_version)
     values ('TEST/BAD', 2024, 'Bad', extensions.st_point(21, 45, 4326)::extensions.geography, extensions.st_point(21, 45, 4326)::extensions.geography, 'mining', '3(a)', 'test') $$,
  '23514',
  null,
  'The sector must be one of the nine codes'
);

select lives_ok(
  $$ insert into private.industrial_sites (source_facility_id, reporting_year, name, location, reported_location, sector_code, main_activity_code, source_version)
     select source_facility_id, reporting_year, name, location, reported_location, sector_code, main_activity_code, 'test-next'
     from private.industrial_sites where source_version = 'test' $$,
  'A newer dataset version stores the same facility and year next to the frozen older one'
);

select throws_ok(
  $$ insert into private.industrial_site_overrides (source_facility_id, note) values ('TEST/EMPTY', 'nothing') $$,
  '23514',
  null,
  'An override changes the position or the name'
);

set local role anon;

select throws_ok(
  $$ select count(*) from private.industrial_sites $$,
  '42501',
  null,
  'A visitor cannot read the industrial sites'
);

select throws_ok(
  $$ select count(*) from private.industrial_site_overrides $$,
  '42501',
  null,
  'A visitor cannot read the overrides'
);

set local role authenticated;

select throws_ok(
  $$ select count(*) from private.industrial_sites $$,
  '42501',
  null,
  'A signed-in user cannot read the industrial sites'
);

select throws_ok(
  $$ select count(*) from private.industrial_site_overrides $$,
  '42501',
  null,
  'A signed-in user cannot read the overrides'
);

select throws_ok(
  $$ select * from private.industrial_sites_near(extensions.st_point(21.22, 45.75, 4326)::extensions.geography, 2024::smallint, 'test', 5000) $$,
  '42501',
  null,
  'A signed-in user cannot call the nearby-sites function'
);

select * from finish();

rollback;
