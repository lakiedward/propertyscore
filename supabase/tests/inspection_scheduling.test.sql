begin;

create extension if not exists pgtap with schema extensions;

select plan(55);

delete from public.inspection_events;
delete from public.inspections;
delete from public.properties;
delete from public.inspector_exceptions;
delete from public.inspector_weekly_hours;
delete from public.inspector_profiles;

insert into auth.users (id, email, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', 'client@example.test', '{"full_name": "Client Unu", "phone": "0722111111"}'),
  ('22222222-2222-2222-2222-222222222222', 'other@example.test', '{"full_name": "Alt Client", "phone": "0722222222"}'),
  ('33333333-3333-3333-3333-333333333333', 'inspector@example.test', '{"full_name": "Insp Unu", "phone": "0722333333"}'),
  ('44444444-4444-4444-4444-444444444444', 'inspector2@example.test', '{"full_name": "Insp Doi", "phone": "0722444444"}'),
  ('55555555-5555-5555-5555-555555555555', 'boss@example.test', '{"full_name": "Admin", "phone": "0722555555"}');

create temporary table fixture as
select
  (select id from public.cities where slug = 'timisoara') as timisoara,
  (select id from public.cities where slug = 'bucuresti') as bucuresti,
  (
    (date_trunc('week', now() at time zone 'Europe/Bucharest')::date + 7) + time '08:00'
  ) at time zone 'Europe/Bucharest' as monday_8,
  (
    (date_trunc('week', now() at time zone 'Europe/Bucharest')::date + 7) + time '09:30'
  ) at time zone 'Europe/Bucharest' as monday_930,
  (
    (date_trunc('week', now() at time zone 'Europe/Bucharest')::date + 7) + time '11:00'
  ) at time zone 'Europe/Bucharest' as monday_11,
  (
    (date_trunc('week', now() at time zone 'Europe/Bucharest')::date + 7) + time '14:00'
  ) at time zone 'Europe/Bucharest' as monday_14,
  (
    (date_trunc('week', now() at time zone 'Europe/Bucharest')::date + 13) + time '09:30'
  ) at time zone 'Europe/Bucharest' as sunday_930,
  (
    (date_trunc('week', now() at time zone 'Europe/Bucharest')::date + 7) + time '10:15'
  ) at time zone 'Europe/Bucharest' as monday_off_grid;

grant select on fixture to authenticated, anon;

insert into public.user_roles (user_id, role)
values
  ('33333333-3333-3333-3333-333333333333', 'inspector'),
  ('44444444-4444-4444-4444-444444444444', 'inspector');

update public.user_roles set role = 'admin'
where user_id = '55555555-5555-5555-5555-555555555555';

insert into public.inspector_profiles (user_id, city_id)
values ('33333333-3333-3333-3333-333333333333', (select timisoara from fixture));

insert into public.inspector_weekly_hours (inspector_id, weekday, starts_at, ends_at)
values ('33333333-3333-3333-3333-333333333333', 1, '08:00', '17:00');

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select throws_ok(
  $$ select * from public.inspection_slots((select timisoara from fixture), current_date, current_date + 7) $$,
  '42501', null,
  'Visitors cannot read free hours'
);

select throws_ok($$ select count(*) from public.inspections $$, '42501', null, 'Visitors cannot read inspections');

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated", "user_roles": ["user"]}';

select is(
  (select has_inspectors from public.inspection_cities() where id = (select timisoara from fixture)),
  true,
  'A city with an active inspector is covered'
);

select is(
  (select has_inspectors from public.inspection_cities() where id = (select bucuresti from fixture)),
  false,
  'A city without inspectors is not covered'
);

select is(
  (select free from public.inspection_slots((select timisoara from fixture), (select monday_8 from fixture)::date, (select monday_8 from fixture)::date + 6)
   where starts_at = (select monday_8 from fixture)),
  1,
  'A working inspector makes a Monday hour free'
);

select is(
  (select max(working) from public.inspection_slots((select timisoara from fixture), (select sunday_930 from fixture)::date, (select sunday_930 from fixture)::date)),
  0,
  'Nobody works on Sunday'
);

select is(
  (select count(*)::int from public.inspection_slots((select timisoara from fixture), current_date - 5, (now() at time zone 'Europe/Bucharest')::date)),
  0,
  'Past days and today offer no hours'
);

select throws_ok(
  $$ select * from public.book_inspection(null, null, 'Str. Unirii 1, București', (select bucuresti from fixture),
       44.4270, 26.1020, 'apartment', 60, null, 2::smallint, 4::smallint, (select monday_8 from fixture),
       'self', null, null, '{}', null, 'card') $$,
  'P0001', 'outside_coverage',
  'A city without inspectors cannot be booked'
);

select throws_ok(
  $$ select * from public.book_inspection(null, null, 'Str. Școlii 1, Timișoara', (select timisoara from fixture),
       44.4270, 26.1020, 'apartment', 60, null, 2::smallint, 4::smallint, (select monday_8 from fixture),
       'self', null, null, '{}', null, 'card') $$,
  'P0001', 'outside_coverage',
  'A pin outside the city cannot be booked'
);

select throws_ok(
  $$ select * from public.book_inspection(null, null, 'Str. Școlii 1, Timișoara', (select timisoara from fixture),
       45.7580, 21.2246, 'apartment', 60, null, 2::smallint, 4::smallint, (select monday_off_grid from fixture),
       'self', null, null, '{}', null, 'card') $$,
  'P0001', 'slot_taken',
  'Only the offered start times can be booked'
);

select throws_ok(
  $$ select * from public.book_inspection(null, null, 'Str. Școlii 1, Timișoara', (select timisoara from fixture),
       45.7580, 21.2246, 'apartment', 60, null, 2::smallint, 4::smallint, (select monday_8 from fixture),
       'other', 'Vecin', '12', '{}', null, 'card') $$,
  'P0001', 'invalid_access',
  'Another opener needs a valid phone'
);

select throws_ok(
  $$ select * from public.book_inspection(null, null, 'Str. Școlii 1, Timișoara', (select timisoara from fixture),
       45.7580, 21.2246, 'apartment', 60, null, 2::smallint, 4::smallint, (select monday_8 from fixture),
       'self', null, null, array['sauna'], null, 'card') $$,
  'P0001', 'invalid_access',
  'Only the known access tags are accepted'
);

select throws_ok(
  $$ select * from public.book_inspection(null, null, 'Str. Școlii 1, Timișoara', (select timisoara from fixture),
       45.7580, 21.2246, 'house', 60, null, 2::smallint, 4::smallint, (select monday_8 from fixture),
       'self', null, null, '{}', null, 'card') $$,
  'P0001', 'property_invalid',
  'A house has no floor'
);

select lives_ok(
  $$ select * from public.book_inspection(null, null, 'Str. Școlii 1, Timișoara', (select timisoara from fixture),
       45.7580, 21.2246, 'apartment', 60, 1980::smallint, 2::smallint, 4::smallint, (select monday_8 from fixture),
       'self', null, null, array['intercom'], 'Interfon 4', 'card') $$,
  'A client can book a free hour'
);

select results_eq(
  $$ select status::text, access_name, access_phone, payment_status::text, number >= 1001
     from public.inspections $$,
  $$ values ('scheduled'::text, 'Client Unu'::text, '+40722111111'::text, 'unpaid'::text, true) $$,
  'The booking is scheduled, unpaid and uses the account name and phone'
);

select is(
  (select kind::text from public.inspection_events),
  'booked',
  'The booking is recorded in the history'
);

select is(
  (select free from public.inspection_slots((select timisoara from fixture), (select monday_8 from fixture)::date, (select monday_8 from fixture)::date)
   where starts_at = (select monday_8 from fixture)),
  0,
  'The booked hour is no longer free'
);

select is(
  (select free from public.inspection_slots((select timisoara from fixture), (select monday_8 from fixture)::date, (select monday_8 from fixture)::date)
   where starts_at = (select monday_930 from fixture)),
  0,
  'An unassigned booking also blocks the overlapping hour'
);

select throws_ok(
  $$ select * from public.book_inspection(null, null, 'Str. Școlii 2, Timișoara', (select timisoara from fixture),
       45.7580, 21.2246, 'apartment', 60, null, 2::smallint, 4::smallint, (select monday_8 from fixture),
       'self', null, null, '{}', null, 'card') $$,
  'P0001', 'slot_taken',
  'A taken hour cannot be booked again'
);

select is(
  (select count(*)::int from public.my_inspections()),
  1,
  'The client lists their inspection'
);

select throws_ok(
  $$ insert into public.inspections (property_id, requested_by, starts_at, ends_at, access_mode, access_name, access_phone, payment_method)
     select property_id, requested_by, starts_at, ends_at, access_mode, access_name, access_phone, payment_method from public.inspections $$,
  '42501', null,
  'A client cannot write inspections directly'
);

select throws_ok(
  $$ select public.assign_inspector((select id from public.inspections), '33333333-3333-3333-3333-333333333333') $$,
  '42501', 'forbidden',
  'A client cannot assign an inspector'
);

select throws_ok(
  $$ select * from public.admin_inspections(now(), now() + interval '30 days', null, false) $$,
  '42501', 'forbidden',
  'A client cannot read the admin schedule'
);

select lives_ok(
  $$ select public.reschedule_inspection((select id from public.inspections), (select monday_14 from fixture)) $$,
  'The client can move the booking to a free hour'
);

select is(
  (select starts_at from public.inspections),
  (select monday_14 from fixture),
  'The booking moved'
);

set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "user_roles": ["user"]}';

