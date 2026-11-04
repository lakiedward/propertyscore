begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

select results_eq(
  $$
    select
      params -> 'seismic' ->> 'code',
      params -> 'seismic' ->> 'precision',
      params -> 'seismic' ->> 'snap_m'
    from public.scoring_versions
    where kind = 'online' and label = 'v1'
  $$,
  $$ values ('P100-1/2013'::text, 'address'::text, '250'::text) $$,
  'The v1 formula carries the seismic parameters: P100-1/2013, value at the address, 250 m snap'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'private.seismic_zones'::regclass),
  'Row level security is enabled on the seismic zones'
);

select is(
  (select count(distinct city_id)::integer from private.seismic_zones where code = 'P100-1/2013'),
  9,
  'Every city has P100-1/2013 zones'
);

select ok(
  (select bool_and(extensions.st_isvalid(area::extensions.geometry)) from private.seismic_zones),
  'Every zone outline is a valid geometry'
);

select results_eq(
  $$ select slug, ag_g, zone_count from private.seismic_city_hazards('P100-1/2013') $$,
  $$ values
    ('bucuresti'::text, 0.30::numeric, 1),
    ('iasi', 0.25, 1),
    ('timisoara', 0.20, 1),
    ('constanta', 0.20, 1),
    ('craiova', 0.20, 1),
    ('sibiu', 0.20, 1),
    ('oradea', 0.15, 2),
    ('targu-mures', 0.15, 2),
    ('cluj-napoca', 0.10, 1) $$,
  'Each city gets the value at its centre, highest first, and Oradea and Târgu Mureș span two zones'
);

select results_eq(
  $$ select ag_g, distance_m from private.seismic_hazard_at(extensions.st_point(21.22571, 45.75372, 4326)::extensions.geography, 'P100-1/2013', 250) $$,
  $$ values (0.20::numeric, 0::double precision) $$,
  'The centre of Timișoara lies inside the 0,20 g zone'
);

select is(
  (select ag_g from private.seismic_hazard_at(extensions.st_point(21.95006, 47.00084, 4326)::extensions.geography, 'P100-1/2013', 250)),
  0.10::numeric,
  'A south-eastern address of Oradea lies in the 0,10 g zone, not in the city value'
);

select is(
  (select ag_g from private.seismic_hazard_at(extensions.st_point(24.55747, 46.57573, 4326)::extensions.geography, 'P100-1/2013', 250)),
  0.10::numeric,
  'A northern address of Târgu Mureș lies in the 0,10 g zone'
);

select is_empty(
  $$ select * from private.seismic_hazard_at(extensions.st_point(25.0, 46.0, 4326)::extensions.geography, 'P100-1/2013', 250) $$,
  'A point far from every city has no zone'
);

select is_empty(
  $$ select * from private.seismic_hazard_at(extensions.st_point(21.22571, 45.75372, 4326)::extensions.geography, 'P100-1/2025', 250) $$,
  'A code without zones returns nothing'
);

select throws_ok(
  $$ insert into private.seismic_zones (code, city_id, ag_g, area, source)
     select 'test', id, 0, extensions.st_multi(extensions.st_buffer(center::extensions.geometry, 0.01))::extensions.geography, 'test'
     from public.cities where slug = 'timisoara' $$,
  '23514',
  null,
  'The acceleration must be positive'
);

select throws_ok(
  $$ insert into private.seismic_zones (code, city_id, ag_g, area, source)
     select code, city_id, ag_g, area, source from private.seismic_zones where code = 'P100-1/2013' limit 1 $$,
  '23505',
  null,
  'A code has one outline per city and value'
);

set local role anon;

select throws_ok(
  $$ select count(*) from private.seismic_zones $$,
  '42501',
  null,
  'A visitor cannot read the seismic zones'
);

set local role authenticated;

select throws_ok(
  $$ select count(*) from private.seismic_zones $$,
  '42501',
  null,
  'A signed-in user cannot read the seismic zones'
);

select throws_ok(
  $$ select * from private.seismic_hazard_at(extensions.st_point(21.22, 45.75, 4326)::extensions.geography, 'P100-1/2013', 250) $$,
  '42501',
  null,
  'A signed-in user cannot call the hazard lookup'
);

select throws_ok(
  $$ select * from private.seismic_city_hazards('P100-1/2013') $$,
  '42501',
  null,
  'A signed-in user cannot call the city hazards'
);

select * from finish();

rollback;
