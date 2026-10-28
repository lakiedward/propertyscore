begin;

create extension if not exists pgtap with schema extensions;

select plan(13);

insert into auth.users (id, email)
values
  ('11111111-1111-1111-1111-111111111111', 'owner@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'other@example.test');

insert into public.listings (
  id, owner_id, status, transaction, title, street_label, city, rooms, area_m2, price, currency,
  latitude, longitude, verification, smartcheck_score, published_at
)
values
  ('c0000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', 'published', 'sale',
   'Apartament publicat', 'Str. Școlii, 1', 'Timișoara', 2, 50, 90000, 'EUR', 45.75, 21.22, 'physical', null, now()),
  ('c0000000-0000-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111', 'draft', 'rent',
   'Ciornă de anunț', 'Str. Grădinii, 2', 'Timișoara', 1, 30, 300, 'EUR', 45.75, 21.23, 'none', null, null);

select throws_ok(
  $$
    insert into public.listings (owner_id, transaction, title, street_label, city, rooms, area_m2, price, currency, latitude, longitude, verification, smartcheck_score)
    values ('11111111-1111-1111-1111-111111111111', 'sale', 'Fără scor', 'Str. A, 1', 'Timișoara', 2, 50, 1000, 'EUR', 45.7, 21.2, 'smartcheck', null)
  $$,
  '23514',
  null,
  'A SmartCheck listing needs a score'
);

select throws_ok(
  $$
    insert into public.listings (owner_id, transaction, title, street_label, city, rooms, area_m2, price, currency, latitude, longitude, verification, smartcheck_score)
    values ('11111111-1111-1111-1111-111111111111', 'sale', 'Scor fără raport', 'Str. A, 1', 'Timișoara', 2, 50, 1000, 'EUR', 45.7, 21.2, 'none', 70)
  $$,
  '23514',
  null,
  'A listing without a report has no score'
);

select throws_ok(
  $$
    insert into public.listings (owner_id, status, transaction, title, street_label, city, rooms, area_m2, price, currency, latitude, longitude)
    values ('11111111-1111-1111-1111-111111111111', 'published', 'sale', 'Fără dată', 'Str. A, 1', 'Timișoara', 2, 50, 1000, 'EUR', 45.7, 21.2)
  $$,
  '23514',
  null,
  'A published listing has a publication date'
);

select throws_ok(
  $$
    insert into public.listings (owner_id, transaction, title, street_label, city, rooms, area_m2, price, currency, latitude, longitude)
    values ('11111111-1111-1111-1111-111111111111', 'sale', 'Lei vechi', 'Str. A, 1', 'Timișoara', 2, 50, 1000, 'USD', 45.7, 21.2)
  $$,
  '23514',
  null,
  'Only RON and EUR prices are accepted'
);

select results_eq(
  $$ select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'listing-photos' $$,
  $$ values (true, 5242880::bigint, array['image/webp', 'image/jpeg', 'image/png']) $$,
  'Listing photos live in a public bucket with size and type limits'
);

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select results_eq(
  $$ select id from public.listings where id in ('c0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002') $$,
  $$ values ('c0000000-0000-4000-8000-000000000001'::uuid) $$,
  'A visitor sees published listings but not drafts'
);

select throws_ok(
  $$
    insert into public.listings (owner_id, transaction, title, street_label, city, rooms, area_m2, price, currency, latitude, longitude)
    values ('11111111-1111-1111-1111-111111111111', 'sale', 'Anonim', 'Str. A, 1', 'Timișoara', 2, 50, 1000, 'EUR', 45.7, 21.2)
  $$,
  '42501',
  null,
  'A visitor cannot create a listing'
);

select throws_ok(
  $$ update public.listings set price = 1 where id = 'c0000000-0000-4000-8000-000000000001' $$,
  '42501',
  null,
  'A visitor cannot change a listing'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

select results_eq(
  $$ select id from public.listings where id in ('c0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002') $$,
  $$ values ('c0000000-0000-4000-8000-000000000001'::uuid) $$,
  'Another user sees published listings but not someone else''s draft'
);

select throws_ok(
  $$
    insert into public.listings (transaction, title, street_label, city, rooms, area_m2, price, currency, latitude, longitude)
    values ('sale', 'Al meu', 'Str. A, 1', 'Timișoara', 2, 50, 1000, 'EUR', 45.7, 21.2)
  $$,
  '42501',
  null,
  'A signed-in user cannot create a listing yet'
);

select throws_ok(
  $$ delete from public.listings where id = 'c0000000-0000-4000-8000-000000000001' $$,
  '42501',
  null,
  'A signed-in user cannot delete a listing'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select results_eq(
  $$ select id from public.listings where id in ('c0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002') order by id $$,
  $$ values ('c0000000-0000-4000-8000-000000000001'::uuid), ('c0000000-0000-4000-8000-000000000002'::uuid) $$,
  'The owner sees their own draft'
);

select throws_ok(
  $$ update public.listings set price = 1 where id = 'c0000000-0000-4000-8000-000000000002' $$,
  '42501',
  null,
  'The owner cannot change a listing yet'
);

select * from finish();
rollback;
