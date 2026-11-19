begin;

create extension if not exists pgtap with schema extensions;

select plan(24);

select ok(
  (select relrowsecurity from pg_class where oid = 'private.market_area_statistics'::regclass),
  'Row level security is enabled on the area statistics'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'private.market_statistics_runs'::regclass),
  'Row level security is enabled on the statistics runs'
);

select id as timisoara_id from public.cities where slug = 'timisoara' \gset
select id as sibiu_id from public.cities where slug = 'sibiu' \gset

insert into private.market_imports (id, source, period, file_sha256, content)
values
  ('c0000000-0000-4000-8000-000000000001', 'sample_pages', '2026-09-01', repeat('a', 64), 'area_statistics'),
  ('c0000000-0000-4000-8000-000000000002', 'sample_pages', '2026-10-01', repeat('b', 64), 'area_statistics'),
  ('c0000000-0000-4000-8000-000000000003', 'sample_index', '2026-09-01', repeat('c', 64), 'area_statistics'),
  ('c0000000-0000-4000-8000-000000000004', 'sample_pages', '2026-09-01', repeat('d', 64), 'city_averages');

select is(
  private.insert_market_area_statistics(
    'c0000000-0000-4000-8000-000000000001',
    '[
      {"city": "timisoara", "transaction": "sale", "property_type": "apartment", "observed_on": "2026-09-18", "listing_count": 23627, "apartment_count": 8755, "median_eur": 109900, "p25_eur": 85000, "p75_eur": 138000, "median_eur_m2": 1984.13, "source_url": "https://example.test/vanzare/timisoara"},
      {"city": "timisoara", "transaction": "sale", "property_type": "apartment", "rooms_min": 4, "observed_on": "2026-09-18", "listing_count": 1644, "median_eur": 169900, "median_eur_m2": 1850, "p25_eur_m2": 1600, "p75_eur_m2": 2150, "source_url": "https://example.test/vanzare/timisoara"},
      {"city": "timisoara", "zone_slug": "cetate", "zone_name": "Cetate", "transaction": "sale", "property_type": "apartment", "observed_on": "2026-09-18", "apartment_count": 209, "median_eur": 98000, "median_eur_m2": 1833.33, "source_url": "https://example.test/vanzare/timisoara/cetate"},
      {"city": "timisoara", "zone_slug": "cetate", "zone_name": "Cetate", "transaction": "rent", "property_type": "apartment", "observed_on": "2026-09-18", "median_eur": 450, "source_url": "https://example.test/chirii/timisoara/cetate"},
      {"city": "timisoara", "zone_slug": "cetate", "zone_name": "Cetate", "transaction": "sale", "property_type": "apartment", "observed_on": "2026-09-18", "median_eur_m2": 1900, "source_url": "https://example.test/vanzare/timisoara/cetate"},
      {"city": "atlantis", "transaction": "sale", "property_type": "apartment", "median_eur_m2": 1800, "source_url": "https://example.test/vanzare/atlantis"}
    ]'::jsonb
  ),
  4,
  'Statistics of covered cities are stored once per city, zone, transaction and rooms band; unknown cities are left out'
);

select is(
  private.insert_market_area_statistics(
    'c0000000-0000-4000-8000-000000000002',
    '[
      {"city": "timisoara", "transaction": "sale", "property_type": "apartment", "observed_on": "2026-10-18", "median_eur_m2": 2001, "source_url": "https://example.test/vanzare/timisoara"}
    ]'::jsonb
  ),
  1,
  'The next month is its own import'
);

select is(
  private.insert_market_area_statistics(
    'c0000000-0000-4000-8000-000000000003',
    '[
      {"city": "timisoara", "transaction": "sale", "property_type": "apartment", "median_eur_m2": 1969.7, "source_url": "https://example.test/index/2026-09"},
      {"city": "sibiu", "transaction": "sale", "property_type": "apartment", "median_eur_m2": 2012.99, "source_url": "https://example.test/index/2026-09"},
      {"city": "timisoara", "zone_slug": "giroc", "zone_name": "Giroc", "is_nearby_locality": true, "transaction": "sale", "property_type": "apartment", "listing_count": 171, "median_eur": 103000, "median_eur_m2": 1917, "p25_eur_m2": 1754, "p75_eur_m2": 2128, "median_area_m2": 53, "source_url": "https://example.test/index/2026-09"}
    ]'::jsonb
  ),
  3,
  'A second source keeps its own figures for the same city, and a locality next to it'
);

