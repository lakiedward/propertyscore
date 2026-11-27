begin;

create extension if not exists pgtap with schema extensions;
select plan(18);

select is(
  (select count(*) from pg_catalog.pg_roles where rolname in ('smart_check_report_worker', 'smart_check_snapshot_worker')
    and not rolcanlogin and not rolsuper and not rolbypassrls), 2::bigint,
  'Worker group roles have neither login nor RLS bypass'
);
select ok(
  has_table_privilege('smart_check_report_worker', 'private.legacy_report_institutions', 'SELECT')
    and not has_table_privilege('smart_check_report_worker', 'private.legacy_report_institutions', 'UPDATE'),
  'Report workers can read but not modify frozen school details'
);
select ok(
  has_function_privilege('smart_check_snapshot_worker', 'private.freeze_checkpoint_industry_inputs(uuid,smallint)', 'EXECUTE')
    and not has_table_privilege('smart_check_snapshot_worker', 'private.report_industry_snapshot_inputs', 'INSERT'),
  'Snapshot workers can freeze but not insert arbitrary Industry inputs'
);
select ok(
  has_function_privilege('smart_check_snapshot_worker', 'private.publish_checkpointed_score_snapshot(uuid,uuid,jsonb)', 'EXECUTE')
    and not has_function_privilege('smart_check_report_worker', 'private.publish_checkpointed_score_snapshot(uuid,uuid,jsonb)', 'EXECUTE'),
  'Only the snapshot worker group receives the checkpoint publication entry point'
);
select ok(
  not has_function_privilege('smart_check_snapshot_worker', 'private.handle_new_user()', 'EXECUTE')
    and not has_function_privilege('smart_check_report_worker', 'private.handle_new_user()', 'EXECUTE'),
  'Worker groups cannot execute the sign-up trigger function'
);
select ok(
  not has_function_privilege('smart_check_snapshot_worker', 'private.capture_legacy_report_cutover(uuid)', 'EXECUTE')
    and not has_function_privilege('smart_check_report_worker', 'private.open_legacy_report_cutover(uuid,timestamp with time zone)', 'EXECUTE'),
  'The capture and reopening functions stay operator-only'
);
select ok(
  has_function_privilege('smart_check_report_worker', 'private.attach_online_report_pdf(uuid,text)', 'EXECUTE')
    and not has_column_privilege('smart_check_report_worker', 'public.online_reports', 'pdf_path', 'UPDATE')
    and not has_function_privilege('authenticated', 'private.attach_online_report_pdf(uuid,text)', 'EXECUTE'),
  'The report worker attaches the primary PDF only through the controlled function'
);
select ok(
  not has_table_privilege('smart_check_snapshot_worker', 'private.legacy_report_institutions', 'SELECT')
    and not has_column_privilege('smart_check_snapshot_worker', 'public.score_snapshots', 'source_dates', 'UPDATE'),
  'The snapshot worker does not read copied school details or write published provenance directly'
);
select ok(
  not has_function_privilege('service_role', 'private.publish_checkpointed_score_snapshot(uuid,uuid,jsonb)', 'EXECUTE')
    and not has_table_privilege('service_role', 'private.industry_snapshot_source', 'SELECT'),
  'The API service role receives no access to the checkpoint or the transition tables'
);
select ok(
  not has_column_privilege('smart_check_snapshot_worker', 'private.education_institutions', 'reviewed_by', 'UPDATE')
    and not has_column_privilege('smart_check_snapshot_worker', 'private.education_institutions', 'reviewed_at', 'INSERT'),
  'The school importer cannot write review metadata'
);

set local role anon;
select throws_ok('select * from private.industry_snapshot_source', '42501', null, 'Anonymous clients cannot read capture provenance directly');
select throws_ok('select * from private.legacy_report_institutions', '42501', null, 'Anonymous clients cannot read frozen school details directly');
select throws_ok('select private.capture_legacy_report_cutover(null)', '42501', null, 'Anonymous clients cannot run legacy capture');
select throws_ok('select private.publish_checkpointed_score_snapshot(null,null,null)', '42501', null, 'Anonymous clients cannot publish checkpoints');
reset role;

set local role authenticated;
select throws_ok('select * from private.report_industry_snapshot_inputs', '42501', null, 'Authenticated clients cannot read frozen Industry inputs directly');
select throws_ok('select private.freeze_checkpoint_industry_inputs(null,null)', '42501', null, 'Authenticated clients cannot freeze candidate inputs');
select throws_ok('select private.open_legacy_report_cutover(null,null)', '42501', null, 'Authenticated clients cannot reopen imports');
select throws_ok('select private.publish_checkpointed_score_snapshot(null,null,null)', '42501', null, 'Authenticated clients cannot publish checkpoints');
reset role;

select * from finish();
rollback;
