begin;

create extension if not exists pgtap with schema extensions;

select plan(31);

insert into auth.users (id, email)
values
  ('11111111-1111-1111-1111-111111111111', 'owner@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'other@example.test');

insert into public.listings (
  id, owner_id, status, transaction, title, street_label, city, rooms, area_m2, price, currency,
  latitude, longitude, verification, smartcheck_score, published_at
)
values
  ('c0000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', 'approved', 'sale',
   'Apartament publicat', 'Str. Școlii, 1', 'Timișoara', 2, 50, 90000, 'EUR', 45.75, 21.22, 'physical', null, now()),
  ('c0000000-0000-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111', 'draft', 'rent',
   'Ciornă de anunț', 'Str. Grădinii, 2', 'Timișoara', 1, 30, 300, 'EUR', 45.75, 21.23, 'none', null, null);

insert into public.listings (
  id, owner_id, transaction, title, street_label, city, rooms, area_m2, price, currency, latitude, longitude, updated_at
)
values
  ('c0000000-0000-4000-8000-000000000003', '11111111-1111-1111-1111-111111111111', 'sale',
   'Anunț vechi', 'Str. Livezii, 3', 'Timișoara', 2, 50, 90000, 'EUR', 45.75, 21.22, '2020-01-01 00:00:00+00');

insert into storage.objects (bucket_id, name)
values ('listing-photos', '11111111-1111-1111-1111-111111111111/c0000000-0000-4000-8000-000000000001/cover.webp');

set local storage.allow_delete_query = 'true';

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
    values ('11111111-1111-1111-1111-111111111111', 'approved', 'sale', 'Fără dată', 'Str. A, 1', 'Timișoara', 2, 50, 1000, 'EUR', 45.7, 21.2)
  $$,
  '23514',
  null,
  'An approved listing has a publication date'
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
  $$
    with updated as (
      update public.listings set price = 95000
      where id = 'c0000000-0000-4000-8000-000000000003'
      returning updated_at
    )
    select updated_at > '2020-01-01 00:00:00+00'::timestamptz and updated_at = now() from updated
  $$,
  $$ values (true) $$,
  'Updating a listing refreshes updated_at'
);

select results_eq(
  $$ select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'listing-photos' $$,
  $$ values (true, 5242880::bigint, array['image/webp', 'image/jpeg', 'image/png']) $$,
  'The listing photos bucket matches config.toml: public, 5MiB, webp, jpeg and png'
);

select ok(
  exists (
    select 1
    from supabase_migrations.schema_migrations as migrations,
      unnest(migrations.statements) as statement
    where statement ilike 'insert into storage.buckets%'
      and statement like '%''listing-photos''%'
      and statement like '%true,%'
      and statement like '%5242880,%'
      and statement like '%array[''image/webp'', ''image/jpeg'', ''image/png'']%'
  ),
  'The migration creates the listing photos bucket with the config.toml values'
);

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select results_eq(
  $$ select id from public.listings where id in ('c0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002') $$,
  $$ values ('c0000000-0000-4000-8000-000000000001'::uuid) $$,
  'A visitor sees approved listings but not drafts'
);

select results_eq(
  $$
    select title, city, price, photo_path, published_at is not null
    from public.listings
    where id in ('c0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002')
  $$,
  $$ values ('Apartament publicat'::text, 'Timișoara'::text, 90000::numeric(12, 2), null::text, true) $$,
  'A visitor reads the public columns of approved listings'
);

select throws_ok(
  $$ select owner_id from public.listings $$,
  '42501',
  null,
  'A visitor cannot read who owns a listing'
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

select throws_ok(
  $$ delete from public.listings where id = 'c0000000-0000-4000-8000-000000000001' $$,
  '42501',
  null,
  'A visitor cannot delete a listing'
);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('listing-photos', '11111111-1111-1111-1111-111111111111/c0000000-0000-4000-8000-000000000001/anon.webp') $$,
  '42501',
  null,
  'A visitor cannot upload a listing photo'
);

select results_eq(
  $$
    with updated as (
      update storage.objects set metadata = '{}'
      where bucket_id = 'listing-photos'
      returning 1
    )
    select count(*)::int from updated
  $$,
  $$ values (0) $$,
  'A visitor cannot change a listing photo'
);