select throws_ok(
  $$
    select private.insert_market_area_statistics('c0000000-0000-4000-8000-000000000004', '[]'::jsonb)
  $$,
  'P0001',
  'market_import_not_open',
  'An import of city averages cannot receive area statistics'
);

select throws_ok(
  format(
    $$
      insert into private.market_area_statistics (import_id, city_id, transaction, property_type, listing_count, source_url)
      values ('c0000000-0000-4000-8000-000000000001', %L, 'rent', 'apartment', 12, 'https://example.test/chirii/timisoara')
    $$,
    :'timisoara_id'
  ),
  '23514',
  null,
  'A statistic needs a median price or a median price per square metre'
);

select throws_ok(
  format(
    $$
      insert into private.market_area_statistics (import_id, city_id, zone_slug, transaction, property_type, median_eur, source_url)
      values ('c0000000-0000-4000-8000-000000000001', %L, 'iosefin', 'rent', 'apartment', 400, 'https://example.test/chirii/timisoara/iosefin')
    $$,
    :'timisoara_id'
  ),
  '23514',
  null,
  'A zone has both its address and its name'
);

select throws_ok(
  format(
    $$
      insert into private.market_area_statistics (import_id, city_id, transaction, property_type, rooms_min, median_eur, p25_eur, p75_eur, source_url)
      values ('c0000000-0000-4000-8000-000000000001', %L, 'rent', 'apartment', 2, 400, 500, 350, 'https://example.test/chirii/timisoara')
    $$,
    :'timisoara_id'
  ),
  '23514',
  null,
  'The typical interval goes from its lower to its upper bound'
);

select throws_ok(
  format(
    $$
      insert into private.market_area_statistics (import_id, city_id, transaction, property_type, rooms_min, median_eur, source_url)
      values ('c0000000-0000-4000-8000-000000000001', %L, 'rent', 'apartment', 3, 500, 'http://example.test/chirii/timisoara')
    $$,
    :'timisoara_id'
  ),
  '23514',
  null,
  'Every figure carries the secure address of its page'
);

update private.market_imports
set completed_at = '2026-09-20 00:00:00+00'
where id in ('c0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000003');

update private.market_imports
set completed_at = '2026-10-20 00:00:00+00'
where id = 'c0000000-0000-4000-8000-000000000002';

select throws_ok(
  $$
    select private.insert_market_area_statistics('c0000000-0000-4000-8000-000000000001', '[]'::jsonb)
  $$,
  'P0001',
  'market_import_not_open',
  'A completed import cannot receive more statistics'
);

select results_eq(
  format(
    $$
      select source, period, zone_slug, transaction::text, rooms_min, median_eur, median_eur_m2, observed_on, source_url
      from private.market_area_statistics_at(%L, '2026-10-01 00:00:00+00', '2026-06-01')
      order by source, zone_slug nulls first, transaction::text, rooms_min nulls first
    $$,
    :'timisoara_id'
  ),
  $$
    values
      ('sample_index'::text, '2026-09-01'::date, null::text, 'sale'::text, null::smallint, null::numeric, 1969.70::numeric, null::date, 'https://example.test/index/2026-09'::text),
      ('sample_index'::text, '2026-09-01'::date, 'giroc'::text, 'sale'::text, null::smallint, 103000::numeric, 1917::numeric, null::date, 'https://example.test/index/2026-09'::text),
      ('sample_pages'::text, '2026-09-01'::date, null::text, 'sale'::text, null::smallint, 109900::numeric, 1984.13::numeric, '2026-09-18'::date, 'https://example.test/vanzare/timisoara'::text),
      ('sample_pages'::text, '2026-09-01'::date, null::text, 'sale'::text, 4::smallint, 169900::numeric, 1850::numeric, '2026-09-18'::date, 'https://example.test/vanzare/timisoara'::text),
      ('sample_pages'::text, '2026-09-01'::date, 'cetate'::text, 'rent'::text, null::smallint, 450::numeric, null::numeric, '2026-09-18'::date, 'https://example.test/chirii/timisoara/cetate'::text),
      ('sample_pages'::text, '2026-09-01'::date, 'cetate'::text, 'sale'::text, null::smallint, 98000::numeric, 1833.33::numeric, '2026-09-18'::date, 'https://example.test/vanzare/timisoara/cetate'::text)
  $$,
  'A report reads, for each source, the import completed before its snapshot, with the page and the day of every figure'
);

