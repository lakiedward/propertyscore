begin;

create extension if not exists pgtap with schema extensions;

select plan(47);

delete from public.listings;

insert into auth.users (id, email, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', 'owner@example.test', '{"full_name": "Ioana Stan"}'),
  ('22222222-2222-2222-2222-222222222222', 'other@example.test', '{}'),
  ('33333333-3333-3333-3333-333333333333', 'admin@example.test', '{}');

insert into public.listings (
  id, owner_id, status, transaction, title, street_label, city, rooms, area_m2, price, currency,
  latitude, longitude, description, submitted_at, decided_at, published_at
)
values
  ('d0000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', 'draft', 'sale',
   'Ciornă completă', 'Str. Școlii, 1', 'Timișoara', 2, 50, 90000, 'EUR', 45.75, 21.22, 'Descriere completă.', null, null, null),
  ('d0000000-0000-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111', 'draft', 'sale',
   'Ciornă fără descriere', 'Str. Școlii, 2', 'Timișoara', 2, 50, 90000, 'EUR', 45.75, 21.22, null, null, null, null),
  ('d0000000-0000-4000-8000-000000000003', '11111111-1111-1111-1111-111111111111', 'pending_approval', 'rent',
   'În așteptare', 'Str. Școlii, 3', 'Timișoara', 1, 30, 300, 'EUR', 45.75, 21.22, 'Descriere.', now() - interval '1 hour', null, null),
  ('d0000000-0000-4000-8000-000000000004', '11111111-1111-1111-1111-111111111111', 'rejected', 'sale',
   'Respins', 'Str. Școlii, 4', 'Timișoara', 3, 70, 120000, 'EUR', 45.75, 21.22, 'Descriere.', now() - interval '2 days', now() - interval '1 day', null),
  ('d0000000-0000-4000-8000-000000000005', '11111111-1111-1111-1111-111111111111', 'blocked', 'sale',
   'Blocat', 'Str. Școlii, 5', 'Timișoara', 3, 70, 120000, 'EUR', 45.75, 21.22, 'Descriere.', now() - interval '3 days', now() - interval '2 days', null),
  ('d0000000-0000-4000-8000-000000000006', '11111111-1111-1111-1111-111111111111', 'approved', 'sale',
   'Aprobat', 'Str. Școlii, 6', 'Timișoara', 3, 70, 120000, 'EUR', 45.75, 21.22, 'Descriere.', now() - interval '4 days', now() - interval '3 days', now() - interval '3 days'),
  ('d0000000-0000-4000-8000-000000000007', '11111111-1111-1111-1111-111111111111', 'pending_approval', 'sale',
   'De blocat', 'Str. Școlii, 7', 'Timișoara', 3, 70, 120000, 'EUR', 45.75, 21.22, 'Descriere.', now() - interval '30 minutes', null, null);

insert into public.listing_photos (listing_id, owner_id, path, position)
select
  listing.id,
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111/' || listing.id || '/photo-' || photo.position || '.webp',
  photo.position
from (
  values
    ('d0000000-0000-4000-8000-000000000001'::uuid),
    ('d0000000-0000-4000-8000-000000000004'::uuid)
) as listing (id)
cross join generate_series(0, 4) as photo (position);

insert into public.listing_photos (listing_id, owner_id, path, position)
values
  ('d0000000-0000-4000-8000-000000000006', '11111111-1111-1111-1111-111111111111',
   '11111111-1111-1111-1111-111111111111/d0000000-0000-4000-8000-000000000006/cover.webp', 0);

select is(
  (select photo_path from public.listings where id = 'd0000000-0000-4000-8000-000000000001'),
  '11111111-1111-1111-1111-111111111111/d0000000-0000-4000-8000-000000000001/photo-0.webp',
  'The first photo becomes the listing cover'
);

select throws_ok(
  $$ update public.listings set status = 'approved' where id = 'd0000000-0000-4000-8000-000000000005' $$,
  'P0001',
  'listing_invalid_transition',
  'Not even the database owner can move a blocked listing to another status'
);

select throws_ok(
  $$ update public.listings set status = 'pending_approval' where id = 'd0000000-0000-4000-8000-000000000006' $$,
  'P0001',
  'listing_invalid_transition',
  'An approved listing cannot go back to review'
);

select throws_ok(
  $$
    insert into public.listing_photos (listing_id, owner_id, path, position)
    select 'd0000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111',
      '11111111-1111-1111-1111-111111111111/d0000000-0000-4000-8000-000000000001/extra-' || n || '.webp', 19
    from generate_series(1, 16) as n
  $$,
  'P0001',
  'listing_photo_limit',
  'A listing holds at most 20 photos'
);

select throws_ok(
  $$
    insert into public.listing_decisions (listing_id, decision, reasons, message)
    values ('d0000000-0000-4000-8000-000000000003', 'blocked', '{photos}', 'Motiv')
  $$,
  '23514',
  null,
  'A block uses only block reasons'
);

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated", "user_roles": ["user"]}';

select lives_ok(
  $$
    insert into public.listings (transaction, title, street_label, city, rooms, area_m2, price, currency, latitude, longitude)
    values ('sale', 'Anunț nou', 'Str. Nouă, 1', 'Timișoara', 2, 50, 1000, 'EUR', 45.7, 21.2)
  $$,
  'The owner can create a draft listing'
);

select is(
  (select status::text from public.listings where title = 'Anunț nou'),
  'draft',
  'A new listing starts as a draft'
);

select throws_ok(
  $$
    insert into public.listings (status, transaction, title, street_label, city, rooms, area_m2, price, currency, latitude, longitude)
    values ('pending_approval', 'sale', 'Direct la verificare', 'Str. A, 1', 'Timișoara', 2, 50, 1000, 'EUR', 45.7, 21.2)
  $$,
  '42501',
  null,
  'The owner cannot create a listing that skips the draft status'
);

select results_eq(
  $$
    with updated as (
      update public.listings set title = 'Ciornă editată'
      where id = 'd0000000-0000-4000-8000-000000000001'
      returning 1
    )
    select count(*)::int from updated
  $$,
  $$ values (1) $$,
  'The owner can edit a draft'
);

select results_eq(
  $$
    with updated as (
      update public.listings set price = 115000
      where id = 'd0000000-0000-4000-8000-000000000004'
      returning 1
    )
    select count(*)::int from updated
  $$,
  $$ values (1) $$,
  'The owner can edit a rejected listing'
);

select results_eq(
  $$
    with updated as (
      update public.listings set price = 1
      where id in ('d0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000006')
      returning 1
    )
    select count(*)::int from updated
  $$,
  $$ values (0) $$,
  'The owner cannot edit a pending, blocked or approved listing'
);

select throws_ok(
  $$ update public.listings set status = 'approved' where id = 'd0000000-0000-4000-8000-000000000001' $$,
  '42501',
  null,
  'The owner cannot change the status directly'
);

select throws_ok(
  $$ select public.submit_listing('d0000000-0000-4000-8000-000000000002') $$,
  'P0001',
  'listing_incomplete',
  'A listing without a description or five photos cannot be submitted'
);

select results_eq(
  $$
    select status::text, submitted_at is not null
    from public.submit_listing('d0000000-0000-4000-8000-000000000001')
  $$,
  $$ values ('pending_approval'::text, true) $$,
  'The owner submits a complete draft for review'
);

select throws_ok(
  $$ select public.submit_listing('d0000000-0000-4000-8000-000000000001') $$,
  'P0001',
  'listing_already_pending',
  'A listing already waiting for review cannot be submitted twice'
);

select throws_ok(
  $$ select public.submit_listing('d0000000-0000-4000-8000-000000000005') $$,
  'P0001',
  'listing_blocked',
  'A blocked listing cannot be resubmitted'
);

select throws_ok(
  $$ select public.submit_listing('d0000000-0000-4000-8000-000000000006') $$,
  'P0001',
  'listing_invalid_transition',
  'An approved listing cannot be submitted again'
);

select throws_ok(
  $$ select public.decide_listing('d0000000-0000-4000-8000-000000000003', 'approved', '{}', null) $$,
  '42501',
  'forbidden',
  'An owner cannot decide on a listing'
);

select throws_ok(
  $$ select * from public.listing_moderation_counts() $$,
  '42501',
  'forbidden',
  'An owner cannot read the moderation counts'
);

select throws_ok(
  $$
    insert into public.listing_decisions (listing_id, decision, reasons, message)
    values ('d0000000-0000-4000-8000-000000000003', 'approved', '{}', null)
  $$,
  '42501',
  null,
  'An owner cannot write a decision'
);

select throws_ok(
  $$
    insert into public.listing_photos (listing_id, path, position)
    values ('d0000000-0000-4000-8000-000000000005', '11111111-1111-1111-1111-111111111111/d0000000-0000-4000-8000-000000000005/x.webp', 0)
  $$,
  '42501',
  null,
  'The owner cannot add a photo to a blocked listing'
);

select lives_ok(
  $$
    insert into public.listing_photos (listing_id, path, position)
    values ('d0000000-0000-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111/d0000000-0000-4000-8000-000000000002/a.webp', 0)
  $$,
  'The owner can add a photo to a draft'
);

select lives_ok(
  $$ insert into storage.objects (bucket_id, name) values ('listing-photos', '11111111-1111-1111-1111-111111111111/d0000000-0000-4000-8000-000000000002/a.webp') $$,
  'The owner can upload a photo file to a draft'
);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('listing-photos', '11111111-1111-1111-1111-111111111111/d0000000-0000-4000-8000-000000000005/a.webp') $$,
  '42501',
  null,
  'The owner cannot upload a photo file to a blocked listing'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated", "user_roles": ["admin"]}';

select results_eq(
  $$
    select id from public.listings
    where owner_id = '11111111-1111-1111-1111-111111111111'
    order by id
  $$,
  $$
    values
      ('d0000000-0000-4000-8000-000000000001'::uuid),
      ('d0000000-0000-4000-8000-000000000003'::uuid),
      ('d0000000-0000-4000-8000-000000000004'::uuid),
      ('d0000000-0000-4000-8000-000000000005'::uuid),
      ('d0000000-0000-4000-8000-000000000006'::uuid),
      ('d0000000-0000-4000-8000-000000000007'::uuid)
  $$,
  'An admin reads submitted listings but not drafts'
);

select is(
  (select full_name from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'Ioana Stan',
  'An admin reads the owner''s name'
);

select results_eq(
  $$ select status::text, total from public.listing_moderation_counts() $$,
  $$ values ('pending_approval'::text, 3), ('approved'::text, 1), ('rejected'::text, 1), ('blocked'::text, 1) $$,
  'An admin reads the count of listings in each moderation status'
);

select throws_ok(
  $$ select public.decide_listing('d0000000-0000-4000-8000-000000000003', 'rejected', '{}', 'Mesaj') $$,
  'P0001',
  'decision_reason_invalid',
  'A rejection needs at least one reason'
);

select throws_ok(
  $$ select public.decide_listing('d0000000-0000-4000-8000-000000000003', 'rejected', '{duplicate}', 'Mesaj') $$,
  'P0001',
  'decision_reason_invalid',
  'A rejection uses only rejection reasons'
);

select throws_ok(
  $$ select public.decide_listing('d0000000-0000-4000-8000-000000000003', 'rejected', '{photos}', '   ') $$,
  'P0001',
  'decision_message_required',
  'A rejection needs a message for the owner'
);

select throws_ok(
  $$ select public.decide_listing('d0000000-0000-4000-8000-000000000003', 'approved', '{photos}', null) $$,
  'P0001',
  'decision_reason_invalid',
  'An approval has no reasons'
);

select results_eq(
  $$
    select decision::text, reasons::text, message, decided_by
    from public.decide_listing('d0000000-0000-4000-8000-000000000003', 'rejected', '{photos,photos,description}', '  Adaugă fotografii.  ')
  $$,
  $$ values ('rejected'::text, '{photos,description}'::text, 'Adaugă fotografii.'::text, '33333333-3333-3333-3333-333333333333'::uuid) $$,
  'An admin rejects a listing with its reasons and message'
);

select is(
  (select status::text from public.listings where id = 'd0000000-0000-4000-8000-000000000003'),
  'rejected',
  'The rejected listing changes status'
);

select throws_ok(
  $$ select public.decide_listing('d0000000-0000-4000-8000-000000000003', 'approved', '{}', null) $$,
  'P0001',
  'listing_not_pending',
  'A listing that was already decided cannot be decided again'
);

select results_eq(
  $$ select decision::text, reasons::text, message from public.decide_listing('d0000000-0000-4000-8000-000000000001', 'approved', '{}', null) $$,
  $$ values ('approved'::text, '{}'::text, null::text) $$,
  'An admin approves a listing'
);

select results_eq(
  $$
    select listings.status::text, listings.published_at = decisions.created_at
    from public.listings
    join public.listing_decisions as decisions on decisions.listing_id = listings.id
    where listings.id = 'd0000000-0000-4000-8000-000000000001'
  $$,
  $$ values ('approved'::text, true) $$,
  'The approved listing is published at the decision time'
);

select results_eq(
  $$
    select decision::text
    from public.decide_listing('d0000000-0000-4000-8000-000000000007', 'blocked', '{duplicate}', 'Anunț duplicat.')
  $$,
  $$ values ('blocked'::text) $$,
  'An admin blocks a listing'
);

select results_eq(
  $$
    with updated as (
      update public.listings set price = 1
      where id = 'd0000000-0000-4000-8000-000000000006'
      returning 1
    )
    select count(*)::int from updated
  $$,
  $$ values (0) $$,
  'An admin cannot edit a listing directly'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated", "user_roles": ["user"]}';

select results_eq(
  $$
    select decision::text, message
    from public.listing_decisions
    where listing_id = 'd0000000-0000-4000-8000-000000000003'
  $$,
  $$ values ('rejected'::text, 'Adaugă fotografii.'::text) $$,
  'The owner reads the admin''s decision and message'
);

select results_eq(
  $$ select id, status::text from public.submit_listing('d0000000-0000-4000-8000-000000000004') $$,
  $$ values ('d0000000-0000-4000-8000-000000000004'::uuid, 'pending_approval'::text) $$,
  'The owner resubmits a rejected listing and it keeps its identity'
);

select results_eq(
  $$
    with updated as (
      update public.listings set price = 1
      where id = 'd0000000-0000-4000-8000-000000000007'
      returning 1
    )
    select count(*)::int from updated
  $$,
  $$ values (0) $$,
  'The owner cannot edit a listing once it is blocked'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "user_roles": ["user"]}';

select is(
  (select count(*)::int from public.listing_decisions where listing_id = 'd0000000-0000-4000-8000-000000000003'),
  0,
  'Another user cannot read the decisions on someone else''s listing'
);

select throws_ok(
  $$ select public.submit_listing('d0000000-0000-4000-8000-000000000002') $$,
  'P0001',
  'listing_not_found',
  'Another user cannot submit someone else''s listing'
);

select is(
  (select count(*)::int from public.listings where id in ('d0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000005')),
  0,
  'Another user cannot read someone else''s rejected or blocked listing'
);

reset role;
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select throws_ok(
  $$ select public.submit_listing('d0000000-0000-4000-8000-000000000002') $$,
  '42501',
  null,
  'A visitor cannot submit a listing'
);

select throws_ok(
  $$ select count(*) from public.listing_decisions $$,
  '42501',
  null,
  'A visitor cannot read decisions'
);

select results_eq(
  $$
    select listing_id, count(*)::int
    from public.listing_photos
    where listing_id in ('d0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000006')
    group by listing_id
  $$,
  $$ values ('d0000000-0000-4000-8000-000000000006'::uuid, 1) $$,
  'A visitor reads the photos of approved listings only'
);

select * from finish();
rollback;
