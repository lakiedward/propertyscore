begin;

create extension if not exists pgtap with schema extensions;

select plan(34);

delete from public.listings;

insert into auth.users (id, email, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', 'owner@example.test', '{}'),
  ('33333333-3333-3333-3333-333333333333', 'admin@example.test', '{}');

create function pg_temp.map_matches_listings()
returns boolean
language sql
as $$
  with expected_cells as (
    select
      listings.transaction,
      listings.price_band,
      keys.zoom,
      keys.cx,
      keys.cy,
      count(*)::integer as listing_count,
      avg(extensions.st_x(listings.location_3857)) as center_x,
      avg(extensions.st_y(listings.location_3857)) as center_y
    from public.listings
    cross join lateral private.listing_map_cell_keys(listings.location_3857) as keys
    where listings.status = 'approved'
    group by 1, 2, 3, 4, 5
  ),
  expected_counts as (
    select listings.transaction, listings.price_band, listings.county_id, count(*)::integer as listing_count
    from public.listings
    where listings.status = 'approved'
    group by 1, 2, 3
  )
  select
    not exists (
      select 1
      from expected_cells expected
      full join private.listing_map_cells actual using (transaction, price_band, zoom, cx, cy)
      where expected.listing_count is distinct from actual.listing_count
        or abs(expected.center_x - actual.sum_x / actual.listing_count) > 0.01
        or abs(expected.center_y - actual.sum_y / actual.listing_count) > 0.01
    )
    and not exists (
      select 1
      from expected_counts expected
      full join private.listing_map_counts actual using (transaction, price_band, county_id)
      where expected.listing_count is distinct from actual.listing_count
    );
$$;

create function pg_temp.tile_at(
  p_zoom integer,
  p_listing_id uuid,
  p_max_price_eur integer default null
)
returns bytea
language sql
as $$
  select public.listing_map_tile(
    p_zoom,
    floor((extensions.st_x(listings.location_3857) + 20037508.342789244) / (40075016.685578488 / power(2, p_zoom)))::integer,
    floor((20037508.342789244 - extensions.st_y(listings.location_3857)) / (40075016.685578488 / power(2, p_zoom)))::integer,
    listings.transaction,
    p_max_price_eur
  )
  from public.listings
  where listings.id = p_listing_id;
$$;

create function pg_temp.has_text(p_tile bytea, p_text text)
returns boolean
language sql
as $$
  select position(convert_to(p_text, 'UTF8') in p_tile) > 0;
$$;

grant execute on function pg_temp.tile_at(integer, uuid, integer) to anon, authenticated;
grant execute on function pg_temp.has_text(bytea, text) to anon, authenticated;

select is(
  (select count(*)::integer from private.listing_map_cells) + (select count(*)::integer from private.listing_map_counts),
  0,
  'With no listings the map tables are empty'
);

insert into public.listings (
  id, owner_id, status, transaction, title, street_label, city, rooms, area_m2, price, currency,
  latitude, longitude, description, floor, submitted_at
)
values
  ('c0000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', 'pending_approval', 'sale',
   'Apartament Iosefin', 'Str. Școlii, 1', 'Timișoara', 2, 50, 90000, 'EUR', 45.75, 21.221, 'Descriere.', 2, now()),
  ('c0000000-0000-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111', 'pending_approval', 'sale',
   'Apartament în lei', 'Str. Școlii, 3', 'Timișoara', 2, 50, 90000, 'RON', 45.7501, 21.2211, 'Descriere.', 2, now()),
  ('c0000000-0000-4000-8000-000000000003', '11111111-1111-1111-1111-111111111111', 'pending_approval', 'sale',
   'Apartament scump', 'Str. Mărășești, 9', 'Cluj-Napoca', 3, 80, 250000, 'EUR', 46.77, 23.62, 'Descriere.', 4, now()),
  ('c0000000-0000-4000-8000-000000000004', '11111111-1111-1111-1111-111111111111', 'pending_approval', 'rent',
   'Garsonieră', 'Str. Horea, 2', 'Cluj-Napoca', 1, 30, 450, 'EUR', 46.771, 23.621, 'Descriere.', 1, now());

select results_eq(
  $$ select id::text, price_band, county_id from public.listings order by id $$,
  $$
    values
      ('c0000000-0000-4000-8000-000000000001', 1::smallint, 'timis'),
      ('c0000000-0000-4000-8000-000000000002', 4::smallint, 'timis'),
      ('c0000000-0000-4000-8000-000000000003', 4::smallint, 'cluj'),
      ('c0000000-0000-4000-8000-000000000004', 2::smallint, 'cluj')
  $$,
  'Every listing gets its price band and county, and a price in lei is above every cap'
);

select is(
  (select count(*)::integer from private.listing_map_counts),
  0,
  'Listings waiting for approval are not on the map'
);

update public.listings set status = 'approved', decided_at = now(), published_at = now();

select ok(pg_temp.map_matches_listings(), 'Approving listings counts them in every cell and county');

select results_eq(
  $$ select county_id, listing_count from public.listing_map_summary('sale') $$,
  $$ values ('cluj', 1), ('timis', 2) $$,
  'The summary counts the sale listings of each county'
);

select results_eq(
  $$ select county_id, listing_count from public.listing_map_summary('sale', 100000) $$,
  $$ values ('timis', 1) $$,
  'A price cap counts only the euro listings at or under it'
);

select results_eq(
  $$ select county_id, listing_count from public.listing_map_summary('rent', 600) $$,
  $$ values ('cluj', 1) $$,
  'A rent cap includes the listings of the lower bands'
);

select ok(
  pg_temp.has_text(pg_temp.tile_at(16, 'c0000000-0000-4000-8000-000000000001'), 'c0000000-0000-4000-8000-000000000001')
    and pg_temp.has_text(pg_temp.tile_at(16, 'c0000000-0000-4000-8000-000000000001'), 'c0000000-0000-4000-8000-000000000002'),
  'A street-level tile carries every listing in it as a pin'
);

select ok(
  pg_temp.has_text(pg_temp.tile_at(16, 'c0000000-0000-4000-8000-000000000001', 100000), 'c0000000-0000-4000-8000-000000000001')
    and not pg_temp.has_text(pg_temp.tile_at(16, 'c0000000-0000-4000-8000-000000000001', 100000), 'c0000000-0000-4000-8000-000000000002'),
  'A price cap hides the listing priced in lei'
);

select ok(
  pg_temp.has_text(pg_temp.tile_at(8, 'c0000000-0000-4000-8000-000000000001'), 'clusters')
    and not pg_temp.has_text(pg_temp.tile_at(8, 'c0000000-0000-4000-8000-000000000001'), 'c0000000-0000-4000-8000-000000000001'),
  'Two close listings become a bubble when zoomed out'
);

select ok(
  pg_temp.has_text(pg_temp.tile_at(8, 'c0000000-0000-4000-8000-000000000003'), 'c0000000-0000-4000-8000-000000000003')
    and not pg_temp.has_text(pg_temp.tile_at(8, 'c0000000-0000-4000-8000-000000000003'), 'clusters'),
  'A listing alone in its cell is a pin even when zoomed out'
);

select ok(
  pg_temp.has_text(pg_temp.tile_at(14, 'c0000000-0000-4000-8000-000000000001'), 'clusters'),
  'Listings are grouped on the fly at zoom 14'
);

select is(
  length(pg_temp.tile_at(12, 'c0000000-0000-4000-8000-000000000004')),
  length(pg_temp.tile_at(12, 'c0000000-0000-4000-8000-000000000004', 800)),
  'The highest rent cap keeps a rent listing under it'
);

insert into public.listings (
  id, owner_id, status, transaction, title, street_label, city, rooms, area_m2, price, currency,
  latitude, longitude, description, floor, submitted_at
)
select
  'c0000000-0000-4000-8000-000000000005', '11111111-1111-1111-1111-111111111111', 'pending_approval', 'sale',
  'Pe marginea dalei', 'Str. Gării, 7', 'Timișoara', 2, 50, 95000, 'EUR', 45.76,
  ceil((21.23 + 180) / 360 * 65536) / 65536 * 360 - 180, 'Descriere.', 2, now();

update public.listings
set status = 'approved', decided_at = now(), published_at = now()
where id = 'c0000000-0000-4000-8000-000000000005';

select is(
  (
    select count(*)::integer
    from public.listings
    cross join lateral (
      values
        (floor((extensions.st_x(location_3857) + 20037508.342789244) / (40075016.685578488 / 65536))::integer - 1),
        (floor((extensions.st_x(location_3857) + 20037508.342789244) / (40075016.685578488 / 65536))::integer),
        (floor((extensions.st_x(location_3857) + 20037508.342789244) / (40075016.685578488 / 65536))::integer + 1)
    ) as tiles (x)
    where listings.id = 'c0000000-0000-4000-8000-000000000005'
      and pg_temp.has_text(
        public.listing_map_tile(
          16,
          tiles.x,
          floor((20037508.342789244 - extensions.st_y(location_3857)) / (40075016.685578488 / 65536))::integer,
          'sale'
        ),
        'c0000000-0000-4000-8000-000000000005'
      )
  ),
  1,
  'A listing on the edge between two tiles is in exactly one of them'
);

select results_eq(
  $$
    select cx, cy, listing_count, center_x::numeric(10, 2)
    from private.merge_listing_map_groups(
      array[
        row(0, 0, 5, 0, 0)::private.listing_map_group,
        row(1, 0, 1, 10, 0)::private.listing_map_group,
        row(9, 0, 2, 200, 0)::private.listing_map_group
      ],
      20
    )
    order by cx
  $$,
  $$ values (0, 0, 6, 1.67::numeric(10, 2)), (9, 0, 2, 100.00::numeric(10, 2)) $$,
  'Groups closer than the radius join the largest one around its weighted centre'
);

insert into public.listings (
  id, owner_id, status, transaction, title, street_label, city, rooms, area_m2, price, currency,
  latitude, longitude, description, floor, submitted_at
)
select
  ('c0000000-0000-4000-8000-00000000000' || side)::uuid, '11111111-1111-1111-1111-111111111111', 'pending_approval', 'sale',
  'Lângă marginea celulei', 'Str. Mare, 1', 'Iași', 2, 50, 95000, 'EUR', 47.16,
  floor((27.6 + 180) / 360 * 2048) / 2048 * 360 - 180 + case side when 6 then -0.001 else 0.001 end,
  'Descriere.', 2, now()
from (values (6), (7)) as sides (side);

update public.listings
set status = 'approved', decided_at = now(), published_at = now()
where id in ('c0000000-0000-4000-8000-000000000006', 'c0000000-0000-4000-8000-000000000007');

select ok(
  pg_temp.has_text(pg_temp.tile_at(8, 'c0000000-0000-4000-8000-000000000006'), 'clusters')
    and not pg_temp.has_text(pg_temp.tile_at(8, 'c0000000-0000-4000-8000-000000000006'), 'c0000000-0000-4000-8000-000000000006')
    and not pg_temp.has_text(pg_temp.tile_at(8, 'c0000000-0000-4000-8000-000000000007'), 'c0000000-0000-4000-8000-000000000007'),
  'Two listings on either side of a cell edge become one bubble'
);

update public.listings set price = 160000 where id = 'c0000000-0000-4000-8000-000000000001';

select ok(
  pg_temp.map_matches_listings()
    and (select price_band from public.listings where id = 'c0000000-0000-4000-8000-000000000001') = 3,
  'A price change across a cap moves the listing to its new band'
);

update public.listings set latitude = 46.771, longitude = 23.6235 where id = 'c0000000-0000-4000-8000-000000000001';

select ok(
  pg_temp.map_matches_listings()
    and (select county_id from public.listings where id = 'c0000000-0000-4000-8000-000000000001') = 'cluj',
  'Moving a listing to another county moves its counts'
);

update public.listings set title = 'Titlu nou' where id = 'c0000000-0000-4000-8000-000000000003';

select ok(pg_temp.map_matches_listings(), 'Changing a field the map does not use leaves the counts as they are');

update public.listings set price_band = 1, county_id = 'alba' where id = 'c0000000-0000-4000-8000-000000000003';

select results_eq(
  $$ select price_band, county_id from public.listings where id = 'c0000000-0000-4000-8000-000000000003' $$,
  $$ values (4::smallint, 'cluj') $$,
  'The band and county cannot be written by hand'
);

update public.listings set status = 'blocked' where id = 'c0000000-0000-4000-8000-000000000003';

select ok(
  pg_temp.map_matches_listings()
    and not pg_temp.has_text(pg_temp.tile_at(16, 'c0000000-0000-4000-8000-000000000003'), 'c0000000-0000-4000-8000-000000000003'),
  'A blocked listing leaves the map'
);

insert into public.listing_photos (listing_id, owner_id, path, position)
select
  'c0000000-0000-4000-8000-000000000004',
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111/c0000000-0000-4000-8000-000000000004/photo-' || position || '.webp',
  position
from generate_series(0, 4) as position;

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated", "user_roles": ["user"]}';

select public.start_listing_revision('c0000000-0000-4000-8000-000000000004');

update public.listings
set price = 350, latitude = 45.751, longitude = 21.221
where revision_of = 'c0000000-0000-4000-8000-000000000004';

select public.submit_listing(id) from public.listings where revision_of = 'c0000000-0000-4000-8000-000000000004';

reset role;

select ok(pg_temp.map_matches_listings(), 'A revision in review does not change the map');

set local role authenticated;
set local request.jwt.claims = '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated", "user_roles": ["admin"]}';

select public.decide_listing(id, 'approved', '{}', null)
from public.listings
where revision_of = 'c0000000-0000-4000-8000-000000000004';

reset role;

select ok(
  pg_temp.map_matches_listings()
    and (select (price_band, county_id) = (1::smallint, 'timis') from public.listings where id = 'c0000000-0000-4000-8000-000000000004'),
  'Approving a revision moves the published listing to its new price band and place'
);

delete from public.listings where id = 'c0000000-0000-4000-8000-000000000002';

select ok(pg_temp.map_matches_listings(), 'Deleting a listing removes it from the map');

select private.rebuild_listing_map();

select ok(pg_temp.map_matches_listings(), 'Rebuilding the map tables gives the same counts');

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select ok(
  length(pg_temp.tile_at(16, 'c0000000-0000-4000-8000-000000000001')) > 0
    and not pg_temp.has_text(pg_temp.tile_at(16, 'c0000000-0000-4000-8000-000000000001'), 'Apartament Iosefin')
    and not pg_temp.has_text(pg_temp.tile_at(16, 'c0000000-0000-4000-8000-000000000001'), '11111111-1111-1111-1111-111111111111')
    and not pg_temp.has_text(pg_temp.tile_at(16, 'c0000000-0000-4000-8000-000000000001'), 'Str. Școlii'),
  'Visitors get tiles without the title, owner or address'
);

select results_eq(
  $$ select sum(listing_count)::integer from public.listing_map_summary('sale') $$,
  $$ values (4) $$,
  'Visitors get the summary'
);

select throws_ok(
  $$ select public.listing_map_tile(3, 0, 0, 'sale') $$,
  'P0001',
  'invalid_tile',
  'A zoom under 4 is refused'
);

select throws_ok(
  $$ select public.listing_map_tile(6, 64, 0, 'sale') $$,
  'P0001',
  'invalid_tile',
  'A tile outside the zoom''s range is refused'
);

select throws_ok(
  $$ select public.listing_map_tile(6, 36, 22, 'sale', 123) $$,
  'P0001',
  'invalid_price_cap',
  'A price cap that is not offered is refused'
);

select throws_ok(
  $$ select public.listing_map_summary('rent', 100000) $$,
  'P0001',
  'invalid_price_cap',
  'The summary refuses a cap of the other transaction'
);

select throws_ok(
  $$ select count(*) from private.listing_map_cells $$,
  '42501',
  null,
  'Visitors cannot read the map cells'
);

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated", "user_roles": ["user"]}';

select throws_ok(
  $$ select count(*) from private.listing_map_counts $$,
  '42501',
  null,
  'Signed-in users cannot read the county counts'
);

select ok(
  length(pg_temp.tile_at(16, 'c0000000-0000-4000-8000-000000000001')) > 0,
  'Signed-in users get tiles'
);

select * from finish();
rollback;
