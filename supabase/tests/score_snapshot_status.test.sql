begin;

create extension if not exists pgtap with schema extensions;

select plan(20);

select ok(
  has_schema_privilege('snapshot_status_reader', 'snapshot_diagnostics', 'USAGE'),
  'The dedicated reader can access the diagnostics schema'
);
select ok(
  has_function_privilege('snapshot_status_reader', 'snapshot_diagnostics.read_score_snapshot_runtime(uuid)', 'EXECUTE'),
  'The dedicated reader can read exact execution metadata'
);
select ok(
  has_function_privilege('snapshot_status_reader', 'snapshot_diagnostics.read_score_snapshot_ads_attempts(uuid)', 'EXECUTE'),
  'The dedicated reader can read exact ADS attempts'
);
select ok(
  not has_schema_privilege('snapshot_status_reader', 'private', 'USAGE'),
  'The dedicated reader cannot access the worker schema'
);
select ok(
  not has_table_privilege('snapshot_status_reader', 'public.score_snapshots', 'UPDATE, INSERT, DELETE'),
  'The dedicated reader cannot change snapshots'
);
select ok(
  not has_table_privilege('snapshot_status_reader', 'private.score_snapshot_cams_attempts', 'UPDATE, INSERT, DELETE'),
  'The dedicated reader cannot change ADS attempts'
);
select ok(
  not has_table_privilege('snapshot_status_reader', 'private.score_snapshot_executions', 'UPDATE, INSERT, DELETE'),
  'The dedicated reader cannot change execution identity'
);
select ok(
  not has_schema_privilege('anon', 'snapshot_diagnostics', 'USAGE'),
  'Anonymous users cannot access diagnostics'
);
select ok(
  not has_schema_privilege('authenticated', 'snapshot_diagnostics', 'USAGE'),
  'Signed-in users cannot access diagnostics'
);
select ok(
  not has_schema_privilege('service_role', 'snapshot_diagnostics', 'USAGE'),
  'The browser API service role cannot access diagnostics'
);
select ok(
  not has_table_privilege('authenticated', 'private.score_snapshot_cams_attempts', 'SELECT'),
  'ADS attempts are not visible to signed-in users'
);
select ok(
  not has_table_privilege('anon', 'private.score_snapshot_executions', 'SELECT'),
  'Execution identities are not visible to anonymous users'
);

insert into public.score_snapshots (scoring_version_id, period, status, finished_at, error_code)
select id, '2027-01-01', 'failed', now(), 'test_fixture'
from public.scoring_versions where kind = 'online' and is_active
returning id as snapshot_id \gset

insert into private.score_snapshot_executions
  (snapshot_id, replica_id, valhalla_url, valhalla_ledger_id)
values
  (:'snapshot_id', 'deployment/replica', 'https://valhalla.example.test', '00000000-0000-4000-8000-000000000001');

insert into private.score_snapshot_cams_attempts (snapshot_id, ads_url)
values (:'snapshot_id', 'https://ads.example.test')
returning id as attempt_id \gset

select results_eq(
  format($$ select created_at, updated_at from private.score_snapshot_executions where snapshot_id = %L $$, :'snapshot_id'),
  $$ values (now(), now()) $$,
  'Execution timestamps default to the time of insertion'
);
select results_eq(
  format($$ select created_at, updated_at from private.score_snapshot_cams_attempts where id = %L $$, :'attempt_id'),
  $$ values (now(), now()) $$,
  'ADS attempt timestamps exist before the job ID is known'
);

update private.score_snapshot_executions
set valhalla_url = 'https://valhalla.example.test/registry', updated_at = '2000-01-01'
where snapshot_id = :'snapshot_id';
update private.score_snapshot_cams_attempts
set job_id = 'ads-job', updated_at = '2000-01-01'
where id = :'attempt_id';

select results_eq(
  format($$ select created_at, updated_at from private.score_snapshot_executions where snapshot_id = %L $$, :'snapshot_id'),
  $$ values (now(), now()) $$,
  'An execution update refreshes the modification time without changing the creation time'
);
select results_eq(
  format($$ select job_id, created_at, updated_at from private.score_snapshot_cams_attempts where id = %L $$, :'attempt_id'),
  $$ values ('ads-job'::text, now(), now()) $$,
  'Recording an ADS job ID refreshes the modification time without changing the creation time'
);

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select throws_ok(
  $$ select snapshot_id from private.score_snapshot_executions $$,
  '42501',
  null,
  'A visitor cannot read execution identities'
);
select throws_ok(
  $$ select job_id from private.score_snapshot_cams_attempts $$,
  '42501',
  null,
  'A visitor cannot read ADS attempts'
);

set local role authenticated;
set local request.jwt.claims = '{"role": "authenticated", "sub": "11111111-1111-1111-1111-111111111111"}';

select throws_ok(
  $$ select snapshot_id from private.score_snapshot_executions $$,
  '42501',
  null,
  'A signed-in user cannot read execution identities'
);
select throws_ok(
  $$ select job_id from private.score_snapshot_cams_attempts $$,
  '42501',
  null,
  'A signed-in user cannot read ADS attempts'
);

select * from finish();
rollback;
