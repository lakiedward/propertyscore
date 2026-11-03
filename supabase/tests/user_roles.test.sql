begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', 'admin@example.test', '{}'),
  ('22222222-2222-2222-2222-222222222222', 'user@example.test', '{}'),
  ('33333333-3333-3333-3333-333333333333', 'oauth@example.test', '{"name": "  Maria Pop  "}');

insert into public.user_roles (user_id, role)
values ('11111111-1111-1111-1111-111111111111', 'admin');

select is(
  (public.custom_access_token_hook(jsonb_build_object(
    'user_id', '11111111-1111-1111-1111-111111111111',
    'claims', jsonb_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated'),
    'authentication_method', 'password'
  )) -> 'claims' -> 'user_roles'),
  '["admin"]'::jsonb,
  'The hook adds the admin role to an admin token'
);

select is(
  (public.custom_access_token_hook(jsonb_build_object(
    'user_id', '22222222-2222-2222-2222-222222222222',
    'claims', jsonb_build_object('sub', '22222222-2222-2222-2222-222222222222', 'role', 'authenticated'),
    'authentication_method', 'password'
  )) -> 'claims' -> 'user_roles'),
  '[]'::jsonb,
  'The hook adds an empty role list for a regular user'
);

select is(
  (public.custom_access_token_hook(jsonb_build_object(
    'user_id', '22222222-2222-2222-2222-222222222222',
    'claims', jsonb_build_object('sub', '22222222-2222-2222-2222-222222222222', 'role', 'authenticated'),
    'authentication_method', 'password'
  )) -> 'claims' ->> 'role'),
  'authenticated',
  'The hook keeps the existing claims'
);

select results_eq(
  $$ select full_name from public.profiles where id = '33333333-3333-3333-3333-333333333333' $$,
  $$ values ('Maria Pop') $$,
  'An OAuth name sets the trimmed full name'
);

set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated", "user_roles": ["admin"]}';
select ok(private.has_role('admin'), 'has_role is true when the token carries the role');

set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "user_roles": []}';
select ok(not private.has_role('admin'), 'has_role is false for an empty role list');

set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "user_metadata": {"user_roles": ["admin"]}}';
select ok(not private.has_role('admin'), 'has_role ignores roles written into user metadata');

set local role authenticated;

set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "user_roles": []}';

select is(
  (select count(*)::int from public.user_roles),
  0,
  'A regular user cannot read other users roles'
);

select throws_ok(
  $$ insert into public.user_roles (user_id, role) values ('22222222-2222-2222-2222-222222222222', 'admin') $$,
  '42501',
  null,
  'A regular user cannot grant themselves a role'
);

select throws_ok(
  $$ select public.custom_access_token_hook('{}'::jsonb) $$,
  '42501',
  null,
  'A signed-in user cannot call the access token hook'
);

set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated", "user_roles": []}';

select results_eq(
  $$ select role::text from public.user_roles $$,
  $$ values ('admin') $$,
  'A user reads their own role'
);

set local request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "role": "authenticated", "user_roles": ["admin"]}';

select is(
  (select count(*)::int from public.user_roles where user_id = '11111111-1111-1111-1111-111111111111'),
  1,
  'An admin reads every role'
);

select throws_ok(
  $$ update public.user_roles set role = 'admin' where user_id = '11111111-1111-1111-1111-111111111111' $$,
  '42501',
  null,
  'An admin cannot change roles directly'
);

select throws_ok(
  $$ delete from public.user_roles where user_id = '11111111-1111-1111-1111-111111111111' $$,
  '42501',
  null,
  'An admin cannot delete roles directly'
);

reset role;
set local role anon;

select throws_ok(
  $$ select count(*) from public.user_roles $$,
  '42501',
  null,
  'Anonymous visitors cannot read roles'
);

select throws_ok(
  $$ select public.custom_access_token_hook('{}'::jsonb) $$,
  '42501',
  null,
  'Anonymous visitors cannot call the access token hook'
);

select * from finish();
rollback;
