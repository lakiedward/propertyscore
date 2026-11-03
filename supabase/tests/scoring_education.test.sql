begin;

create extension if not exists pgtap with schema extensions;

select plan(24);

update public.score_snapshots set status = 'failed', finished_at = now(), error_code = 'test_setup'
where status = 'building';

select id as sibiu_id from public.cities where slug = 'sibiu' \gset

select is(
  (select params -> 'education' -> 'levels' -> 'school' ->> 'weight' from public.scoring_versions where kind = 'online' and label = 'v1'),
  '45',
  'The v1 formula carries the education parameters'
);

select is(
  private.upsert_education_institutions(
    :'sibiu_id',
    '2026-11-01',
    $$[
      {"siiir_code": "3261100001", "osm_ref": "osm:way/10", "name": "Școala Gimnazială nr. 1", "levels": ["primary", "lower_secondary"], "ownership": "public", "lng": 24.1500, "lat": 45.7970, "location_precision": "osm", "match_status": "matched", "source_date": "2026-09-01"},
      {"siiir_code": "3261100002", "parent_siiir_code": "3261100001", "name": "Grădinița PP 3", "levels": ["kindergarten"], "match_status": "siiir_only", "source_date": "2026-09-01"},
      {"osm_ref": "osm:node/20", "name": "Liceul Teoretic X", "levels": ["upper_secondary"], "lng": 24.1550, "lat": 45.7990, "location_precision": "osm", "match_status": "osm_only"}
    ]$$::jsonb
  ),
  3,
  'The import writes every register row'
);

select is(
  (select count(*)::integer from private.education_institutions where city_id = :'sibiu_id'),
  3,
  'Three units are registered for Sibiu'
);

select private.upsert_education_institutions(
  :'sibiu_id',
  '2026-11-01',
  $$[{"siiir_code": "3261100001", "osm_ref": "osm:way/10", "name": "Școala Gimnazială nr. 1 Sibiu", "levels": ["primary", "lower_secondary"], "ownership": "public", "lng": 24.1500, "lat": 45.7970, "location_precision": "osm", "match_status": "matched"}]$$::jsonb
);

select is(
  (select name from private.education_institutions where siiir_code = '3261100001'),
  'Școala Gimnazială nr. 1 Sibiu',
  'Importing the same unit again updates it instead of adding a row'
);

select private.upsert_education_institutions(
  :'sibiu_id',
  '2026-11-01',
  $$[{"siiir_code": "3261100003", "osm_ref": "osm:node/20", "name": "Liceul Teoretic X", "levels": ["upper_secondary"], "ownership": "public", "lng": 24.1550, "lat": 45.7990, "location_precision": "osm", "match_status": "matched"}]$$::jsonb
);

select is(
  (select count(*)::integer from private.education_institutions where osm_ref = 'osm:node/20'),
  1,
  'An OSM-only unit later found in the register becomes one matched unit'
);

select is(
  (select siiir_code from private.education_institutions where osm_ref = 'osm:node/20'),
  '3261100003',
  'The matched unit keeps the register code'
);

update private.education_institutions
set match_status = 'excluded', reviewed_at = now()
where siiir_code = '3261100003';

select private.upsert_education_institutions(
  :'sibiu_id',
  '2026-11-01',
  $$[{"siiir_code": "3261100003", "osm_ref": "osm:node/20", "name": "Liceul Teoretic X", "levels": ["upper_secondary"], "lng": 24.1600, "lat": 45.8000, "location_precision": "osm", "match_status": "matched"}]$$::jsonb
);

select is(
  (select match_status from private.education_institutions where siiir_code = '3261100003'),
  'excluded',
  'A manual review decision survives the next import'
);

select private.upsert_education_institutions(
  :'sibiu_id',
  '2026-11-01',
  $$[{"siiir_code": "3261100004", "osm_ref": "osm:way/10", "name": "Școala Gimnazială nr. 4", "levels": ["primary", "lower_secondary"], "lng": 24.1500, "lat": 45.7970, "location_precision": "osm", "match_status": "matched"}]$$::jsonb
);

select is(
  (select siiir_code from private.education_institutions where osm_ref = 'osm:way/10'),
  '3261100004',
  'An OSM unit matched to another register code moves to it instead of failing the import'
);

select is(
  (select match_status || ':' || coalesce(osm_ref, '-') from private.education_institutions where siiir_code = '3261100001'),
  'siiir_only:-',
  'The previous holder of the OSM unit becomes a register-only unit'
);

select private.upsert_education_institutions(
  :'sibiu_id',
  '2026-11-01',
  $$[{"siiir_code": "3261100005", "osm_ref": "osm:node/20", "name": "Liceul Teoretic Y", "levels": ["upper_secondary"], "lng": 24.1550, "lat": 45.7990, "location_precision": "osm", "match_status": "matched"}]$$::jsonb
);

