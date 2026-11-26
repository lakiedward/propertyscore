begin;

create extension if not exists pgtap with schema extensions;

select plan(80);

create temporary table fixture as
select
  'a0000000-0000-4000-8000-000000000001'::uuid as ana_id,
  'a0000000-0000-4000-8000-000000000002'::uuid as emma_id,
  'a0000000-0000-4000-8000-000000000003'::uuid as ion_id,
  'a0000000-0000-4000-8000-000000000004'::uuid as admin_id,
  'a0000000-0000-4000-8000-000000000005'::uuid as mihai_id,
  'a0000000-0000-4000-8000-000000000006'::uuid as elena_id,
  (select id from public.cities where slug = 'timisoara') as timisoara,
  (select id from public.cities where slug = 'bucuresti') as bucuresti,
  (select id from public.cities where slug = 'cluj-napoca') as cluj,
  (now() at time zone 'Europe/Bucharest')::date as today,
  date_trunc('week', now() at time zone 'Europe/Bucharest')::date + 14 as monday;

grant select on fixture to authenticated, anon;

insert into public.inspector_exceptions (id, inspector_id, kind, starts_at, ends_at)
values (
  'f1000000-0000-4000-8000-000000000001',
  (select elena_id from fixture),
  'leave',
  (((select monday from fixture) + 2) + time '09:00') at time zone 'Europe/Bucharest',
  (((select monday from fixture) + 2) + time '12:00') at time zone 'Europe/Bucharest'
);

insert into public.inspections (
  id, property_id, requested_by, inspector_id, status, starts_at, ends_at, access_mode, access_name,
  access_phone, payment_method, assigned_at
)
values
  (
    'e0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000004',
    (select ion_id from fixture), (select elena_id from fixture), 'inspector_assigned',
    ((select monday from fixture) + time '11:00') at time zone 'Europe/Bucharest',
    ((select monday from fixture) + time '13:00') at time zone 'Europe/Bucharest',
    'self', 'Ion Țurcanu', '+40722000003', 'card', now()
  ),
  (
    'e0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000004',
    (select ion_id from fixture), null, 'scheduled',
    ((select monday from fixture) + time '08:00') at time zone 'Europe/Bucharest',
    ((select monday from fixture) + time '10:00') at time zone 'Europe/Bucharest',
    'self', 'Ion Țurcanu', '+40722000003', 'card', null
  ),
  (
    'e0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000002',
    (select ana_id from fixture), null, 'scheduled',
    (select starts_at from public.inspections where id = 'd0000000-0000-4000-8000-000000000001'),
    (select ends_at from public.inspections where id = 'd0000000-0000-4000-8000-000000000001'),
    'self', 'Ana Mărginean', '+40722000001', 'card', null
  ),
  (
    'e0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000002',
    (select ana_id from fixture), (select mihai_id from fixture), 'inspector_assigned',
    now() - interval '30 minutes', now() + interval '90 minutes',
    'self', 'Ana Mărginean', '+40722000001', 'card', now()
  );

create function pg_temp.old_slot_counts(
  p_city_id uuid,
  p_starts_at timestamptz,
  p_exclude_inspection_id uuid
)
returns table (working integer, free integer)
language sql
stable
as $$
  with inspectors as (
    select profiles.user_id
    from public.inspector_profiles as profiles
    where profiles.city_id = p_city_id
      and profiles.is_active
      and exists (
        select 1 from public.user_roles
        where user_roles.user_id = profiles.user_id and user_roles.role = 'inspector'
      )
  ),
  working as (
    select inspectors.user_id
    from inspectors
    where exists (
      select 1
      from public.inspector_weekly_hours as hours
      where hours.inspector_id = inspectors.user_id
        and hours.weekday = extract(isodow from p_starts_at at time zone 'Europe/Bucharest')
        and hours.starts_at <= (p_starts_at at time zone 'Europe/Bucharest')::time
        and hours.ends_at >= ((p_starts_at + interval '2 hours') at time zone 'Europe/Bucharest')::time
    )
  ),
  free_inspectors as (
    select working.user_id
    from working
    where private.inspector_is_free(
      working.user_id, p_starts_at, p_starts_at + interval '2 hours', p_exclude_inspection_id
    )
  ),
  waiting as (
    select count(*)::integer as amount
    from public.inspections as booked
    join public.properties on properties.id = booked.property_id
    where properties.city_id = p_city_id
      and booked.status = 'scheduled'
      and booked.id is distinct from p_exclude_inspection_id
      and booked.starts_at < p_starts_at + interval '2 hours 30 minutes'
      and booked.ends_at > p_starts_at - interval '30 minutes'
  )
  select
    (select count(*)::integer from working),
    greatest((select count(*)::integer from free_inspectors) - (select amount from waiting), 0);
