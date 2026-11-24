begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

create temporary table fixture as
select
  (select user_id from public.user_roles where role = 'admin' limit 1) as admin_id,
  'a0000000-0000-4000-8000-000000000001'::uuid as ana_id,
  'a0000000-0000-4000-8000-000000000002'::uuid as emma_id,
  'a0000000-0000-4000-8000-000000000003'::uuid as ion_id,
  'a0000000-0000-4000-8000-000000000005'::uuid as mihai_id;

insert into private.user_blocks (user_id, reason, blocked_by)
values ((select emma_id from fixture), 'Spam', (select admin_id from fixture));

grant select on fixture to authenticated, anon;

set local role anon;

select throws_ok(
  $$ select public.make_admin((select ana_id from fixture)) $$,
  '42501', null,
  'A visitor cannot call make_admin'
);

set local role authenticated;

select set_config(
  'request.jwt.claims',
  json_build_object('sub', (select ion_id from fixture), 'role', 'authenticated', 'user_roles', json_build_array('user'))::text,
  true
);

select throws_ok(
  $$ select public.make_admin((select ion_id from fixture)) $$,
  '42501', 'forbidden',
  'A user who is not an admin cannot make anyone an admin'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', (select admin_id from fixture), 'role', 'authenticated', 'user_roles', json_build_array('admin'))::text,
  true
);

select throws_ok(
  $$ select public.make_admin(gen_random_uuid()) $$,
  'P0001', 'user_not_found',
  'An unknown account cannot be made an admin'
);

select throws_ok(
  $$ select public.make_admin((select emma_id from fixture)) $$,
  'P0001', 'user_blocked',
  'A blocked account cannot be made an admin'
);

select throws_ok(
  $$ select public.make_admin((select mihai_id from fixture)) $$,
  'P0001', 'admin_inspector_conflict',
  'An inspector cannot be made an admin'
);

select lives_ok(
  $$ select public.make_admin((select ana_id from fixture)) $$,
  'An admin makes a user an admin'
);

select results_eq(
  $$ select role::text from public.user_roles where user_id = (select ana_id from fixture) $$,
  $$ values ('admin') $$,
  'The new admin has the admin role in place of the user role'
);

select is(
  (select granted_by from public.user_roles where user_id = (select ana_id from fixture)),
  (select admin_id from fixture),
  'The admin role records who granted it'
);

select lives_ok(
  $$ select public.make_admin((select ana_id from fixture)) $$,
  'Making an admin again changes nothing'
);

select * from finish();
rollback;
