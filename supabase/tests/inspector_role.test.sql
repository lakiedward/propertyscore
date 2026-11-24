begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

create temporary table fixture as
select
  (select user_id from public.user_roles where role = 'admin' limit 1) as admin_id,
  'a0000000-0000-4000-8000-000000000003'::uuid as ion_id,
  'a0000000-0000-4000-8000-000000000005'::uuid as mihai_id,
  (select id from public.cities order by name limit 1) as city_id;

grant select on fixture to authenticated;

select is(
  (select array_agg(role order by role) from public.user_roles where user_id = (select mihai_id from fixture)),
  array['inspector']::public.app_role[],
  'A seeded inspector has only the inspector role'
);

set local role authenticated;

select set_config(
  'request.jwt.claims',
  json_build_object('sub', (select admin_id from fixture), 'role', 'authenticated', 'user_roles', json_build_array('admin'))::text,
  true
);

select lives_ok(
  $$ select public.set_inspector((select ion_id from fixture), (select city_id from fixture)) $$,
  'The admin makes a user an inspector'
);

select is(
  (select array_agg(role order by role) from public.user_roles where user_id = (select ion_id from fixture)),
  array['inspector']::public.app_role[],
  'The inspector role replaces the user role'
);

select lives_ok(
  $$ select public.set_inspector((select ion_id from fixture), (select city_id from fixture)) $$,
  'Changing an inspector''s city keeps a single role'
);

select is(
  (select array_agg(role order by role) from public.user_roles where user_id = (select ion_id from fixture)),
  array['inspector']::public.app_role[],
  'The inspector still has only the inspector role'
);

select lives_ok(
  $$ select public.remove_inspector((select ion_id from fixture)) $$,
  'The admin removes the inspector role'
);

select is(
  (select array_agg(role order by role) from public.user_roles where user_id = (select ion_id from fixture)),
  array['user']::public.app_role[],
  'Removing the inspector role gives the user role back'
);

select throws_ok(
  $$ select public.set_inspector((select admin_id from fixture), (select city_id from fixture)) $$,
  'P0001', 'admin_inspector_conflict',
  'An admin cannot be made an inspector'
);

select * from finish();
rollback;
