begin;

create extension if not exists pgtap with schema extensions;

select plan(32);

select results_eq(
  $$ select label, (select sum(value::numeric) from jsonb_each_text(weights)), params ->> 'cell_size_m' from public.scoring_versions where kind = 'online' and is_active $$,
  $$ values ('v3'::text, 100::numeric, '175'::text) $$,
  'The active online formula v3 has weights summing to 100 and a 175 m cell'
);

select throws_ok(
  $$ insert into public.scoring_versions (kind, label, is_active, activated_at) values ('online', 'v9', true, now()) $$,
  '23505',
  null,
  'Only one formula version is active per kind'
);

select throws_ok(
  $$ insert into public.scoring_versions (kind, label, is_active) values ('online', 'v8', true) $$,
  '23514',
  null,
  'An active formula version has an activation date'
);

select lives_ok(
  $$ update public.scoring_versions set params = params || '{"green": {"share_cap": 0.3}}' where label = 'v3' $$,
  'A formula version no snapshot uses can still change'
);

update public.score_snapshots set status = 'failed', finished_at = now(), error_code = 'test_setup'
where status = 'building';

select private.start_score_snapshot('2026-11-17') as first_id \gset

select results_eq(
  format($$ select status::text, period from public.score_snapshots where id = %L $$, :'first_id'),
  $$ values ('building'::text, '2026-11-01'::date) $$,
  'A snapshot starts building for the first day of its month'
);

select throws_ok(
  $$ select private.start_score_snapshot('2026-11-01') $$,
  'P0001',
  'snapshot_legacy_unconfirmed',
  'A second build cannot start while one is building'
);

select throws_ok(
  $$ update public.scoring_versions set weights = weights || '{"green": 20}' where label = 'v3' $$,
  'P0001',
  'scoring_version_in_use',
  'A formula version used by a snapshot is frozen'
);

select lives_ok(
  $$ update public.scoring_versions set is_active = is_active where label = 'v3' $$,
  'A used formula version can still be touched without changing its formula'
);

select private.build_grid_cells(c.id, 175)
from public.cities c
where c.has_online_coverage;

create temporary table station_cells as
select c.slug, private.find_grid_cell(d.location, 175) as cell_id
from public.cities c
join private.key_destinations d on d.city_id = c.id and d.kind = 'station' and d.is_active
where c.has_online_coverage;

select is(count(cell_id), 9::bigint, 'All nine reference stations resolve to grid cells')
from station_cells;

insert into private.cell_scores (snapshot_id, cell_id, categories)
select :'first_id', cell_id, '{"green": 60}' from station_cells;
select private.compute_overall_scores(:'first_id');
select private.compute_snapshot_stats(:'first_id');

select lives_ok(
  format($$ select private.publish_score_snapshot(%L, '{"osm": "2026-11-01"}') $$, :'first_id'),
  'A snapshot with a score at all nine stations can be published'
);

select results_eq(
  $$ select private.current_score_snapshot_id() $$,
  format($$ values (%L::uuid) $$, :'first_id'),
  'The published snapshot is the current one'
);

select throws_ok(
  format($$ select private.publish_score_snapshot(%L, '{}') $$, :'first_id'),
  'P0001',
  'snapshot_not_building',
  'A snapshot is published only once'
);

select private.start_score_snapshot('2026-12-01') as second_id \gset

insert into private.cell_scores (snapshot_id, cell_id, categories)
select :'second_id', cell_id, '{"green": 60}' from station_cells where slug <> 'sibiu';
select private.compute_overall_scores(:'second_id');
select private.compute_snapshot_stats(:'second_id');

select throws_ok(
  format($$ select private.publish_score_snapshot(%L, '{}') $$, :'second_id'),
  'P0001',
  'snapshot_incomplete_city_coverage',
  'A candidate missing a supported city cannot publish'
);

insert into private.cell_scores (snapshot_id, cell_id)
select :'second_id', g.id
from private.grid_cells g
join public.cities c on c.id = g.city_id
where c.slug = 'sibiu' and g.size_m = 175
  and g.id <> (select cell_id from station_cells where slug = 'sibiu')
order by g.cell_key
limit 1;
select private.compute_snapshot_stats(:'second_id');

select throws_ok(
  format($$ select private.publish_score_snapshot(%L, '{}') $$, :'second_id'),
  'P0001',
  'snapshot_incomplete_city_coverage',
  'A supported city with only empty score rows cannot publish'
);

update private.cell_scores cs
set categories = '{"green": 60}'
from private.grid_cells g
join public.cities c on c.id = g.city_id
where cs.snapshot_id = :'second_id' and cs.cell_id = g.id and c.slug = 'sibiu';

insert into private.cell_scores (snapshot_id, cell_id)
select :'second_id', cell_id from station_cells where slug = 'sibiu';
select private.compute_overall_scores(:'second_id');
select private.compute_snapshot_stats(:'second_id');

