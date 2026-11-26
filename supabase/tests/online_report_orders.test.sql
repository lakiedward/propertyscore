begin;

create extension if not exists pgtap with schema extensions;

select plan(47);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', 'admin@example.test', '{}'),
  ('22222222-2222-2222-2222-222222222222', 'Tester@Example.test', '{"locale": "en"}'),
  ('33333333-3333-3333-3333-333333333333', 'client@example.test', '{}');

update public.user_roles
set role = 'admin'
where user_id = '11111111-1111-1111-1111-111111111111';

update public.score_snapshots set status = 'failed', finished_at = now(), error_code = 'test_setup'
where status = 'building';
update public.score_snapshots set status = 'superseded' where status = 'ready';

select id as sibiu_id from public.cities where slug = 'sibiu' \gset
select private.build_grid_cells(:'sibiu_id', 175);
select private.start_score_snapshot('2026-11-01') as snapshot_id \gset
select private.seed_cell_scores(:'snapshot_id', :'sibiu_id');

update private.cell_scores set categories = '{"green": 60}'::jsonb where snapshot_id = :'snapshot_id';

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select throws_ok(
  $$ select id from public.smartcheck_unlimited_accounts $$,
  '42501',
  null,
  'A visitor cannot read the unlimited flags'
);

select throws_ok(
  $$ select public.create_online_report('Piața Mare 1, Sibiu', 45.7983, 24.1520) $$,
  '42501',
  null,
  'A visitor cannot order a report'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "user_roles": ["user"]}';

select throws_ok(
  $$ select public.set_smartcheck_unlimited('tester@example.test', true) $$,
  '42501',
  'forbidden',
  'A user who is not an admin cannot set the unlimited flag, not even on their own account'
);

select throws_ok(
  $$ select * from public.list_smartcheck_unlimited_accounts() $$,
  '42501',
  'forbidden',
  'A user who is not an admin cannot list the unlimited accounts'
);

select throws_ok(
  $$ insert into public.smartcheck_unlimited_accounts (user_id) values ('22222222-2222-2222-2222-222222222222') $$,
  '42501',
  null,
  'A user cannot give themselves the unlimited flag through the table'
);

select throws_ok(
  $$ select public.create_online_report('Piața Mare 1, Sibiu', 45.7983, 24.1520) $$,
  'P0001',
  'no_ready_snapshot',
  'A report cannot be ordered before a snapshot is ready'
);

reset role;

select private.compute_overall_scores(:'snapshot_id');
select private.compute_snapshot_stats(:'snapshot_id');
update public.score_snapshots
set status = 'ready', finished_at = now(), source_dates = '{"osm": "2026-10-31"}'
where id = :'snapshot_id';

set local role authenticated;
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "user_roles": ["user"]}';

