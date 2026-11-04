begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

select id as oradea_id from public.cities where slug = 'oradea' \gset

select is(
  private.replace_cnas_providers(:'oradea_id', 'pharmacy', '2026-10-01', 'farmacii.xlsx',
    '[{"name": "Farmacia Unu", "address": "Str. Republicii nr. 1"}, {"name": "Farmacia Doi", "address": ""}]'::jsonb),
  2,
  'A CAS list is imported with one row per provider'
);

select is(
  private.replace_cnas_providers(:'oradea_id', 'pharmacy', '2026-10-01', 'farmacii-v2.xlsx',
    '[{"name": "Farmacia Trei", "address": "Str. Independenței nr. 3"}]'::jsonb),
  1,
  'Importing the same list again replaces it'
);

select results_eq(
  format($$ select name, address, source_ref from private.cnas_providers where city_id = %L order by name $$, :'oradea_id'),
  $$ values ('Farmacia Trei'::text, 'Str. Independenței nr. 3'::text, 'farmacii-v2.xlsx'::text) $$,
  'Only the rows of the latest import of a list remain, with an empty address stored as null'
);

select throws_ok(
  $$ select private.replace_cnas_providers('00000000-0000-4000-8000-000000000000', 'pharmacy', '2026-10-01', 'x', '[]'::jsonb) $$,
  'P0001',
  'city_not_found',
  'A list for an unknown city is refused'
);

insert into private.emergency_hospitals (city_id, name, location, level, is_pediatric, source_ref, valid_from)
values
  (:'oradea_id', 'Spitalul Județean', extensions.st_point(21.93, 47.06, 4326)::extensions.geography, 'upu', false, 'OMS vechi', '2020-01-01'),
  (:'oradea_id', 'Spitalul Municipal', extensions.st_point(21.92, 47.05, 4326)::extensions.geography, 'upu', false, 'OMS vechi', '2020-01-01'),
  (:'oradea_id', 'Spitalul Închis', extensions.st_point(21.91, 47.04, 4326)::extensions.geography, 'cpu', false, 'OMS vechi', '2020-01-01');

select is(
  private.sync_emergency_hospitals(:'oradea_id', '2026-11-01', '[
    {"name": "Spitalul Județean", "level": "upu", "is_pediatric": false, "source_ref": "OMS nou", "lng": 21.9301, "lat": 47.0601},
    {"name": "Spitalul Municipal", "level": "cpu", "is_pediatric": false, "source_ref": "OMS nou", "lng": 21.92, "lat": 47.05},
    {"name": "Spitalul de Copii", "level": "upu", "is_pediatric": true, "source_ref": "OMS nou", "lng": 21.94, "lat": 47.07}
  ]'::jsonb),
  '{"kept": 1, "closed": 2, "inserted": 2}'::jsonb,
  'An unchanged unit stays open, a changed or missing one closes and the new ones open'
);

select results_eq(
  format($$ select name, level::text, source_ref from private.list_emergency_hospitals(%L, '2026-11-01') $$, :'oradea_id'),
  $$ values
    ('Spitalul de Copii'::text, 'upu'::text, 'OMS nou'::text),
    ('Spitalul Județean'::text, 'upu'::text, 'OMS nou'::text),
    ('Spitalul Municipal'::text, 'cpu'::text, 'OMS nou'::text) $$,
  'The month the list takes effect reads the imported units'
);

select set_eq(
  format($$ select name, level::text from private.list_emergency_hospitals(%L, '2026-10-01') $$, :'oradea_id'),
  $$ values
    ('Spitalul Județean'::text, 'upu'::text),
    ('Spitalul Municipal'::text, 'upu'::text),
    ('Spitalul Închis'::text, 'cpu'::text) $$,
  'An earlier month still reads the units valid then'
);

select is(
  private.sync_emergency_hospitals(:'oradea_id', '2026-11-01', '[
    {"name": "Spitalul Județean", "level": "upu", "is_pediatric": false, "source_ref": "OMS nou", "lng": 21.9301, "lat": 47.0601},
    {"name": "Spitalul Municipal", "level": "cpu", "is_pediatric": false, "source_ref": "OMS nou", "lng": 21.92, "lat": 47.05}
  ]'::jsonb),
  '{"kept": 2, "closed": 1, "inserted": 0}'::jsonb,
  'Importing again on the same date removes a unit that opened that day instead of closing it'
);

select is(
  (select count(*)::integer from private.emergency_hospitals where city_id = :'oradea_id' and name = 'Spitalul de Copii'),
  0,
  'The removed unit leaves no empty validity range behind'
);

select is(
  private.sync_emergency_hospitals(:'oradea_id', '2026-11-01', '[
    {"name": "Spitalul Județean", "level": "upu", "is_pediatric": false, "source_ref": "OMS nou", "lng": 21.9301, "lat": 47.0601},
    {"name": "Spitalul Județean", "level": "upu", "is_pediatric": true, "source_ref": "OMS nou", "lng": 21.9302, "lat": 47.0602},
    {"name": "Spitalul Municipal", "level": "cpu", "is_pediatric": false, "source_ref": "OMS nou", "lng": 21.92, "lat": 47.05}
  ]'::jsonb),
  '{"kept": 2, "closed": 0, "inserted": 1}'::jsonb,
  'A new unit with the name of a kept one is still opened'
);

select results_eq(
  format($$ select is_pediatric from private.emergency_hospitals where city_id = %L and name = 'Spitalul Județean' and valid_to is null order by is_pediatric $$, :'oradea_id'),
  $$ values (false), (true) $$,
  'The adult and the pediatric unit of the same hospital are both open'
);

set local role authenticated;
set local request.jwt.claims = '{"role": "authenticated", "sub": "11111111-1111-1111-1111-111111111111"}';

select throws_ok(
  format($$ select private.sync_emergency_hospitals(%L, '2026-11-01', '[]'::jsonb) $$, :'oradea_id'),
  '42501', null, 'A signed-in user cannot import emergency units'
);

reset role;

select * from finish();
rollback;
