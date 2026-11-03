begin;

create extension if not exists pgtap with schema extensions;

select plan(23);

insert into auth.users (id, email)
values
  ('11111111-1111-1111-1111-111111111111', 'owner@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'other@example.test');

insert into public.online_reports (id, owner_id, city_id, location, address_text)
select
  'd0000000-0000-4000-8000-000000000001',
  '11111111-1111-1111-1111-111111111111',
  c.id,
  extensions.st_point(21.2087, 45.7537, 4326)::extensions.geography,
  'Piața Victoriei 1, Timișoara'
from public.cities c
where c.slug = 'timisoara';

insert into public.online_reports (id, owner_id, city_id, location, address_text)
select
  'd0000000-0000-4000-8000-000000000002',
  '22222222-2222-2222-2222-222222222222',
  c.id,
  extensions.st_point(24.1520, 45.7983, 4326)::extensions.geography,
  'Piața Mare 1, Sibiu'
from public.cities c
where c.slug = 'sibiu';

select results_eq(
  $$
    select status::text, version, locale, round(latitude::numeric, 4), round(longitude::numeric, 4), category_scores, result
    from public.online_reports
    where id = 'd0000000-0000-4000-8000-000000000001'
  $$,
  $$ values ('pending_payment'::text, 1, 'ro'::text, 45.7537::numeric, 21.2087::numeric, '{}'::jsonb, '{}'::jsonb) $$,
  'A new report waits for payment and derives its coordinates from the location'
);

select ok(
  (select a.number < b.number
   from public.online_reports a, public.online_reports b
   where a.id = 'd0000000-0000-4000-8000-000000000001' and b.id = 'd0000000-0000-4000-8000-000000000002'),
  'Reports get increasing numbers'
);

select throws_ok(
  $$ update public.online_reports set status = 'ready' where id = 'd0000000-0000-4000-8000-000000000001' $$,
  '23514',
  null,
  'A ready report is frozen on a snapshot, a formula version and a generation time'
);

select throws_ok(
  $$ update public.online_reports set status = 'failed' where id = 'd0000000-0000-4000-8000-000000000001' $$,
  '23514',
  null,
  'A failed report has an error code'
);

select throws_ok(
  $$ update public.online_reports set error_code = 'osm_missing' where id = 'd0000000-0000-4000-8000-000000000001' $$,
  '23514',
  null,
  'Only a failed report has an error code'
);

select throws_ok(
  $$ update public.online_reports set category_scores = '{"green": 140}' where id = 'd0000000-0000-4000-8000-000000000001' $$,
  '23514',
  null,
  'Category scores are known categories between 0 and 100'
);

select throws_ok(
  $$ update public.online_reports set source_listing_url = 'http://example.test/a' where id = 'd0000000-0000-4000-8000-000000000001' $$,
  '23514',
  null,
  'A source listing link is https'
);

update public.score_snapshots set status = 'failed', finished_at = now(), error_code = 'test_setup'
where status = 'building';
update public.score_snapshots set status = 'superseded' where status = 'ready';

select id as sibiu_id from public.cities where slug = 'sibiu' \gset
select private.build_grid_cells(:'sibiu_id', 175);
select private.start_score_snapshot('2026-11-01') as snapshot_id \gset
select private.seed_cell_scores(:'snapshot_id', :'sibiu_id');
select private.find_grid_cell(extensions.st_point(24.1520, 45.7983, 4326)::extensions.geography, 175) as report_cell \gset

update private.cell_scores
set categories = case when cell_id = :'report_cell' then '{"green": 80, "noise": 60}'::jsonb else '{"green": 40, "noise": 60}'::jsonb end
where snapshot_id = :'snapshot_id';

select throws_ok(
  $$ select * from private.begin_online_report('d0000000-0000-4000-8000-000000000002') $$,
  'P0001',
  'no_ready_snapshot',
  'A report cannot start before a snapshot is ready'
);

select private.compute_overall_scores(:'snapshot_id');
select private.compute_snapshot_stats(:'snapshot_id');
select private.publish_score_snapshot(:'snapshot_id', '{"osm": "2026-10-31"}');

insert into public.online_reports (id, owner_id, city_id, location, address_text)
values (
  'd0000000-0000-4000-8000-000000000003',
  '22222222-2222-2222-2222-222222222222',
  :'sibiu_id',
  extensions.st_point(25.5, 46.5, 4326)::extensions.geography,
  'Departe de oraș'
);

select throws_ok(
  $$ select * from private.begin_online_report('d0000000-0000-4000-8000-000000000003') $$,
  'P0001',
  'outside_coverage',
  'A report outside the scored grid fails with a code'
);

select results_eq(
  $$ select snapshot_id, cell_id, city_slug from private.begin_online_report('d0000000-0000-4000-8000-000000000002') $$,
  format($$ values (%L::uuid, %L::uuid, 'sibiu'::text) $$, :'snapshot_id', :'report_cell'),
  'Starting a report picks the ready snapshot and the cell under the address'
);

select private.complete_online_report(
  'd0000000-0000-4000-8000-000000000002', :'snapshot_id', :'report_cell', '{"green": {"parks": []}}'
);

select results_eq(
  $$
    select status::text, overall_score, category_scores ->> 'green', category_scores ->> 'safety', generated_at is not null
    from public.online_reports where id = 'd0000000-0000-4000-8000-000000000002'
  $$,
  $$ values ('ready'::text, 69::smallint, '80'::text, null::text, true) $$,
  'A completed report freezes the zone score and the category scores'
);

select results_eq(
  $$
    select
      result -> 'city' ->> 'slug',
      result -> 'snapshot' -> 'source_dates' ->> 'osm',
      result -> 'formula' ->> 'label',
      (result -> 'zone' ->> 'score')::integer,
      (result -> 'zone' ->> 'city_avg')::integer,
      (result -> 'categories' -> 'green' ->> 'percentile')::integer >= 99,
      (result -> 'categories' -> 'green' ->> 'city_avg')::integer,
      jsonb_array_length(result -> 'categories' -> 'green' -> 'histogram'),
      result -> 'green' -> 'parks'
    from public.online_reports where id = 'd0000000-0000-4000-8000-000000000002'
  $$,
  $$ values ('sibiu'::text, '2026-10-31'::text, 'v1'::text, 69, 51, true, 40, 20, '[]'::jsonb) $$,
  'The frozen result holds the city, the sources, the percentiles, the city averages and the score sections'
);

select throws_ok(
  $$ select * from private.begin_online_report('d0000000-0000-4000-8000-000000000002') $$,
  'P0001',
  'report_already_ready',
  'A ready report is never generated again'
);

select throws_ok(
  format($$ select private.complete_online_report('d0000000-0000-4000-8000-000000000001', %L, %L, '{}') $$, :'snapshot_id', :'report_cell'),
  'P0001',
  'report_not_generating',
  'Only a report being generated can be completed'
);

select private.fail_online_report('d0000000-0000-4000-8000-000000000003', 'outside_coverage');

select results_eq(
  $$ select status::text, error_code from public.online_reports where id = 'd0000000-0000-4000-8000-000000000003' $$,
  $$ values ('failed'::text, 'outside_coverage'::text) $$,
  'A report that cannot start is marked failed with its code'
);

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select throws_ok(
  $$ select id from public.online_reports $$,
  '42501',
  null,
  'A visitor cannot read online reports'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select results_eq(
  $$ select id from public.online_reports $$,
  $$ values ('d0000000-0000-4000-8000-000000000001'::uuid) $$,
  'An owner reads only their own reports'
);

select throws_ok(
  $$
    insert into public.online_reports (city_id, location, address_text)
    select id, extensions.st_point(21.2, 45.75, 4326)::extensions.geography, 'Str. Test 1' from public.cities limit 1
  $$,
  '42501',
  null,
  'An owner cannot create a report from the browser'
);

select throws_ok(
  $$ update public.online_reports set overall_score = 100 where id = 'd0000000-0000-4000-8000-000000000001' $$,
  '42501',
  null,
  'An owner cannot change a report'
);

select throws_ok(
  $$ delete from public.online_reports where id = 'd0000000-0000-4000-8000-000000000001' $$,
  '42501',
  null,
  'An owner cannot delete a report'
);

select throws_ok(
  $$ select * from private.begin_online_report('d0000000-0000-4000-8000-000000000001') $$,
  '42501',
  null,
  'An owner cannot start a report generation'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

select is_empty(
  $$ select id from public.online_reports where id = 'd0000000-0000-4000-8000-000000000001' $$,
  'Another user cannot read someone else''s report'
);

reset role;

select results_eq(
  $$
    with updated as (
      update public.online_reports set updated_at = '2020-01-01', address_text = 'Piața Victoriei 2, Timișoara'
      where id = 'd0000000-0000-4000-8000-000000000001'
      returning updated_at
    )
    select updated_at > '2020-01-01' from updated
  $$,
  $$ values (true) $$,
  'Changing a report refreshes its update time'
);

select * from finish();

rollback;
