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
  jsonb_build_object('locale', seed.locale, 'full_name', seed.full_name, 'phone', seed.phone),
  now(),
  now(),
  '',
  '',
  '',
  ''
from (
  values
    ('a0000000-0000-4000-8000-000000000001'::uuid, 'ana.ro@example.test', 'ro', 'Ana Mărginean', '+40722000001'),
    ('a0000000-0000-4000-8000-000000000002'::uuid, 'emma.en@example.test', 'en', 'Emma Stănescu', '+40722000002'),
    ('a0000000-0000-4000-8000-000000000003'::uuid, 'ion.ro@example.test', 'ro', 'Ion Țurcanu', '+40722000003'),
    ('a0000000-0000-4000-8000-000000000004'::uuid, 'admin.ro@example.test', 'ro', 'Radu Marin', '+40722000004'),
    ('a0000000-0000-4000-8000-000000000005'::uuid, 'mihai.inspector@example.test', 'ro', 'Mihai Dobre', '+40744210330'),
    ('a0000000-0000-4000-8000-000000000006'::uuid, 'elena.inspector@example.test', 'ro', 'Elena Matei', '+40755410220')
) as seed (id, email, locale, full_name, phone);

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

update public.user_roles
set role = 'admin'
where user_id = 'a0000000-0000-4000-8000-000000000004'
  and role = 'user';

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
  'approved',
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

update public.listings
set
  property_type = 'house',
  title = seed.title,
  house_type = seed.house_type::public.listing_house_type,
  land_area_m2 = seed.land_area_m2,
  building_floors = seed.building_floors,
  bathrooms = seed.bathrooms
from (
  values
    ('b0000000-0000-4000-8000-000000000004'::uuid, 'Casă cu 4 camere și terasă', 'detached', 420, 1, 2),
    ('b0000000-0000-4000-8000-000000000009'::uuid, 'Casă cu 3 camere și parcare', 'duplex', 260, 1, 2)
) as seed (id, title, house_type, land_area_m2, building_floors, bathrooms)
where listings.id = seed.id;

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
  photo_path,
  submitted_at,
  decided_at
)
values (
  'b0000000-0000-4000-8000-000000000013',
  'a0000000-0000-4000-8000-000000000001',
  'rejected',
  'sale',
  'Apartament cu 2 camere, Fabric',
  'Str. Ștefan cel Mare, 14',
  'Timișoara',
  2,
  52,
  92000,
  'EUR',
  45.7593,
  21.2412,
  'a0000000-0000-4000-8000-000000000001/b0000000-0000-4000-8000-000000000013/cover.webp',
  now() - interval '3 days',
  now() - interval '1 day'
);

insert into public.listing_decisions (listing_id, decision, reasons, message, decided_by, created_at)
values (
  'b0000000-0000-4000-8000-000000000013',
  'rejected',
  array['photos', 'description']::public.listing_decision_reason[],
  'Adaugă fotografii cu baia și bucătăria și completează descrierea.',
  'a0000000-0000-4000-8000-000000000004',
  now() - interval '1 day'
);

insert into public.favorite_listings (owner_id, listing_id, created_at)
select
  'a0000000-0000-4000-8000-000000000003'::uuid,
  seed.listing_id,
  now() - make_interval(hours => seed.position)
from (
  values
    ('b0000000-0000-4000-8000-000000000003'::uuid, 1),
    ('b0000000-0000-4000-8000-000000000007'::uuid, 2),
    ('b0000000-0000-4000-8000-000000000004'::uuid, 3),
    ('b0000000-0000-4000-8000-000000000013'::uuid, 4),
    ('b0000000-0000-4000-8000-000000000010'::uuid, 5),
    ('b0000000-0000-4000-8000-000000000001'::uuid, 6)
) as seed (listing_id, position);

