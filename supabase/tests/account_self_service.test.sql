begin;

create extension if not exists pgtap with schema extensions;

select plan(26);

insert into auth.users (id, email, encrypted_password, raw_user_meta_data)
values
  ('55555555-5555-5555-5555-555555555555', 'parola@example.test', extensions.crypt('Parola-Veche-1', extensions.gen_salt('bf')), '{}'),
  ('66666666-6666-6666-6666-666666666666', 'google@example.test', null, '{"name": "Ioana Google"}'),
  ('77777777-7777-7777-7777-777777777777', 'sefa@example.test', extensions.crypt('Parola-Sefa-1', extensions.gen_salt('bf')), '{}'),
  ('88888888-8888-8888-8888-888888888888', 'adjuncta@example.test', extensions.crypt('Parola-Adjuncta-1', extensions.gen_salt('bf')), '{}');

update public.user_roles
set role = 'user'
where role = 'admin';

update public.user_roles
set role = 'admin'
where user_id = '77777777-7777-7777-7777-777777777777';

set local role authenticated;

set local request.jwt.claims = '{"sub": "55555555-5555-5555-5555-555555555555", "role": "authenticated", "user_roles": ["user"]}';

select ok(public.account_has_password(), 'An account with a password reports it');

select is(
  public.delete_own_account('Parola-Gresita-1'),
  'invalid_password',
  'A wrong password is answered with invalid_password'
);

select is(
  (select count(*)::int from public.profiles where id = '55555555-5555-5555-5555-555555555555'),
  1,
  'The account is kept after a wrong password'
);

select is(
  public.delete_own_account('parola@example.test'),
  'invalid_password',
  'An account with a password cannot be deleted with its email'
);

select is(
  public.delete_own_account(null),
  'invalid_password',
  'An account with a password cannot be deleted without a confirmation'
);

select is(public.delete_own_account('Parola-Gresita-2'), 'invalid_password', 'A fourth wrong password is refused');

select is(public.delete_own_account('Parola-Gresita-3'), 'invalid_password', 'A fifth wrong password is refused');

select throws_ok(
  $$ select public.delete_own_account('Parola-Veche-1') $$,
  'P0001',
  'rate_limited',
  'After five failed confirmations even the right password is refused'
);

reset role;

select is(
  (select count(*)::int from private.account_deletion_attempts where user_id = '55555555-5555-5555-5555-555555555555'),
  5,
  'Every failed confirmation is recorded'
);

update private.account_deletion_attempts
set attempted_at = now() - interval '16 minutes'
where user_id = '55555555-5555-5555-5555-555555555555';

set local role authenticated;

set local request.jwt.claims = '{"sub": "55555555-5555-5555-5555-555555555555", "role": "authenticated", "user_roles": ["user"]}';

select is(
  public.delete_own_account('Parola-Veche-1'),
  'deleted',
  'The right password deletes the account once the window has passed'
);

reset role;

select is(
  (select count(*)::int from auth.users where id = '55555555-5555-5555-5555-555555555555'),
  0,
  'The deleted account is gone from auth.users'
);

select is(
  (select count(*)::int from public.profiles where id = '55555555-5555-5555-5555-555555555555')
    + (select count(*)::int from public.user_roles where user_id = '55555555-5555-5555-5555-555555555555')
    + (select count(*)::int from private.account_deletion_attempts where user_id = '55555555-5555-5555-5555-555555555555'),
  0,
  'The profile, role and recorded attempts of the deleted account are gone'
);

set local role authenticated;

set local request.jwt.claims = '{"sub": "66666666-6666-6666-6666-666666666666", "role": "authenticated", "user_roles": ["user"]}';

select ok(not public.account_has_password(), 'An account without a password reports it');

select is(
  public.delete_own_account('altcineva@example.test'),
  'email_mismatch',
  'An account without a password is not deleted with another email'
);

select throws_ok(
  $$ select public.delete_own_account('google@example.test') $$,
  'P0001',
  'reauthentication_needed',
  'An account without a password needs a sign-in recorded in its token'
);

do $$
begin
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', '66666666-6666-6666-6666-666666666666',
      'role', 'authenticated',
      'user_roles', jsonb_build_array('user'),
      'amr', jsonb_build_array(jsonb_build_object('method', 'oauth', 'timestamp', extract(epoch from now())::bigint - 3600))
    )::text,
    true
  );
end;
$$;

select throws_ok(
  $$ select public.delete_own_account('google@example.test') $$,
  'P0001',
  'reauthentication_needed',
  'An account without a password needs a sign-in from the last 10 minutes'
);

do $$
begin
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', '66666666-6666-6666-6666-666666666666',
      'role', 'authenticated',
      'user_roles', jsonb_build_array('user'),
      'amr', jsonb_build_array(jsonb_build_object('method', 'oauth', 'timestamp', extract(epoch from now())::bigint - 60))
    )::text,
    true
  );
end;
$$;

select is(
  public.delete_own_account('  Google@Example.test '),
  'deleted',
  'An account without a password is deleted with its own email after a recent sign-in'
);

set local request.jwt.claims = '{"sub": "77777777-7777-7777-7777-777777777777", "role": "authenticated", "user_roles": ["admin"]}';

select throws_ok(
  $$ select public.delete_own_account('Parola-Gresita-1') $$,
  'P0001',
  'last_admin',
  'The last admin is refused before the password is checked'
);

select throws_ok(
  $$ select public.delete_own_account('Parola-Sefa-1') $$,
  'P0001',
  'last_admin',
  'The last admin cannot delete their account'
);

reset role;

update public.user_roles
set role = 'admin'
where user_id = '88888888-8888-8888-8888-888888888888';

set local role authenticated;

set local request.jwt.claims = '{"sub": "77777777-7777-7777-7777-777777777777", "role": "authenticated", "user_roles": ["admin"]}';

select is(
  public.delete_own_account('Parola-Sefa-1'),
  'deleted',
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

set local role authenticated;

set local request.jwt.claims = '{"role": "authenticated"}';

select throws_ok(
  $$ select public.delete_own_account('x') $$,
  '42501',
  'not_signed_in',
  'A token without a user cannot delete an account'
);

set local request.jwt.claims = '{"sub": "88888888-8888-8888-8888-888888888888", "role": "authenticated", "user_roles": ["admin"]}';

select throws_ok(
  $$ select count(*) from private.account_deletion_attempts $$,
  '42501',
  null,
  'Signed-in users cannot read the recorded attempts'
);

reset role;
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

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

select throws_ok(
  $$ select count(*) from private.account_deletion_attempts $$,
  '42501',
  null,
  'Anonymous visitors cannot read the recorded attempts'
);

select * from finish();
rollback;
