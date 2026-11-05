begin;

create extension if not exists pgtap with schema extensions;

select plan(14);

insert into auth.users (id, email, encrypted_password, raw_user_meta_data)
values
  ('55555555-5555-5555-5555-555555555555', 'parola@example.test', extensions.crypt('Parola-Veche-1', extensions.gen_salt('bf')), '{}'),
  ('66666666-6666-6666-6666-666666666666', 'google@example.test', null, '{"name": "Ioana Google"}'),
  ('77777777-7777-7777-7777-777777777777', 'sefa@example.test', extensions.crypt('Parola-Sefa-1', extensions.gen_salt('bf')), '{}');

update public.user_roles
set role = 'admin'
where user_id = '77777777-7777-7777-7777-777777777777';

update public.user_roles
set role = 'user'
where role = 'admin'
  and user_id <> '77777777-7777-7777-7777-777777777777';

set local role authenticated;

set local request.jwt.claims = '{"sub": "55555555-5555-5555-5555-555555555555", "role": "authenticated", "user_roles": ["user"]}';

select ok(public.account_has_password(), 'An account with a password reports it');

select throws_ok(
  $$ select public.delete_own_account('Parola-Gresita-1') $$,
  'P0001',
  'invalid_password',
  'A wrong password does not delete the account'
);

select is(
  (select count(*)::int from public.profiles where id = '55555555-5555-5555-5555-555555555555'),
  1,
  'The account is kept after a wrong password'
);

select lives_ok(
  $$ select public.delete_own_account('Parola-Veche-1') $$,
  'The right password deletes the account'
);

reset role;

select is(
  (select count(*)::int from auth.users where id = '55555555-5555-5555-5555-555555555555'),
  0,
  'The deleted account is gone from auth.users'
);

select is(
  (select count(*)::int from public.profiles where id = '55555555-5555-5555-5555-555555555555')
    + (select count(*)::int from public.user_roles where user_id = '55555555-5555-5555-5555-555555555555'),
  0,
  'The profile and role of the deleted account are gone'
);

set local role authenticated;

set local request.jwt.claims = '{"sub": "66666666-6666-6666-6666-666666666666", "role": "authenticated", "user_roles": ["user"]}';

select ok(not public.account_has_password(), 'An account without a password reports it');

select throws_ok(
  $$ select public.delete_own_account('altcineva@example.test') $$,
  'P0001',
  'email_mismatch',
  'An account without a password is not deleted with another email'
);

select lives_ok(
  $$ select public.delete_own_account('  Google@Example.test ') $$,
  'An account without a password is deleted with its own email'
);

set local request.jwt.claims = '{"sub": "77777777-7777-7777-7777-777777777777", "role": "authenticated", "user_roles": ["admin"]}';

select throws_ok(
  $$ select public.delete_own_account('Parola-Sefa-1') $$,
  'P0001',
  'last_admin',
  'The last admin cannot delete their account'
);

reset role;

update public.user_roles
set role = 'admin'
where user_id = (select id from auth.users where email = 'admin.ro@example.test')
  and role = 'user';

set local role authenticated;

set local request.jwt.claims = '{"sub": "77777777-7777-7777-7777-777777777777", "role": "authenticated", "user_roles": ["admin"]}';

select lives_ok(
  $$ select public.delete_own_account('Parola-Sefa-1') $$,
  'An admin can delete their account while another admin remains'
);

reset role;

select is(
  (select count(*)::int from auth.users where id in (
    '66666666-6666-6666-6666-666666666666',
    '77777777-7777-7777-7777-777777777777'
  )),
  0,
  'Both accounts are gone'
);

set local role anon;

select throws_ok(
  $$ select public.delete_own_account('x') $$,
  '42501',
  null,
  'Anonymous visitors cannot call delete_own_account'
);

select throws_ok(
  $$ select public.account_has_password() $$,
  '42501',
  null,
  'Anonymous visitors cannot call account_has_password'
);

select * from finish();
rollback;
