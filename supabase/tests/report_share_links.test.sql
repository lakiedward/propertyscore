begin;

create extension if not exists pgtap with schema extensions;

select plan(22);

insert into auth.users (id, email)
values
  ('11111111-1111-1111-1111-111111111111', 'owner@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'other@example.test');

insert into public.score_snapshots (id, scoring_version_id, period, status, finished_at)
select 'e0000000-0000-4000-8000-000000000001', v.id, '2026-10-01', 'superseded', now()
from public.scoring_versions v
where v.kind = 'online' and v.label = 'v1';

insert into public.online_reports (id, owner_id, city_id, location, address_text, status, scoring_version_id, snapshot_id, overall_score, result, generated_at)
select
  'd0000000-0000-4000-8000-000000000011',
  '11111111-1111-1111-1111-111111111111',
  c.id,
  extensions.st_point(21.2087, 45.7537, 4326)::extensions.geography,
  'Piața Victoriei 1, Timișoara',
  'ready',
  s.scoring_version_id,
  s.id,
  72,
  '{"schema_version": 1}',
  now()
from public.cities c, public.score_snapshots s
where c.slug = 'timisoara' and s.id = 'e0000000-0000-4000-8000-000000000001';

insert into public.online_reports (id, owner_id, city_id, location, address_text)
select
  'd0000000-0000-4000-8000-000000000012',
  '11111111-1111-1111-1111-111111111111',
  c.id,
  extensions.st_point(21.2087, 45.7537, 4326)::extensions.geography,
  'Piața Victoriei 2, Timișoara'
from public.cities c
where c.slug = 'timisoara';

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select throws_ok(
  $$ select public.create_report_share_link('d0000000-0000-4000-8000-000000000011') $$,
  '42501',
  null,
  'Anonymous visitors cannot create share links'
);

select throws_ok(
  $$ select * from public.report_share_links $$,
  '42501',
  null,
  'Anonymous visitors cannot read share links'
);

set local role authenticated;
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

select throws_ok(
  $$ select public.create_report_share_link('d0000000-0000-4000-8000-000000000011') $$,
  'P0001',
  'report_not_found',
  'Another user cannot share a report they do not own'
);

select throws_ok(
  $$ select public.revoke_report_share_link('d0000000-0000-4000-8000-000000000011') $$,
  'P0001',
  'report_not_found',
  'Another user cannot revoke the links of a report they do not own'
);

set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select throws_ok(
  $$ select public.create_report_share_link('d0000000-0000-4000-8000-000000000012') $$,
  'P0001',
  'report_not_ready',
  'A report that is not ready cannot be shared'
);

select throws_ok(
  $$ select public.create_report_share_link('d0000000-0000-4000-8000-000000000011', 0) $$,
  'P0001',
  'share_link_invalid_expiry',
  'An expiry has to be between 1 and 365 days'
);

select public.create_report_share_link('d0000000-0000-4000-8000-000000000011') as first_token \gset

select matches(
  :'first_token'::text,
  '^[0-9a-f]{48}$'::text,
  'A share token is 24 random bytes in hex'
);

select results_eq(
  $$ select count(*)::int, count(*) filter (where expires_at is null)::int from public.report_share_links $$,
  $$ values (1, 1) $$,
  'The owner sees the new link, which does not expire by default'
);

select throws_ok(
  $$ select token_hash from public.report_share_links $$,
  '42501',
  null,
  'The owner cannot read the token hash'
);

select throws_ok(
  $$ update public.report_share_links set revoked_at = now() $$,
  '42501',
  null,
  'The owner cannot change a link directly'
);

select public.create_report_share_link('d0000000-0000-4000-8000-000000000011', 30) as second_token \gset

select results_eq(
  $$
    select count(*)::int,
      count(*) filter (where revoked_at is null)::int,
      count(*) filter (where revoked_at is null and expires_at between now() + interval '29 days' and now() + interval '31 days')::int
    from public.report_share_links
  $$,
  $$ values (2, 1, 1) $$,
  'A new link replaces the active one and carries its expiry'
);

set local role authenticated;
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

select is_empty(
  $$ select id from public.report_share_links $$,
  'Another user does not see the owner''s links'
);

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select results_eq(
  format($$ select id, address_text, overall_score from public.resolve_report_share_link('d0000000-0000-4000-8000-000000000011', %L) $$, :'second_token'),
  $$ values ('d0000000-0000-4000-8000-000000000011'::uuid, 'Piața Victoriei 1, Timișoara'::text, 72::smallint) $$,
  'An anonymous visitor reads the report with the active token'
);

select is_empty(
  format($$ select * from public.resolve_report_share_link('d0000000-0000-4000-8000-000000000011', %L) $$, :'first_token'),
  'A replaced token no longer opens the report'
);

select is_empty(
  format($$ select * from public.resolve_report_share_link('d0000000-0000-4000-8000-000000000012', %L) $$, :'second_token'),
  'A token opens only the report it was made for'
);

select is_empty(
  $$ select * from public.resolve_report_share_link('d0000000-0000-4000-8000-000000000011', 'not-a-token') $$,
  'A malformed token opens nothing'
);

select throws_ok(
  $$ select * from public.online_reports $$,
  '42501',
  null,
  'Anonymous visitors still cannot read reports directly'
);

reset role;

update public.report_share_links
set created_at = now() - interval '2 days', expires_at = now() - interval '1 day'
where revoked_at is null;

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select is_empty(
  format($$ select * from public.resolve_report_share_link('d0000000-0000-4000-8000-000000000011', %L) $$, :'second_token'),
  'An expired token opens nothing'
);

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select public.create_report_share_link('d0000000-0000-4000-8000-000000000011') as third_token \gset
select public.revoke_report_share_link('d0000000-0000-4000-8000-000000000011');

select results_eq(
  $$ select count(*) filter (where revoked_at is null)::int from public.report_share_links $$,
  $$ values (0) $$,
  'Revoking leaves the report without an active link'
);

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select is_empty(
  format($$ select * from public.resolve_report_share_link('d0000000-0000-4000-8000-000000000011', %L) $$, :'third_token'),
  'A revoked token opens nothing'
);

reset role;

select throws_ok(
  $$ insert into public.report_share_links (online_report_id, owner_id, token_hash) values ('d0000000-0000-4000-8000-000000000011', '11111111-1111-1111-1111-111111111111', '\x00') $$,
  '23514',
  null,
  'A token hash is a SHA-256 digest'
);

select ok(
  not has_function_privilege('anon', 'public.revoke_report_share_link(uuid)', 'execute'),
  'Anonymous visitors cannot revoke links'
);

select * from finish();

rollback;