$$;

create temporary table slot_starts as
select cities.id as city_id, ((day::date + start_time) at time zone 'Europe/Bucharest') as starts_at
from public.cities
cross join generate_series(
  (select today from fixture) + 1, (select today from fixture) + 90, interval '1 day'
) as day
cross join unnest(private.inspection_start_times()) as start_time;

select is_empty(
  $$ select slot_starts.city_id, slot_starts.starts_at, counts.working, counts.free
     from slot_starts
     cross join lateral pg_temp.old_slot_counts(slot_starts.city_id, slot_starts.starts_at, null) as counts
     except
     select cities.id, slots.starts_at, slots.working, slots.free
     from public.cities
     cross join lateral public.inspection_slots(
       cities.id, (select today from fixture) + 1, (select today from fixture) + 90
     ) as slots $$,
  'The set-based count returns every hour the per-inspector count returned'
);

select is_empty(
  $$ select cities.id, slots.starts_at, slots.working, slots.free
     from public.cities
     cross join lateral public.inspection_slots(
       cities.id, (select today from fixture) + 1, (select today from fixture) + 90
     ) as slots
     except
     select slot_starts.city_id, slot_starts.starts_at, counts.working, counts.free
     from slot_starts
     cross join lateral pg_temp.old_slot_counts(slot_starts.city_id, slot_starts.starts_at, null) as counts $$,
  'The set-based count returns no hour the per-inspector count did not'
);

select is_empty(
  $$ (
       select slot_starts.city_id, slot_starts.starts_at, counts.working, counts.free
       from slot_starts
       cross join lateral pg_temp.old_slot_counts(
         slot_starts.city_id, slot_starts.starts_at, 'e0000000-0000-4000-8000-000000000001'
       ) as counts
       except
       select slot_starts.city_id, slot_starts.starts_at, counts.working, counts.free
       from slot_starts
       cross join lateral private.inspection_slot_counts(
         slot_starts.city_id, slot_starts.starts_at, 'e0000000-0000-4000-8000-000000000001'
       ) as counts
     )
     union all
     (
       select slot_starts.city_id, slot_starts.starts_at, counts.working, counts.free
       from slot_starts
       cross join lateral private.inspection_slot_counts(
         slot_starts.city_id, slot_starts.starts_at, 'e0000000-0000-4000-8000-000000000001'
       ) as counts
       except
       select slot_starts.city_id, slot_starts.starts_at, counts.working, counts.free
       from slot_starts
       cross join lateral pg_temp.old_slot_counts(
         slot_starts.city_id, slot_starts.starts_at, 'e0000000-0000-4000-8000-000000000001'
       ) as counts
     ) $$,
  'Excluding a booking counts every hour the same way as before'
);

select ok(
  exists (
    select 1 from public.inspection_slots(
      (select bucuresti from fixture), (select monday from fixture), (select monday from fixture)
    )
    where working > 0 and free = 0
  )
  and exists (
    select 1 from public.inspection_slots(
      (select timisoara from fixture), (select today from fixture) + 1, (select today from fixture) + 90
    )
    where free > 0
  ),
  'The compared window holds both free and taken hours'
);

