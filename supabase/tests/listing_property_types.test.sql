begin;

create extension if not exists pgtap with schema extensions;

select plan(14);

delete from public.listings;

insert into auth.users (id, email, raw_user_meta_data)
values ('11111111-1111-1111-1111-111111111111', 'owner@example.test', '{"full_name": "Ioana Stan"}');

insert into public.listings (
  id, owner_id, status, transaction, property_type, title, street_label, city, rooms, area_m2,
  price, currency, latitude, longitude, description, floor, house_type, land_area_m2, published_at
)
values
  ('e0000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', 'draft', 'sale',
   'apartment', 'Apartament fără etaj', 'Str. Școlii, 1', 'Timișoara', 2, 50, 90000, 'EUR',
   45.75, 21.22, 'Descriere.', null, null, null, null),
  ('e0000000-0000-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111', 'draft', 'sale',
   'house', 'Casă fără teren', 'Str. Școlii, 2', 'Timișoara', 4, 120, 190000, 'EUR',
   45.75, 21.22, 'Descriere.', null, 'detached', null, null),
  ('e0000000-0000-4000-8000-000000000003', '11111111-1111-1111-1111-111111111111', 'draft', 'sale',
   'house', 'Casă completă', 'Str. Școlii, 3', 'Timișoara', 4, 120, 190000, 'EUR',
   45.75, 21.22, 'Descriere.', null, 'duplex', 300, null),
  ('e0000000-0000-4000-8000-000000000004', '11111111-1111-1111-1111-111111111111', 'approved', 'rent',
   'house', 'Casă de închiriat', 'Str. Școlii, 4', 'Timișoara', 3, 90, 900, 'EUR',
   45.75, 21.22, 'Descriere.', null, 'terraced', 150, now());

insert into public.listing_photos (listing_id, owner_id, path, position)
select
  listing.id,
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111/' || listing.id || '/photo-' || photo.position || '.webp',
  photo.position
from (
  values
    ('e0000000-0000-4000-8000-000000000001'::uuid),
    ('e0000000-0000-4000-8000-000000000002'::uuid),
    ('e0000000-0000-4000-8000-000000000003'::uuid)
) as listing (id)
cross join generate_series(0, 4) as photo (position);

select is(
  (select property_type::text from public.listings where id = 'e0000000-0000-4000-8000-000000000001'),
  'apartment',
  'A listing keeps the property type it was created with'
);

select throws_ok(
  $$ update public.listings set partitioning = 'detached' where id = 'e0000000-0000-4000-8000-000000000003' $$,
  '23514',
  null,
  'A house cannot have an apartment layout'
);

select throws_ok(
  $$ update public.listings set floor = 2 where id = 'e0000000-0000-4000-8000-000000000003' $$,
  '23514',
  null,
  'A house has no floor'
);

select throws_ok(
  $$ update public.listings set land_area_m2 = 200 where id = 'e0000000-0000-4000-8000-000000000001' $$,
  '23514',
  null,
  'An apartment cannot have a land area'
);

select throws_ok(
  $$ update public.listings set utilities = array['water', 'internet']::public.listing_utility[] where id = 'e0000000-0000-4000-8000-000000000001' $$,
  '23514',
  null,
  'An apartment lists only water, sewerage and gas among utilities'
);

select throws_ok(
  $$ update public.listings set heating = 'solar_panels' where id = 'e0000000-0000-4000-8000-000000000001' $$,
  '23514',
  null,
  'Solar panels are a house heating option'
);

select throws_ok(
  $$ update public.listings set pets = 'allowed' where id = 'e0000000-0000-4000-8000-000000000003' $$,
  '23514',
  null,
  'Pets are asked only for rentals'
);

select lives_ok(
  $$
    update public.listings
    set pets = 'allowed', pool = 'own', yard = 'garden', heating = 'heat_pump',
      utilities = array['water', 'electricity', 'internet']::public.listing_utility[],
      building_services = array['security']::public.listing_building_service[],
      has_attic = true, bathrooms = 2, balconies = 1, parking_spaces = 2
    where id = 'e0000000-0000-4000-8000-000000000004'
  $$,
  'A rented house takes its own details and the pets answer'
);

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated", "user_roles": ["user"]}';

select throws_ok(
  $$ select public.submit_listing('e0000000-0000-4000-8000-000000000001') $$,
  'P0001',
  'listing_incomplete',
  'An apartment without a floor cannot be submitted'
);

select throws_ok(
  $$ select public.submit_listing('e0000000-0000-4000-8000-000000000002') $$,
  'P0001',
  'listing_incomplete',
  'A house without a land area cannot be submitted'
);

select results_eq(
  $$ select status::text from public.submit_listing('e0000000-0000-4000-8000-000000000003') $$,
  $$ values ('pending_approval'::text) $$,
  'A complete house is submitted for review'
);

select lives_ok(
  $$
    insert into public.listings (
      transaction, property_type, title, street_label, city, rooms, area_m2, price, currency,
      latitude, longitude, floor, bathrooms, partitioning, comfort, building_type, has_elevator,
      utilities
    )
    values (
      'sale', 'apartment', 'Apartament nou', 'Str. Școlii, 5', 'Timișoara', 2, 55, 95000, 'EUR',
      45.75, 21.22, 3, 1, 'semi_detached', 'first', 'apartment_block', true,
      array['water', 'gas']::public.listing_utility[]
    )
  $$,
  'An owner creates an apartment draft with its details'
);

reset role;
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select results_eq(
  $$
    select property_type::text, house_type::text, land_area_m2, pool::text, yard::text
    from public.listings
    where id = 'e0000000-0000-4000-8000-000000000004'
  $$,
  $$ values ('house'::text, 'terraced'::text, 150.00::numeric(9, 2), 'own'::text, 'garden'::text) $$,
  'Visitors read the type and details of an approved listing'
);

select throws_ok(
  $$ select owner_id from public.listings limit 1 $$,
  '42501',
  null,
  'Visitors still cannot read the owner of a listing'
);

select * from finish();
rollback;
