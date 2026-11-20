begin;

create extension if not exists pgtap with schema extensions;

select plan(20);

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
  ('f0000000-0000-4000-8000-000000000005', '11111111-1111-1111-1111-111111111111', 'rejected', 'sale',
   'Retras', 'Str. Școlii, 5', 'Timișoara', 2, 50, 90000, 'EUR', 45.75, 21.22, 'p/5.webp', now(), now(), null);

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
  ('22222222-2222-2222-2222-222222222222', 'f0000000-0000-4000-8000-000000000005', now() - interval '2 hours'),
  ('33333333-3333-3333-3333-333333333333', 'f0000000-0000-4000-8000-000000000001', now() - interval '1 hour');

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
  $$ select * from public.list_my_favorite_listings(24, 0) $$,
  '42501',
  null,
  'Visitors cannot list favourites'
);

set local role authenticated;
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "user_roles": ["user"]}';

select is(
  (select count(*)::int from public.favorite_listings),
  1,
  'A user sees only their own favourites'
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

select throws_ok(
  $$ insert into public.favorite_listings (owner_id, listing_id)
     values ('33333333-3333-3333-3333-333333333333', 'f0000000-0000-4000-8000-000000000002') $$,
  '42501',
  null,
  'A user cannot save a favourite for someone else'
);

select throws_ok(
  $$ update public.favorite_listings set listing_id = 'f0000000-0000-4000-8000-000000000002' $$,
  '42501',
  null,
  'A user cannot change a favourite'
);

select is(
  (select count(*)::int from public.list_my_favorite_listings(24, 0)),
  2,
  'The list holds the user''s favourites, available or not'
);

select results_eq(
  $$ select listing_id, is_available, title, photo_path, price, city, rooms, total_count
     from public.list_my_favorite_listings(24, 0) $$,
  $$ values
       ('f0000000-0000-4000-8000-000000000001'::uuid, true, 'Aprobat'::text, 'p/1.webp'::text,
        142000::numeric, 'Timișoara'::text, 3::smallint, 2::bigint),
       ('f0000000-0000-4000-8000-000000000005'::uuid, false, 'Retras'::text, 'p/5.webp'::text,
        null::numeric, null::text, null::smallint, 2::bigint) $$,
  'Newest first; a listing no longer public shows only its title and photo'
);

select is(
  (select count(*)::int from public.list_my_favorite_listings(1, 1)),
  1,
  'The list pages with limit and offset'
);

select lives_ok(
  $$ delete from public.favorite_listings where listing_id = 'f0000000-0000-4000-8000-000000000001' $$,
  'A user can remove their favourite'
);

select is(
  (select count(*)::int from public.favorite_listings),
  1,
  'The removed favourite is gone'
);

set local request.jwt.claims = '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated", "user_roles": ["user"]}';

delete from public.favorite_listings where owner_id = '22222222-2222-2222-2222-222222222222';

reset role;

select is(
  (select count(*)::int from public.favorite_listings where owner_id = '22222222-2222-2222-2222-222222222222'),
  1,
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
limit 499;

set local role authenticated;
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "user_roles": ["user"]}';

select throws_ok(
  $$ insert into public.favorite_listings (listing_id) values ('f0000000-0000-4000-8000-000000000002') $$,
  'P0001',
  'favorite_limit_reached',
  'A user cannot save more than 500 listings'
);

select is(
  (select max(total_count)::int from public.list_my_favorite_listings(500, 0)),
  500,
  'The total counts every favourite'
);

select * from finish();
rollback;