select is(
  (
    select count(distinct (starts_at at time zone 'Europe/Bucharest')::date)::int
    from public.inspection_slots(
      (select timisoara from fixture), (select today from fixture) + 1, (select today from fixture) + 90
    )
  ),
  90,
  'One call returns the whole 90-day booking window'
);

select ok(
  exists (
    select 1 from public.inspection_slots(
      (select timisoara from fixture), (select today from fixture) + 1, (select today from fixture) + 90
    )
    where (starts_at at time zone 'Europe/Bucharest')::date = (select today from fixture) + 85
  ),
  'A 90-day request returns the hours of day 85'
);

select hasnt_function(
  'public', 'inspector_free_starts', array['uuid', 'date', 'date'],
  'The unused inspector_free_starts RPC is gone'
);

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select throws_ok($$ select count(*) from public.inspector_profiles $$, '42501', null, 'Visitors cannot read inspector profiles');
select throws_ok($$ select count(*) from public.inspector_weekly_hours $$, '42501', null, 'Visitors cannot read weekly hours');

set local role authenticated;
set local request.jwt.claims = '{"sub": "a0000000-0000-4000-8000-000000000006", "role": "authenticated", "user_roles": ["inspector"]}';

select is(
  (select count(*)::int from public.inspector_profiles where user_id = (select mihai_id from fixture)),
  0,
  'An inspector cannot read another inspector''s profile'
);

select is(
  (select count(*)::int from public.inspector_weekly_hours where inspector_id = (select mihai_id from fixture)),
  0,
  'An inspector cannot read another inspector''s weekly hours'
);

select is(
  (select count(*)::int from public.inspector_workspace('d0000000-0000-4000-8000-000000000001')),
  0,
  'Another inspector cannot open the inspection workspace'
);

delete from public.inspector_exceptions where inspector_id = (select mihai_id from fixture);

reset role;

select is(
  (select count(*)::int from public.inspector_exceptions where inspector_id = (select mihai_id from fixture)),
  1,
  'An inspector cannot remove another inspector''s exceptions'
);

set local role authenticated;
set local request.jwt.claims = '{"sub": "a0000000-0000-4000-8000-000000000005", "role": "authenticated", "user_roles": ["inspector"]}';

select is(
  (select count(*)::int from public.inspector_workspace('d0000000-0000-4000-8000-000000000001')),
  1,
  'The assigned inspector opens the inspection workspace'
);

delete from public.inspector_exceptions where inspector_id = (select mihai_id from fixture);

reset role;

select is(
  (select count(*)::int from public.inspector_exceptions where inspector_id = (select mihai_id from fixture)),
  0,
  'An inspector removes their own exceptions'
);

set local role authenticated;
set local request.jwt.claims = '{"sub": "a0000000-0000-4000-8000-000000000004", "role": "authenticated", "user_roles": ["admin"]}';

delete from public.inspector_exceptions where id = 'f1000000-0000-4000-8000-000000000001';

reset role;

select is(
  (select count(*)::int from public.inspector_exceptions where id = 'f1000000-0000-4000-8000-000000000001'),
  0,
  'An admin removes any inspector''s exception'
);

set local role authenticated;
set local request.jwt.claims = '{"sub": "a0000000-0000-4000-8000-000000000001", "role": "authenticated", "user_roles": ["user"]}';

select is(
  (select count(*)::int from public.inspection_history('d0000000-0000-4000-8000-000000000003')),
  0,
  'A client cannot read another client''s booking history'
);

select is(
  (
    select count(*)::int from public.my_bookable_properties()
    where property_id in ('c0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000004')
  ),
  0,
  'The bookable homes never include another account''s homes'
);

select is(
  (
    select count(*)::int from public.my_bookable_properties()
    where property_id in ('c0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002')
  ),
  2,
  'The bookable homes list the caller''s saved homes'
);