select is(
  (select coalesce(n.osm_ref, '-') || ':' || o.siiir_code || ':' || coalesce(n.location_precision, '-')
   from private.education_institutions n, private.education_institutions o
   where n.siiir_code = '3261100005' and o.osm_ref = 'osm:node/20'),
  '-:3261100003:-',
  'A reviewed unit keeps its OSM unit and the newcomer stays register-only, without its position'
);

insert into private.education_institutions (city_id, osm_ref, name, levels, location, location_precision, match_status, last_seen_on, reviewed_at)
values (:'sibiu_id', 'osm:node/30', 'Grădinița Z', '{kindergarten}', extensions.st_point(24.151, 45.798, 4326)::extensions.geography, 'osm', 'manual', '2026-10-01', now());

select private.upsert_education_institutions(
  :'sibiu_id',
  '2026-10-01',
  $$[{"siiir_code": "3261100006", "osm_ref": "osm:node/30", "name": "Grădinița PP 6", "levels": ["kindergarten"], "lng": 24.151, "lat": 45.798, "location_precision": "osm", "match_status": "matched"}]$$::jsonb
);

select is(
  (select siiir_code || ':' || match_status from private.education_institutions where osm_ref = 'osm:node/30'),
  '3261100006:manual',
  'A reviewed OSM unit gets the register code once it is matched'
);

select throws_ok(
  $$ select private.upsert_education_institutions('00000000-0000-4000-8000-000000000000', '2026-11-01', '[]') $$,
  'P0001',
  'city_not_found',
  'Units are imported only for a known city'
);

select throws_ok(
  format($$ insert into private.education_institutions (city_id, name, levels, match_status, last_seen_on) values (%L, 'Fără cod', '{primary}', 'siiir_only', '2026-11-01') $$, :'sibiu_id'),
  '23514',
  null,
  'A unit needs a register code or an OSM reference'
);

select throws_ok(
  format($$ insert into private.education_institutions (city_id, siiir_code, name, levels, match_status, last_seen_on) values (%L, '3261100001', 'Dublură', '{primary}', 'siiir_only', '2026-11-01') $$, :'sibiu_id'),
  '23505',
  null,
  'A register code belongs to one unit'
);

select throws_ok(
  format($$ insert into private.education_institutions (city_id, osm_ref, name, levels, match_status, last_seen_on) values (%L, 'osm:node/99', 'Fără poziție', '{primary}', 'osm_only', '2026-11-01') $$, :'sibiu_id'),
  '23514',
  null,
  'An OSM unit always has a position'
);

select throws_ok(
  format($$ insert into private.education_institutions (city_id, osm_ref, name, levels, ownership, location, location_precision, match_status, last_seen_on) values (%L, 'osm:node/98', 'X', '{primary}', 'church', extensions.st_point(24.15, 45.79, 4326)::extensions.geography, 'osm', 'osm_only', '2026-11-01') $$, :'sibiu_id'),
  '23514',
  null,
  'Ownership is public, private or unknown'
);

select throws_ok(
  format($$ insert into private.education_institutions (city_id, osm_ref, name, levels, match_status, last_seen_on) values (%L, 'osm:node/97', 'X', '{}', 'osm_only', '2026-11-01') $$, :'sibiu_id'),
  '23514',
  null,
  'A unit has at least one level'
);

select private.start_score_snapshot('2026-11-01') as snapshot_id \gset
select private.build_grid_cells(:'sibiu_id', 175);
select private.seed_cell_scores(:'snapshot_id', :'sibiu_id');

select is(
  private.copy_education_pois(:'snapshot_id', :'sibiu_id', '2026-11-01'),
  2,
  'Placed, not excluded units seen in this import or reviewed reach the points of interest, once per category'
);

select is(
  (select category from private.poi_features where snapshot_id = :'snapshot_id' and source_ref = 'siiir:3261100004'),
  'education_school',
  'Primary and lower secondary levels share the school category'
);

select is(
  private.copy_education_pois(:'snapshot_id', :'sibiu_id', '2026-11-01'),
  0,
  'Copying twice adds no points'
);

select ok(
  (select count(distinct cell_id) > 0 and bool_and(straight_m <= 1500)
   from private.education_candidates(:'snapshot_id', :'sibiu_id', 'education_school', 1500, 12)),
  'Cells near the school get it as a candidate, inside the search radius'
);

set local role anon;

select throws_ok(
  $$ select count(*) from private.education_institutions $$,
  '42501',
  null,
  'A visitor cannot read the education register'
);

set local role authenticated;
set local request.jwt.claims = '{"role": "authenticated", "sub": "11111111-1111-1111-1111-111111111111"}';

select throws_ok(
  $$ select count(*) from private.education_institutions $$,
  '42501',
  null,
  'A signed-in user cannot read the education register'
);

select throws_ok(
  $$ select private.upsert_education_institutions('00000000-0000-4000-8000-000000000000', '2026-11-01', '[]') $$,
  '42501',
  null,
  'A signed-in user cannot import units'
);

select * from finish();
rollback;
