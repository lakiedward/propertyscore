begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

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

select * from finish();
rollback;
