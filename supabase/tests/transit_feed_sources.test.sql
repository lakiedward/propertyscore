begin;

create extension if not exists pgtap with schema extensions;

select plan(4);

select results_eq(
  $$
    select c.slug, count(s.id)::integer
    from public.cities c
    left join private.transit_feed_sources s on s.city_id = c.id and s.is_active
    group by c.slug, c.position
    order by c.position
  $$,
  $$
    values
      ('timisoara', 1), ('bucuresti', 1), ('cluj-napoca', 1), ('iasi', 1), ('constanta', 1),
      ('craiova', 1), ('sibiu', 1), ('oradea', 1), ('targu-mures', 0)
  $$,
  'Every city except Târgu Mureș has one active GTFS feed'
);

select is_empty(
  $$ select id from private.transit_feed_sources where url !~ '^https://' or url !~ '\.zip$' $$,
  'Every feed is a ZIP archive downloaded over HTTPS'
);

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select throws_ok(
  $$ select count(*) from private.transit_feed_sources $$,
  '42501',
  null,
  'An anonymous visitor cannot read the GTFS feed sources'
);

set local role authenticated;
set local request.jwt.claims = '{"role": "authenticated", "sub": "11111111-1111-1111-1111-111111111111"}';

select throws_ok(
  $$ select count(*) from private.transit_feed_sources $$,
  '42501',
  null,
  'A signed-in user cannot read the GTFS feed sources'
);

select * from finish();
rollback;