select is((select count(*)::int from public.inspections), 0, 'Another client cannot see the booking');
select is((select count(*)::int from public.properties), 0, 'Another client cannot see the property');
select is((select count(*)::int from public.my_inspections()), 0, 'Another client lists nothing');

select throws_ok(
  $$ select public.cancel_inspection('00000000-0000-4000-8000-0000000000aa', null) $$,
  'P0001', 'inspection_not_found',
  'Cancelling an unknown booking fails'
);

reset role;
create temporary table booked_id as select id from public.inspections;
grant select on booked_id to authenticated;
set local role authenticated;

select throws_ok(
  $$ select public.cancel_inspection((select id from booked_id), null) $$,
  '42501', 'forbidden',
  'Another client cannot cancel someone else''s booking'
);

set local request.jwt.claims = '{"sub": "55555555-5555-5555-5555-555555555555", "role": "authenticated", "user_roles": ["admin"]}';

select is(
  (select count(*)::int from public.admin_inspections(now(), now() + interval '30 days', null, true)),
  1,
  'The admin sees the booking in the unassigned queue'
);

select throws_ok(
  $$ select public.assign_inspector((select id from public.inspections), '44444444-4444-4444-4444-444444444444') $$,
  'P0001', 'wrong_city',
  'An inspector without a profile in the city cannot be assigned'
);

