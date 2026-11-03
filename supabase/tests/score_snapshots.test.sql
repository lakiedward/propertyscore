begin;

create extension if not exists pgtap with schema extensions;

select plan(18);

select results_eq(
  $$ select label, (select sum(value::numeric) from jsonb_each_text(weights)), params ->> 'cell_size_m' from public.scoring_versions where kind = 'online' and is_active $$,
  $$ values ('v1'::text, 100::numeric, '175'::text) $$,
  'The active online formula v1 has weights summing to 100 and a 175 m cell'
);

select throws_ok(
  $$ insert into public.scoring_versions (kind, label, is_active, activated_at) values ('online', 'v2', true, now()) $$,
  '23505',
  null,
  'Only one formula version is active per kind'
);

select throws_ok(
  $$ insert into public.scoring_versions (kind, label, is_active) values ('online', 'v3', true) $$,
  '23514',
  null,
  'An active formula version has an activation date'
);

select lives_ok(
  $$ update public.scoring_versions set params = params || '{"green": {"share_cap": 0.3}}' where label = 'v1' $$,
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
  'snapshot_already_building',
  'A second build cannot start while one is building'
);

select throws_ok(
  $$ update public.scoring_versions set weights = weights || '{"green": 20}' where label = 'v1' $$,
  'P0001',
  'scoring_version_in_use',
  'A formula version used by a snapshot is frozen'
);

select lives_ok(
  $$ update public.scoring_versions set is_active = is_active where label = 'v1' $$,
  'A used formula version can still be touched without changing its formula'
);

select lives_ok(
  format($$ select private.publish_score_snapshot(%L, '{"osm": "2026-11-01"}') $$, :'first_id'),
  'A building snapshot can be published'
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
select private.start_score_snapshot('2027-02-01') as fresh_id \gset

select results_eq(
  format($$ select status::text, error_code from public.score_snapshots where id = %L $$, :'stale_id'),
  $$ values ('failed'::text, 'abandoned'::text) $$,
  'A build left running for more than 12 hours is abandoned when a new one starts'
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
  $$ update public.scoring_versions set weights = '{}' $$,
  '42501',
  null,
  'A signed-in user cannot change formula versions'
);

select * from finish();
rollback;
