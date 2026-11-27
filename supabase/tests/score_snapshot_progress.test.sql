begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

select is(
  (select count(*)::int
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'private' and c.relrowsecurity
      and c.relname in ('score_snapshot_progress', 'score_snapshot_generations',
        'score_snapshot_steps', 'score_snapshot_requests')),
  4, 'All worker journal tables have RLS'
);
select ok(
  not has_table_privilege('service_role', 'private.score_snapshot_requests', 'SELECT, INSERT, UPDATE, DELETE'),
  'The API service role cannot read or write the request journal'
);
select ok(
  not has_function_privilege('authenticated', 'snapshot_diagnostics.read_score_snapshot_requests(uuid, uuid)', 'EXECUTE'),
  'Signed-in users cannot list request identities'
);
select ok(
  has_function_privilege('snapshot_status_reader', 'snapshot_diagnostics.read_score_snapshot_progress(uuid)', 'EXECUTE'),
  'The dedicated reader can inspect checkpoint progress'
);
select ok(
  has_function_privilege('snapshot_status_reader', 'snapshot_diagnostics.read_score_snapshot_requests(uuid, uuid)', 'EXECUTE'),
  'The dedicated reader can inspect paginated request metadata'
);
select ok(
  not has_table_privilege('snapshot_status_reader', 'private.score_snapshot_steps', 'SELECT, INSERT, UPDATE, DELETE'),
  'The dedicated reader has no table access to checkpoint results'
);

insert into public.score_snapshots (scoring_version_id, period, status, finished_at, error_code)
select id, '2099-07-01', 'failed', now(), 'test_fixture'
from public.scoring_versions where kind = 'online' and is_active
returning id as snapshot_id \gset

select snapshot_diagnostics.read_score_snapshot_progress(:'snapshot_id'::uuid) -> 'plan_sha256' as plan_sha256,
  snapshot_diagnostics.read_score_snapshot_requests(:'snapshot_id'::uuid, null) as requests \gset

select is(
  :'plan_sha256'::jsonb,
  'null'::jsonb, 'An old snapshot has no recorded recovery plan'
);
select is(
  :'requests'::jsonb,
  '[]'::jsonb, 'An old snapshot has no checkpointed requests'
);

select * from finish();

rollback;
