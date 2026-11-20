begin;

create extension if not exists pgtap with schema extensions;

select plan(34);

delete from public.favorite_listings;
delete from public.listings;

insert into auth.users (id, email, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', 'owner@example.test', '{}'),
  ('22222222-2222-2222-2222-222222222222', 'saver@example.test', '{}'),
  ('33333333-3333-3333-3333-333333333333', 'other@example.test', '{}');

insert into public.listings (
  id, owner_id, status, transaction, title, street_label, city, rooms, area_m2, price, currency,
  latitude, longitude, photo_path, submitted_at, decided_at, published_at
)
values
  ('f0000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', 'approved', 'sale',
   'Aprobat', 'Str. Școlii, 1', 'Timișoara', 3, 76, 142000, 'EUR', 45.75, 21.22, 'p/1.webp', now(), now(), now()),
  ('f0000000-0000-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111', 'approved', 'rent',
   'Aprobat de închiriat', 'Str. Școlii, 2', 'Timișoara', 2, 54, 450, 'EUR', 45.75, 21.22, 'p/2.webp', now(), now(), now()),
  ('f0000000-0000-4000-8000-000000000003', '11111111-1111-1111-1111-111111111111', 'draft', 'sale',
   'Ciornă', 'Str. Școlii, 3', 'Timișoara', 2, 50, 90000, 'EUR', 45.75, 21.22, null, null, null, null),
  ('f0000000-0000-4000-8000-000000000004', '11111111-1111-1111-1111-111111111111', 'pending_approval', 'sale',
   'În așteptare', 'Str. Școlii, 4', 'Timișoara', 2, 50, 90000, 'EUR', 45.75, 21.22, null, now(), null, null),
  ('f0000000-0000-4000-8000-000000000005', '11111111-1111-1111-1111-111111111111', 'approved', 'sale',
   'Retras', 'Str. Școlii, 5', 'Timișoara', 2, 50, 90000, 'EUR', 45.75, 21.22, 'p/5.webp', now(), now(), now()),
  ('f0000000-0000-4000-8000-000000000007', '11111111-1111-1111-1111-111111111111', 'approved', 'sale',
   'Blocat', 'Str. Școlii, 7', 'Timișoara', 2, 50, 90000, 'EUR', 45.75, 21.22, 'p/7.webp', now(), now(), now());

insert into public.listings (
  id, owner_id, status, transaction, title, street_label, city, rooms, area_m2, price, currency,
  latitude, longitude, revision_of
)
values
  ('f0000000-0000-4000-8000-000000000006', '11111111-1111-1111-1111-111111111111', 'draft', 'sale',
   'Revizie', 'Str. Școlii, 1', 'Timișoara', 3, 76, 142000, 'EUR', 45.75, 21.22,
   'f0000000-0000-4000-8000-000000000001');

insert into public.favorite_listings (owner_id, listing_id, created_at)
values
  ('22222222-2222-2222-2222-222222222222', 'f0000000-0000-4000-8000-000000000005', now() - interval '3 hours'),
  ('22222222-2222-2222-2222-222222222222', 'f0000000-0000-4000-8000-000000000007', now() - interval '2 hours'),
  ('33333333-3333-3333-3333-333333333333', 'f0000000-0000-4000-8000-000000000001', now() - interval '1 hour');

select is(
  (select saved_title from public.favorite_listings
   where listing_id = 'f0000000-0000-4000-8000-000000000005'),
  'Retras',
  'Saving a listing keeps its approved title'
);

update public.listings
set status = 'rejected', title = 'Titlu schimbat după respingere', photo_path = 'p/5-changed.webp'
where id = 'f0000000-0000-4000-8000-000000000005';

update public.listings
set status = 'blocked'
where id = 'f0000000-0000-4000-8000-000000000007';

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select throws_ok(
  $$ select count(*) from public.favorite_listings $$,
  '42501',
  null,
  'Visitors cannot read favourites'
);

select throws_ok(
  $$ insert into public.favorite_listings (listing_id) values ('f0000000-0000-4000-8000-000000000001') $$,
  '42501',
  null,
  'Visitors cannot save favourites'
);

select throws_ok(
  $$ delete from public.favorite_listings $$,
  '42501',
  null,
  'Visitors cannot remove favourites'
);

select throws_ok(
  $$ select * from public.list_my_favorite_listings(24) $$,
  '42501',
  null,
  'Visitors cannot list favourites'
);

set local role authenticated;
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "user_roles": ["user"]}';

