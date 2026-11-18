begin;

create extension if not exists pgtap with schema extensions;

select plan(21);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', 'ana@example.test', '{"locale": "en", "full_name": "  Ana Mărginean  ", "phone": "0722 123 456"}'),
  ('22222222-2222-2222-2222-222222222222', 'ion@example.test', '{}'),
  ('33333333-3333-3333-3333-333333333333', 'dan@example.test', '{"locale": "de", "full_name": "   ", "phone": "12345"}');

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

select results_eq(
  $$ select phone from public.profiles where id = '11111111-1111-1111-1111-111111111111' $$,
  $$ values ('+40722123456') $$,
  'Sign-up metadata sets the phone in E.164 form'
);

select results_eq(
  $$ select count(*)::int from public.profiles where id in ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333') and phone is null $$,
  $$ values (2) $$,
  'A missing or invalid sign-up phone leaves the phone empty'
);

select results_eq(
  $$
    select private.normalize_phone(raw_phone)
    from (values
      (1, '+40 722 123 456'),
      (2, '0040.744.555-210'),
      (3, '(021) 315 15 15'),
      (4, '+44 20 7946 0958'),
      (5, '+40 722 12'),
      (6, '0722'),
      (7, 'telefon')
    ) as inputs (position, raw_phone)
    order by position
  $$,
  $$ values ('+40722123456'), ('+40744555210'), ('+40213151515'), ('+442079460958'), (null), (null), (null) $$,
  'Typed phone numbers are normalized to E.164 or rejected'
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

select lives_ok(
  $$ update public.profiles set phone = '+40744555210' where id = '11111111-1111-1111-1111-111111111111' $$,
  'A user can change their own phone'
);

select results_eq(
  $$
    with updated as (
      update public.profiles set phone = '+40744555210'
      where id = '22222222-2222-2222-2222-222222222222'
      returning id
    )
    select count(*)::int from updated
  $$,
  $$ values (0) $$,
  'A user cannot change another user''s phone'
);

select throws_ok(
  $$ update public.profiles set phone = '0744555210' where id = '11111111-1111-1111-1111-111111111111' $$,
  '23514',
  null,
  'The phone is stored only in E.164 form'
);

select throws_ok(
  $$ update public.profiles set phone = '+4074455521' where id = '11111111-1111-1111-1111-111111111111' $$,
  '23514',
  null,
  'A Romanian phone has nine digits after +40'
);

select throws_ok(
  $$ update public.profiles set created_at = now() where id = '11111111-1111-1111-1111-111111111111' $$,
  '42501',
  null,
  'Only the locale, full name and phone columns are writable'
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
