begin;

create extension if not exists pgtap with schema extensions;

select plan(33);

delete from public.listings;

insert into auth.users (id, email, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', 'owner@example.test', '{}'),
  ('22222222-2222-2222-2222-222222222222', 'other@example.test', '{}'),
  ('33333333-3333-3333-3333-333333333333', 'admin@example.test', '{}');

insert into public.listings (
  id, owner_id, status, transaction, title, street_label, city, rooms, area_m2, price, currency,
  latitude, longitude, description, floor, submitted_at, decided_at, published_at
)
values
  ('e0000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', 'draft', 'sale',
   'Ciornă', 'Str. Școlii, 1', 'Timișoara', 2, 50, 90000, 'EUR', 45.75, 21.22, 'Descriere.', 2, null, null, null),
  ('e0000000-0000-4000-8000-000000000003', '11111111-1111-1111-1111-111111111111', 'pending_approval', 'sale',
   'În așteptare', 'Str. Școlii, 3', 'Timișoara', 2, 50, 90000, 'EUR', 45.75, 21.22, 'Descriere.', 2, now(), null, null),
  ('e0000000-0000-4000-8000-000000000005', '11111111-1111-1111-1111-111111111111', 'blocked', 'sale',
   'Blocat', 'Str. Școlii, 5', 'Timișoara', 2, 50, 90000, 'EUR', 45.75, 21.22, 'Descriere.', 2, now(), now(), null),
  ('e0000000-0000-4000-8000-000000000006', '11111111-1111-1111-1111-111111111111', 'approved', 'sale',
   'Aprobat', 'Str. Școlii, 6', 'Timișoara', 2, 50, 90000, 'EUR', 45.75, 21.22, 'Descriere.', 2, now(), now(), now());

insert into public.listing_photos (listing_id, owner_id, path, position)
select
  listing.id,
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111/' || listing.id || '/photo-' || photo.position || '.webp',
  photo.position
from (
  values
    ('e0000000-0000-4000-8000-000000000001'::uuid),
    ('e0000000-0000-4000-8000-000000000003'::uuid),
    ('e0000000-0000-4000-8000-000000000005'::uuid),
    ('e0000000-0000-4000-8000-000000000006'::uuid)
) as listing (id)
cross join generate_series(0, 4) as photo (position);

insert into storage.objects (bucket_id, name, owner_id)
values (
  'listing-photos',
  '11111111-1111-1111-1111-111111111111/e0000000-0000-4000-8000-000000000001/photo-4.webp',
  '11111111-1111-1111-1111-111111111111'
);

set local storage.allow_delete_query = 'true';

set local role authenticated;
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "user_roles": ["user"]}';

select is(
  (select count(*)::int from public.listing_photos where listing_id = 'e0000000-0000-4000-8000-000000000001'),
  0,
  'Another user cannot see the photos of a draft'
);

select throws_ok(
  $$
    insert into public.listing_photos (listing_id, owner_id, path, position)
    values ('e0000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111',
      '11111111-1111-1111-1111-111111111111/e0000000-0000-4000-8000-000000000001/intrus.webp', 5)
  $$,
  '42501',
  null,
  'Another user cannot add a photo to someone else''s draft'
);

select results_eq(
  $$
    with updated as (
      update public.listing_photos set position = 9
      where listing_id = 'e0000000-0000-4000-8000-000000000001'
      returning 1
    )
    select count(*)::int from updated
  $$,
  $$ values (0) $$,
  'Another user cannot reorder the photos of someone else''s draft'
);

select results_eq(
  $$
    with deleted as (
      delete from public.listing_photos
      where listing_id = 'e0000000-0000-4000-8000-000000000001'
      returning 1
    )
    select count(*)::int from deleted
  $$,
  $$ values (0) $$,
  'Another user cannot remove the photos of someone else''s draft'
);

select throws_ok(
  $$
    insert into storage.objects (bucket_id, name)
    values ('listing-photos', '11111111-1111-1111-1111-111111111111/e0000000-0000-4000-8000-000000000001/intrus.webp')
  $$,
  '42501',
  null,
  'Another user cannot upload a file into someone else''s draft folder'
);

