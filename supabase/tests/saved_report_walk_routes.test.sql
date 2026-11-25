begin;

create extension if not exists pgtap with schema extensions;

select plan(30);

insert into auth.users (id, email) values
  ('ec000000-0000-4000-8000-000000000001', 'route-owner@example.test'),
  ('ec000000-0000-4000-8000-000000000002', 'other-route-user@example.test');

insert into public.score_snapshots (id, scoring_version_id, period, status, finished_at)
select 'ec000000-0000-4000-8000-000000000003', id, '2026-10-01', 'superseded', now()
from public.scoring_versions where kind = 'online' and label = 'v1';

insert into public.online_reports (
  id, owner_id, city_id, location, address_text, status, scoring_version_id, snapshot_id,
  overall_score, result, generated_at, pdf_path
)
select 'ec000000-0000-4000-8000-000000000004', 'ec000000-0000-4000-8000-000000000001',
  c.id, extensions.st_point(20, 45, 4326)::extensions.geography, 'Test Address 10', 'ready',
  s.scoring_version_id, s.id, 72,
  '{
    "fifteen_minute": {
      "status": "scored",
      "categories": [
        {"key": "pharmacy", "t1_min": 14}, {"key": "supermarket", "t1_min": 7},
        {"key": "restaurant", "t1_min": 19}, {"key": "bank", "t1_min": 9}
      ],
      "places": [
        {"id": "farther", "category": "pharmacy", "minutes": 15},
        {"id": "nearest", "category": "pharmacy", "minutes": 14},
        {"id": "tied", "category": "pharmacy", "minutes": 14},
        {"id": "shop", "category": "supermarket", "minutes": 7},
        {"id": "food", "category": "restaurant", "minutes": 19}
      ],
      "routes": [{"place_id": "shop", "polyline6": "??AA"}]
    }
  }',
  now(), 'fixture/test-report.pdf'
from public.cities c
cross join public.score_snapshots s
where c.slug = 'timisoara' and s.id = 'ec000000-0000-4000-8000-000000000003';

insert into public.online_reports (
  id, owner_id, city_id, location, address_text, status, scoring_version_id, snapshot_id,
  overall_score, result, generated_at
)
select 'ec000000-0000-4000-8000-000000000005', 'ec000000-0000-4000-8000-000000000002',
  city_id, extensions.st_point(21, 45, 4326)::extensions.geography, 'Test Address 20', status,
  scoring_version_id, snapshot_id, overall_score, result, generated_at
from public.online_reports where id = 'ec000000-0000-4000-8000-000000000004';

create temporary table original_report as
select result, overall_score, pdf_path, updated_at
from public.online_reports where id = 'ec000000-0000-4000-8000-000000000004';

set local role authenticated;
set local request.jwt.claims = '{"sub":"ec000000-0000-4000-8000-000000000001","role":"authenticated"}';

select public.create_report_share_link('ec000000-0000-4000-8000-000000000004') as token \gset

select is(public.request_saved_report_walk_route('ec000000-0000-4000-8000-000000000004', 'pharmacy'),
  '{"status":"pending"}'::jsonb, 'The report owner can request a missing route');
select is(public.request_saved_report_walk_route('ec000000-0000-4000-8000-000000000004', 'pharmacy'),
  '{"status":"pending"}'::jsonb, 'Repeating a pending request does not change the response');
select is(public.request_saved_report_walk_route('ec000000-0000-4000-8000-000000000004', 'supermarket'),
  null::jsonb, 'An existing frozen route does not need another route');
select is(public.request_saved_report_walk_route('ec000000-0000-4000-8000-000000000004', 'restaurant'),
  null::jsonb, 'A category outside the checklist walking limit cannot be queued');
select is(public.request_saved_report_walk_route('ec000000-0000-4000-8000-000000000004', 'bank'),
  null::jsonb, 'A category without a saved place cannot be queued');
select is(public.request_saved_report_walk_route('ec000000-0000-4000-8000-000000000004', 'arbitrary'),
  null::jsonb, 'Unknown categories cannot be queued');
select throws_ok('select * from private.saved_report_walk_routes', '42501', null,
  'Authenticated users cannot access the queue directly');
select throws_ok('select * from private.claim_next_saved_report_walk_route()', '42501', null,
  'Authenticated users cannot claim route jobs');

set local request.jwt.claims = '{"sub":"ec000000-0000-4000-8000-000000000002","role":"authenticated"}';
select public.create_report_share_link('ec000000-0000-4000-8000-000000000005') as other_token \gset
select is(public.request_saved_report_walk_route('ec000000-0000-4000-8000-000000000004', 'pharmacy'),
  null::jsonb, 'An unrelated account cannot look up the route');

reset role;
select results_eq('select place_id from private.saved_report_walk_routes', $$ values ('nearest') $$,
  'Only the same closest place the checklist selects is queued');

