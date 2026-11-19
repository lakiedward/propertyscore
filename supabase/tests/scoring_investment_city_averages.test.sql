begin;

create extension if not exists pgtap with schema extensions;

select plan(14);

select ok(
  (select relrowsecurity from pg_class where oid = 'private.market_city_averages'::regclass),
  'Row level security is enabled on the city averages'
);

select is(
  (select column_default from information_schema.columns
   where table_schema = 'private' and table_name = 'market_imports' and column_name = 'content'),
  '''listings''::private.market_import_content',
  'Imports hold listings unless they say otherwise'
);

select id as timisoara_id from public.cities where slug = 'timisoara' \gset

insert into private.market_imports (id, source, period, file_sha256, content)
values
  ('b0000000-0000-4000-8000-000000000001', 'sample_index', '2026-09-01', repeat('a', 64), 'city_averages'),
  ('b0000000-0000-4000-8000-000000000002', 'sample_index', '2026-09-01', repeat('b', 64), 'city_averages'),
  ('b0000000-0000-4000-8000-000000000003', 'sample_index', '2026-09-01', repeat('c', 64), 'listings');

select is(
  private.insert_market_city_averages(
    'b0000000-0000-4000-8000-000000000001',
    '[
      {"city": "timisoara", "period": "2026-09-01", "transaction": "sale", "property_type": "apartment", "price_m2": 1800, "currency": "EUR", "eur_m2": 1800},
      {"city": "timisoara", "period": "2026-09-01", "transaction": "sale", "property_type": "apartment", "rooms_min": 3, "rooms_max": 3, "price_m2": 1750, "currency": "EUR", "eur_m2": 1750, "source_url": "https://example.test/sample"},
      {"city": "timisoara", "period": "2026-09-01", "transaction": "sale", "property_type": "apartment", "rooms_min": 4, "price_m2": 1700, "currency": "EUR", "eur_m2": 1700},
      {"city": "timisoara", "period": "2025-09-01", "transaction": "sale", "property_type": "apartment", "rooms_min": 3, "rooms_max": 3, "price_m2": 1600, "currency": "EUR", "eur_m2": 1600},
      {"city": "timisoara", "period": "2026-09-01", "transaction": "rent", "property_type": "apartment", "rooms_min": 3, "rooms_max": 3, "price_month": 2800, "currency": "RON", "eur_month": 560},
      {"city": "atlantis", "period": "2026-09-01", "transaction": "sale", "property_type": "apartment", "price_m2": 1800, "currency": "EUR", "eur_m2": 1800},
      {"city": "timisoara", "period": "2026-09-01", "transaction": "sale", "property_type": "apartment", "price_m2": 1810, "currency": "EUR", "eur_m2": 1810}
    ]'::jsonb
  ),
  5,
  'Averages of covered cities are stored once per city, month, type and rooms band; unknown cities are left out'
);

select is(
  private.insert_market_city_averages(
    'b0000000-0000-4000-8000-000000000002',
    '[
      {"city": "timisoara", "period": "2026-09-01", "transaction": "sale", "property_type": "apartment", "price_m2": 1820, "currency": "EUR", "eur_m2": 1820}
    ]'::jsonb
  ),
  1,
  'A later import stores its own copy of an average'
);

select throws_ok(
  $$
    select private.insert_market_city_averages('b0000000-0000-4000-8000-000000000003', '[]'::jsonb)
  $$,
  'P0001',
  'market_import_not_open',
  'A listings import cannot receive city averages'
);

select throws_ok(
  format(
    $$
      insert into private.market_city_averages (import_id, city_id, period, transaction, property_type, price_month, currency, eur_month)
      values ('b0000000-0000-4000-8000-000000000001', %L, '2026-09-01', 'sale', 'apartment', 900, 'EUR', 900)
    $$,
    :'timisoara_id'
  ),
  '23514',
  null,
  'A sale average is a price per square metre, never a monthly price'
);

select throws_ok(
  format(
    $$
      insert into private.market_city_averages (import_id, city_id, period, transaction, property_type, rooms_max, price_m2, currency, eur_m2)
      values ('b0000000-0000-4000-8000-000000000001', %L, '2026-08-01', 'sale', 'apartment', 3, 1800, 'EUR', 1800)
    $$,
    :'timisoara_id'
  ),
  '23514',
  null,
  'A rooms band needs its lower bound'
);

select throws_ok(
  format(
    $$
      insert into private.market_city_averages (import_id, city_id, period, transaction, property_type, price_m2, currency, eur_m2)
      values ('b0000000-0000-4000-8000-000000000001', %L, '2026-08-15', 'sale', 'apartment', 1800, 'EUR', 1800)
    $$,
    :'timisoara_id'
  ),
  '23514',
  null,
  'An average belongs to a whole month'
);

update private.market_imports
set completed_at = '2026-10-01 00:00:00+00'
where id = 'b0000000-0000-4000-8000-000000000001';

update private.market_imports
set completed_at = '2026-11-01 00:00:00+00'
where id = 'b0000000-0000-4000-8000-000000000002';

select throws_ok(
  $$
    select private.insert_market_city_averages('b0000000-0000-4000-8000-000000000001', '[]'::jsonb)
  $$,
  'P0001',
  'market_import_not_open',
  'A completed import cannot receive more averages'
);

select results_eq(
  format(
    $$
      select period, transaction::text, rooms_min, rooms_max, eur_m2, eur_month
      from private.market_city_averages_at(%L, '2026-10-02 00:00:00+00', '2025-06-01')
      order by period, transaction::text, rooms_min nulls first
    $$,
    :'timisoara_id'
  ),
  $$
    values
      ('2025-09-01'::date, 'sale'::text, 3::smallint, 3::smallint, 1600::numeric, null::numeric),
      ('2026-09-01'::date, 'rent'::text, 3::smallint, 3::smallint, null::numeric, 560::numeric),
      ('2026-09-01'::date, 'sale'::text, null::smallint, null::smallint, 1800::numeric, null::numeric),
      ('2026-09-01'::date, 'sale'::text, 3::smallint, 3::smallint, 1750::numeric, null::numeric),
      ('2026-09-01'::date, 'sale'::text, 4::smallint, null::smallint, 1700::numeric, null::numeric)
  $$,
  'A report reads the averages of the imports completed before its snapshot'
);

select is(
  (
    select eur_m2
    from private.market_city_averages_at(:'timisoara_id', '2026-11-02 00:00:00+00', '2025-06-01')
    where transaction = 'sale' and rooms_min is null
  ),
  1820::numeric,
  'The latest import before the cutoff wins for the same city, month and rooms band'
);

select is(
  (
    select count(*)::integer
    from private.market_city_averages_at(:'timisoara_id', '2026-10-02 00:00:00+00', '2026-01-01')
  ),
  4,
  'Months before the requested start are left out'
);

set local role anon;

select throws_ok(
  $$ select count(*) from private.market_city_averages $$,
  '42501',
  null,
  'A visitor cannot read the city averages'
);

set local role authenticated;

select throws_ok(
  $$ select count(*) from private.market_city_averages $$,
  '42501',
  null,
  'A signed-in user cannot read the city averages'
);

select * from finish();

rollback;