select lives_ok(
  $$ select public.set_inspector('44444444-4444-4444-4444-444444444444', (select timisoara from fixture)) $$,
  'The admin can make someone an inspector in a city'
);

select throws_ok(
  $$ select public.assign_inspector((select id from public.inspections), '44444444-4444-4444-4444-444444444444') $$,
  'P0001', 'inspector_unavailable',
  'An inspector without hours at that time cannot be assigned'
);

select lives_ok(
  $$ select public.assign_inspector((select id from public.inspections), '33333333-3333-3333-3333-333333333333') $$,
  'The admin can assign a free inspector'
);

select results_eq(
  $$ select status::text, inspector_id from public.inspections $$,
  $$ values ('inspector_assigned'::text, '33333333-3333-3333-3333-333333333333'::uuid) $$,
  'The booking is assigned'
);

select is(
  (select count(*)::int from public.admin_inspectors(null)),
  2,
  'The admin lists the inspectors'
);

select is(
  (select roles from public.admin_list_users('insp doi', null, null, 50, 0)),
  array['user', 'inspector']::public.app_role[],
  'The users list shows the roles'
);

select lives_ok(
  $$ select public.set_inspector_weekly_hours('44444444-4444-4444-4444-444444444444', 3::smallint,
       '[{"starts_at": "08:00", "ends_at": "12:00"}, {"starts_at": "13:00", "ends_at": "18:00"}]') $$,
  'The admin can set an inspector''s weekly hours'
);

