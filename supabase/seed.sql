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

insert into public.inspection_form_versions (id, version, status, created_by)
values (
  'f0000000-0000-4000-8000-000000000001', 1, 'draft', 'a0000000-0000-4000-8000-000000000004'
);

insert into public.inspection_form_categories (form_version_id, key, position, name_ro, name_en, icon, weight)
values
  ('f0000000-0000-4000-8000-000000000001', 'struct', 0, 'Structură', 'Structure', 'building-2', 15),
  ('f0000000-0000-4000-8000-000000000001', 'umez', 1, 'Umezeală', 'Damp', 'droplets', 15),
  ('f0000000-0000-4000-8000-000000000001', 'elec', 2, 'Instalații electrice', 'Electrical installation', 'zap', 12),
  ('f0000000-0000-4000-8000-000000000001', 'apa', 3, 'Apă & canalizare', 'Water & drainage', 'droplet', 10),
  ('f0000000-0000-4000-8000-000000000001', 'incalz', 4, 'Încălzire & apă caldă', 'Heating & hot water', 'flame', 12),
  ('f0000000-0000-4000-8000-000000000001', 'tampl', 5, 'Tâmplărie & uși', 'Windows & doors', 'door-open', 8),
  ('f0000000-0000-4000-8000-000000000001', 'izol', 6, 'Izolație & confort', 'Insulation & comfort', 'thermometer', 7),
  ('f0000000-0000-4000-8000-000000000001', 'finis', 7, 'Finisaje', 'Finishes', 'paintbrush', 6),
  ('f0000000-0000-4000-8000-000000000001', 'comun', 8, 'Părți comune & exterior', 'Common areas & exterior', 'users', 5),
  ('f0000000-0000-4000-8000-000000000001', 'acte', 9, 'Acte & context', 'Documents & context', 'file-text', 5),
  ('f0000000-0000-4000-8000-000000000001', 'sig', 10, 'Siguranță & vecinătate', 'Safety & neighbourhood', 'shield', 5);

