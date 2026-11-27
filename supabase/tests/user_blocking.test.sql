begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

create temporary table fixture as
select
  (select user_id from public.user_roles where role = 'admin' limit 1) as admin_id,
  'a0000000-0000-4000-8000-000000000003'::uuid as ion_id,
  'a0000000-0000-4000-8000-000000000005'::uuid as mihai_id,
  (
    select listings.owner_id
    from public.listings
    where listings.status = 'approved'
      and listings.revision_of is null
      and not exists (
        select 1 from public.user_roles
        where user_roles.user_id = listings.owner_id and user_roles.role = 'admin'
      )
    limit 1
  ) as owner_id;

create temporary table approved_before as
select id from public.listings
where owner_id = (select owner_id from fixture) and status = 'approved' and revision_of is null;

update public.inspections
set starts_at = now() + interval '3 days', ends_at = now() + interval '3 days 2 hours'
where requested_by = (select ion_id from fixture) and status = 'scheduled';

update public.inspections
set starts_at = now() + interval '4 days', ends_at = now() + interval '4 days 2 hours'
where inspector_id = (select mihai_id from fixture) and status = 'inspector_assigned';

insert into auth.sessions (id, user_id, created_at, updated_at)
values (gen_random_uuid(), (select owner_id from fixture), now(), now());

grant select on fixture, approved_before to authenticated, anon;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  json_build_object('sub', (select ion_id from fixture), 'role', 'authenticated', 'user_roles', json_build_array('user'))::text,
  true
);

select throws_ok(
  $$ select public.block_user((select owner_id from fixture), 'Spam') $$,
  '42501', 'forbidden',
  'A user who is not an admin cannot block anyone'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', (select admin_id from fixture), 'role', 'authenticated', 'user_roles', json_build_array('user', 'admin'))::text,
  true
);

select throws_ok(
  $$ select public.block_user((select admin_id from fixture), 'Test') $$,
  'P0001', 'cannot_block_self',
  'An admin cannot block themselves'
);

select throws_ok(
  $$ select public.block_user((select owner_id from fixture), '  ') $$,
  'P0001', 'block_reason_invalid',
  'A block needs a reason'
);

select lives_ok(
  $$ select public.block_user((select owner_id from fixture), 'Anunțuri false') $$,
  'An admin blocks a user with a reason'
);

select ok(
  (select count(*) from approved_before) > 0
  and not exists (
    select 1 from public.listings
    where id in (select id from approved_before) and status <> 'suspended'
  ),
  'The blocked owner''s published listings are suspended'
);

select is(
  (select block_reason from public.admin_list_users('', null, true) where user_id = (select owner_id from fixture)),
  'Anunțuri false',
  'The user list shows the block and its reason'
);

reset role;

select ok(
  (select banned_until > now() + interval '50 years' from auth.users where id = (select owner_id from fixture)),
  'The blocked account cannot sign in'
);

select is(
  (select count(*)::integer from auth.sessions where user_id = (select owner_id from fixture)),
  0,
  'The blocked account''s sessions are ended'
);

set local role anon;

select is(
  (select count(*)::integer from public.listings where id in (select id from approved_before)),
  0,
  'Visitors no longer see the suspended listings'
);

set local role authenticated;

select set_config(
  'request.jwt.claims',
  json_build_object('sub', (select admin_id from fixture), 'role', 'authenticated', 'user_roles', json_build_array('user', 'admin'))::text,
  true
);

select lives_ok(
  $$ select public.block_user((select ion_id from fixture), 'Rezervări false') $$,
  'An admin blocks a client with future bookings'
);

select is(
  (
    select count(*)::integer from public.inspections
    where requested_by = (select ion_id from fixture)
      and starts_at > now()
      and status in ('scheduled', 'inspector_assigned')
  ),
  0,
  'The client''s future bookings are cancelled'
);

select lives_ok(
  $$ select public.block_user((select mihai_id from fixture), 'Absențe') $$,
  'An admin blocks an inspector'
);

reset role;

select ok(
  not exists (
    select 1 from public.inspections
    where inspector_id = (select mihai_id from fixture) and starts_at > now()
  )
  and not (select is_active from public.inspector_profiles where user_id = (select mihai_id from fixture)),
  'The inspector''s future visits go back to the queue and they stop taking bookings'
);

insert into public.user_roles (user_id, role)
values ((select ion_id from fixture), 'admin')
on conflict do nothing;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  json_build_object('sub', (select admin_id from fixture), 'role', 'authenticated', 'user_roles', json_build_array('user', 'admin'))::text,
  true
);

select throws_ok(
  $$ select public.block_user((select ion_id from fixture), 'Test') $$,
  'P0001', 'cannot_block_admin',
  'An admin cannot block another admin'
);

select lives_ok(
  $$ select public.unblock_user((select owner_id from fixture)) $$,
  'An admin unblocks a user'
);

reset role;

select ok(
  (select banned_until is null from auth.users where id = (select owner_id from fixture))
  and not exists (
    select 1 from public.listings
    where id in (select id from approved_before) and status <> 'approved'
  ),
  'Unblocking lets the user sign in again and publishes their listings again'
);

select * from finish();

rollback;