select throws_ok(
  $$ select public.discard_listing_revision('e0000000-0000-4000-8000-000000000001') $$,
  'P0001',
  'listing_not_found',
  'Another user cannot discard someone else''s listing'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated", "user_roles": ["user"]}';

select results_eq(
  $$
    with updated as (
      update public.listing_photos set position = 9
      where listing_id = 'e0000000-0000-4000-8000-000000000001' and position = 4
      returning 1
    )
    select count(*)::int from updated
  $$,
  $$ values (1) $$,
  'The owner reorders a photo of their draft'
);

select is(
  (
    select count(*)::int from storage.objects
    where bucket_id = 'listing-photos'
      and name = '11111111-1111-1111-1111-111111111111/e0000000-0000-4000-8000-000000000001/photo-4.webp'
  ),
  1,
  'The owner reads the photo files of their draft'
);

select results_eq(
  $$
    with updated as (
      update storage.objects set metadata = '{"checked": true}'
      where bucket_id = 'listing-photos'
        and name = '11111111-1111-1111-1111-111111111111/e0000000-0000-4000-8000-000000000001/photo-4.webp'
      returning 1
    )
    select count(*)::int from updated
  $$,
  $$ values (1) $$,
  'The owner replaces a photo file of their draft'
);

select results_eq(
  $$
    with deleted as (
      delete from storage.objects
      where bucket_id = 'listing-photos'
        and name = '11111111-1111-1111-1111-111111111111/e0000000-0000-4000-8000-000000000001/photo-4.webp'
      returning 1
    )
    select count(*)::int from deleted
  $$,
  $$ values (1) $$,
  'The owner deletes a photo file of their draft'
);

select results_eq(
  $$
    with deleted as (
      delete from public.listing_photos
      where listing_id = 'e0000000-0000-4000-8000-000000000001' and position = 0
      returning 1
    )
    select count(*)::int from deleted
  $$,
  $$ values (1) $$,
  'The owner removes a photo of their draft'
);

select is(
  (select photo_path from public.listings where id = 'e0000000-0000-4000-8000-000000000001'),
  '11111111-1111-1111-1111-111111111111/e0000000-0000-4000-8000-000000000001/photo-1.webp',
  'Removing the cover makes the next photo the cover'
);

select results_eq(
  $$ select position::int from public.listing_photos where listing_id = 'e0000000-0000-4000-8000-000000000001' order by position $$,
  $$ values (0), (1), (2), (3) $$,
  'The remaining photos close the gap left by the removed one'
);

delete from public.listing_photos where listing_id = 'e0000000-0000-4000-8000-000000000001';

select is(
  (select photo_path from public.listings where id = 'e0000000-0000-4000-8000-000000000001'),
  null,
  'A listing without photos has no cover'
);

select throws_ok(
  $$
    insert into public.listing_photos (listing_id, path, position)
    values ('e0000000-0000-4000-8000-000000000001',
      '11111111-1111-1111-1111-111111111111/e0000000-0000-4000-8000-000000000006/photo-0.webp', 0)
  $$,
  'P0001',
  'listing_photo_path_invalid',
  'A photo must sit in the folder of its own listing'
);

select throws_ok(
  $$
    insert into public.listing_photos (listing_id, path, position)
    values ('e0000000-0000-4000-8000-000000000001',
      '11111111-1111-1111-1111-111111111111/e0000000-0000-4000-8000-000000000001/../x.webp', 0)
  $$,
  'P0001',
  'listing_photo_path_invalid',
  'A photo path cannot climb out of its folder'
);

select results_eq(
  $$
    with updated as (
      update public.listing_photos set position = 9
      where listing_id = 'e0000000-0000-4000-8000-000000000005'
      returning 1
    )
    select count(*)::int from updated
  $$,
  $$ values (0) $$,
  'The owner cannot reorder the photos of a blocked listing'
);

select results_eq(
  $$
    with deleted as (
      delete from public.listing_photos
      where listing_id = 'e0000000-0000-4000-8000-000000000005'
      returning 1
    )
    select count(*)::int from deleted
  $$,
  $$ values (0) $$,
  'The owner cannot remove the photos of a blocked listing'
);

select throws_ok(
  $$ select public.discard_listing_revision('e0000000-0000-4000-8000-000000000001') $$,
  'P0001',
  'listing_not_found',
  'Discarding is only for a revision'
);

select lives_ok(
  $$ select public.start_listing_revision('e0000000-0000-4000-8000-000000000006') $$,
  'The owner starts changes to the published listing'
);

select lives_ok(
  $$ select public.submit_listing(id) from public.listings where revision_of = 'e0000000-0000-4000-8000-000000000006' $$,
  'The owner sends the changes for review'
);

reset role;
select set_config(
  'test.revision_id',
  (select id::text from public.listings where revision_of = 'e0000000-0000-4000-8000-000000000006'),
  true
);
set local role authenticated;
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "user_roles": ["user"]}';

