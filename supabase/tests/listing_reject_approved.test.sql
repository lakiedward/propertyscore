begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

delete from public.listings;

insert into auth.users (id, email, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', 'owner@example.test', '{}'),
  ('33333333-3333-3333-3333-333333333333', 'admin@example.test', '{}');

insert into public.listings (
  id, owner_id, status, transaction, title, street_label, city, rooms, area_m2, price, currency,
  latitude, longitude, description, floor, submitted_at, decided_at, published_at
)
values
  ('a0000000-0000-4000-8000-0000000000a1', '11111111-1111-1111-1111-111111111111', 'approved', 'sale',
   'Publicat', 'Str. Școlii, 1', 'Timișoara', 2, 50, 90000, 'EUR', 45.75, 21.22, 'Descriere.', 2,
   now() - interval '3 days', now() - interval '2 days', now() - interval '2 days');

insert into public.listing_photos (listing_id, owner_id, path, position)
select
  'a0000000-0000-4000-8000-0000000000a1',
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111/a0000000-0000-4000-8000-0000000000a1/photo-' || position || '.webp',
  position
from generate_series(0, 4) as position;

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated", "user_roles": ["user"]}';

select lives_ok(
  $$ select public.start_listing_revision('a0000000-0000-4000-8000-0000000000a1') $$,
  'The owner starts changes to the published listing'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated", "user_roles": ["admin"]}';

select throws_ok(
  $$ select public.decide_listing('a0000000-0000-4000-8000-0000000000a1', 'approved', '{}', null) $$,
  'P0001',
  'listing_not_pending',
  'A published listing cannot be approved again'
);

select throws_ok(
  $$ select public.decide_listing('a0000000-0000-4000-8000-0000000000a1', 'rejected', '{}', 'Motiv.') $$,
  'P0001',
  'decision_reason_invalid',
  'Rejecting a published listing still needs a reason'
);

select lives_ok(
  $$
    select public.decide_listing(
      'a0000000-0000-4000-8000-0000000000a1',
      'rejected',
      array['photos']::public.listing_decision_reason[],
      'Fotografiile nu arată locuința.'
    )
  $$,
  'The admin rejects a published listing with a reason'
);

select results_eq(
  $$ select status::text from public.listings where id = 'a0000000-0000-4000-8000-0000000000a1' $$,
  $$ values ('rejected'::text) $$,
  'The listing goes back to the owner as rejected'
);

select is(
  (select count(*)::integer from public.listings where revision_of = 'a0000000-0000-4000-8000-0000000000a1'),
  0,
  'The owner''s open changes are dropped with it'
);

reset role;
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select is(
  (select count(*)::integer from public.listings where id = 'a0000000-0000-4000-8000-0000000000a1'),
  0,
  'Visitors no longer see the listing'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated", "user_roles": ["user"]}';

select results_eq(
  $$
    select decision::text, message
    from public.listing_decisions
    where listing_id = 'a0000000-0000-4000-8000-0000000000a1'
    order by created_at desc
    limit 1
  $$,
  $$ values ('rejected'::text, 'Fotografiile nu arată locuința.'::text) $$,
  'The owner reads the reason'
);

select * from finish();
rollback;
