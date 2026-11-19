begin;

create extension if not exists pgtap with schema extensions;

select plan(22);

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
  ('c0000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', 'approved', 'sale',
   'Titlul aprobat', 'Str. Școlii, 1', 'Timișoara', 2, 50, 90000, 'EUR', 45.75, 21.22, 'Descriere.', 2,
   now() - interval '3 days', now() - interval '2 days', now() - interval '2 days'),
  ('c0000000-0000-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111', 'draft', 'sale',
   'Ciornă', 'Str. Școlii, 2', 'Timișoara', 2, 50, 90000, 'EUR', 45.75, 21.22, 'Descriere.', 2,
   null, null, null);

insert into public.listing_photos (listing_id, owner_id, path, position)
select
  'c0000000-0000-4000-8000-000000000001',
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111/c0000000-0000-4000-8000-000000000001/photo-' || position || '.webp',
  position
from generate_series(0, 5) as position;

create temporary table revision (id uuid) on commit drop;
grant all on revision to authenticated;

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated", "user_roles": ["user"]}';

insert into revision select public.start_listing_revision('c0000000-0000-4000-8000-000000000001');

select results_eq(
  $$ select status::text, title, revision_of from public.listings where id = (select id from revision) $$,
  $$ values ('draft'::text, 'Titlul aprobat'::text, 'c0000000-0000-4000-8000-000000000001'::uuid) $$,
  'Editing an approved listing opens a draft copy of it'
);

select is(
  (select count(*)::integer from public.listing_photos where listing_id = (select id from revision)),
  6,
  'The copy starts with the photos of the approved listing'
);

select is(
  public.start_listing_revision('c0000000-0000-4000-8000-000000000001'),
  (select id from revision),
  'Editing again returns the same copy'
);

select throws_ok(
  $$ select public.start_listing_revision('c0000000-0000-4000-8000-000000000002') $$,
  'P0001',
  'listing_invalid_transition',
  'A draft is edited directly, without a copy'
);

update public.listings set title = 'Titlul nou' where id = (select id from revision);
delete from public.listing_photos
where listing_id = (select id from revision)
  and path like '%/photo-5.webp';

select is(
  (select title from public.listings where id = 'c0000000-0000-4000-8000-000000000001'),
  'Titlul aprobat',
  'The approved listing keeps its content while the copy changes'
);

select lives_ok(
  $$ select public.submit_listing((select id from revision)) $$,
  'The owner sends the changes for review'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "user_roles": ["user"]}';

select throws_ok(
  $$ select public.start_listing_revision('c0000000-0000-4000-8000-000000000001') $$,
  'P0001',
  'listing_not_found',
  'Another user cannot edit the listing'
);

reset role;
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select results_eq(
  $$ select title from public.listings where id = 'c0000000-0000-4000-8000-000000000001' or revision_of is not null $$,
  $$ values ('Titlul aprobat'::text) $$,
  'Visitors see only the approved version while the changes wait'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated", "user_roles": ["admin"]}';

select lives_ok(
  $$ select public.decide_listing((select id from revision), 'approved', '{}', null) $$,
  'The admin approves the changes'
);

select results_eq(
  $$ select title, status::text from public.listings where id = 'c0000000-0000-4000-8000-000000000001' $$,
  $$ values ('Titlul nou'::text, 'approved'::text) $$,
  'The approved changes replace the public listing, which stays approved'
);

select is(
  (select count(*)::integer from public.listing_photos where listing_id = 'c0000000-0000-4000-8000-000000000001'),
  5,
  'The public listing takes the photos of the approved copy'
);

select is(
  (select count(*)::integer from public.listings where revision_of = 'c0000000-0000-4000-8000-000000000001'),
  0,
  'The copy is gone once its changes are approved'
);

select is(
  (select decision::text from public.listing_decisions where listing_id = 'c0000000-0000-4000-8000-000000000001' order by created_at desc limit 1),
  'approved',
  'The decision is kept on the public listing'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated", "user_roles": ["user"]}';

delete from revision;
insert into revision select public.start_listing_revision('c0000000-0000-4000-8000-000000000001');
update public.listings set price = 1 where id = (select id from revision);
select lives_ok(
  $$ select public.submit_listing((select id from revision)) $$,
  'The owner sends a lower price for review'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated", "user_roles": ["admin"]}';

select lives_ok(
  $$ select public.decide_listing((select id from revision), 'rejected', array['price_area']::public.listing_decision_reason[], 'Prețul pare greșit.') $$,
  'The admin rejects the new price'
);

select results_eq(
  $$
    select
      (select status::text from public.listings where id = (select id from revision)),
      (select price from public.listings where id = 'c0000000-0000-4000-8000-000000000001')
  $$,
  $$ values ('rejected'::text, 90000.00::numeric(12, 2)) $$,
  'Rejected changes stay on the copy and the public listing keeps its price'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated", "user_roles": ["user"]}';

select lives_ok(
  $$ select public.discard_listing_revision((select id from revision)) $$,
  'The owner drops the rejected changes'
);

select is(
  (select count(*)::integer from public.listings where revision_of = 'c0000000-0000-4000-8000-000000000001'),
  0,
  'Dropping the changes removes only the copy'
);

delete from revision;
insert into revision select public.start_listing_revision('c0000000-0000-4000-8000-000000000001');
select lives_ok(
  $$ select public.submit_listing((select id from revision)) $$,
  'The owner sends another round of changes'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated", "user_roles": ["admin"]}';

select lives_ok(
  $$ select public.decide_listing((select id from revision), 'blocked', array['rules']::public.listing_decision_reason[], 'Anunțul încalcă regulile.') $$,
  'The admin blocks the changes'
);

select is(
  (select status::text from public.listings where id = 'c0000000-0000-4000-8000-000000000001'),
  'blocked',
  'Blocking the changes takes the public listing offline'
);

reset role;

select throws_ok(
  $$
    insert into public.listings (
      owner_id, status, revision_of, transaction, title, street_label, city, rooms, area_m2, price,
      currency, latitude, longitude, floor, published_at
    )
    values (
      '11111111-1111-1111-1111-111111111111', 'approved', 'c0000000-0000-4000-8000-000000000002',
      'sale', 'Copie', 'Str. Școlii, 9', 'Timișoara', 2, 50, 90000, 'EUR', 45.75, 21.22, 2, now()
    )
  $$,
  '23514',
  null,
  'A copy can never be public itself'
);

select * from finish();
rollback;
