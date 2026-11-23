begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', 'owner@example.test', '{}'),
  ('22222222-2222-2222-2222-222222222222', 'other@example.test', '{}');

update public.score_snapshots set status = 'failed', finished_at = now(), error_code = 'test_setup'
where status = 'building';
update public.score_snapshots set status = 'superseded' where status = 'ready';

select private.start_score_snapshot('2026-11-01') as snapshot_id \gset

insert into public.online_reports (id, owner_id, city_id, location, address_text, status, snapshot_id, scoring_version_id, generated_at)
select
  'd0000000-0000-4000-8000-000000000001',
  '11111111-1111-1111-1111-111111111111',
  c.id,
  extensions.st_point(24.1520, 45.7983, 4326)::extensions.geography,
  'Piața Mare 1, Sibiu',
  'ready',
  s.id,
  s.scoring_version_id,
  now()
from public.cities c
cross join public.score_snapshots s
where c.slug = 'sibiu' and s.id = :'snapshot_id';

insert into public.online_reports (id, owner_id, city_id, location, address_text, status, claim_expires_at)
select
  'd0000000-0000-4000-8000-000000000002',
  '11111111-1111-1111-1111-111111111111',
  c.id,
  extensions.st_point(24.1520, 45.7983, 4326)::extensions.geography,
  'Piața Mare 2, Sibiu',
  'generating',
  now() + interval '10 minutes'
from public.cities c
where c.slug = 'sibiu';

insert into public.online_reports (id, owner_id, city_id, location, address_text, status)
select
  'd0000000-0000-4000-8000-000000000003',
  '11111111-1111-1111-1111-111111111111',
  c.id,
  extensions.st_point(24.1520, 45.7983, 4326)::extensions.geography,
  'Piața Mare 3, Sibiu',
  'generating'
from public.cities c
where c.slug = 'sibiu';

insert into storage.objects (bucket_id, name)
values
  ('online-report-pdfs', '11111111-1111-1111-1111-111111111111/d0000000-0000-4000-8000-000000000001.pdf'),
  ('online-report-pdfs', '11111111-1111-1111-1111-111111111111/d0000000-0000-4000-8000-000000000002.pdf');

set local storage.allow_delete_query = 'true';

select results_eq(
  $$ select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'online-report-pdfs' $$,
  $$ values (false, 52428800::bigint, array['application/pdf']) $$,
  'The report PDF bucket is private, 50 MiB, PDF only'
);

select is(
  private.online_report_pdf_path('d0000000-0000-4000-8000-000000000001'),
  '11111111-1111-1111-1111-111111111111/d0000000-0000-4000-8000-000000000001.pdf',
  'A report PDF lives in its owner''s folder under the report id'
);

select throws_ok(
  $$ select private.attach_online_report_pdf('d0000000-0000-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111/d0000000-0000-4000-8000-000000000002.pdf') $$,
  'P0001',
  'report_not_ready',
  'A PDF is attached only to a ready report'
);

select throws_ok(
  $$ select private.attach_online_report_pdf('d0000000-0000-4000-8000-000000000001', '22222222-2222-2222-2222-222222222222/d0000000-0000-4000-8000-000000000001.pdf') $$,
  'P0001',
  'report_pdf_path_invalid',
  'A PDF outside its owner''s folder is refused'
);

select throws_ok(
  $$ select private.attach_online_report_pdf('d0000000-0000-4000-8000-0000000000ff', 'x.pdf') $$,
  'P0001',
  'report_not_found',
  'A PDF cannot be attached to a report that does not exist'
);

select lives_ok(
  $$ select private.attach_online_report_pdf('d0000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111/d0000000-0000-4000-8000-000000000001.pdf') $$,
  'The worker attaches the PDF of a ready report'
);

select throws_ok(
  $$ select private.begin_online_report('d0000000-0000-4000-8000-000000000003') $$,
  'P0001',
  'report_in_progress',
  'A report that another run is generating without a queue lease is not started again'
);

select throws_ok(
  $$ select private.begin_online_report('d0000000-0000-4000-8000-000000000002') $$,
  'P0001',
  'no_ready_snapshot',
  'A report the queue handed back to a worker under a fresh lease can be started again'
);

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated", "user_roles": ["user"]}';

select throws_ok(
  $$ select private.attach_online_report_pdf('d0000000-0000-4000-8000-000000000001', 'x.pdf') $$,
  '42501',
  null,
  'A user cannot attach a PDF to a report'
);

select results_eq(
  $$ select name from storage.objects where bucket_id = 'online-report-pdfs' $$,
  $$ values ('11111111-1111-1111-1111-111111111111/d0000000-0000-4000-8000-000000000001.pdf') $$,
  'The owner reads the PDF of their ready report and nothing that is not linked to a report'
);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('online-report-pdfs', '11111111-1111-1111-1111-111111111111/own.pdf') $$,
  '42501',
  null,
  'The owner cannot upload a PDF'
);

select results_eq(
  $$
    with deleted as (
      delete from storage.objects
      where bucket_id = 'online-report-pdfs'
      returning 1
    )
    select count(*)::int from deleted
  $$,
  $$ values (0) $$,
  'The owner cannot delete a report PDF'
);

select results_eq(
  $$
    with updated as (
      update storage.objects set metadata = '{}'
      where bucket_id = 'online-report-pdfs'
      returning 1
    )
    select count(*)::int from updated
  $$,
  $$ values (0) $$,
  'The owner cannot change a report PDF'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "user_roles": ["user"]}';

select results_eq(
  $$ select count(*)::int from storage.objects where bucket_id = 'online-report-pdfs' $$,
  $$ values (0) $$,
  'Another user cannot read someone else''s report PDF'
);

reset role;
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select results_eq(
  $$ select count(*)::int from storage.objects where bucket_id = 'online-report-pdfs' $$,
  $$ values (0) $$,
  'A visitor cannot read a report PDF'
);

reset role;

select results_eq(
  $$ select pdf_path, claim_expires_at from public.online_reports where id = 'd0000000-0000-4000-8000-000000000001' $$,
  $$ values ('11111111-1111-1111-1111-111111111111/d0000000-0000-4000-8000-000000000001.pdf', null::timestamptz) $$,
  'The attached PDF path is stored on the report and its lease is released'
);

select * from finish();
rollback;
