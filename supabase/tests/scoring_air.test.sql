begin;

create extension if not exists pgtap with schema extensions;

select plan(20);

update public.score_snapshots set status = 'failed', finished_at = now(), error_code = 'test_setup'
where status = 'building';

select id as sibiu_id from public.cities where slug = 'sibiu' \gset

select is(
  (select (params #>> '{air,weights,pm25}')::numeric from public.scoring_versions where kind = 'online' and label = 'v1'),
  0.7,
  'The v1 formula carries the air parameters'
);

select is(
  private.upsert_air_stations('[
    {"eoi_code": "RO9990A", "station_type": "background", "area_type": "urban", "longitude": 24.15192, "latitude": 45.79705, "active_from": "2010-01-01", "active_to": null},
    {"eoi_code": "RO9992A", "station_type": "background", "area_type": "rural", "longitude": 22.0, "latitude": 44.0, "active_from": null, "active_to": null}
  ]'::jsonb),
  2,
  'Stations are inserted from the EEA register'
);

select results_eq(
  $$ select eoi_code, city_id from private.air_stations where eoi_code in ('RO9990A', 'RO9992A') order by eoi_code $$,
  format($$ values ('RO9990A'::text, %L::uuid), ('RO9992A'::text, null::uuid) $$, :'sibiu_id'),
  'A station gets the covered city whose boundary contains it'
);

select is(
  private.upsert_air_stations('[
    {"eoi_code": "RO9990A", "station_type": "traffic", "area_type": "urban", "longitude": 24.15192, "latitude": 45.79705, "active_from": "2010-01-01", "active_to": "2026-01-01"}
  ]'::jsonb),
  1,
  'Importing a known station again updates it'
);

select results_eq(
  $$ select count(*)::integer, min(station_type) from private.air_stations where eoi_code = 'RO9990A' $$,
  $$ values (1, 'traffic'::text) $$,
  'A station is stored once per EEA code'
);

select throws_ok(
  $$ insert into private.air_station_months (station_id, pollutant, month, mean, valid_days, source)
     select id, 'pm25', '2026-01-15', 10, 30, 'eea_e1a' from private.air_stations where eoi_code = 'RO9990A' $$,
  '23514',
  null,
  'A station month starts on the first day'
);

select private.build_grid_cells(:'sibiu_id', 175);

select results_eq(
  $$
    select max(neighbours), mode() within group (order by neighbours)
    from (
      select count(*)::integer as neighbours
      from private.grid_cell_neighbours((select id from public.cities where slug = 'sibiu'), 175)
      group by cell_id
    ) as counts
  $$,
  $$ values (6, 6) $$,
  'A hexagon has at most six neighbours and inner hexagons have exactly six'
);

select is(
  (select count(*)::integer from private.grid_cell_neighbours(:'sibiu_id', 175) where cell_id = neighbour_id),
  0,
  'A cell is not its own neighbour'
);

select private.start_score_snapshot('2026-11-01') as snapshot_id \gset

select private.seed_cell_scores(:'snapshot_id', :'sibiu_id');

select (select cell_id from private.cell_scores where snapshot_id = :'snapshot_id' order by cell_id limit 1) as cell_id \gset

select lives_ok(
  format($$
    insert into private.cell_air (
      snapshot_id, cell_id, period_start, period_end, pm25_monthly, no2_monthly, pm25_annual,
      pm25_valid_months, no2_valid_months, spatial_method, score_raw, score_display, verdict_code
    ) values (
      %L, %L, '2025-11-01', '2026-10-31',
      array[11, 16, 22, 24, 19, 13, 9, 8, 7, 8, 8, null]::numeric[],
      array[null, null, null, null, null, null, null, null, null, null, null, null]::numeric[],
      13.2, 11, 0, 'eea_1km', 68, 70, 'winter_peaks'
    )
  $$, :'snapshot_id', :'cell_id'),
  'A cell stores 12 monthly values with gaps as null'
);

select throws_ok(
  format($$
    update private.cell_air set pm25_monthly = array[1, 2, 3]::numeric[]
    where snapshot_id = %L and cell_id = %L
  $$, :'snapshot_id', :'cell_id'),
  '23514',
  null,
  'A monthly series always has 12 positions'
);

select throws_ok(
  format($$
    insert into private.air_city_calibration (snapshot_id, city_id, pollutant, factor, stations_used, status)
    values (%L, %L, 'no2', 1.1, 0, 'calibrated')
  $$, :'snapshot_id', :'sibiu_id'),
  '23514',
  null,
  'A city is calibrated only when stations were used'
);

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select throws_ok(
  $$ select count(*) from private.cell_air $$,
  '42501',
  null,
  'A visitor cannot read the air cells'
);

select throws_ok(
  $$ select count(*) from private.air_stations $$,
  '42501',
  null,
  'A visitor cannot read the air stations'
);

select throws_ok(
  $$ select count(*) from private.air_station_months $$,
  '42501',
  null,
  'A visitor cannot read the station months'
);

select throws_ok(
  $$ select count(*) from private.air_city_calibration $$,
  '42501',
  null,
  'A visitor cannot read the city calibration'
);

set local role authenticated;
set local request.jwt.claims = '{"role": "authenticated", "sub": "11111111-1111-1111-1111-111111111111"}';

select throws_ok(
  $$ select count(*) from private.cell_air $$,
  '42501',
  null,
  'A signed-in user cannot read the air cells'
);

select throws_ok(
  $$ select count(*) from private.air_stations $$,
  '42501',
  null,
  'A signed-in user cannot read the air stations'
);

select throws_ok(
  $$ select count(*) from private.air_station_months $$,
  '42501',
  null,
  'A signed-in user cannot read the station months'
);

select throws_ok(
  $$ select count(*) from private.air_city_calibration $$,
  '42501',
  null,
  'A signed-in user cannot read the city calibration'
);

select throws_ok(
  $$ select private.upsert_air_stations('[]'::jsonb) $$,
  '42501',
  null,
  'A signed-in user cannot call the air functions'
);

select * from finish();
rollback;