select throws_ok($$ select * from public.admin_user_role_counts() $$, '42501', 'forbidden', 'A user cannot read the role counts');
select throws_ok($$ select public.admin_unassigned_count() $$, '42501', 'forbidden', 'A user cannot read the unassigned count');
select throws_ok(
  $$ select public.set_inspector((select emma_id from fixture), (select timisoara from fixture)) $$,
  '42501', 'forbidden', 'A user cannot make an inspector'
);
select throws_ok(
  $$ select public.remove_inspector((select mihai_id from fixture)) $$,
  '42501', 'forbidden', 'A user cannot remove an inspector'
);
select throws_ok(
  $$ select public.unblock_user((select emma_id from fixture)) $$,
  '42501', 'forbidden', 'A user cannot unblock an account'
);
select throws_ok(
  $$ update public.listings set status = 'suspended' where id = 'b0000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'An owner cannot suspend a listing directly'
);

select lives_ok(
  $$ select public.cancel_inspection('d0000000-0000-4000-8000-000000000002', null) $$,
  'A client cancels their own booking without a reason'
);

set local request.jwt.claims = '{"sub": "a0000000-0000-4000-8000-000000000004", "role": "authenticated", "user_roles": ["admin"]}';

select is(
  (select count(*)::int from public.admin_user_role_counts()),
  (select count(*)::int from unnest(enum_range(null::public.app_role))),
  'An admin reads a count for every role'
);

select is(
  public.admin_unassigned_count(),
  (select count(*)::int from public.admin_inspections(now(), now(), null, true)),
  'The unassigned count matches the unassigned queue'
);

select is(
  (select count(*)::int from public.admin_inspections(now() - interval '30 days', now() + interval '90 days', null, null)),
  0,
  'The schedule still returns nothing without a queue flag'
);

select set_eq(
  $$ select user_id from public.admin_list_users('', null, null, (select timisoara from fixture)) $$,
  $$ select profiles.user_id
     from public.inspector_profiles as profiles
     where profiles.city_id = (select timisoara from fixture)
       and profiles.is_active
       and exists (
         select 1 from public.user_roles
         where user_roles.user_id = profiles.user_id and user_roles.role = 'inspector'
       ) $$,
  'The city filter returns only that city''s current inspectors'
);

select is((select count(*)::int from public.admin_list_users('%')), 0, 'A percent sign is searched literally');
select is((select count(*)::int from public.admin_list_users('_')), 0, 'An underscore is searched literally');
select is((select count(*)::int from public.admin_list_users('mihai')), 1, 'A plain search still matches');

select lives_ok(
  $$ select public.unassign_inspector('d0000000-0000-4000-8000-000000000001') $$,
  'An admin takes an inspector off a visit'
);

select results_eq(
  $$ select status::text, inspector_id, assigned_at from public.inspections where id = 'd0000000-0000-4000-8000-000000000001' $$,
  $$ values ('scheduled'::text, null::uuid, null::timestamptz) $$,
  'The visit goes back to the queue'
);

select is(
  (
    select count(*)::int from public.inspection_events
    where inspection_id = 'd0000000-0000-4000-8000-000000000001'
      and kind = 'unassigned'
      and details ->> 'inspector_id' = (select mihai_id from fixture)::text
  ),
  1,
  'Taking the inspector off is recorded in the history'
);

select lives_ok(
  $$ select public.assign_inspector('d0000000-0000-4000-8000-000000000001', (select mihai_id from fixture)) $$,
  'An admin assigns the inspector again'
);

select throws_ok(
  $$ select public.assign_inspector('e0000000-0000-4000-8000-000000000003', (select mihai_id from fixture)) $$,
  'P0001', 'inspector_busy',
  'An inspector with a visit at the same time cannot be assigned'
);

select throws_ok(
  $$ select public.cancel_inspection('e0000000-0000-4000-8000-000000000003', '  ') $$,
  'P0001', 'cancel_reason_required',
  'An admin must give a reason to cancel a client''s booking'
);