update public.favorite_listings
set
  saved_title = 'Apartament cu 2 camere, Fabric',
  saved_photo_path = 'a0000000-0000-4000-8000-000000000001/b0000000-0000-4000-8000-000000000013/cover.webp'
where listing_id = 'b0000000-0000-4000-8000-000000000013';

insert into public.user_roles (user_id, role)
values
  ('a0000000-0000-4000-8000-000000000005', 'inspector'),
  ('a0000000-0000-4000-8000-000000000006', 'inspector');

delete from public.user_roles
where user_roles.role = 'user'
  and user_roles.user_id in ('a0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000006');

insert into public.inspector_profiles (user_id, city_id)
select seed.user_id, cities.id
from (
  values
    ('a0000000-0000-4000-8000-000000000005'::uuid, 'timisoara'),
    ('a0000000-0000-4000-8000-000000000006'::uuid, 'bucuresti')
) as seed (user_id, slug)
join public.cities on cities.slug = seed.slug;

insert into public.inspector_weekly_hours (inspector_id, weekday, starts_at, ends_at)
select inspector.user_id, hours.weekday, hours.starts_at, hours.ends_at
from public.inspector_profiles as inspector
cross join (
  values
    (1::smallint, time '08:00', time '17:00'),
    (2::smallint, time '08:00', time '17:00'),
    (3::smallint, time '08:00', time '12:00'),
    (3::smallint, time '14:00', time '18:00'),
    (4::smallint, time '08:00', time '17:00'),
    (5::smallint, time '08:00', time '17:00'),
    (6::smallint, time '09:00', time '13:00')
) as hours (weekday, starts_at, ends_at);

insert into public.inspector_exceptions (inspector_id, kind, starts_at, ends_at, note)
values (
  'a0000000-0000-4000-8000-000000000005',
  'training',
  ((date_trunc('week', now() at time zone 'Europe/Bucharest')::date + 9) + time '08:00') at time zone 'Europe/Bucharest',
  ((date_trunc('week', now() at time zone 'Europe/Bucharest')::date + 9) + time '11:00') at time zone 'Europe/Bucharest',
  'Training intern'
);

insert into public.properties (
  id, owner_id, listing_id, address_text, city_id, latitude, longitude, property_type, area_m2,
  year_built, floor, building_floors
)
select
  seed.id,
  seed.owner_id,
  seed.listing_id,
  seed.address_text,
  cities.id,
  seed.latitude,
  seed.longitude,
  seed.property_type::public.listing_property_type,
  seed.area_m2,
  seed.year_built,
  seed.floor,
  seed.building_floors
from (
  values
    ('c0000000-0000-4000-8000-000000000001'::uuid, 'a0000000-0000-4000-8000-000000000001'::uuid,
     'b0000000-0000-4000-8000-000000000001'::uuid, 'Str. Școlii, 12, Timișoara', 'timisoara', 45.7580, 21.2246,
     'apartment', 78, 1985::smallint, 3::smallint, 8::smallint),
    ('c0000000-0000-4000-8000-000000000002'::uuid, 'a0000000-0000-4000-8000-000000000001'::uuid,
     null::uuid, 'Calea Circumvalațiunii 41, ap. 22, Timișoara', 'timisoara', 45.7655, 21.2135,
     'apartment', 54, 1978::smallint, 6::smallint, 10::smallint),
    ('c0000000-0000-4000-8000-000000000003'::uuid, 'a0000000-0000-4000-8000-000000000003'::uuid,
     null::uuid, 'Str. Paris 3, ap. 9, Timișoara', 'timisoara', 45.7484, 21.2215,
     'apartment', 62, 1962::smallint, 2::smallint, 4::smallint),
    ('c0000000-0000-4000-8000-000000000004'::uuid, 'a0000000-0000-4000-8000-000000000003'::uuid,
     null::uuid, 'Bd. Unirii 18, ap. 5, București', 'bucuresti', 44.4270, 26.1020,
     'apartment', 70, 1975::smallint, 4::smallint, 8::smallint)
) as seed (id, owner_id, listing_id, address_text, slug, latitude, longitude, property_type, area_m2, year_built, floor, building_floors)
join public.cities on cities.slug = seed.slug;