select throws_ok(
  $$ select public.create_online_report('Piața Mare 1, Sibiu', 45.7983, 24.1520) $$,
  'P0001',
  'payment_required',
  'An account without the unlimited flag must pay for a covered address'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated", "user_roles": ["admin"]}';

select is(
  public.set_smartcheck_unlimited('  TESTER@example.test ', true),
  '22222222-2222-2222-2222-222222222222'::uuid,
  'An admin sets the unlimited flag by email, ignoring case and spaces'
);

select is(
  public.set_smartcheck_unlimited('tester@example.test', true),
  '22222222-2222-2222-2222-222222222222'::uuid,
  'Setting the flag twice keeps the account flagged'
);

select throws_ok(
  $$ select public.set_smartcheck_unlimited('nobody@example.test', true) $$,
  'P0001',
  'account_not_found',
  'An unknown email is refused'
);

select throws_ok(
  $$ select public.set_smartcheck_unlimited('tester@example.test', null) $$,
  'P0001',
  'unlimited_flag_missing',
  'The flag value is required'
);

select results_eq(
  $$ select user_id, email from public.list_smartcheck_unlimited_accounts() $$,
  $$ values ('22222222-2222-2222-2222-222222222222'::uuid, 'Tester@Example.test'::text) $$,
  'An admin lists the flagged accounts with their email'
);

select is_empty(
  $$ select id from public.smartcheck_unlimited_accounts $$,
  'An admin does not read the flags table directly, only through the list'
);

reset role;

select results_eq(
  $$ select user_id, granted_by from public.smartcheck_unlimited_accounts $$,
  $$ values ('22222222-2222-2222-2222-222222222222'::uuid, '11111111-1111-1111-1111-111111111111'::uuid) $$,
  'The flag records which admin set it'
);

set local role authenticated;
set local request.jwt.claims = '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated", "user_roles": ["user"]}';

select is_empty(
  $$ select id from public.smartcheck_unlimited_accounts $$,
  'Another user does not see someone else''s flag'
);

select throws_ok(
  $$ select public.create_online_report('Piața Mare 1, Sibiu', 45.7983, 24.1520) $$,
  'P0001',
  'payment_required',
  'An account without the flag still has to pay'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "user_roles": ["user"]}';

select results_eq(
  $$ select user_id from public.smartcheck_unlimited_accounts $$,
  $$ values ('22222222-2222-2222-2222-222222222222'::uuid) $$,
  'A flagged user reads their own flag'
);

select throws_ok(
  $$ delete from public.smartcheck_unlimited_accounts where user_id = '22222222-2222-2222-2222-222222222222' $$,
  '42501',
  null,
  'A user cannot remove their flag through the table'
);

select throws_ok(
  $$ select public.create_online_report('Str. Departe 1', 46.5, 25.5) $$,
  'P0001',
  'outside_coverage',
  'An address outside the covered cities is refused'
);

select throws_ok(
  $$ select public.create_online_report('Str. Departe 1', 44.43, 26.10) $$,
  'P0001',
  'outside_coverage',
  'An address in a covered city without scored cells in the ready snapshot is refused'
);

select throws_ok(
  $$ select public.create_online_report('  ', 45.7983, 24.1520) $$,
  'P0001',
  'address_invalid',
  'An empty address is refused'
);

select throws_ok(
  $$ select public.create_online_report('Piața Mare 1, Sibiu', 120, 24.1520) $$,
  'P0001',
  'location_invalid',
  'Coordinates out of range are refused'
);

select throws_ok(
  $$ select public.create_online_report('Piața Mare 1, Sibiu', 45.7983, 24.1520, 'ro', p_declared_rooms => 40::smallint) $$,
  '23514',
  null,
  'Declared details keep the checks of the report table'
);

select public.create_online_report(
  ' Piața Mare 1, Sibiu ', 45.7983, 24.1520, null,
  2::smallint, 58.5, 3::smallint, 4::smallint, false, 1975::smallint
) as first_report \gset

select public.create_online_report('Piața Mică 2, Sibiu', 45.7975, 24.1525, 'ro') as second_report \gset

select results_eq(
  format($$
    select owner_id, status::text, address_text, locale, round(latitude::numeric, 4), round(longitude::numeric, 4),
      declared_rooms::int, declared_area_m2, declared_floor::int, declared_building_floors::int,
      declared_has_elevator, declared_construction_year::int, generation_attempts::int
    from public.online_reports
    where id = %L
  $$, :'first_report'),
  $$ values (
    '22222222-2222-2222-2222-222222222222'::uuid, 'queued'::text, 'Piața Mare 1, Sibiu'::text, 'en'::text,
    45.7983::numeric, 24.1520::numeric, 2, 58.50::numeric, 3, 4, false, 1975, 0
  ) $$,
  'A flagged account queues the report with the address, the pin, the declared details and the profile language'
);

select results_eq(
  format($$ select c.slug from public.online_reports r join public.cities c on c.id = r.city_id where r.id = %L $$, :'first_report'),
  $$ values ('sibiu'::text) $$,
  'The report is placed in the city that covers the pin'
);

select results_eq(
  $$ select count(*)::int, count(*) filter (where status = 'queued')::int from public.online_reports $$,
  $$ values (2, 2) $$,
  'A flagged account can order several reports, each read back by its owner'
);

select throws_ok(
  $$ update public.online_reports set status = 'ready' $$,
  '42501',
  null,
  'An owner cannot change the status of an order'
);

select throws_ok(
  $$ select private.claim_next_online_report() $$,
  '42501',
  null,
  'A user cannot take a report from the worker queue'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated", "user_roles": ["user"]}';

select is_empty(
  $$ select id from public.online_reports $$,
  'Another user does not see the orders of someone else'
);

reset role;

update public.online_reports set created_at = created_at + interval '1 second' where id = :'second_report';

select is(
  private.claim_next_online_report(),
  :'first_report'::uuid,
  'The worker takes the oldest queued report first'
);

select is(
  private.claim_next_online_report(),
  :'second_report'::uuid,
  'A second claim skips the report already taken'
);

select is(
  private.claim_next_online_report(),
  null,
  'The queue is empty once every report is taken'
);

select results_eq(
  format($$ select status::text, generation_attempts::int, claim_expires_at > now() from public.online_reports where id = %L $$, :'first_report'),
  $$ values ('queued'::text, 1, true) $$,
  'Taking a report records the attempt and a lease'
);

select results_eq(
  format($$ select city_slug from private.begin_online_report(%L) $$, :'first_report'),
  $$ values ('sibiu'::text) $$,
  'The worker starts a taken report as before'
);

select results_eq(
  format($$ select status::text from public.online_reports where id = %L $$, :'first_report'),
  $$ values ('generating'::text) $$,
  'A started report is generating'
);

select is(
  private.claim_next_online_report(),
  null,
  'A generating report with a live lease is not taken again'
);

alter table public.online_reports disable trigger online_reports_set_updated_at;

update public.online_reports
set claim_expires_at = now() - interval '1 minute', updated_at = now() - interval '20 minutes'
where id = :'first_report';

select is(
  private.claim_next_online_report(),
  :'first_report'::uuid,
  'A report whose worker stopped is taken again after its lease and 15 minutes without progress'
);

select results_eq(
  format($$ select generation_attempts::int from public.online_reports where id = %L $$, :'first_report'),
  $$ values (2) $$,
  'Taking it again counts a second attempt'
);

update public.online_reports
set claim_expires_at = now() - interval '1 minute', updated_at = now() - interval '20 minutes'
where id = :'first_report';

select ok(
  private.extend_online_report_claim(:'first_report'),
  'The worker renews the lease of a report it is still generating'
);

select is(
  private.claim_next_online_report(),
  null,
  'A report whose lease was renewed is not taken by another worker'
);

select ok(
  private.extend_online_report_claim(:'second_report'),
  'A queued report that was taken can renew its lease too'
);

update public.online_reports
set claim_expires_at = now() - interval '1 minute', updated_at = now() - interval '20 minutes', generation_attempts = 3
where id = :'first_report';

select is(
  private.claim_next_online_report(),
  null,
  'A report that failed three attempts is not taken again'
);

select results_eq(
  format($$ select status::text, error_code from public.online_reports where id = %L $$, :'first_report'),
  $$ values ('failed'::text, 'generation_attempts_exhausted'::text) $$,
  'A report that failed three attempts is marked failed'
);

select ok(
  not private.extend_online_report_claim(:'first_report'),
  'A failed report cannot renew its lease'
);

alter table public.online_reports enable trigger online_reports_set_updated_at;

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated", "user_roles": ["admin"]}';

select is(
  public.set_smartcheck_unlimited('tester@example.test', false),
  '22222222-2222-2222-2222-222222222222'::uuid,
  'An admin removes the unlimited flag'
);

select is_empty(
  $$ select * from public.list_smartcheck_unlimited_accounts() $$,
  'The account leaves the list'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "user_roles": ["user"]}';

select throws_ok(
  $$ select public.create_online_report('Piața Mare 1, Sibiu', 45.7983, 24.1520) $$,
  'P0001',
  'payment_required',
  'Without the flag the account has to pay again'
);

select * from finish();
rollback;