select throws_ok(
  $$ select public.set_inspector_weekly_hours('44444444-4444-4444-4444-444444444444', 4::smallint,
       '[{"starts_at": "08:00", "ends_at": "12:00"}, {"starts_at": "11:00", "ends_at": "14:00"}]') $$,
  'P0001', 'availability_invalid',
  'Overlapping ranges are refused'
);

set local request.jwt.claims = '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated", "user_roles": ["user", "inspector"]}';

select is(
  (select count(*)::int from public.inspector_agenda(now(), now() + interval '30 days')),
  1,
  'The inspector sees the assigned booking in the agenda'
);

select is((select count(*)::int from public.properties), 0, 'The inspector does not read properties directly');

select lives_ok(
  $$ select public.set_inspector_weekly_hours('33333333-3333-3333-3333-333333333333', 2::smallint,
       '[{"starts_at": "09:00", "ends_at": "13:00"}]') $$,
  'An inspector can set their own weekly hours'
);

select throws_ok(
  $$ select public.set_inspector_weekly_hours('44444444-4444-4444-4444-444444444444', 5::smallint,
       '[{"starts_at": "09:00", "ends_at": "13:00"}]') $$,
  '42501', 'forbidden',
  'An inspector cannot set someone else''s hours'
);

select lives_ok(
  $$ insert into public.inspector_exceptions (inspector_id, kind, starts_at, ends_at)
     values ('33333333-3333-3333-3333-333333333333', 'day_off', (select monday_8 from fixture) + interval '7 days',
             (select monday_8 from fixture) + interval '8 days') $$,
  'An inspector can add a day off'
);

select throws_ok(
  $$ insert into public.inspector_exceptions (inspector_id, kind, starts_at, ends_at)
     values ('44444444-4444-4444-4444-444444444444', 'day_off', now() + interval '2 days', now() + interval '3 days') $$,
  '42501', null,
  'An inspector cannot add a day off for someone else'
);

select is(
  (select free from public.inspection_slots((select timisoara from fixture), (select monday_8 from fixture)::date + 7, (select monday_8 from fixture)::date + 7)
   where starts_at = (select monday_8 from fixture) + interval '7 days'),
  0,
  'A day off removes the inspector''s hours'
);

select throws_ok(
  $$ select public.unassign_inspector((select id from public.inspections)) $$,
  '42501', 'forbidden',
  'An inspector cannot unassign'
);

set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated", "user_roles": ["user"]}';

select is(
  (select inspector_name from public.my_inspections()),
  'Insp Unu',
  'The client sees the assigned inspector''s name'
);

select is(
  (select count(*)::int from public.inspection_history((select id from public.inspections))),
  3,
  'The client reads the booking history'
);

select lives_ok(
  $$ select public.reschedule_inspection((select id from public.inspections), (select monday_11 from fixture)) $$,
  'The client can move an assigned booking'
);

select is(
  (select status::text from public.inspections),
  'inspector_assigned',
  'The inspector stays when still free at the new hour'
);

select lives_ok(
  $$ select public.cancel_inspection((select id from public.inspections), 'Am vândut deja') $$,
  'The client can cancel before the visit'
);

select results_eq(
  $$ select status::text, inspector_id, cancel_reason from public.inspections $$,
  $$ values ('cancelled'::text, null::uuid, 'Am vândut deja'::text) $$,
  'The cancelled booking frees the inspector'
);

select throws_ok(
  $$ select public.reschedule_inspection((select id from public.inspections), (select monday_14 from fixture)) $$,
  'P0001', 'inspection_locked',
  'A cancelled booking cannot be moved'
);

select * from finish();
rollback;
