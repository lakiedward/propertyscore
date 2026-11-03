begin;

create extension if not exists pgtap with schema extensions;

select plan(14);

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
