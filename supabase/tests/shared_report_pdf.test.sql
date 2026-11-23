begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

insert into auth.users (id, email)
values ('11111111-1111-1111-1111-111111111111', 'owner@example.test');

insert into public.score_snapshots (id, scoring_version_id, period, status, finished_at)
select 'e0000000-0000-4000-8000-000000000001', v.id, '2026-10-01', 'superseded', now()
from public.scoring_versions v
where v.kind = 'online' and v.label = 'v1';

insert into public.online_reports (id, owner_id, city_id, location, address_text, status, scoring_version_id, snapshot_id, overall_score, result, generated_at, pdf_path)
select
  r.id::uuid,
  '11111111-1111-1111-1111-111111111111',
  c.id,
  extensions.st_point(21.2087, 45.7537, 4326)::extensions.geography,
  r.address,
  'ready',
  s.scoring_version_id,
  s.id,
  72,
  '{"schema_version": 1}',
  now(),
  r.pdf_path
from public.cities c
cross join public.score_snapshots s
cross join (
  values
    ('d0000000-0000-4000-8000-000000000021', 'Piața Victoriei 1, Timișoara', '11111111-1111-1111-1111-111111111111/d0000000-0000-4000-8000-000000000021.pdf'),
    ('d0000000-0000-4000-8000-000000000022', 'Piața Victoriei 2, Timișoara', null)
) as r (id, address, pdf_path)
where c.slug = 'timisoara' and s.id = 'e0000000-0000-4000-8000-000000000001';

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select public.create_report_share_link('d0000000-0000-4000-8000-000000000021') as token \gset
select public.create_report_share_link('d0000000-0000-4000-8000-000000000022') as token_without_pdf \gset

select throws_ok(
  format($$ select * from public.shared_report_pdf('d0000000-0000-4000-8000-000000000021', %L) $$, :'token'),
  '42501',
  null,
  'The owner cannot call the function the Edge Function uses'
);

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select throws_ok(
  format($$ select * from public.shared_report_pdf('d0000000-0000-4000-8000-000000000021', %L) $$, :'token'),
  '42501',
  null,
  'Anonymous visitors cannot call it either'
);

set local role service_role;
set local request.jwt.claims = '{"role": "service_role"}';

select results_eq(
  format($$ select pdf_path from public.shared_report_pdf('d0000000-0000-4000-8000-000000000021', %L) $$, :'token'),
  $$ values ('11111111-1111-1111-1111-111111111111/d0000000-0000-4000-8000-000000000021.pdf') $$,
  'An active link gives the path of its report PDF'
);

select is_empty(
  format($$ select * from public.shared_report_pdf('d0000000-0000-4000-8000-000000000022', %L) $$, :'token'),
  'A token opens only the report it was created for'
);

select is_empty(
  $$ select * from public.shared_report_pdf('d0000000-0000-4000-8000-000000000021', repeat('a', 48)) $$,
  'A wrong token gives nothing'
);

select is_empty(
  $$ select * from public.shared_report_pdf('d0000000-0000-4000-8000-000000000021', 'not-a-token') $$,
  'A malformed token gives nothing'
);

select is_empty(
  format($$ select * from public.shared_report_pdf('d0000000-0000-4000-8000-000000000022', %L) $$, :'token_without_pdf'),
  'A report without a stored PDF gives nothing'
);

update public.report_share_links
set expires_at = now() - interval '1 second', created_at = now() - interval '1 day'
where online_report_id = 'd0000000-0000-4000-8000-000000000021';

select is_empty(
  format($$ select * from public.shared_report_pdf('d0000000-0000-4000-8000-000000000021', %L) $$, :'token'),
  'An expired link gives nothing'
);

update public.report_share_links
set expires_at = null
where online_report_id = 'd0000000-0000-4000-8000-000000000021';

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select public.revoke_report_share_link('d0000000-0000-4000-8000-000000000021');

set local role service_role;
set local request.jwt.claims = '{"role": "service_role"}';

select is_empty(
  format($$ select * from public.shared_report_pdf('d0000000-0000-4000-8000-000000000021', %L) $$, :'token'),
  'A revoked link gives nothing'
);

select * from finish();
rollback;
