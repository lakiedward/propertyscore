begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

delete from public.listings;

insert into auth.users (id, email, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', 'owner@example.test', '{}'),
  ('22222222-2222-2222-2222-222222222222', 'other@example.test', '{}');

insert into public.listings (
  id, owner_id, status, transaction, title, street_label, city, rooms, area_m2, price, currency,
  latitude, longitude, description, floor, submitted_at, decided_at, published_at
)
values
  ('f0000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', 'draft', 'sale',
   'Ciornă', 'Str. Școlii, 1', 'Timișoara', 2, 50, 90000, 'EUR', 45.75, 21.22, 'Descriere.', 2,
   null, null, null),
  ('f0000000-0000-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111', 'approved', 'sale',
   'Aprobat', 'Str. Școlii, 2', 'Timișoara', 2, 50, 90000, 'EUR', 45.75, 21.22, 'Descriere.', 2,
   now() - interval '2 days', now() - interval '1 day', now() - interval '1 day');

insert into public.listing_photos (id, listing_id, owner_id, path, position)
values
  ('a1000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001',
   '11111111-1111-1111-1111-111111111111',
   '11111111-1111-1111-1111-111111111111/f0000000-0000-4000-8000-000000000001/one.webp', 0),
  ('a1000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000001',
   '11111111-1111-1111-1111-111111111111',
   '11111111-1111-1111-1111-111111111111/f0000000-0000-4000-8000-000000000001/two.webp', 1),
  ('a1000000-0000-4000-8000-000000000003', 'f0000000-0000-4000-8000-000000000001',
   '11111111-1111-1111-1111-111111111111',
   '11111111-1111-1111-1111-111111111111/f0000000-0000-4000-8000-000000000001/three.webp', 2),
  ('a2000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000002',
   '11111111-1111-1111-1111-111111111111',
   '11111111-1111-1111-1111-111111111111/f0000000-0000-4000-8000-000000000002/one.webp', 0);

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated", "user_roles": ["user"]}';

select lives_ok(
  $$
    select public.reorder_listing_photos(
      'f0000000-0000-4000-8000-000000000001',
      array[
        'a1000000-0000-4000-8000-000000000003',
        'a1000000-0000-4000-8000-000000000001',
        'a1000000-0000-4000-8000-000000000002'
      ]::uuid[]
    )
  $$,
  'The owner reorders the photos of a draft'
);

select results_eq(
  $$
    select id from public.listing_photos
    where listing_id = 'f0000000-0000-4000-8000-000000000001'
    order by position
  $$,
  $$
    values
      ('a1000000-0000-4000-8000-000000000003'::uuid),
      ('a1000000-0000-4000-8000-000000000001'::uuid),
      ('a1000000-0000-4000-8000-000000000002'::uuid)
  $$,
  'The photos take the order they were sent in'
);

select is(
  (select photo_path from public.listings where id = 'f0000000-0000-4000-8000-000000000001'),
  '11111111-1111-1111-1111-111111111111/f0000000-0000-4000-8000-000000000001/three.webp',
  'The first photo becomes the cover'
);

select throws_ok(
  $$
    select public.reorder_listing_photos(
      'f0000000-0000-4000-8000-000000000001',
      array['a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000002']::uuid[]
    )
  $$,
  'P0001',
  'listing_photos_changed',
  'An order that leaves out a photo is refused'
);

select throws_ok(
  $$
    select public.reorder_listing_photos(
      'f0000000-0000-4000-8000-000000000001',
      array[
        'a1000000-0000-4000-8000-000000000001',
        'a1000000-0000-4000-8000-000000000001',
        'a1000000-0000-4000-8000-000000000002'
      ]::uuid[]
    )
  $$,
  'P0001',
  'listing_photos_changed',
  'An order that repeats a photo is refused'
);

select throws_ok(
  $$
    select public.reorder_listing_photos(
      'f0000000-0000-4000-8000-000000000001',
      array[
        'a1000000-0000-4000-8000-000000000003',
        'a1000000-0000-4000-8000-000000000001',
        'a2000000-0000-4000-8000-000000000001'
      ]::uuid[]
    )
  $$,
  'P0001',
  'listing_photos_changed',
  'An order with a photo of another listing is refused'
);

select throws_ok(
  $$
    select public.reorder_listing_photos(
      'f0000000-0000-4000-8000-000000000002',
      array['a2000000-0000-4000-8000-000000000001']::uuid[]
    )
  $$,
  'P0001',
  'listing_invalid_transition',
  'The photos of an approved listing keep their order'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "user_roles": ["user"]}';

select throws_ok(
  $$
    select public.reorder_listing_photos(
      'f0000000-0000-4000-8000-000000000001',
      array[
        'a1000000-0000-4000-8000-000000000001',
        'a1000000-0000-4000-8000-000000000002',
        'a1000000-0000-4000-8000-000000000003'
      ]::uuid[]
    )
  $$,
  'P0001',
  'listing_not_found',
  'Another user cannot reorder the photos'
);

reset role;
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select throws_ok(
  $$
    select public.reorder_listing_photos(
      'f0000000-0000-4000-8000-000000000001',
      array['a1000000-0000-4000-8000-000000000001']::uuid[]
    )
  $$,
  '42501',
  null,
  'Visitors cannot call the function'
);

select * from finish();
rollback;