insert into public.inspection_form_questions (category_id, key, position, text_ro, text_en, required_media)
select categories.id, seed.key, seed.position, seed.text_ro, seed.text_en, seed.required_media::public.inspection_required_media
from (
  values
    ('struct', 'struct-1', 0, 'Fisuri vizibile în pereți portanți, grinzi sau tavane?', 'Visible cracks in load-bearing walls, beams or ceilings?', 'photo'),
    ('struct', 'struct-2', 1, 'Planșee și pardoseli: denivelări, tasări, scârțâit la mers?', 'Floors and slabs: unevenness, settling, creaking underfoot?', 'video'),
    ('struct', 'struct-3', 2, 'Balcon / terasă: placa, balustrada, urme de infiltrații?', 'Balcony / terrace: slab, railing, signs of water ingress?', 'photo'),
    ('struct', 'struct-4', 3, 'Tipul și anul structurii corespund cu anunțul (cadre beton, zidărie, panouri)?', 'Do the structure type and year match the listing (concrete frame, masonry, panels)?', 'photo'),
    ('umez', 'umez-1', 0, 'Pete, mucegai sau igrasie pe pereți și tavane?', 'Stains, mould or rising damp on walls and ceilings?', 'photo'),
    ('umez', 'umez-2', 1, 'Umiditate măsurată pe peretele cel mai expus (%, cu aparatul în cadru)', 'Moisture measured on the most exposed wall (%, with the meter in the frame)', 'photo'),
    ('umez', 'umez-3', 2, 'Miros de umezeală sau mucegai în baie / bucătărie?', 'Damp or mouldy smell in the bathroom / kitchen?', 'none'),
    ('umez', 'umez-4', 3, 'Urme de infiltrații de la vecini sau acoperiș (tavan, colțuri)?', 'Signs of leaks from neighbours or the roof (ceiling, corners)?', 'photo'),
    ('elec', 'elec-1', 0, 'Tablou electric: siguranțe automate, diferențial, stare generală?', 'Fuse box: circuit breakers, residual current device, general condition?', 'photo'),
    ('elec', 'elec-2', 1, 'Prize cu împământare, funcționale în toate încăperile (test)?', 'Earthed sockets working in every room (tested)?', 'none'),
    ('elec', 'elec-3', 2, 'Cabluri vizibile, improvizații, doze deschise?', 'Exposed cables, makeshift wiring, open junction boxes?', 'photo'),
    ('elec', 'elec-4', 3, 'Contor și branșament: individual, accesibil, în stare bună?', 'Meter and supply connection: individual, accessible, in good condition?', 'photo'),
    ('apa', 'apa-1', 0, 'Presiune și debit la robinete (baie, bucătărie)?', 'Water pressure and flow at the taps (bathroom, kitchen)?', 'video'),
    ('apa', 'apa-2', 1, 'Scurgeri sub chiuvete, la WC, la cadă / duș?', 'Leaks under the sinks, at the toilet, bath / shower?', 'photo'),
    ('apa', 'apa-3', 2, 'Țevi: material (fier / cupru / PPR), coroziune, vechime vizibilă?', 'Pipes: material (iron / copper / PPR), corrosion, visible age?', 'photo'),
    ('apa', 'apa-4', 3, 'Apometre individuale, accesibile, cu sigilii intacte?', 'Individual water meters, accessible, seals intact?', 'photo'),
    ('incalz', 'incalz-1', 0, 'Sursa: centrală proprie / termoficare / sobă; anul centralei de pe plăcuță', 'Source: own boiler / district heating / stove; boiler year from its plate', 'photo'),
    ('incalz', 'incalz-2', 1, 'Centrala pornește, arde curat, presiunea e în plaja normală?', 'Does the boiler start, burn cleanly, with pressure in the normal range?', 'video'),
    ('incalz', 'incalz-3', 2, 'Caloriferele se încălzesc uniform, robineții funcționează?', 'Do the radiators heat evenly and do the valves work?', 'photo'),
    ('incalz', 'incalz-4', 3, 'Verificare ISCIR / revizie centrală în termen?', 'Boiler safety check / service up to date?', 'photo'),
    ('tampl', 'tampl-1', 0, 'Ferestre: material, geam termopan, închid etanș?', 'Windows: material, double glazing, do they close tightly?', 'video'),
    ('tampl', 'tampl-2', 1, 'Garnituri, feronerie, condens între foile de geam?', 'Seals, hardware, condensation between the panes?', 'photo'),
    ('tampl', 'tampl-3', 2, 'Ușa de intrare: material, încuietori, blindată?', 'Front door: material, locks, reinforced?', 'photo'),
    ('tampl', 'tampl-4', 3, 'Uși interioare: se închid, praguri, deteriorări?', 'Interior doors: do they close, thresholds, damage?', 'none'),
    ('izol', 'izol-1', 0, 'Blocul / casa e reabilitat(ă) termic la exterior?', 'Is the building / house externally insulated?', 'photo'),
    ('izol', 'izol-2', 1, 'Zgomot din stradă sau de la vecini cu ferestrele închise?', 'Noise from the street or neighbours with the windows closed?', 'video'),
    ('izol', 'izol-3', 2, 'Curent de aer la ferestre / ușă (test cu mâna)?', 'Draughts at the windows / door (hand test)?', 'none'),
    ('izol', 'izol-4', 3, 'Orientare și lumină naturală în camerele principale?', 'Orientation and daylight in the main rooms?', 'photo'),
    ('finis', 'finis-1', 0, 'Pardoseli: tip, stare, zone deteriorate?', 'Floors: type, condition, damaged areas?', 'photo'),
    ('finis', 'finis-2', 1, 'Pereți și tavane: zugrăveală, fisuri superficiale?', 'Walls and ceilings: paint, surface cracks?', 'photo'),
    ('finis', 'finis-3', 2, 'Baie: gresie / faianță, obiecte sanitare, ventilație?', 'Bathroom: tiles, sanitary fittings, ventilation?', 'photo'),
    ('finis', 'finis-4', 3, 'Bucătărie: mobilier, electrocasnice incluse, hotă / ventilație?', 'Kitchen: units, included appliances, hood / ventilation?', 'photo'),
    ('comun', 'comun-1', 0, 'Scară, lift, interfon: stare și funcționare?', 'Stairwell, lift, intercom: condition and operation?', 'video'),
    ('comun', 'comun-2', 1, 'Acoperiș / terasa blocului, jgheaburi, fațadă (ce se vede)?', 'Roof / building terrace, gutters, facade (what can be seen)?', 'photo'),
    ('comun', 'comun-3', 2, 'Subsol: uscat, fără mirosuri, instalații comune în stare bună?', 'Basement: dry, no smells, shared installations in good condition?', 'photo'),
    ('comun', 'comun-4', 3, 'Parcare, curte, acces, iluminat exterior?', 'Parking, yard, access, outdoor lighting?', 'photo'),
    ('acte', 'acte-1', 0, 'Suprafața măsurată corespunde cu anunțul (±3%)?', 'Does the measured area match the listing (±3%)?', 'photo'),
    ('acte', 'acte-2', 1, 'Există certificat energetic; ce clasă?', 'Is there an energy certificate; which class?', 'photo'),
    ('acte', 'acte-3', 2, 'Restanțe la asociație / utilități, declarate de proprietar?', 'Arrears to the owners'' association / utilities, as declared by the owner?', 'none'),
    ('acte', 'acte-4', 3, 'Modificări neautorizate (pereți demolați, balcon închis, spațiu comun ocupat)?', 'Unauthorised changes (walls removed, balcony enclosed, common space taken over)?', 'photo'),
    ('sig', 'sig-1', 0, 'Ușa de intrare în bloc / poarta: se închide, interfon funcțional, acces controlat?', 'Building entrance / gate: does it close, working intercom, controlled access?', 'photo'),
    ('sig', 'sig-2', 1, 'Iluminat la intrare, pe scară și pe stradă în fața imobilului?', 'Lighting at the entrance, in the stairwell and on the street in front?', 'photo'),
    ('sig', 'sig-3', 2, 'Semne de vandalism, graffiti, geamuri sparte, clădiri abandonate pe stradă?', 'Signs of vandalism, graffiti, broken windows, abandoned buildings on the street?', 'photo'),
    ('sig', 'sig-4', 3, 'Asociația / vecinii: incidente în ultimele 12 luni (spargeri, furturi, scandaluri)?', 'Association / neighbours: incidents in the last 12 months (break-ins, thefts, disturbances)?', 'none')
) as seed (category_key, key, position, text_ro, text_en, required_media)
join public.inspection_form_categories as categories
  on categories.form_version_id = 'f0000000-0000-4000-8000-000000000001'
 and categories.key = seed.category_key;