select throws_ok(
  $$ select public.discard_listing_revision(current_setting('test.revision_id')::uuid) $$,
  'P0001',
  'listing_not_found',
  'Another user cannot discard the owner''s changes'
);

reset role;

select is(
  (select count(*)::int from public.listings where revision_of = 'e0000000-0000-4000-8000-000000000006'),
  1,
  'The owner''s changes are still there'
);

set local role authenticated;
set local request.jwt.claims = '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated", "user_roles": ["admin"]}';

select is(
  (select count(*)::int from public.listing_photos where listing_id = 'e0000000-0000-4000-8000-000000000003'),
  5,
  'An admin reads the photos of a listing in review'
);

select throws_ok(
  $$ select public.decide_listing('e0000000-0000-4000-8000-000000000003', 'rejected', array['photos']::public.listing_decision_reason[], repeat('a', 2001)) $$,
  'P0001',
  'decision_message_too_long',
  'A message to the owner is at most 2000 characters'
);

select results_eq(
  $$ select status::text, total from public.listing_moderation_counts() $$,
  $$ values ('pending_approval'::text, 2), ('approved'::text, 1), ('rejected'::text, 0), ('blocked'::text, 1) $$,
  'An admin counts the listings of every moderation status'
);

select lives_ok(
  $$
    select public.decide_listing(id, 'rejected', array['photos']::public.listing_decision_reason[], 'Fotografiile nu arată locuința.')
    from public.listings where revision_of = 'e0000000-0000-4000-8000-000000000006'
  $$,
  'The admin rejects the changes'
);

reset role;
update public.listings
set status = 'pending_approval', submitted_at = now()
where revision_of = 'e0000000-0000-4000-8000-000000000006';
set local role authenticated;
set local request.jwt.claims = '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated", "user_roles": ["admin"]}';

select lives_ok(
  $$
    select public.decide_listing(id, 'approved', '{}', null)
    from public.listings where revision_of = 'e0000000-0000-4000-8000-000000000006'
  $$,
  'The admin approves the corrected changes'
);

select results_eq(
  $$
    select decision::text from public.listing_decisions
    where listing_id = 'e0000000-0000-4000-8000-000000000006'
    order by decision::text
  $$,
  $$ values ('approved'::text), ('rejected'::text) $$,
  'The rejection of the changes stays in the history of the published listing'
);

reset role;
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select throws_ok(
  $$ select public.decide_listing('e0000000-0000-4000-8000-000000000003', 'approved', '{}', null) $$,
  '42501',
  null,
  'A visitor cannot decide a listing'
);

select throws_ok(
  $$ select * from public.listing_moderation_counts() $$,
  '42501',
  null,
  'A visitor cannot count the moderation queue'
);

select throws_ok(
  $$ select public.start_listing_revision('e0000000-0000-4000-8000-000000000006') $$,
  '42501',
  null,
  'A visitor cannot start changes to a listing'
);

select throws_ok(
  $$ select public.discard_listing_revision('e0000000-0000-4000-8000-000000000006') $$,
  '42501',
  null,
  'A visitor cannot discard changes'
);

select * from finish();
rollback;