select lives_ok(
  $$ select public.cancel_inspection('e0000000-0000-4000-8000-000000000003', 'Clientul a cerut telefonic') $$,
  'An admin cancels a client''s booking with a reason'
);

select throws_ok(
  $$ select public.set_inspector_weekly_hours((select ion_id from fixture), 1::smallint, '[]') $$,
  'P0001', 'inspector_not_found',
  'Weekly hours need an inspector profile'
);

select throws_ok(
  $$ select public.set_inspector_weekly_hours((select elena_id from fixture), 4::smallint,
       '[{"starts_at": "08:00", "ends_at": "10:00"}, {"starts_at": "08:00", "ends_at": "12:00"}]') $$,
  'P0001', 'availability_invalid',
  'Ranges with the same start overlap'
);

select throws_ok(
  $$ select public.set_inspector_weekly_hours((select elena_id from fixture), 4::smallint,
       '[{"starts_at": "09:00", "ends_at": "11:00"}, {"starts_at": "09:00", "ends_at": "11:00"}]') $$,
  'P0001', 'availability_invalid',
  'The same range twice overlaps'
);

select lives_ok(
  $$ select public.set_inspector_weekly_hours((select elena_id from fixture), 4::smallint,
       '[{"starts_at": "08:00", "ends_at": "12:00"}, {"starts_at": "12:00", "ends_at": "14:00"}]') $$,
  'Ranges that only touch are accepted'
);

select throws_ok(
  $$ select public.unblock_user((select emma_id from fixture)) $$,
  'P0001', 'user_not_blocked',
  'An account that is not blocked cannot be unblocked'
);

reset role;

create temporary table free_hours as
select
  (
    select starts_at from public.inspection_slots(
      (select timisoara from fixture), (select today from fixture) + 20, (select today from fixture) + 30
    )
    where free > 0 order by starts_at limit 1
  ) as first_hour,
  (
    select starts_at from public.inspection_slots(
      (select timisoara from fixture), (select today from fixture) + 40, (select today from fixture) + 50
    )
    where free > 0 order by starts_at limit 1
  ) as second_hour;

create temporary table homes_before as
select count(*)::int as amount from public.properties where owner_id = (select ion_id from fixture);

grant select on free_hours, homes_before to authenticated;

set local role authenticated;
set local request.jwt.claims = '{"sub": "a0000000-0000-4000-8000-000000000003", "role": "authenticated", "user_roles": ["user"]}';

select lives_ok(
  $$ select * from public.book_inspection('Str. Paris 3, ap. 9, Timișoara', (select timisoara from fixture),
       45.7484, 21.2215, 'apartment', 62, (select first_hour from free_hours), 'self', '{}', 'card',
       'c0000000-0000-4000-8000-000000000003', null, 1962::smallint, 2::smallint, 4::smallint, null, null, null) $$,
  'A client books a saved home with the same details'
);

select is(
  (select property_id from public.inspections where starts_at = (select first_hour from free_hours) and requested_by = (select ion_id from fixture)),
  'c0000000-0000-4000-8000-000000000003'::uuid,
  'The same details reuse the saved home'
);

select lives_ok(
  $$ select * from public.book_inspection('Str. Paris 5, ap. 2, Timișoara', (select timisoara from fixture),
       45.7484, 21.2215, 'apartment', 62, (select second_hour from free_hours), 'self', '{}', 'card',
       'c0000000-0000-4000-8000-000000000003', null, 1962::smallint, 2::smallint, 4::smallint, null, null, null) $$,
  'A client books a saved home with a different address'
);

select results_eq(
  $$ select properties.address_text
     from public.inspections
     join public.properties on properties.id = inspections.property_id
     where inspections.id in ('d0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000005')
     order by inspections.id $$,
  $$ values ('Str. Paris 3, ap. 9, Timișoara'::text), ('Str. Paris 3, ap. 9, Timișoara'::text) $$,
  'Earlier inspections keep the saved home''s address'
);

