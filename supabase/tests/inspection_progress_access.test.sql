begin;

create extension if not exists pgtap with schema extensions;

select plan(3);

create temporary table fixture as
select
  'a0000000-0000-4000-8000-000000000005'::uuid as mihai_id,
  (
    select id from public.inspections
    where inspector_id = 'a0000000-0000-4000-8000-000000000005'
    order by starts_at
    limit 1
  ) as inspection_id;

grant select on fixture to authenticated;

select isnt((select inspection_id from fixture), null, 'The seed has a visit assigned to the inspector');

set local role authenticated;

select set_config(
  'request.jwt.claims',
  json_build_object('sub', (select mihai_id from fixture), 'role', 'authenticated', 'user_roles', json_build_array('inspector'))::text,
  true
);

select lives_ok(
  $$ select public.inspection_progress((select inspection_id from fixture)) $$,
  'The assigned inspector reads the progress of their visit'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', (select mihai_id from fixture), 'role', 'authenticated', 'user_roles', json_build_array('user'))::text,
  true
);

select throws_ok(
  $$ select public.inspection_progress((select inspection_id from fixture)) $$,
  'P0001', 'inspection_not_found',
  'An account without the inspector role cannot read the progress of a visit it was assigned'
);

select * from finish();
rollback;
