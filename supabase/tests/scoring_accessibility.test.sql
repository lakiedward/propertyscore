begin;

create extension if not exists pgtap with schema extensions;

select plan(20);

update public.score_snapshots set status = 'failed', finished_at = now(), error_code = 'test_setup'
where status = 'building';

select id as sibiu_id from public.cities where slug = 'sibiu' \gset

select results_eq(
  $$
    select
      (params #>> '{accessibility,weights,access}')::integer,
      (params #>> '{accessibility,weights,travel}')::integer,
      (params #>> '{accessibility,weights,coverage}')::integer,
      (params #>> '{accessibility,modes,tram,radius_m}')::integer
    from public.scoring_versions
    where kind = 'online' and label = 'v1'
  $$,
  $$ values (40, 45, 15, 600) $$,
  'The v1 formula carries the accessibility parameters'
);

select isnt(
  (select params -> 'cell_size_m' from public.scoring_versions where kind = 'online' and label = 'v1'),
  null,
  'Adding the accessibility parameters keeps the other keys'
);

select private.build_grid_cells(:'sibiu_id', 175);
select private.start_score_snapshot('2026-11-01') as snapshot_id \gset
select private.seed_cell_scores(:'snapshot_id', :'sibiu_id');

insert into private.transit_stops (snapshot_id, city_id, stop_key, name, location, modes)
values (:'snapshot_id', :'sibiu_id', 'g0:piata-mare', 'Piața Mare', extensions.st_point(24.152, 45.797, 4326)::extensions.geography, array['bus']);

select lives_ok(
  format($$
    insert into private.transit_routes (snapshot_id, city_id, route_key, ref, mode, colour)
    values (%L, %L, 'g0:5', '5', 'trolleybus', '#E30613')
  $$, :'snapshot_id', :'sibiu_id'),
  'A trolleybus line with an upper-case colour is stored'
);

select throws_ok(
  format($$
    insert into private.transit_routes (snapshot_id, city_id, route_key, mode)
    values (%L, %L, 'g0:cfr', 'rail')
  $$, :'snapshot_id', :'sibiu_id'),
  '23514',
  null,
  'Only bus, trolleybus, tram and subway lines are stored'
);

select throws_ok(
  format($$
    insert into private.transit_stops (snapshot_id, city_id, stop_key, location, modes)
    values (%L, %L, 'g0:x', extensions.st_point(24.15, 45.79, 4326)::extensions.geography, array['bus', 'ferry'])
  $$, :'snapshot_id', :'sibiu_id'),
  '23514',
  null,
  'A stop lists only known modes'
);

select throws_ok(
  format($$
    insert into private.transit_stops (snapshot_id, city_id, stop_key, location, modes)
    values (%L, %L, 'g0:y', extensions.st_point(24.15, 45.79, 4326)::extensions.geography, '{}')
  $$, :'snapshot_id', :'sibiu_id'),
  '23514',
  null,
  'A stop has at least one mode'
);

select lives_ok(
  format($$
    insert into private.transit_stop_routes (snapshot_id, city_id, stop_key, route_key, direction_label, peak_departures_per_hour)
    values (%L, %L, 'g0:piata-mare', 'g0:5', 'Gară', 7.5)
  $$, :'snapshot_id', :'sibiu_id'),
  'A line is linked to a stop with its peak frequency'
);

select throws_ok(
  format($$
    insert into private.transit_stop_routes (snapshot_id, city_id, stop_key, route_key, direction_label)
    values (%L, %L, 'g0:missing', 'g0:5', 'Gară')
  $$, :'snapshot_id', :'sibiu_id'),
  '23503',
  null,
  'A stop-line link needs a stop of the same snapshot'
);

select throws_ok(
  format($$
    insert into private.key_destinations (city_id, kind, label_ro, label_en, location)
    values (%L, 'stadium', 'Stadion', 'Stadium', extensions.st_point(24.15, 45.79, 4326)::extensions.geography)
  $$, :'sibiu_id'),
  '23514',
  null,
  'Key destinations use the six known kinds'
);

select throws_ok(
  format($$
    insert into private.transit_feeds (snapshot_id, city_id, source, source_url, status)
    values (%L, %L, 'gtfs', 'https://example.org/gtfs.zip', 'expired')
  $$, :'snapshot_id', :'sibiu_id'),
  '23514',
  null,
  'A feed that was not used records why'
);

select throws_ok(
  format($$
    insert into private.cell_transit (snapshot_id, cell_id, s_access, data_quality)
    select %L, cell_id, 1.2, 'gtfs' from private.cell_scores where snapshot_id = %L limit 1
  $$, :'snapshot_id', :'snapshot_id'),
  '23514',
  null,
  'A component stays between 0 and 1'
);

with ordered as (
  select g.id, row_number() over (order by g.cell_key) - 1 as position
  from private.cell_scores cs
  join private.grid_cells g on g.id = cs.cell_id
  where cs.snapshot_id = :'snapshot_id'
),
encoded as (
  select string_agg(
    case
      when position = 0 then '0000'
      when position = 1 then '0011'
      when position = 2 then 'ffff'
      else lpad(to_hex(least(position, 90)::integer), 4, '0')
    end,
    '' order by position
  ) as hex
  from ordered
)
insert into private.cell_travel_matrix (snapshot_id, city_id, origin_cell_id, minutes)
select :'snapshot_id', :'sibiu_id', (select id from ordered where position = 0), decode(encoded.hex, 'hex')
from encoded;

select id as cell_0 from (
  select g.id, row_number() over (order by g.cell_key) - 1 as position
  from private.cell_scores cs join private.grid_cells g on g.id = cs.cell_id
  where cs.snapshot_id = :'snapshot_id'
) as ordered where position = 0 \gset

select id as cell_1 from (
  select g.id, row_number() over (order by g.cell_key) - 1 as position
  from private.cell_scores cs join private.grid_cells g on g.id = cs.cell_id
  where cs.snapshot_id = :'snapshot_id'
) as ordered where position = 1 \gset

select id as cell_2 from (
  select g.id, row_number() over (order by g.cell_key) - 1 as position
  from private.cell_scores cs join private.grid_cells g on g.id = cs.cell_id
  where cs.snapshot_id = :'snapshot_id'
) as ordered where position = 2 \gset

select is(
  private.transit_minutes(:'snapshot_id', :'cell_0', :'cell_1'),
  17::smallint,
  'The matrix row gives the minutes to a cell by its cell_key position'
);

select is(
  private.transit_minutes(:'snapshot_id', :'cell_0', :'cell_0'),
  0::smallint,
  'A cell reaches itself in zero minutes'
);

select is(
  private.transit_minutes(:'snapshot_id', :'cell_0', :'cell_2'),
  null::smallint,
  'An unreachable cell has no time'
);

select is(
  private.transit_minutes(:'snapshot_id', :'cell_1', :'cell_0'),
  null::smallint,
  'A cell without a matrix row has no time'
);

select throws_ok(
  format($$
    insert into private.cell_travel_matrix (snapshot_id, city_id, origin_cell_id, minutes)
    values (%L, %L, %L, '\x000102'::bytea)
  $$, :'snapshot_id', :'sibiu_id', :'cell_1'),
  '23514',
  null,
  'A matrix row holds whole two-byte values'
);

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select throws_ok(
  $$ select count(*) from private.transit_stops $$,
  '42501',
  null,
  'A visitor cannot read transit stops'
);

select throws_ok(
  $$ select count(*) from private.cell_travel_matrix $$,
  '42501',
  null,
  'A visitor cannot read the travel matrix'
);

set local role authenticated;
set local request.jwt.claims = '{"role": "authenticated", "sub": "11111111-1111-1111-1111-111111111111"}';

select throws_ok(
  $$ select count(*) from private.cell_transit $$,
  '42501',
  null,
  'A signed-in user cannot read the accessibility results'
);

select throws_ok(
  $$ select count(*) from private.key_destinations $$,
  '42501',
  null,
  'A signed-in user cannot read the key destinations'
);

select * from finish();
rollback;