select is(
  (
    select properties.address_text
    from public.inspections
    join public.properties on properties.id = inspections.property_id
    where inspections.starts_at = (select second_hour from free_hours)
      and inspections.requested_by = (select ion_id from fixture)
      and properties.id <> 'c0000000-0000-4000-8000-000000000003'
  ),
  'Str. Paris 5, ap. 2, Timișoara',
  'Changed details are booked on a new home'
);

select is(
  (select count(*)::int from public.properties where owner_id = (select ion_id from fixture)),
  (select amount + 1 from homes_before),
  'Only the changed booking adds a home'
);

reset role;

update public.inspections
set status = 'completed',
  form_version_id = (select id from public.inspection_form_versions where status = 'published'),
  consent_version_id = (select id from public.consent_versions where status = 'published'),
  started_at = now() - interval '2 hours',
  submitted_at = now() - interval '1 hour'
where id = 'd0000000-0000-4000-8000-000000000005';

insert into public.inspection_consents (
  inspection_id, consent_version_id, language, signer_name, signature_path, sections_snapshot
)
values (
  'd0000000-0000-4000-8000-000000000005',
  (select id from public.consent_versions where status = 'published'),
  'ro',
  'Ion Țurcanu',
  'd0000000-0000-4000-8000-000000000005/signature/owner.png',
  '[]'
);

insert into public.inspection_answers (inspection_id, question_id, answer)
select 'd0000000-0000-4000-8000-000000000005', question.id, 'good'
from public.inspection_form_questions as question
where question.form_version_id = (select id from public.inspection_form_versions where status = 'published')
limit 1;

insert into storage.objects (bucket_id, name, metadata)
values (
  'inspection-media',
  'd0000000-0000-4000-8000-000000000005/question/past.webp',
  '{"mimetype": "image/webp", "size": 10}'
);

set local role authenticated;
set local request.jwt.claims = '{"sub": "a0000000-0000-4000-8000-000000000005", "role": "authenticated", "user_roles": ["inspector"]}';

select is(
  (
    (select count(*) from public.inspections where id = 'd0000000-0000-4000-8000-000000000005')
    + (select count(*) from public.inspection_answers where inspection_id = 'd0000000-0000-4000-8000-000000000005')
    + (select count(*) from public.inspection_consents where inspection_id = 'd0000000-0000-4000-8000-000000000005')
    + (select count(*) from storage.objects where name = 'd0000000-0000-4000-8000-000000000005/question/past.webp')
  )::int,
  4,
  'A current inspector reads their inspection, answers, consent and files'
);

set local request.jwt.claims = '{"sub": "a0000000-0000-4000-8000-000000000004", "role": "authenticated", "user_roles": ["admin"]}';

select lives_ok(
  $$ select public.remove_inspector((select mihai_id from fixture)) $$,
  'An admin removes an inspector with a visit that already started'
);

select results_eq(
  $$ select id, status::text, inspector_id from public.inspections
     where id in ('d0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000004')
     order by id $$,
  $$ values
       ('d0000000-0000-4000-8000-000000000001'::uuid, 'scheduled'::text, null::uuid),
       ('e0000000-0000-4000-8000-000000000004'::uuid, 'scheduled'::text, null::uuid) $$,
  'Every assigned visit goes back to the queue, including one whose time has come'
);

select is(
  (
    select count(*)::int from public.inspection_events
    where inspection_id in ('d0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000004')
      and kind = 'unassigned'
      and details ->> 'reason' = 'inspector_removed'
      and actor_id = (select admin_id from fixture)
  ),
  2,
  'Each released visit is recorded with the admin and the reason'
);

select is(
  (select status::text from public.inspections where id = 'd0000000-0000-4000-8000-000000000005'),
  'completed',
  'A completed inspection keeps its inspector'
);

set local request.jwt.claims = '{"sub": "a0000000-0000-4000-8000-000000000005", "role": "authenticated", "user_roles": ["user"]}';