select results_eq(
  format(
    $$
      select source, period, median_eur_m2
      from private.market_area_statistics_at(%L, '2026-11-01 00:00:00+00', '2026-06-01')
      where zone_slug is null
      order by source
    $$,
    :'timisoara_id'
  ),
  $$
    values
      ('sample_index'::text, '2026-09-01'::date, 1969.70::numeric),
      ('sample_pages'::text, '2026-10-01'::date, 2001::numeric)
  $$,
  'The latest month of each source replaces its earlier months as a whole'
);

select is(
  (
    select count(*)::integer
    from private.market_area_statistics_at(:'sibiu_id', '2026-11-01 00:00:00+00', '2026-10-01')
  ),
  0,
  'Imports older than the requested start are left out'
);

select results_eq(
  format(
    $$
      select zone_slug, is_nearby_locality, median_area_m2
      from private.market_area_statistics_at(%L, '2026-10-01 00:00:00+00', '2026-06-01')
      where source = 'sample_index'
      order by zone_slug nulls first
    $$,
    :'timisoara_id'
  ),
  $$
    values
      (null::text, false, null::numeric),
      ('giroc'::text, true, 53::numeric)
  $$,
  'A report tells the localities next to the city from its zones and reads the median area a source gives'
);

select throws_ok(
  format(
    $$
      insert into private.market_area_statistics (import_id, city_id, is_nearby_locality, transaction, property_type, rooms_min, median_eur, source_url)
      values ('c0000000-0000-4000-8000-000000000001', %L, true, 'rent', 'apartment', 2, 400, 'https://example.test/chirii/timisoara')
    $$,
    :'timisoara_id'
  ),
  '23514',
  null,
  'A nearby locality is a named zone'
);

select results_eq(
  format(
    $$
      select source, period, median_eur_m2, source_url
      from private.market_city_sale_history(%L, '2026-11-01 00:00:00+00', '2026-06-01')
      order by source, period
    $$,
    :'timisoara_id'
  ),
  $$
    values
      ('sample_index'::text, '2026-09-01'::date, 1969.70::numeric, 'https://example.test/index/2026-09'::text),
      ('sample_pages'::text, '2026-09-01'::date, 1984.13::numeric, 'https://example.test/vanzare/timisoara'::text),
      ('sample_pages'::text, '2026-10-01'::date, 2001::numeric, 'https://example.test/vanzare/timisoara'::text)
  $$,
  'The history of a city is its whole-market sale median, one month per source, without zones, localities or rooms bands'
);

select results_eq(
  format(
    $$
      select source, period
      from private.market_city_sale_history(%L, '2026-10-01 00:00:00+00', '2026-10-01')
    $$,
    :'timisoara_id'
  ),
  $$ select null::text, null::date where false $$,
  'The history leaves out the months before its start and the imports completed after the cutoff'
);

insert into private.market_statistics_runs (source, run_month)
values ('sample_pages', '2026-10-01');

select throws_ok(
  $$ insert into private.market_statistics_runs (source, run_month) values ('sample_pages', '2026-10-01') $$,
  '23505',
  null,
  'A source has one run per month'
);

select throws_ok(
  $$ update private.market_statistics_runs set outcome = 'imported' where source = 'sample_pages' $$,
  '23514',
  null,
  'A run gets its outcome only together with the time it finished'
);

set local role anon;

select throws_ok(
  $$ select count(*) from private.market_statistics_runs $$,
  '42501',
  null,
  'A visitor cannot read the statistics runs'
);

select throws_ok(
  $$ select count(*) from private.market_area_statistics $$,
  '42501',
  null,
  'A visitor cannot read the area statistics'
);

set local role authenticated;

select throws_ok(
  $$ select count(*) from private.market_area_statistics $$,
  '42501',
  null,
  'A signed-in user cannot read the area statistics'
);

select throws_ok(
  $$ select count(*) from private.market_statistics_runs $$,
  '42501',
  null,
  'A signed-in user cannot read the statistics runs'
);

select * from finish();

rollback;