select private.split_question_weights('f0000000-0000-4000-8000-000000000001', null);

update public.inspection_form_versions
set status = 'published', published_at = '2026-09-01 09:00:00+03', published_by = 'a0000000-0000-4000-8000-000000000004'
where id = 'f0000000-0000-4000-8000-000000000001';

insert into public.consent_versions (id, version, status, created_by)
values ('c0000000-0000-4000-8000-000000000001', 1.0, 'draft', 'a0000000-0000-4000-8000-000000000004');

insert into public.consent_sections (
  consent_version_id, position, title_ro, title_en, text_ro, text_en, check_ro, check_en
)
values
  (
    'c0000000-0000-4000-8000-000000000001', 0,
    'Prelucrarea datelor personale', 'Personal data processing',
    'PropertyScore SRL, operator de date, prelucrează numele, telefonul, emailul și datele locuinței tale ca să facă inspecția, să genereze book-ul și să ți-l trimită. Datele se păstrează cât e valabil book-ul plus perioada cerută de lege. Ai dreptul de acces, rectificare, ștergere, restricționare, portabilitate și opoziție, la gdpr@propertyscore.ro. Nu vindem datele. Le vede echipa PropertyScore și, dacă ai venit printr-un partener, partenerul vede stadiul și book-ul.',
    'PropertyScore SRL, as data controller, processes your name, phone, email and the property data to carry out the inspection, generate the book and deliver it to you. Data is kept for the validity of the book plus the legally required period. You have the right of access, rectification, erasure, restriction, portability and objection at gdpr@propertyscore.ro. We do not sell data. It is seen by the PropertyScore team and, if you came through a partner, the partner sees the status and the book.',
    'Am citit și sunt de acord cu prelucrarea datelor mele personale.',
    'I have read and agree to the processing of my personal data.'
  ),
  (
    'c0000000-0000-4000-8000-000000000001', 1,
    'Poze și video în locuință', 'Photos and video in the property',
    'Agentul face fotografii și clipuri în toate încăperile, câte o panoramă cu o cameră 360 în fiecare cameră și scanează locuința cu Polycam pentru un plan de prezentare. Materialele rămân la inspecție și intră în anunțul tău doar dacă decizi să îl publici. Evităm persoanele, actele și obiectele personale. Poți cere pe loc să nu fie fotografiat ceva anume.',
    'The inspector takes photos and videos in every room, one 360-degree panorama in each room, and scans the home with Polycam for a presentation floor plan. The materials remain with the inspection and appear in your listing only if you choose to publish it. We avoid people, documents and personal items. You can ask for a specific item not to be photographed.',
    'Sunt de acord să se facă fotografii și clipuri în locuință, în condițiile de mai sus.',
    'I agree to photos and videos being taken in the property, under the conditions above.'
  ),
  (
    'c0000000-0000-4000-8000-000000000001', 2,
    'Termenii inspecției și răspunderea', 'Inspection terms and liability',
    'Inspecția e vizuală și cu instrumente simple, fără demontări, fără expertize de specialitate. Book-ul descrie ce s-a putut vedea și măsura la data inspecției; nu garantează lipsa defectelor ascunse și nu înlocuiește o expertiză tehnică. Nota se calculează automat din răspunsurile la 44 de întrebări. Răspunderea PropertyScore se limitează la valoarea serviciului.',
    'The inspection is visual, with simple instruments, without dismantling or specialist surveys. The book describes what could be seen and measured on the inspection date; it does not guarantee the absence of hidden defects and does not replace a technical survey. The grade is computed automatically from the answers to 44 questions. PropertyScore''s liability is limited to the value of the service.',
    'Am înțeles ce este și ce nu este inspecția și accept termenii.',
    'I understand what the inspection is and is not, and I accept the terms.'
  );

update public.consent_versions
set status = 'published', published_at = '2026-09-01 09:00:00+03', published_by = 'a0000000-0000-4000-8000-000000000004'
where id = 'c0000000-0000-4000-8000-000000000001';

insert into public.inspections (
  id, property_id, requested_by, inspector_id, status, starts_at, ends_at, access_mode, access_name,
  access_phone, access_tags, access_notes, payment_method, assigned_at
)
values (
  'd0000000-0000-4000-8000-000000000005',
  'c0000000-0000-4000-8000-000000000003',
  'a0000000-0000-4000-8000-000000000003',
  'a0000000-0000-4000-8000-000000000005',
  'inspector_assigned',
  date_trunc('hour', now()) + interval '30 minutes',
  date_trunc('hour', now()) + interval '150 minutes',
  'self',
  'Ion Țurcanu',
  '+40722000003',
  array['parking']::text[],
  'Parcare în spatele blocului.',
  'card',
  now() - interval '1 day'
);