select is(
  (select count(*)::int from public.inspections where id = 'd0000000-0000-4000-8000-000000000005'),
  0,
  'A former inspector cannot read their past inspection'
);

select is(
  (select count(*)::int from public.inspection_answers where inspection_id = 'd0000000-0000-4000-8000-000000000005'),
  0,
  'A former inspector cannot read the answers'
);

select is(
  (select count(*)::int from public.inspection_consents where inspection_id = 'd0000000-0000-4000-8000-000000000005'),
  0,
  'A former inspector cannot read the signed consent'
);

select is(
  (select count(*)::int from storage.objects where name = 'd0000000-0000-4000-8000-000000000005/question/past.webp'),
  0,
  'A former inspector cannot read the inspection files'
);

reset role;

set local request.jwt.claims = '{"sub": "a0000000-0000-4000-8000-000000000004", "role": "authenticated", "user_roles": ["admin"]}';

update public.inspections
set status = 'in_progress',
  form_version_id = (select id from public.inspection_form_versions where status = 'published'),
  started_at = now()
where id = 'e0000000-0000-4000-8000-000000000001';

select throws_ok(
  $$ delete from auth.users where id = 'a0000000-0000-4000-8000-000000000006' $$,
  'P0001', 'inspector_has_open_inspection',
  'An inspector with an inspection in progress cannot be deleted'
);

update public.inspections
set status = 'inspector_assigned', form_version_id = null, started_at = null
where id = 'e0000000-0000-4000-8000-000000000001';

select lives_ok(
  $$ delete from auth.users where id = 'a0000000-0000-4000-8000-000000000006' $$,
  'An inspector with assigned visits can be deleted'
);

select results_eq(
  $$ select status::text, inspector_id, assigned_at from public.inspections where id = 'e0000000-0000-4000-8000-000000000001' $$,
  $$ values ('scheduled'::text, null::uuid, null::timestamptz) $$,
  'The deleted inspector''s visits go back to the queue'
);

select is(
  (
    select count(*)::int from public.inspection_events
    where inspection_id = 'e0000000-0000-4000-8000-000000000001'
      and kind = 'unassigned'
      and details ->> 'reason' = 'inspector_deleted'
  ),
  1,
  'The release is recorded in the history'
);

set local role authenticated;

select lives_ok(
  $$ select public.block_user((select ion_id from fixture), 'Rezervări false') $$,
  'An admin blocks a client'
);

select throws_ok(
  $$ select public.set_inspector((select ion_id from fixture), (select timisoara from fixture)) $$,
  'P0001', 'user_blocked',
  'A blocked account cannot be made an inspector'
);

set local request.jwt.claims = '{"sub": "a0000000-0000-4000-8000-000000000003", "role": "authenticated", "user_roles": ["user"]}';

select throws_ok(
  $$ select * from public.book_inspection('Str. Paris 3, ap. 9, Timișoara', (select timisoara from fixture),
       45.7484, 21.2215, 'apartment', 62, (select second_hour from free_hours), 'self', '{}', 'card',
       null, null, 1962::smallint, 2::smallint, 4::smallint, null, null, null) $$,
  'P0001', 'user_blocked',
  'A blocked account cannot book'
);

select throws_ok(
  $$ select public.reschedule_inspection('d0000000-0000-4000-8000-000000000003', (select second_hour from free_hours)) $$,
  'P0001', 'user_blocked',
  'A blocked account cannot reschedule'
);

reset role;

insert into public.inspector_profiles (user_id, city_id, is_active)
values ((select ion_id from fixture), (select cluj from fixture), false);

set local role authenticated;
set local request.jwt.claims = '{"sub": "a0000000-0000-4000-8000-000000000004", "role": "authenticated", "user_roles": ["admin"]}';

select public.unblock_user((select ion_id from fixture));

reset role;

select is(
  (select is_active from public.inspector_profiles where user_id = (select ion_id from fixture)),
  false,
  'Unblocking does not reactivate a profile without the inspector role'
);

