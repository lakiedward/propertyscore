begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', 'ana@example.test', '{"locale": "en"}'),
  ('22222222-2222-2222-2222-222222222222', 'ion@example.test', '{}'),
  ('33333333-3333-3333-3333-333333333333', 'dan@example.test', '{"locale": "de"}');

select results_eq(
  $$ select locale from public.profiles where id = '11111111-1111-1111-1111-111111111111' $$,
  $$ values ('en') $$,
  'Sign-up metadata sets the profile locale'
);

select results_eq(
  $$ select locale from public.profiles where id = '22222222-2222-2222-2222-222222222222' $$,
  $$ values ('ro') $$,
  'The locale defaults to Romanian'
);

select results_eq(
  $$ select locale from public.profiles where id = '33333333-3333-3333-3333-333333333333' $$,
  $$ values ('ro') $$,
  'An unsupported sign-up locale falls back to Romanian'
);

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select results_eq(
  $$ select id from public.profiles $$,
  $$ values ('11111111-1111-1111-1111-111111111111'::uuid) $$,
  'A user sees only their own profile'
);

select lives_ok(
  $$ update public.profiles set locale = 'ro' where id = '11111111-1111-1111-1111-111111111111' $$,
  'A user can change their own locale'
);

select results_eq(
  $$
    with updated as (
      update public.profiles set locale = 'en'
      where id = '22222222-2222-2222-2222-222222222222'
      returning id
    )
    select count(*)::int from updated
  $$,
  $$ values (0) $$,
  'A user cannot change another user''s profile'
);

select throws_ok(
  $$ update public.profiles set created_at = now() where id = '11111111-1111-1111-1111-111111111111' $$,
  '42501',
  null,
  'Only the locale column is writable'
);

select throws_ok(
  $$ update public.profiles set locale = 'de' where id = '11111111-1111-1111-1111-111111111111' $$,
  '23514',
  null,
  'The locale is limited to ro and en'
);

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select throws_ok(
  $$ select * from public.profiles $$,
  '42501',
  null,
  'Anonymous visitors cannot read profiles'
);

select * from finish();

rollback;