insert into public.inspections (
  id, property_id, requested_by, inspector_id, status, starts_at, ends_at, access_mode, access_name,
  access_phone, access_tags, access_notes, payment_method, assigned_at, cancelled_at, cancelled_by
)
select
  seed.id,
  seed.property_id,
  seed.requested_by,
  seed.inspector_id,
  seed.status::public.inspection_status,
  seed.starts_at,
  seed.starts_at + interval '2 hours',
  'self',
  seed.access_name,
  seed.access_phone,
  seed.access_tags,
  seed.access_notes,
  'card',
  case when seed.inspector_id is not null then now() - interval '1 hour' end,
  case when seed.status = 'cancelled' then now() - interval '2 days' end,
  case when seed.status = 'cancelled' then seed.requested_by end
from (
  values
    ('d0000000-0000-4000-8000-000000000001'::uuid, 'c0000000-0000-4000-8000-000000000001'::uuid,
     'a0000000-0000-4000-8000-000000000001'::uuid, 'a0000000-0000-4000-8000-000000000005'::uuid,
     'inspector_assigned',
     ((date_trunc('week', now() at time zone 'Europe/Bucharest')::date + 8) + time '09:30') at time zone 'Europe/Bucharest',
     'Ana Mărginean', '+40722000001', array['intercom']::text[], 'Interfon 7. Câinele stă pe balcon.'),
    ('d0000000-0000-4000-8000-000000000002'::uuid, 'c0000000-0000-4000-8000-000000000002'::uuid,
     'a0000000-0000-4000-8000-000000000001'::uuid, null::uuid,
     'scheduled',
     ((date_trunc('week', now() at time zone 'Europe/Bucharest')::date + 9) + time '14:00') at time zone 'Europe/Bucharest',
     'Ana Mărginean', '+40722000001', array[]::text[], null),
    ('d0000000-0000-4000-8000-000000000003'::uuid, 'c0000000-0000-4000-8000-000000000003'::uuid,
     'a0000000-0000-4000-8000-000000000003'::uuid, null::uuid,
     'scheduled',
     ((date_trunc('week', now() at time zone 'Europe/Bucharest')::date + 10) + time '11:00') at time zone 'Europe/Bucharest',
     'Ion Țurcanu', '+40722000003', array['parking']::text[], 'Parcare în spatele blocului.'),
    ('d0000000-0000-4000-8000-000000000004'::uuid, 'c0000000-0000-4000-8000-000000000004'::uuid,
     'a0000000-0000-4000-8000-000000000003'::uuid, null::uuid,
     'cancelled',
     ((date_trunc('week', now() at time zone 'Europe/Bucharest')::date + 11) + time '14:00') at time zone 'Europe/Bucharest',
     'Ion Țurcanu', '+40722000003', array[]::text[], null)
) as seed (id, property_id, requested_by, inspector_id, status, starts_at, access_name, access_phone, access_tags, access_notes);

insert into public.inspection_events (inspection_id, kind, actor_id, created_at)
select inspections.id, 'booked', inspections.requested_by, inspections.created_at - interval '3 days'
from public.inspections;

insert into public.inspection_events (inspection_id, kind, actor_id, details, created_at)
select
  inspections.id,
  'assigned',
  'a0000000-0000-4000-8000-000000000004',
  jsonb_build_object('inspector_id', inspections.inspector_id),
  inspections.assigned_at
from public.inspections
where inspections.inspector_id is not null;

insert into public.inspection_events (inspection_id, kind, actor_id, created_at)
select inspections.id, 'cancelled', inspections.cancelled_by, inspections.cancelled_at
from public.inspections
where inspections.status = 'cancelled';