insert into public.inspector_profiles (user_id, city_id, is_active)
values ((select emma_id from fixture), (select cluj from fixture), true);

insert into public.inspector_weekly_hours (inspector_id, weekday, starts_at, ends_at)
select (select emma_id from fixture), weekday, time '08:00', time '17:00'
from generate_series(1, 6) as weekday;

set local role authenticated;

select is(
  (select has_inspectors from public.inspection_cities() where id = (select cluj from fixture)),
  false,
  'An active profile without the inspector role does not cover a city'
);

select is(
  (select max(working) from public.inspection_slots((select cluj from fixture), (select today from fixture) + 1, (select today from fixture) + 14)),
  0,
  'An active profile without the inspector role offers no hours'
);

select is(
  (select count(*)::int from public.admin_list_users('', null, null, (select cluj from fixture))),
  0,
  'The city filter skips profiles without the inspector role'
);

reset role;

insert into public.user_roles (user_id, role) values ((select emma_id from fixture), 'inspector');

set local role authenticated;

select is(
  (select has_inspectors from public.inspection_cities() where id = (select cluj from fixture)),
  true,
  'A current inspector covers the city'
);

select ok(
  (select max(working) from public.inspection_slots((select cluj from fixture), (select today from fixture) + 1, (select today from fixture) + 14)) > 0,
  'A current inspector offers hours'
);

select results_eq(
  $$ select user_id from public.admin_list_users('', null, null, (select cluj from fixture)) $$,
  $$ values ('a0000000-0000-4000-8000-000000000002'::uuid) $$,
  'The city filter returns the current inspector only'
);

select public.block_user((select emma_id from fixture), 'Absențe');
select public.unblock_user((select emma_id from fixture));

reset role;

select is(
  (select is_active from public.inspector_profiles where user_id = (select emma_id from fixture)),
  true,
  'Unblocking reactivates a current inspector'
);

insert into public.properties (
  id, owner_id, address_text, city_id, latitude, longitude, property_type, area_m2
)
values (
  'c1000000-0000-4000-8000-000000000001', (select ana_id from fixture), 'Str. Memorandumului 4, Cluj-Napoca',
  (select cluj from fixture), 46.7700, 23.5900, 'apartment', 55
);

insert into public.inspections (
  id, property_id, requested_by, inspector_id, status, starts_at, ends_at, access_mode, access_name,
  access_phone, payment_method, assigned_at
)
values (
  'e0000000-0000-4000-8000-000000000005', 'c1000000-0000-4000-8000-000000000001',
  (select ana_id from fixture), (select emma_id from fixture), 'inspector_assigned',
  now() + interval '10 days', now() + interval '10 days 2 hours',
  'self', 'Ana Mărginean', '+40722000001', 'card', now()
);

set local role authenticated;

select public.set_inspector((select emma_id from fixture), (select cluj from fixture));

select is(
  (select status::text from public.inspections where id = 'e0000000-0000-4000-8000-000000000005'),
  'inspector_assigned',
  'Saving the same city keeps the inspector''s visits'
);

select public.set_inspector((select emma_id from fixture), (select timisoara from fixture));

select results_eq(
  $$ select status::text, inspector_id from public.inspections where id = 'e0000000-0000-4000-8000-000000000005' $$,
  $$ values ('scheduled'::text, null::uuid) $$,
  'Moving an inspector to another city releases the visits left behind'
);

select is(
  (
    select count(*)::int from public.inspection_events
    where inspection_id = 'e0000000-0000-4000-8000-000000000005'
      and kind = 'unassigned'
      and details ->> 'reason' = 'inspector_city_changed'
  ),
  1,
  'The city change is recorded in the history'
);

select is(
  (select array_agg(role order by role) from public.user_roles where user_id = (select emma_id from fixture)),
  array['inspector']::public.app_role[],
  'The inspector role replaces the user role'
);

select * from finish();
rollback;