select throws_ok(
  format($$ select private.publish_score_snapshot(%L, '{}') $$, :'second_id'),
  'P0001',
  'snapshot_unscored_reference_points',
  'All cities have scores but an unscored reference station blocks publication'
);

select results_eq(
  format($$ select status::text from public.score_snapshots where id in (%L, %L) order by period $$, :'first_id', :'second_id'),
  $$ values ('ready'::text), ('building') $$,
  'A rejected candidate never replaces the current ready snapshot'
);

update private.cell_scores
set categories = '{"green": 60}'
where snapshot_id = :'second_id' and cell_id = (select cell_id from station_cells where slug = 'sibiu');
select private.compute_overall_scores(:'second_id');
select private.compute_snapshot_stats(:'second_id');
select private.publish_score_snapshot(:'second_id', '{}');

select results_eq(
  format($$ select status::text from public.score_snapshots where id in (%L, %L) order by period $$, :'first_id', :'second_id'),
  $$ values ('superseded'::text), ('ready') $$,
  'Publishing a new snapshot supersedes the previous one'
);

select private.start_score_snapshot('2027-01-01') as failed_id \gset
select private.fail_score_snapshot(:'failed_id', 'osmium_failed');

select results_eq(
  format($$ select status::text, error_code, finished_at is not null from public.score_snapshots where id = %L $$, :'failed_id'),
  $$ values ('failed'::text, 'osmium_failed'::text, true) $$,
  'A failed build keeps its error code and does not replace the current snapshot'
);

select private.start_score_snapshot('2027-02-01') as stale_id \gset
update public.score_snapshots set started_at = now() - interval '13 hours' where id = :'stale_id';
select throws_ok(
  $$ select private.start_score_snapshot('2027-02-01') $$,
  'P0001',
  'snapshot_legacy_unconfirmed',
  'A legacy worker cannot take over an old unconfirmed build'
);

select throws_ok(
  $$ select private.start_score_snapshot('2027-02-01', true) $$,
  'P0001',
  'snapshot_legacy_unconfirmed',
  'Elapsed time is not proof that a legacy build ended'
);

select results_eq(
  format($$ select status::text, error_code, finished_at from public.score_snapshots where id = %L $$, :'stale_id'),
  $$ values ('building'::text, null::text, null::timestamptz) $$,
  'Both rejected starts leave the old candidate untouched'
);

select private.fail_score_snapshot(:'stale_id', 'test_setup');
select private.start_score_snapshot('2027-02-01', true) as owned_id \gset

select ok(
  (select uses_worker_lock from public.score_snapshots where id = :'owned_id'),
  'A candidate started with the new worker is marked as session-owned'
);

select throws_ok(
  $$ select private.start_score_snapshot('2027-02-01', true) $$,
  'P0001',
  'snapshot_already_building',
  'The session owning a build cannot start another candidate'
);

select ok(
  not has_function_privilege('anon', 'private.start_score_snapshot(date,boolean)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'private.start_score_snapshot(date,boolean)', 'EXECUTE'),
  'Visitors and signed-in users cannot start a session-owned build'
);

select pg_advisory_unlock_shared(hashtext('propertyscore.snapshot') & 2147483647, 1);
update public.score_snapshots
set routing_pending = true, started_at = now() - interval '13 hours'
where id = :'owned_id';

select throws_ok(
  $$ select private.start_score_snapshot('2027-02-01', true) $$,
  'P0001',
  'snapshot_routing_unconfirmed',
  'A lost session and an expired build do not prove that external routing stopped'
);

select throws_ok(
  $$ select private.start_score_snapshot('2027-02-01') $$,
  'P0001',
  'snapshot_routing_unconfirmed',
  'A legacy worker cannot bypass the routing guard'
);

select is(
  (select id from public.score_snapshots where status = 'ready'),
  :'second_id'::uuid,
  'The routing guard leaves the existing ready snapshot alone'
);

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select throws_ok(
  $$ select id from public.score_snapshots $$,
  '42501',
  null,
  'A visitor cannot read snapshots'
);

select throws_ok(
  $$ select id from public.scoring_versions $$,
  '42501',
  null,
  'A visitor cannot read formula versions'
);

set local role authenticated;
set local request.jwt.claims = '{"role": "authenticated", "sub": "11111111-1111-1111-1111-111111111111"}';

select throws_ok(
  $$ select id from public.score_snapshots $$,
  '42501',
  null,
  'A signed-in user cannot read snapshots'
);

select throws_ok(
  $$ select id from public.scoring_versions $$,
  '42501',
  null,
  'A signed-in user cannot read formula versions'
);

select throws_ok(
  $$ update public.scoring_versions set weights = '{}' $$,
  '42501',
  null,
  'A signed-in user cannot change formula versions'
);

select * from finish();
rollback;