select results_eq(
  $$
    with deleted as (
      delete from storage.objects
      where bucket_id = 'listing-photos'
      returning 1
    )
    select count(*)::int from deleted
  $$,
  $$ values (0) $$,
  'A visitor cannot delete a listing photo'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

select results_eq(
  $$ select id from public.listings where id in ('c0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002') $$,
  $$ values ('c0000000-0000-4000-8000-000000000001'::uuid) $$,
  'Another user sees approved listings but not someone else''s draft'
);

select throws_ok(
  $$
    insert into public.listings (owner_id, transaction, title, street_label, city, rooms, area_m2, price, currency, latitude, longitude)
    values ('11111111-1111-1111-1111-111111111111', 'sale', 'Al altcuiva', 'Str. A, 1', 'Timișoara', 2, 50, 1000, 'EUR', 45.7, 21.2)
  $$,
  '42501',
  null,
  'A signed-in user cannot create a listing for someone else'
);

select results_eq(
  $$
    with updated as (
      update public.listings set price = 1
      where id = 'c0000000-0000-4000-8000-000000000001'
      returning 1
    )
    select count(*)::int from updated
  $$,
  $$ values (0) $$,
  'Another user cannot change someone else''s listing'
);

select throws_ok(
  $$ delete from public.listings where id = 'c0000000-0000-4000-8000-000000000001' $$,
  '42501',
  null,
  'A signed-in user cannot delete a listing'
);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('listing-photos', '11111111-1111-1111-1111-111111111111/c0000000-0000-4000-8000-000000000001/other.webp') $$,
  '42501',
  null,
  'Another user cannot upload a photo to someone else''s listing'
);

select results_eq(
  $$
    with updated as (
      update storage.objects set metadata = '{}'
      where bucket_id = 'listing-photos'
      returning 1
    )
    select count(*)::int from updated
  $$,
  $$ values (0) $$,
  'Another user cannot change a listing photo'
);

select results_eq(
  $$
    with deleted as (
      delete from storage.objects
      where bucket_id = 'listing-photos'
      returning 1
    )
    select count(*)::int from deleted
  $$,
  $$ values (0) $$,
  'Another user cannot delete a listing photo'
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
  $$
    insert into public.listings (owner_id, transaction, title, street_label, city, rooms, area_m2, price, currency, latitude, longitude)
    values ('11111111-1111-1111-1111-111111111111', 'sale', 'Al meu', 'Str. A, 1', 'Timișoara', 2, 50, 1000, 'EUR', 45.7, 21.2)
  $$,
  '42501',
  null,
  'The owner cannot choose who owns a new listing'
);

select results_eq(
  $$
    with updated as (
      update public.listings set price = 1
      where id = 'c0000000-0000-4000-8000-000000000001'
      returning 1
    )
    select count(*)::int from updated
  $$,
  $$ values (0) $$,
  'The owner cannot change an approved listing'
);

select throws_ok(
  $$ delete from public.listings where id = 'c0000000-0000-4000-8000-000000000002' $$,
  '42501',
  null,
  'The owner cannot delete a listing'
);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('listing-photos', '11111111-1111-1111-1111-111111111111/c0000000-0000-4000-8000-000000000001/owner.webp') $$,
  '42501',
  null,
  'The owner cannot upload a photo to an approved listing'
);

select results_eq(
  $$
    with updated as (
      update storage.objects set metadata = '{}'
      where bucket_id = 'listing-photos'
      returning 1
    )
    select count(*)::int from updated
  $$,
  $$ values (0) $$,
  'The owner cannot change a photo of an approved listing'
);

select results_eq(
  $$
    with deleted as (
      delete from storage.objects
      where bucket_id = 'listing-photos'
      returning 1
    )
    select count(*)::int from deleted
  $$,
  $$ values (0) $$,
  'The owner cannot delete a photo of an approved listing'
);

reset role;

select results_eq(
  $$
    select count(*)::int
    from storage.objects
    where bucket_id = 'listing-photos'
      and name = '11111111-1111-1111-1111-111111111111/c0000000-0000-4000-8000-000000000001/cover.webp'
      and metadata is distinct from '{}'::jsonb
  $$,
  $$ values (1) $$,
  'No role changed or removed the stored listing photo'
);

select * from finish();
rollback;
