begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

select results_eq(
  $$ select slug from public.cities order by position $$,
  $$
    values
      ('timisoara'::text), ('bucuresti'), ('cluj-napoca'), ('iasi'), ('constanta'),
      ('craiova'), ('sibiu'), ('oradea'), ('targu-mures')
  $$,
  'The nine SmartCheck cities are seeded in the plan order'
);

select ok(
  (select bool_and(has_online_coverage) from public.cities),
  'Every seeded city has online coverage'
);

select ok(
  (
    select bool_and(extensions.st_covers(boundary, center))
    from public.cities
  ),
  'Every coverage area contains its city centre'
);

select is(
  (select name from public.cities where slug = 'targu-mures'),
  'Târgu Mureș',
  'City names keep their diacritics'
);

select throws_ok(
  $$
    insert into public.cities (slug, name, county, center, boundary)
    values (
      'Brasov', 'Brașov', 'Brașov',
      extensions.st_point(25.6, 45.65, 4326)::extensions.geography,
      extensions.st_multi(extensions.st_buffer(extensions.st_point(25.6, 45.65, 4326)::extensions.geography, 1000)::extensions.geometry)::extensions.geography
    )
  $$,
  '23514',
  null,
  'A city slug is lowercase kebab-case'
);

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select is(
  (select count(*)::integer from public.cities),
  9,
  'A visitor reads every city'
);

select throws_ok(
  $$ update public.cities set has_field_team = true $$,
  '42501',
  null,
  'A visitor cannot change a city'
);

set local role authenticated;
set local request.jwt.claims = '{"role": "authenticated", "sub": "11111111-1111-1111-1111-111111111111"}';

select is(
  (select count(*)::integer from public.cities),
  9,
  'A signed-in user reads every city'
);

select throws_ok(
  $$ delete from public.cities where slug = 'sibiu' $$,
  '42501',
  null,
  'A signed-in user cannot delete a city'
);

select * from finish();
rollback;
