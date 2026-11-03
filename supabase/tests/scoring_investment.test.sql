begin;

create extension if not exists pgtap with schema extensions;

select plan(15);

select results_eq(
  $$
    select
      params -> 'investment' ->> 'window_days',
      params -> 'investment' -> 'radii_m' ->> 0,
      params -> 'investment' ->> 'sale_min_count'
    from public.scoring_versions
    where kind = 'online' and label = 'v1'
  $$,
  $$ values ('90'::text, '800'::text, '20'::text) $$,
  'The v1 formula carries the Investment parameters: 90-day window, 800 m first radius, 20 sale listings'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'private.market_imports'::regclass)
    and (select relrowsecurity from pg_class where oid = 'private.market_listings'::regclass),
  'Row level security is enabled on both market tables'
);

select id as timisoara_id from public.cities where slug = 'timisoara' \gset

insert into private.market_imports (id, source, period, file_sha256)
values
  ('a0000000-0000-4000-8000-000000000001', 'test', '2026-08-01', repeat('1', 64)),
  ('a0000000-0000-4000-8000-000000000002', 'test', '2026-09-01', repeat('2', 64)),
  ('a0000000-0000-4000-8000-000000000003', 'test', '2026-10-01', repeat('3', 64));

select is(
  private.insert_market_listings(
    'a0000000-0000-4000-8000-000000000001',
    2000,
    '[
      {"source_listing_id": "A", "transaction": "sale", "property_type": "apartment", "longitude": 21.2303, "latitude": 45.7546, "area_m2": 80, "rooms": 3, "price": 160000, "currency": "EUR", "price_eur": 160000, "first_seen_on": "2026-07-01", "last_seen_on": "2026-08-20"},
      {"source_listing_id": "FAR", "transaction": "sale", "property_type": "apartment", "longitude": 25.0, "latitude": 46.0, "area_m2": 80, "rooms": 3, "price": 100000, "currency": "EUR", "price_eur": 100000, "first_seen_on": "2026-07-01", "last_seen_on": "2026-08-20"}
    ]'::jsonb
  ),
  1,
  'A listing outside every covered city is not stored'
);

select is(
  private.insert_market_listings(
    'a0000000-0000-4000-8000-000000000002',
    2000,
    '[
      {"source_listing_id": "A", "transaction": "sale", "property_type": "apartment", "longitude": 21.2303, "latitude": 45.7546, "area_m2": 80, "rooms": 3, "price": 168000, "currency": "EUR", "price_eur": 168000, "first_seen_on": "2026-07-01", "last_seen_on": "2026-09-25"},
      {"source_listing_id": "B", "transaction": "sale", "property_type": "apartment", "longitude": 21.2400, "latitude": 45.7600, "area_m2": 60, "rooms": 2, "price": 600000, "currency": "RON", "price_eur": 120000, "first_seen_on": "2026-08-01", "last_seen_on": "2026-09-28"},
      {"source_listing_id": "R", "transaction": "rent", "property_type": "apartment", "longitude": 21.2310, "latitude": 45.7550, "area_m2": 70, "rooms": 3, "price": 600, "currency": "EUR", "price_eur": 600, "first_seen_on": "2026-08-01", "last_seen_on": "2026-09-28"},
      {"source_listing_id": "H", "transaction": "sale", "property_type": "house", "longitude": 21.2310, "latitude": 45.7550, "area_m2": 150, "rooms": 5, "price": 300000, "currency": "EUR", "price_eur": 300000, "first_seen_on": "2026-08-01", "last_seen_on": "2026-09-28"}
    ]'::jsonb
  ),
  4,
  'Sale, rent and house listings of Timișoara are stored'
);

select is(
  private.insert_market_listings(
    'a0000000-0000-4000-8000-000000000003',
    2000,
    '[
      {"source_listing_id": "A", "transaction": "sale", "property_type": "apartment", "longitude": 21.2303, "latitude": 45.7546, "area_m2": 80, "rooms": 3, "price": 150000, "currency": "EUR", "price_eur": 150000, "first_seen_on": "2026-07-01", "last_seen_on": "2026-10-20"}
    ]'::jsonb
  ),
  1,
  'A later import stores its own copy of a listing'
);

update private.market_imports
set completed_at = '2026-10-01 00:00:00+00'
where id in ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002');

select throws_ok(
  $$
    select private.insert_market_listings('a0000000-0000-4000-8000-000000000002', 2000, '[]'::jsonb)
  $$,
  'P0001',
  'market_import_not_open',
  'A completed import cannot receive more listings'
);

select is(
  private.market_reference_date(:'timisoara_id', '2026-10-02 00:00:00+00'),
  '2026-09-28'::date,
  'The reference date is the last day a listing was seen in the imports completed before the cutoff'
);

select results_eq(
  format(
    $$
      select source_listing_id, price_eur
      from private.market_observations(%L, '2026-10-02 00:00:00+00', 'sale', '2026-07-01', '2026-09-30') o
      join private.market_listings l on l.id = o.listing_id
      order by source_listing_id
    $$,
    :'timisoara_id'
  ),
  $$ values ('A'::text, 168000::numeric), ('B'::text, 120000::numeric) $$,
  'Each listing appears once, as the latest import before the cutoff saw it, and houses are left out'
);

update private.market_imports
set completed_at = '2026-11-01 00:00:00+00'
where id = 'a0000000-0000-4000-8000-000000000003';

select is(
  (
    select count(*)::integer
    from private.market_observations(:'timisoara_id', '2026-10-02 00:00:00+00', 'sale', '2026-07-01', '2026-12-31')
    where price_eur = 150000
  ),
  0,
  'An import completed after the snapshot does not change the report'
);

select results_eq(
  format(
    $$
      select round(distance_m)::integer, rooms
      from private.market_comparables(%L, '2026-10-02 00:00:00+00', 'sale', '2026-07-01', '2026-09-30', 21.2303, 45.7546, 300)
    $$,
    :'timisoara_id'
  ),
  $$ values (0, 3::smallint) $$,
  'Comparables are limited to the radius around the address'
);

select results_eq(
  format(
    $$
      select transaction::text, listing_count, p50_eur_m2
      from private.market_city_summary(%L, '2026-10-02 00:00:00+00', '2026-07-01', '2026-09-30', '2026-09-16')
    $$,
    :'timisoara_id'
  ),
  $$ values ('sale'::text, 2, 2050::double precision), ('rent'::text, 1, (600.0 / 70)::double precision) $$,
  'The city summary gives the median price per square metre for sale and rent'
);

set local role anon;

select throws_ok(
  $$ select count(*) from private.market_listings $$,
  '42501',
  null,
  'A visitor cannot read the market listings'
);

select throws_ok(
  $$ select count(*) from private.market_imports $$,
  '42501',
  null,
  'A visitor cannot read the market imports'
);

set local role authenticated;

select throws_ok(
  $$ select count(*) from private.market_listings $$,
  '42501',
  null,
  'A signed-in user cannot read the market listings'
);

select throws_ok(
  $$ select count(*) from private.market_imports $$,
  '42501',
  null,
  'A signed-in user cannot read the market imports'
);

select * from finish();

rollback;
