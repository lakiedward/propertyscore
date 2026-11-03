begin;

create extension if not exists pgtap with schema extensions;

select plan(12);


select id as sibiu_id from public.cities where slug = 'sibiu' \gset

select ok(
  (select params -> 'health' ? 'layers' from public.scoring_versions where kind = 'online' and label = 'v1'),
  'The v1 formula carries the Health parameters'
);

insert into private.emergency_hospitals (city_id, name, location, level, is_pediatric, source_ref, valid_from, valid_to)
values
  (:'sibiu_id', 'Spitalul Clinic Județean de Urgență Sibiu', extensions.st_point(24.1395, 45.7866, 4326)::extensions.geography, 'upu', false, 'OMS 1706/2007', '2020-01-01', null),
  (:'sibiu_id', 'Spitalul Clinic de Pediatrie Sibiu', extensions.st_point(24.1452, 45.7935, 4326)::extensions.geography, 'upu', true, 'OMS 1706/2007', '2020-01-01', null),
  (:'sibiu_id', 'Unitate închisă', extensions.st_point(24.15, 45.79, 4326)::extensions.geography, 'cpu', false, 'OMS 1706/2007', '2015-01-01', '2024-06-01'),
  (:'sibiu_id', 'Unitate viitoare', extensions.st_point(24.15, 45.79, 4326)::extensions.geography, 'cpu', false, 'OMS 1706/2007', '2027-01-01', null);

select results_eq(
  format($$ select name, level::text, is_pediatric from private.list_emergency_hospitals(%L, '2026-11-01') $$, :'sibiu_id'),
  $$ values
    ('Spitalul Clinic de Pediatrie Sibiu'::text, 'upu'::text, true),
    ('Spitalul Clinic Județean de Urgență Sibiu'::text, 'upu'::text, false) $$,
  'Only the emergency units valid in the snapshot month are listed'
);

select throws_ok(
  format($$ insert into private.emergency_hospitals (city_id, name, location, level, source_ref, valid_from, valid_to)
    values (%L, 'X', extensions.st_point(24.1, 45.8, 4326)::extensions.geography, 'upu', 'x', '2026-01-01', '2025-01-01') $$, :'sibiu_id'),
  '23514',
  null,
  'An emergency unit cannot close before it opens'
);

insert into private.cnas_providers (city_id, kind, name, location, list_date, source_ref)
values
  (:'sibiu_id', 'pharmacy', 'Farmacia Veche', extensions.st_point(24.15, 45.79, 4326)::extensions.geography, '2026-06-30', 'cas-sibiu-2026-06.xlsx'),
  (:'sibiu_id', 'pharmacy', 'Farmacia Nouă', extensions.st_point(24.151, 45.791, 4326)::extensions.geography, '2026-09-30', 'cas-sibiu-2026-09.xlsx'),
  (:'sibiu_id', 'family_doctor', 'Dr. Fără Adresă', null, '2026-09-30', 'cas-sibiu-2026-09.xlsx'),
  (:'sibiu_id', 'pharmacy', 'Farmacia Viitoare', null, '2026-12-31', 'cas-sibiu-2026-12.xlsx');

select results_eq(
  format($$ select name, longitude is null from private.list_cnas_providers(%L, '2026-11-01') $$, :'sibiu_id'),
  $$ values ('Farmacia Nouă'::text, false), ('Dr. Fără Adresă'::text, true) $$,
  'Only the latest CNAS list published before the snapshot is read, ungeocoded rows included'
);

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select throws_ok($$ select count(*) from private.emergency_hospitals $$, '42501', null, 'A visitor cannot read the emergency units');
select throws_ok($$ select count(*) from private.cnas_providers $$, '42501', null, 'A visitor cannot read the CNAS providers');
select throws_ok(
  format($$ select * from private.list_emergency_hospitals(%L, '2026-11-01') $$, :'sibiu_id'),
  '42501', null, 'A visitor cannot call the Health functions'
);

set local role authenticated;
set local request.jwt.claims = '{"role": "authenticated", "sub": "11111111-1111-1111-1111-111111111111"}';

select throws_ok($$ select count(*) from private.emergency_hospitals $$, '42501', null, 'A signed-in user cannot read the emergency units');
select throws_ok($$ select count(*) from private.cnas_providers $$, '42501', null, 'A signed-in user cannot read the CNAS providers');
select throws_ok(
  format($$ select * from private.list_cnas_providers(%L, '2026-11-01') $$, :'sibiu_id'),
  '42501', null, 'A signed-in user cannot list the CNAS providers'
);

reset role;

select ok(
  (select relrowsecurity from pg_class where oid = 'private.emergency_hospitals'::regclass),
  'Row level security is on for the emergency units'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'private.cnas_providers'::regclass),
  'Row level security is on for the CNAS providers'
);

select * from finish();
rollback;
