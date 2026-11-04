begin;

create extension if not exists pgtap with schema extensions;

select plan(14);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', 'ana@example.test', '{"locale": "en", "full_name": "  Ana Mărginean  "}'),
  ('22222222-2222-2222-2222-222222222222', 'ion@example.test', '{}'),
  ('33333333-3333-3333-3333-333333333333', 'dan@example.test', '{"locale": "de", "full_name": "   "}');

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

select results_eq(
  $$ select full_name from public.profiles where id = '11111111-1111-1111-1111-111111111111' $$,
  $$ values ('Ana Mărginean') $$,
  'Sign-up metadata sets the trimmed full name'
);

select results_eq(
  $$ select count(*)::int from public.profiles where id in ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333') and full_name is null $$,
  $$ values (2) $$,
  'A missing or blank sign-up name leaves the full name empty'
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

select lives_ok(
  $$ update public.profiles set full_name = 'Ana Ionescu' where id = '11111111-1111-1111-1111-111111111111' $$,
  'A user can change their own full name'
);

select throws_ok(
  $$ update public.profiles set full_name = '' where id = '11111111-1111-1111-1111-111111111111' $$,
  '23514',
  null,
  'The full name cannot be empty'
);

select throws_ok(
  $$ update public.profiles set full_name = repeat('a', 121) where id = '11111111-1111-1111-1111-111111111111' $$,
  '23514',
  null,
  'The full name has at most 120 characters'
);

select throws_ok(
  $$ update public.profiles set created_at = now() where id = '11111111-1111-1111-1111-111111111111' $$,
  '42501',
  null,
  'Only the locale and full name columns are writable'
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
