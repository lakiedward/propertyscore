insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
select
  '00000000-0000-0000-0000-000000000000',
  seed.id,
  'authenticated',
  'authenticated',
  seed.email,
  extensions.crypt('Parola-Test-2026', extensions.gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  jsonb_build_object('locale', seed.locale),
  now(),
  now(),
  '',
  '',
  '',
  ''
from (
  values
    ('a0000000-0000-4000-8000-000000000001'::uuid, 'ana.ro@example.test', 'ro'),
    ('a0000000-0000-4000-8000-000000000002'::uuid, 'emma.en@example.test', 'en'),
    ('a0000000-0000-4000-8000-000000000003'::uuid, 'ion.ro@example.test', 'ro')
) as seed (id, email, locale);

insert into auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
select
  gen_random_uuid(),
  users.id,
  users.id::text,
  jsonb_build_object('sub', users.id::text, 'email', users.email, 'email_verified', true),
  'email',
  now(),
  now(),
  now()
from auth.users as users
where users.email like '%@example.test';
