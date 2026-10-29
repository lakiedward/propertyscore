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

insert into public.listings (
  id,
  owner_id,
  status,
  transaction,
  title,
  street_label,
  city,
  rooms,
  area_m2,
  price,
  currency,
  latitude,
  longitude,
  verification,
  smartcheck_score,
  photo_path,
  published_at
)
select
  seed.id,
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'published',
  seed.transaction::public.listing_transaction,
  seed.title,
  seed.street_label,
  'Timișoara',
  seed.rooms,
  seed.area_m2,
  seed.price,
  'EUR',
  seed.latitude,
  seed.longitude,
  seed.verification::public.listing_verification,
  seed.smartcheck_score,
  'a0000000-0000-4000-8000-000000000001/' || seed.id || '/cover.webp',
  now() - make_interval(mins => seed.position)
from (
  values
    ('b0000000-0000-4000-8000-000000000001'::uuid, 1, 'sale', 'Apartament cu 3 camere', 'Str. Școlii, 12', 3, 78, 125000, 45.7580, 21.2246, 'physical', null::smallint),
    ('b0000000-0000-4000-8000-000000000002'::uuid, 2, 'sale', 'Apartament cu 2 camere', 'Str. Grădinii, 8', 2, 54, 97000, 45.7512, 21.2368, 'none', null),
    ('b0000000-0000-4000-8000-000000000003'::uuid, 3, 'sale', '3 camere cu balcon', 'Str. Castanilor, 16', 3, 86, 158000, 45.7472, 21.2262, 'smartcheck', 74),
    ('b0000000-0000-4000-8000-000000000004'::uuid, 4, 'sale', '4 camere cu terasă', 'Str. Livezii, 24', 4, 112, 186000, 45.7606, 21.2361, 'physical', null),
    ('b0000000-0000-4000-8000-000000000005'::uuid, 5, 'sale', 'Garsonieră renovată', 'Bd. Revoluției, 5', 1, 36, 68000, 45.7541, 21.2190, 'smartcheck', 81),
    ('b0000000-0000-4000-8000-000000000006'::uuid, 6, 'sale', '2 camere, etaj 2', 'Str. Mercy, 3', 2, 58, 109000, 45.7499, 21.2321, 'none', null),
    ('b0000000-0000-4000-8000-000000000007'::uuid, 7, 'rent', '2 camere mobilat', 'Str. Alba Iulia, 4', 2, 55, 450, 45.7553, 21.2265, 'physical', null),
    ('b0000000-0000-4000-8000-000000000008'::uuid, 8, 'rent', 'Garsonieră lângă centru', 'Str. Paris, 9', 1, 34, 320, 45.7484, 21.2215, 'none', null),
    ('b0000000-0000-4000-8000-000000000009'::uuid, 9, 'rent', '3 camere, parcare', 'Str. Polonă, 11', 3, 80, 650, 45.7588, 21.2398, 'smartcheck', 79),
    ('b0000000-0000-4000-8000-000000000010'::uuid, 10, 'rent', 'Studio nou', 'Str. Ungureanu, 6', 1, 30, 350, 45.7520, 21.2420, 'smartcheck', 85),
    ('b0000000-0000-4000-8000-000000000011'::uuid, 11, 'rent', '2 camere, balcon', 'Str. Eminescu, 2', 2, 60, 480, 45.7615, 21.2281, 'physical', null),
    ('b0000000-0000-4000-8000-000000000012'::uuid, 12, 'rent', 'Apartament cu 3 camere', 'Str. Brediceanu, 7', 3, 72, 590, 45.7562, 21.2174, 'none', null)
) as seed (id, position, transaction, title, street_label, rooms, area_m2, price, latitude, longitude, verification, smartcheck_score);