update private.saved_report_walk_routes set requested_at = now() - interval '6 minutes';
set local role authenticated;
set local request.jwt.claims = '{"sub":"ec000000-0000-4000-8000-000000000001","role":"authenticated"}';
select is(public.request_saved_report_walk_route('ec000000-0000-4000-8000-000000000004', 'pharmacy'),
  '{"status":"unavailable"}'::jsonb, 'A delayed job does not cause indefinite browser polling');

reset role;
select id as job_id, claim_token as first_claim from private.claim_next_saved_report_walk_route() \gset
select is_empty('select * from private.claim_next_saved_report_walk_route()', 'A live claim prevents duplicate routing');
select is(private.complete_saved_report_walk_route(:'job_id', gen_random_uuid(), '??BB'),
  false, 'An unrelated claim token cannot complete a job');
update private.saved_report_walk_routes set claim_expires_at = now() - interval '1 second';
select is(private.complete_saved_report_walk_route(:'job_id', :'first_claim', '??BB'),
  false, 'An expired claim cannot complete a job');
select claim_token as second_claim from private.claim_next_saved_report_walk_route() \gset
select isnt(:'second_claim'::uuid, :'first_claim'::uuid, 'A delayed job is reclaimable with a fresh token');
select is(private.complete_saved_report_walk_route(:'job_id', :'first_claim', '??BB'),
  false, 'The previous worker cannot overwrite the reclaimed job');
select is(private.complete_saved_report_walk_route(:'job_id', :'second_claim', null),
  true, 'The current worker can mark a failed route complete without geometry');

update private.saved_report_walk_routes
set completed_at = now() - interval '5 minutes';
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select is(public.request_saved_report_walk_route('ec000000-0000-4000-8000-000000000004', 'pharmacy', :'token'),
  '{"status":"pending"}'::jsonb, 'An active share link can retry a failed route after cooldown');

reset role;
select results_eq('select place_id from private.saved_report_walk_routes where completed_at is null',
  $$ values ('nearest') $$, 'The retry reuses the same job and does not create a duplicate');
select claim_token as retry_claim from private.claim_next_saved_report_walk_route() \gset
select is(private.complete_saved_report_walk_route(:'job_id', :'retry_claim', '??AA'),
  true, 'The current worker can complete a route with geometry');
insert into private.saved_report_walk_routes (report_id, place_id, completed_at, polyline6)
values ('ec000000-0000-4000-8000-000000000005', 'nearest', now(), '??BB');

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok('select * from private.saved_report_walk_routes', '42501', null,
  'Anonymous users cannot access the queue directly');
select throws_ok('select private.complete_saved_report_walk_route(null, null, null)', '42501', null,
  'Anonymous users cannot complete route jobs');
select is(public.request_saved_report_walk_route('ec000000-0000-4000-8000-000000000004', 'pharmacy'),
  null::jsonb, 'An anonymous visitor cannot retrieve cached geometry without a token');
select is(public.request_saved_report_walk_route('ec000000-0000-4000-8000-000000000004', 'pharmacy', :'token'),
  '{"status":"ready","polyline6":"??AA"}'::jsonb, 'An active link can retrieve only the supplemental shape');
select is(public.request_saved_report_walk_route('ec000000-0000-4000-8000-000000000004', 'pharmacy', repeat('f', 48)),
  null::jsonb, 'A wrong token cannot retrieve cached geometry');
select is(public.request_saved_report_walk_route('ec000000-0000-4000-8000-000000000005', 'pharmacy', :'token'),
  null::jsonb, 'The token cannot read the same place in another ready report');
select is(public.request_saved_report_walk_route('ec000000-0000-4000-8000-000000000005', 'pharmacy', :'other_token'),
  '{"status":"ready","polyline6":"??BB"}'::jsonb, 'The second report token retrieves only its own route');

reset role;
update public.report_share_links set
  created_at = now() - interval '1 day', expires_at = now() - interval '1 second'
where online_report_id = 'ec000000-0000-4000-8000-000000000004';

set local role anon;
select is(public.request_saved_report_walk_route('ec000000-0000-4000-8000-000000000004', 'pharmacy', :'token'),
  null::jsonb, 'An expired link cannot retrieve cached geometry');

reset role;
update public.report_share_links set expires_at = null, revoked_at = now()
where online_report_id = 'ec000000-0000-4000-8000-000000000004';

set local role anon;
select is(public.request_saved_report_walk_route('ec000000-0000-4000-8000-000000000004', 'pharmacy', :'token'),
  null::jsonb, 'A revoked link cannot retrieve cached geometry');

reset role;
select results_eq(
  $$ select result, overall_score, pdf_path, updated_at from public.online_reports
    where id = 'ec000000-0000-4000-8000-000000000004' $$,
  'select result, overall_score, pdf_path, updated_at from original_report',
  'Enrichment does not touch the frozen report, score or PDF'
);

select * from finish();
rollback;