select is(
  (select count(*)::int from public.favorite_listings),
  2,
  'A user sees only their own favourites'
);

select throws_ok(
  $$ select saved_title from public.favorite_listings $$,
  '42501',
  null,
  'A user cannot read the saved snapshot directly'
);

select lives_ok(
  $$ insert into public.favorite_listings (listing_id) values ('f0000000-0000-4000-8000-000000000001') $$,
  'A user can save an approved listing'
);

select is(
  (select owner_id from public.favorite_listings where listing_id = 'f0000000-0000-4000-8000-000000000001'),
  '22222222-2222-2222-2222-222222222222'::uuid,
  'A saved favourite belongs to the user who saved it'
);

select throws_ok(
  $$ insert into public.favorite_listings (listing_id) values ('f0000000-0000-4000-8000-000000000001') $$,
  '23505',
  null,
  'A user cannot save the same listing twice'
);

select throws_ok(
  $$ insert into public.favorite_listings (listing_id) values ('f0000000-0000-4000-8000-000000000003') $$,
  '42501',
  null,
  'A user cannot save a draft'
);

select throws_ok(
  $$ insert into public.favorite_listings (listing_id) values ('f0000000-0000-4000-8000-000000000004') $$,
  '42501',
  null,
  'A user cannot save a listing waiting for approval'
);

select throws_ok(
  $$ insert into public.favorite_listings (listing_id) values ('f0000000-0000-4000-8000-000000000006') $$,
  '42501',
  null,
  'A user cannot save a revision'
);

set local request.jwt.claims = '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated", "user_roles": ["user"]}';

select throws_ok(
  $$ insert into public.favorite_listings (listing_id) values ('f0000000-0000-4000-8000-000000000005') $$,
  '42501',
  null,
  'A user cannot save a rejected listing'
);

select throws_ok(
  $$ insert into public.favorite_listings (listing_id) values ('f0000000-0000-4000-8000-000000000007') $$,
  '42501',
  null,
  'A user cannot save a blocked listing'
);

set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "user_roles": ["user"]}';

select throws_ok(
  $$ insert into public.favorite_listings (owner_id, listing_id)
     values ('33333333-3333-3333-3333-333333333333', 'f0000000-0000-4000-8000-000000000002') $$,
  '42501',
  null,
  'A user cannot save a favourite for someone else'
);

select throws_ok(
  $$ insert into public.favorite_listings (listing_id, saved_title)
     values ('f0000000-0000-4000-8000-000000000002', 'Alt titlu') $$,
  '42501',
  null,
  'A user cannot write the saved snapshot'
);

select throws_ok(
  $$ update public.favorite_listings set listing_id = 'f0000000-0000-4000-8000-000000000002' $$,
  '42501',
  null,
  'A user cannot change a favourite'
);

select results_eq(
  $$ select listing_id, is_available, title, photo_path, transaction, price, currency, rooms, area_m2,
            city, total_count
     from public.list_my_favorite_listings(24) $$,
  $$ values
       ('f0000000-0000-4000-8000-000000000001'::uuid, true, 'Aprobat'::text, 'p/1.webp'::text,
        'sale'::public.listing_transaction, 142000::numeric, 'EUR'::text, 3::smallint, 76::numeric,
        'Timișoara'::text, 3::bigint),
       ('f0000000-0000-4000-8000-000000000007'::uuid, false, null::text, null::text,
        null::public.listing_transaction, null::numeric, null::text, null::smallint, null::numeric,
        null::text, 3::bigint),
       ('f0000000-0000-4000-8000-000000000005'::uuid, false, 'Retras'::text, 'p/5.webp'::text,
        null::public.listing_transaction, null::numeric, null::text, null::smallint, null::numeric,
        null::text, 3::bigint) $$,
  'Newest first; a listing no longer public shows only what was approved when it was saved, and a blocked one nothing'
);

select results_eq(
  $$ select listing_id from public.list_my_favorite_listings(1) $$,
  $$ values ('f0000000-0000-4000-8000-000000000001'::uuid) $$,
  'The first page starts with the newest favourite'
);

select results_eq(
  $$ select listing_id, total_count
     from public.list_my_favorite_listings(
       1,
       (select created_at from public.favorite_listings where listing_id = 'f0000000-0000-4000-8000-000000000001'),
       'f0000000-0000-4000-8000-000000000001'
     ) $$,
  $$ values ('f0000000-0000-4000-8000-000000000007'::uuid, 3::bigint) $$,
  'The next page continues after the last favourite of the previous one and keeps the total'
);

select is(
  (select count(*)::int from public.list_my_favorite_listings(null)),
  3,
  'An empty limit falls back to the default page'
);

select is(
  (select count(*)::int from public.list_my_favorite_listings(0)),
  1,
  'A limit below one returns one favourite'
);

select lives_ok(
  $$ delete from public.favorite_listings where listing_id = 'f0000000-0000-4000-8000-000000000001' $$,
  'A user can remove their favourite'
);

select is(
  (select count(*)::int from public.favorite_listings),
  2,
  'The removed favourite is gone'
);

set local request.jwt.claims = '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated", "user_roles": ["user"]}';

delete from public.favorite_listings where owner_id = '22222222-2222-2222-2222-222222222222';

select is(
  (select count(*)::int from public.list_my_favorite_listings(24)),
  1,
  'Another user lists only their own favourites'
);

reset role;

select is(
  (select count(*)::int from public.favorite_listings where owner_id = '22222222-2222-2222-2222-222222222222'),
  2,
  'A user cannot remove someone else''s favourite'
);

insert into public.listings (
  id, owner_id, status, transaction, title, street_label, city, rooms, area_m2, price, currency,
  latitude, longitude, submitted_at, decided_at, published_at
)
select
  gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'approved', 'sale', 'Lot ' || n,
  'Str. Lot, ' || n, 'Timișoara', 2, 50, 90000, 'EUR', 45.75, 21.22, now(), now(), now()
from generate_series(1, 500) as n;

insert into public.favorite_listings (owner_id, listing_id)
select '22222222-2222-2222-2222-222222222222', listing.id
from public.listings as listing
where listing.title like 'Lot %'
order by listing.title
limit 498;

set local role authenticated;
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "user_roles": ["user"]}';

select throws_ok(
  $$ insert into public.favorite_listings (listing_id) values ('f0000000-0000-4000-8000-000000000002') $$,
  'P0001',
  'favorite_limit_reached',
  'A user cannot save more than 500 listings'
);

select is(
  (select max(total_count)::int from public.list_my_favorite_listings(24)),
  500,
  'The total counts every favourite'
);

select is(
  (select count(*)::int from public.list_my_favorite_listings(500)),
  100,
  'A page holds at most 100 favourites'
);

reset role;

select has_index(
  'public', 'favorite_listings', 'favorite_listings_owner_created_idx',
  array['owner_id', 'created_at', 'listing_id'],
  'The owner index covers the page order'
);

select is(
  (select pg_get_indexdef('public.favorite_listings_owner_created_idx'::regclass) like '%created_at DESC, listing_id DESC%'),
  true,
  'The owner index sorts like the page'
);

select col_not_null('public', 'favorite_listings', 'saved_title', 'The saved title is always set');

select is(
  has_column_privilege('authenticated', 'public.favorite_listings', 'saved_photo_path', 'SELECT'),
  false,
  'Signed-in users cannot read the saved photo directly'
);

select * from finish();
rollback;
