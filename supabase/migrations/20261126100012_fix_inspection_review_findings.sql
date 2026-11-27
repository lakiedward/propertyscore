create function private.lock_existing_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from auth.users where users.id = p_user_id for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'user_not_found';
  end if;
end;
$$;

create function private.replace_user_role(
  p_user_id uuid,
  p_from public.app_role,
  p_to public.app_role
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    p_to = 'admin' and exists (
      select 1 from public.user_roles
      where user_roles.user_id = p_user_id and user_roles.role = 'inspector'
    )
  ) or (
    p_to = 'inspector' and exists (
      select 1 from public.user_roles
      where user_roles.user_id = p_user_id and user_roles.role = 'admin'
    )
  ) then
    raise exception using errcode = 'P0001', message = 'admin_inspector_conflict';
  end if;

  insert into public.user_roles (user_id, role, granted_by)
  values (p_user_id, p_to, (select auth.uid()))
  on conflict (user_id, role) do nothing;

  delete from public.user_roles
  where user_roles.user_id = p_user_id and user_roles.role = p_from;
end;
$$;

create function private.release_inspector_visits(
  p_inspector_id uuid,
  p_reason text,
  p_keep_city_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := nullif((select auth.uid()), p_inspector_id);
begin
  with released as (
    update public.inspections
    set status = 'scheduled', inspector_id = null, assigned_at = null
    where inspections.inspector_id = p_inspector_id
      and inspections.status = 'inspector_assigned'
      and (
        p_keep_city_id is null
        or exists (
          select 1 from public.properties
          where properties.id = inspections.property_id
            and properties.city_id <> p_keep_city_id
        )
      )
    returning inspections.id
  )
  insert into public.inspection_events (inspection_id, kind, actor_id, details)
  select released.id, 'unassigned', actor, jsonb_build_object('reason', p_reason)
  from released;
end;
$$;

create function private.release_visits_of_deleted_inspector()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.inspections
    where inspections.inspector_id = old.user_id and inspections.status = 'in_progress'
  ) then
    raise exception using errcode = 'P0001', message = 'inspector_has_open_inspection';
  end if;
  perform private.release_inspector_visits(old.user_id, 'inspector_deleted');
  return old;
end;
$$;

create trigger inspector_profiles_release_visits_before_delete
  before delete on public.inspector_profiles
  for each row execute function private.release_visits_of_deleted_inspector();

create function private.city_slot_counts(
  p_city_id uuid,
  p_starts timestamptz[],
  p_exclude_inspection_id uuid
)
returns table (starts_at timestamptz, working integer, free integer)
language sql
stable
security definer
set search_path = ''
as $$
  with starts as (
    select
      requested.slot,
      requested.starts_at,
      requested.starts_at at time zone 'Europe/Bucharest' as local_start,
      (requested.starts_at + interval '2 hours') at time zone 'Europe/Bucharest' as local_end
    from unnest(p_starts) with ordinality as requested (starts_at, slot)
  ),
  inspectors as (
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
    select
      starts.slot,
      starts.local_start::date = starts.local_end::date
      and not exists (
        select 1
        from public.inspector_exceptions as exception
        where exception.inspector_id = inspectors.user_id
          and exception.starts_at < starts.starts_at + interval '2 hours'
          and exception.ends_at > starts.starts_at
      )
      and not exists (
        select 1
        from public.inspections as booked
        where booked.inspector_id = inspectors.user_id
          and booked.status in ('inspector_assigned', 'in_progress', 'completed', 'book_ready')
          and booked.id is distinct from p_exclude_inspection_id
          and booked.starts_at < (starts.starts_at + interval '2 hours') + interval '30 minutes'
          and booked.ends_at > starts.starts_at - interval '30 minutes'
      ) as is_free
    from starts
    cross join inspectors
    where exists (
      select 1
      from public.inspector_weekly_hours as hours
      where hours.inspector_id = inspectors.user_id
        and hours.weekday = extract(isodow from starts.local_start)
        and hours.starts_at <= starts.local_start::time
        and hours.ends_at >= starts.local_end::time
    )
  )
  select
    starts.starts_at,
    (select count(*)::integer from working where working.slot = starts.slot),
    greatest(
      (select count(*)::integer from working where working.slot = starts.slot and working.is_free)
      - (
        select count(*)::integer
        from public.inspections as booked
        join public.properties on properties.id = booked.property_id
        where properties.city_id = p_city_id
          and booked.status = 'scheduled'
          and booked.id is distinct from p_exclude_inspection_id
          and booked.starts_at < starts.starts_at + interval '2 hours 30 minutes'
          and booked.ends_at > starts.starts_at - interval '30 minutes'
      ),
      0
    )
  from starts
  order by starts.slot;
$$;

create or replace function private.inspection_slot_counts(
  p_city_id uuid,
  p_starts_at timestamptz,
  p_exclude_inspection_id uuid
)
returns table (working integer, free integer)
language sql
stable
security definer
set search_path = ''
as $$
  select counts.working, counts.free
  from private.city_slot_counts(p_city_id, array[p_starts_at], p_exclude_inspection_id) as counts;
$$;

create or replace function public.inspection_slots(p_city_id uuid, p_from date, p_to date)
returns table (starts_at timestamptz, working integer, free integer)
language sql
stable
security definer
set search_path = ''
as $$
  with days as (
    select day::date
    from generate_series(
      greatest(p_from, (now() at time zone 'Europe/Bucharest')::date + 1),
      least(p_to, (now() at time zone 'Europe/Bucharest')::date + 90, p_from + 92),
      interval '1 day'
    ) as day
  ),
  starts as (
    select ((days.day + start_time) at time zone 'Europe/Bucharest') as starts_at
    from days
    cross join unnest(private.inspection_start_times()) as start_time
  )
  select counts.starts_at, counts.working, counts.free
  from private.city_slot_counts(p_city_id, array(select starts.starts_at from starts), null) as counts
  order by counts.starts_at;
$$;

create or replace function public.inspection_cities()
returns table (
  id uuid,
  slug text,
  name text,
  latitude double precision,
  longitude double precision,
  has_inspectors boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    cities.id,
    cities.slug,
    cities.name,
    extensions.st_y(cities.center::extensions.geometry),
    extensions.st_x(cities.center::extensions.geometry),
    exists (
      select 1
      from public.inspector_profiles as profiles
      where profiles.city_id = cities.id
        and profiles.is_active
        and exists (
          select 1 from public.user_roles
          where user_roles.user_id = profiles.user_id and user_roles.role = 'inspector'
        )
    )
  from public.cities
  order by cities.position, cities.name;
$$;

create or replace function public.book_inspection(
  p_address_text text,
  p_city_id uuid,
  p_latitude double precision,
  p_longitude double precision,
  p_property_type public.listing_property_type,
  p_area_m2 numeric,
  p_starts_at timestamptz,
  p_access_mode public.inspection_access_mode,
  p_access_tags text[],
  p_payment_method public.inspection_payment_method,
  p_property_id uuid default null,
  p_listing_id uuid default null,
  p_year_built smallint default null,
  p_floor smallint default null,
  p_building_floors smallint default null,
  p_access_name text default null,
  p_access_phone text default null,
  p_access_notes text default null
)
returns table (id uuid, number integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  covered boolean;
  inside boolean;
  slot record;
  property_row_id uuid := p_property_id;
  saved public.properties;
  opener_name text;
  opener_phone text;
  created public.inspections;
begin
  if caller is null then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;

  if exists (select 1 from private.user_blocks where user_blocks.user_id = caller) then
    raise exception using errcode = 'P0001', message = 'user_blocked';
  end if;

  if p_property_id is not null and not exists (
    select 1 from public.properties
    where properties.id = p_property_id and properties.owner_id = caller
  ) then
    raise exception using errcode = 'P0001', message = 'property_invalid';
  end if;

  if p_listing_id is not null and not exists (
    select 1 from public.listings
    where listings.id = p_listing_id and listings.owner_id = caller
  ) then
    raise exception using errcode = 'P0001', message = 'property_invalid';
  end if;

  select exists (
    select 1 from public.inspector_profiles as profiles
    where profiles.city_id = p_city_id
      and profiles.is_active
      and exists (
        select 1 from public.user_roles
        where user_roles.user_id = profiles.user_id and user_roles.role = 'inspector'
      )
  ) into covered;

  select extensions.st_covers(
    cities.boundary,
    extensions.st_point(p_longitude, p_latitude, 4326)::extensions.geography
  )
  into inside
  from public.cities
  where cities.id = p_city_id;

  if not coalesce(covered, false) or not coalesce(inside, false) then
    raise exception using errcode = 'P0001', message = 'outside_coverage';
  end if;

  if not private.is_bookable_start(p_starts_at) then
    raise exception using errcode = 'P0001', message = 'slot_taken';
  end if;

  if p_access_mode = 'self' then
    select profiles.full_name, profiles.phone
    into opener_name, opener_phone
    from public.profiles
    where profiles.id = caller;
  else
    opener_name := nullif(btrim(p_access_name), '');
    opener_phone := private.normalize_phone(p_access_phone);
  end if;

  if opener_name is null or opener_phone is null
    or not coalesce(p_access_tags, '{}') <@ array['intercom', 'parking', 'pet', 'key_at_doorman']::text[]
    or char_length(coalesce(p_access_notes, '')) > 500 then
    raise exception using errcode = 'P0001', message = 'invalid_access';
  end if;

  perform private.lock_city_schedule(p_city_id);

  select * into slot from private.inspection_slot_counts(p_city_id, p_starts_at, null);
  if slot.free < 1 then
    raise exception using errcode = 'P0001', message = 'slot_taken';
  end if;

  begin
    if property_row_id is null then
      insert into public.properties (
        owner_id, listing_id, address_text, city_id, latitude, longitude, property_type,
        area_m2, year_built, floor, building_floors
      )
      values (
        caller, p_listing_id, btrim(p_address_text), p_city_id, p_latitude, p_longitude,
        p_property_type, p_area_m2, p_year_built, p_floor, p_building_floors
      )
      returning properties.id into property_row_id;
    else
      select * into saved from public.properties where properties.id = property_row_id;
      if not (
        saved.address_text is not distinct from btrim(p_address_text)
        and saved.city_id is not distinct from p_city_id
        and saved.latitude is not distinct from p_latitude
        and saved.longitude is not distinct from p_longitude
        and saved.property_type is not distinct from p_property_type
        and saved.area_m2 is not distinct from p_area_m2
        and saved.year_built is not distinct from p_year_built
        and saved.floor is not distinct from p_floor
        and saved.building_floors is not distinct from p_building_floors
      ) then
        insert into public.properties (
          owner_id, listing_id, address_text, city_id, latitude, longitude, property_type,
          area_m2, year_built, floor, building_floors
        )
        values (
          caller, saved.listing_id, btrim(p_address_text), p_city_id, p_latitude, p_longitude,
          p_property_type, p_area_m2, p_year_built, p_floor, p_building_floors
        )
        returning properties.id into property_row_id;
      end if;
    end if;
  exception
    when check_violation or not_null_violation then
      raise exception using errcode = 'P0001', message = 'property_invalid';
  end;

  insert into public.inspections (
    property_id, requested_by, starts_at, ends_at, access_mode, access_name, access_phone,
    access_tags, access_notes, payment_method
  )
  values (
    property_row_id, caller, p_starts_at, p_starts_at + interval '2 hours', p_access_mode,
    opener_name, opener_phone, coalesce(p_access_tags, '{}'), nullif(btrim(p_access_notes), ''),
    p_payment_method
  )
  returning * into created;

  insert into public.inspection_events (inspection_id, kind, actor_id, details)
  values (created.id, 'booked', caller, jsonb_build_object('starts_at', created.starts_at));

  return query select created.id, created.number;
end;
$$;

create or replace function public.reschedule_inspection(p_inspection_id uuid, p_starts_at timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  is_admin boolean := private.has_role('admin');
  target public.inspections;
  city uuid;
  slot record;
  keeps_inspector boolean;
begin
  if exists (select 1 from private.user_blocks where user_blocks.user_id = caller) then
    raise exception using errcode = 'P0001', message = 'user_blocked';
  end if;
  target := private.lock_inspection(p_inspection_id);
  if caller is null or (target.requested_by <> caller and not is_admin) then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  if target.status not in ('scheduled', 'inspector_assigned') or target.starts_at <= now() then
    raise exception using errcode = 'P0001', message = 'inspection_locked';
  end if;
  if not private.is_bookable_start(p_starts_at) then
    raise exception using errcode = 'P0001', message = 'slot_taken';
  end if;

  select properties.city_id into city from public.properties where properties.id = target.property_id;
  perform private.lock_city_schedule(city);

  keeps_inspector := target.inspector_id is not null and private.inspector_is_free(
    target.inspector_id, p_starts_at, p_starts_at + interval '2 hours', target.id
  );

  if not keeps_inspector then
    select * into slot from private.inspection_slot_counts(city, p_starts_at, target.id);
    if slot.free < 1 then
      raise exception using errcode = 'P0001', message = 'slot_taken';
    end if;
  end if;

  update public.inspections
  set
    starts_at = p_starts_at,
    ends_at = p_starts_at + interval '2 hours',
    inspector_id = case when keeps_inspector then target.inspector_id end,
    status = case when keeps_inspector then 'inspector_assigned' else 'scheduled' end::public.inspection_status,
    assigned_at = case when keeps_inspector then target.assigned_at end
  where inspections.id = target.id;

  insert into public.inspection_events (inspection_id, kind, actor_id, details)
  values (
    target.id,
    'rescheduled',
    caller,
    jsonb_build_object('from', target.starts_at, 'to', p_starts_at, 'kept_inspector', keeps_inspector)
  );
end;
$$;

create or replace function public.cancel_inspection(p_inspection_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  is_admin boolean := private.has_role('admin');
  target public.inspections;
begin
  target := private.lock_inspection(p_inspection_id);
  if caller is null or (target.requested_by <> caller and not is_admin) then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  if target.status not in ('scheduled', 'inspector_assigned')
    or (target.starts_at <= now() and not is_admin) then
    raise exception using errcode = 'P0001', message = 'inspection_locked';
  end if;
  if target.requested_by <> caller and nullif(btrim(p_reason), '') is null then
    raise exception using errcode = 'P0001', message = 'cancel_reason_required';
  end if;

  update public.inspections
  set
    status = 'cancelled',
    inspector_id = null,
    cancelled_at = now(),
    cancelled_by = caller,
    cancel_reason = nullif(btrim(p_reason), '')
  where inspections.id = target.id;

  insert into public.inspection_events (inspection_id, kind, actor_id, details)
  values (target.id, 'cancelled', caller, jsonb_build_object('by_admin', target.requested_by <> caller));
end;
$$;

create or replace function public.assign_inspector(p_inspection_id uuid, p_inspector_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  target public.inspections;
  city uuid;
  inspector_city uuid;
  works boolean;
begin
  if not private.has_role('admin') then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  target := private.lock_inspection(p_inspection_id);
  if target.status not in ('scheduled', 'inspector_assigned') then
    raise exception using errcode = 'P0001', message = 'inspection_locked';
  end if;

  select properties.city_id into city from public.properties where properties.id = target.property_id;
  select profiles.city_id into inspector_city
  from public.inspector_profiles as profiles
  where profiles.user_id = p_inspector_id and profiles.is_active
  for share;

  if inspector_city is null or inspector_city <> city then
    raise exception using errcode = 'P0001', message = 'wrong_city';
  end if;

  perform private.lock_city_schedule(city);

  select exists (
    select 1
    from public.inspector_weekly_hours as hours
    where hours.inspector_id = p_inspector_id
      and hours.weekday = extract(isodow from target.starts_at at time zone 'Europe/Bucharest')
      and hours.starts_at <= (target.starts_at at time zone 'Europe/Bucharest')::time
      and hours.ends_at >= (target.ends_at at time zone 'Europe/Bucharest')::time
  )
  and not exists (
    select 1
    from public.inspector_exceptions as exception
    where exception.inspector_id = p_inspector_id
      and exception.starts_at < target.ends_at
      and exception.ends_at > target.starts_at
  )
  into works;

  if not works then
    raise exception using errcode = 'P0001', message = 'inspector_unavailable';
  end if;

  if not private.inspector_is_free(p_inspector_id, target.starts_at, target.ends_at, target.id) then
    raise exception using errcode = 'P0001', message = 'inspector_busy';
  end if;

  update public.inspections
  set inspector_id = p_inspector_id, status = 'inspector_assigned', assigned_at = now()
  where inspections.id = target.id;

  insert into public.inspection_events (inspection_id, kind, actor_id, details)
  values (
    target.id,
    'assigned',
    caller,
    jsonb_build_object('inspector_id', p_inspector_id, 'previous_inspector_id', target.inspector_id)
  );
end;
$$;

create or replace function public.set_inspector_weekly_hours(
  p_inspector_id uuid,
  p_weekday smallint,
  p_ranges jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  ranges_count integer;
  overlapping integer;
begin
  if caller is null or not (
    (caller = p_inspector_id and private.has_role('inspector')) or private.has_role('admin')
  ) then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  if not exists (select 1 from public.inspector_profiles where user_id = p_inspector_id) then
    raise exception using errcode = 'P0001', message = 'inspector_not_found';
  end if;
  if p_weekday is null or p_weekday not between 1 and 7 or jsonb_typeof(p_ranges) <> 'array' then
    raise exception using errcode = 'P0001', message = 'availability_invalid';
  end if;

  select count(*) into ranges_count from jsonb_array_elements(p_ranges);
  if ranges_count > 4 then
    raise exception using errcode = 'P0001', message = 'availability_invalid';
  end if;

  select count(*)
  into overlapping
  from rows from (jsonb_to_recordset(p_ranges) as (starts_at time, ends_at time))
    with ordinality as first_range (starts_at, ends_at, position)
  join rows from (jsonb_to_recordset(p_ranges) as (starts_at time, ends_at time))
    with ordinality as second_range (starts_at, ends_at, position)
    on first_range.position <> second_range.position
   and first_range.starts_at <= second_range.starts_at
   and first_range.ends_at > second_range.starts_at;

  if overlapping > 0 then
    raise exception using errcode = 'P0001', message = 'availability_invalid';
  end if;

  delete from public.inspector_weekly_hours
  where inspector_id = p_inspector_id and weekday = p_weekday;

  begin
    insert into public.inspector_weekly_hours (inspector_id, weekday, starts_at, ends_at)
    select p_inspector_id, p_weekday, range_row.starts_at, range_row.ends_at
    from jsonb_to_recordset(p_ranges) as range_row (starts_at time, ends_at time);
  exception
    when check_violation or not_null_violation or invalid_datetime_format then
      raise exception using errcode = 'P0001', message = 'availability_invalid';
  end;
end;
$$;

drop function public.inspector_free_starts(uuid, date, date);

create index inspections_scheduled_starts_idx
  on public.inspections (starts_at) where status = 'scheduled';

create index inspections_not_cancelled_starts_idx
  on public.inspections (starts_at) where status <> 'cancelled';

create or replace function public.admin_inspections(
  p_from timestamptz,
  p_to timestamptz,
  p_city_id uuid default null,
  p_unassigned_only boolean default false
)
returns table (
  id uuid,
  number integer,
  status public.inspection_status,
  starts_at timestamptz,
  ends_at timestamptz,
  address_text text,
  city_id uuid,
  city_name text,
  property_type public.listing_property_type,
  area_m2 numeric,
  floor smallint,
  building_floors smallint,
  client_name text,
  client_phone text,
  access_mode public.inspection_access_mode,
  access_name text,
  access_phone text,
  access_tags text[],
  access_notes text,
  inspector_id uuid,
  inspector_name text,
  price numeric,
  currency text,
  payment_status public.inspection_payment_status,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.has_role('admin') then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  if p_unassigned_only then
    return query
    select
      inspections.id,
      inspections.number,
      inspections.status,
      inspections.starts_at,
      inspections.ends_at,
      properties.address_text,
      properties.city_id,
      cities.name,
      properties.property_type,
      properties.area_m2,
      properties.floor,
      properties.building_floors,
      client.full_name,
      client.phone,
      inspections.access_mode,
      inspections.access_name,
      inspections.access_phone,
      inspections.access_tags,
      inspections.access_notes,
      inspections.inspector_id,
      inspector.full_name,
      inspections.price,
      inspections.currency,
      inspections.payment_status,
      inspections.created_at
    from public.inspections
    join public.properties on properties.id = inspections.property_id
    join public.cities on cities.id = properties.city_id
    left join public.profiles as client on client.id = inspections.requested_by
    left join public.profiles as inspector on inspector.id = inspections.inspector_id
    where (p_city_id is null or properties.city_id = p_city_id)
      and inspections.status = 'scheduled'
      and inspections.ends_at > now()
    order by inspections.starts_at, inspections.number;
  elsif not p_unassigned_only then
    return query
    select
      inspections.id,
      inspections.number,
      inspections.status,
      inspections.starts_at,
      inspections.ends_at,
      properties.address_text,
      properties.city_id,
      cities.name,
      properties.property_type,
      properties.area_m2,
      properties.floor,
      properties.building_floors,
      client.full_name,
      client.phone,
      inspections.access_mode,
      inspections.access_name,
      inspections.access_phone,
      inspections.access_tags,
      inspections.access_notes,
      inspections.inspector_id,
      inspector.full_name,
      inspections.price,
      inspections.currency,
      inspections.payment_status,
      inspections.created_at
    from public.inspections
    join public.properties on properties.id = inspections.property_id
    join public.cities on cities.id = properties.city_id
    left join public.profiles as client on client.id = inspections.requested_by
    left join public.profiles as inspector on inspector.id = inspections.inspector_id
    where (p_city_id is null or properties.city_id = p_city_id)
      and inspections.status <> 'cancelled'
      and inspections.starts_at < p_to
      and inspections.ends_at > p_from
    order by inspections.starts_at, inspections.number;
  end if;
end;
$$;

create function public.admin_unassigned_count()
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.has_role('admin') then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  return (
    select count(*)::integer
    from public.inspections
    join public.properties on properties.id = inspections.property_id
    join public.cities on cities.id = properties.city_id
    where inspections.status = 'scheduled'
      and inspections.ends_at > now()
  );
end;
$$;

create or replace function public.admin_list_users(
  p_search text,
  p_role public.app_role default null,
  p_blocked boolean default null,
  p_city_id uuid default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  user_id uuid,
  full_name text,
  email text,
  phone text,
  roles public.app_role[],
  inspector_city_id uuid,
  inspector_city_name text,
  is_blocked boolean,
  block_reason text,
  created_at timestamptz,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  escaped text := replace(
    replace(replace(coalesce(btrim(p_search), ''), '\', '\\'), '%', '\%'),
    '_',
    '\_'
  );
  pattern text := '%' || lower(extensions.unaccent(escaped)) || '%';
begin
  if not private.has_role('admin') then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  return query
  with people as (
    select
      users.id,
      profiles.full_name,
      users.email::text as email,
      profiles.phone,
      coalesce(
        (
          select array_agg(user_roles.role order by user_roles.role)
          from public.user_roles
          where user_roles.user_id = users.id
        ),
        '{}'
      ) as roles,
      inspector.city_id,
      inspector.is_active as is_active_inspector,
      cities.name as city_name,
      coalesce(users.banned_until > now(), false) as is_blocked,
      blocks.reason as block_reason,
      users.created_at
    from auth.users
    left join public.profiles on profiles.id = users.id
    left join public.inspector_profiles as inspector on inspector.user_id = users.id
    left join public.cities on cities.id = inspector.city_id
    left join private.user_blocks as blocks on blocks.user_id = users.id
  )
  select
    people.id,
    people.full_name,
    people.email,
    people.phone,
    people.roles,
    people.city_id,
    people.city_name,
    people.is_blocked,
    people.block_reason,
    people.created_at,
    count(*) over ()
  from people
  where (p_role is null or p_role = any (people.roles))
    and (p_blocked is null or people.is_blocked = p_blocked)
    and (
      p_city_id is null
      or (
        people.city_id = p_city_id
        and people.is_active_inspector
        and 'inspector' = any (people.roles)
      )
    )
    and (
      coalesce(btrim(p_search), '') = ''
      or lower(extensions.unaccent(coalesce(people.full_name, ''))) like pattern escape '\'
      or lower(people.email) like pattern escape '\'
      or coalesce(people.phone, '') like '%' || escaped || '%' escape '\'
    )
  order by people.created_at desc, people.id
  limit least(greatest(coalesce(p_limit, 50), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

create or replace function public.make_admin(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
begin
  if caller is null or not private.has_role('admin') then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;

  perform private.lock_existing_user(p_user_id);
  if exists (select 1 from private.user_blocks where user_blocks.user_id = p_user_id) then
    raise exception using errcode = 'P0001', message = 'user_blocked';
  end if;

  perform private.replace_user_role(p_user_id, 'user', 'admin');
end;
$$;

create or replace function public.set_inspector(p_user_id uuid, p_city_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.has_role('admin') then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;

  perform private.lock_existing_user(p_user_id);
  if exists (select 1 from private.user_blocks where user_blocks.user_id = p_user_id) then
    raise exception using errcode = 'P0001', message = 'user_blocked';
  end if;
  if not exists (select 1 from public.cities where cities.id = p_city_id) then
    raise exception using errcode = 'P0001', message = 'city_not_found';
  end if;

  perform private.replace_user_role(p_user_id, 'user', 'inspector');

  perform 1 from public.inspector_profiles
  where inspector_profiles.user_id = p_user_id
  for update;

  insert into public.inspector_profiles (user_id, city_id, is_active)
  values (p_user_id, p_city_id, true)
  on conflict (user_id) do update set city_id = excluded.city_id, is_active = true;

  perform private.release_inspector_visits(p_user_id, 'inspector_city_changed', p_city_id);
end;
$$;

create or replace function public.remove_inspector(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.has_role('admin') then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;

  perform 1 from auth.users where users.id = p_user_id for update;

  perform 1 from public.inspector_profiles
  where inspector_profiles.user_id = p_user_id
  for update;

  perform private.release_inspector_visits(p_user_id, 'inspector_removed');

  update public.inspector_profiles set is_active = false where inspector_profiles.user_id = p_user_id;

  if exists (
    select 1 from public.user_roles
    where user_roles.user_id = p_user_id and user_roles.role = 'inspector'
  ) then
    perform private.replace_user_role(p_user_id, 'inspector', 'user');
  end if;
end;
$$;

create or replace function public.block_user(p_user_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  clean_reason text := nullif(btrim(p_reason), '');
  booking record;
begin
  if caller is null or not private.has_role('admin') then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  if p_user_id = caller then
    raise exception using errcode = 'P0001', message = 'cannot_block_self';
  end if;
  if exists (
    select 1 from public.user_roles where user_id = p_user_id and role = 'admin'
  ) then
    raise exception using errcode = 'P0001', message = 'cannot_block_admin';
  end if;
  if clean_reason is null or char_length(clean_reason) > 300 then
    raise exception using errcode = 'P0001', message = 'block_reason_invalid';
  end if;
  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception using errcode = 'P0001', message = 'user_not_found';
  end if;

  insert into private.user_blocks (user_id, reason, blocked_by)
  values (p_user_id, clean_reason, caller)
  on conflict (user_id) do update
  set reason = excluded.reason, blocked_by = excluded.blocked_by, blocked_at = now(), updated_at = now();

  update auth.users
  set banned_until = now() + interval '100 years'
  where id = p_user_id;

  delete from auth.sessions where user_id = p_user_id;

  perform set_config('app.account_block_switch', 'on', true);
  update public.listings
  set status = 'suspended'
  where owner_id = p_user_id and status = 'approved' and revision_of is null;
  perform set_config('app.account_block_switch', 'off', true);

  for booking in
    select inspections.id, properties.city_id
    from public.inspections
    join public.properties on properties.id = inspections.property_id
    where inspections.requested_by = p_user_id
      and inspections.status in ('scheduled', 'inspector_assigned')
      and inspections.starts_at > now()
  loop
    perform private.lock_city_schedule(booking.city_id);
    update public.inspections
    set
      status = 'cancelled',
      inspector_id = null,
      cancelled_at = now(),
      cancelled_by = caller,
      cancel_reason = 'Cont blocat'
    where id = booking.id;
    insert into public.inspection_events (inspection_id, kind, actor_id, details)
    values (booking.id, 'cancelled', caller, jsonb_build_object('reason', 'account_blocked'));
  end loop;

  perform 1 from public.inspector_profiles where user_id = p_user_id for update;

  perform private.release_inspector_visits(p_user_id, 'inspector_blocked');

  update public.inspector_profiles set is_active = false where user_id = p_user_id;
end;
$$;

create or replace function public.unblock_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
begin
  if caller is null or not private.has_role('admin') then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  if not exists (select 1 from private.user_blocks where user_id = p_user_id) then
    raise exception using errcode = 'P0001', message = 'user_not_blocked';
  end if;

  delete from private.user_blocks where user_id = p_user_id;

  update auth.users set banned_until = null where id = p_user_id;

  perform set_config('app.account_block_switch', 'on', true);
  update public.listings
  set status = 'approved'
  where owner_id = p_user_id and status = 'suspended';
  perform set_config('app.account_block_switch', 'off', true);

  update public.inspector_profiles
  set is_active = true
  where user_id = p_user_id
    and exists (
      select 1 from public.user_roles
      where user_roles.user_id = p_user_id and user_roles.role = 'inspector'
    );
end;
$$;

create or replace function public.add_inspection_media(
  p_inspection_id uuid,
  p_question_id uuid,
  p_kind public.inspection_media_kind,
  p_path text,
  p_mime_type text,
  p_size_bytes bigint
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.inspections;
  media_id uuid;
  existing integer;
  stored_type text;
  stored_size bigint;
  registered public.inspection_media;
begin
  target := private.lock_assigned_inspection(p_inspection_id);
  if target.status <> 'in_progress' then
    raise exception using errcode = 'P0001', message = 'inspection_not_in_progress';
  end if;
  if not exists (
    select 1 from public.inspection_form_questions
    where id = p_question_id and form_version_id = target.form_version_id
  ) then
    raise exception using errcode = 'P0001', message = 'question_not_in_form';
  end if;
  select objects.metadata ->> 'mimetype', (objects.metadata ->> 'size')::bigint
  into stored_type, stored_size
  from storage.objects
  where objects.bucket_id = 'inspection-media'
    and objects.name = p_path
    and p_path like p_inspection_id::text || '/question/%';
  if not found then
    raise exception using errcode = 'P0001', message = 'media_missing';
  end if;
  stored_type := coalesce(stored_type, p_mime_type);
  if stored_type is null
    or (p_kind = 'photo' and stored_type not like 'image/%')
    or (p_kind = 'video' and stored_type not like 'video/%') then
    raise exception using errcode = 'P0001', message = 'media_type_invalid';
  end if;

  select * into registered from public.inspection_media where inspection_media.path = p_path;
  if registered.id is not null then
    if registered.inspection_id = p_inspection_id and registered.question_id = p_question_id then
      return registered.id;
    end if;
    raise exception using errcode = 'P0001', message = 'media_path_taken';
  end if;

  select count(*) into existing from public.inspection_media
  where inspection_id = p_inspection_id and question_id = p_question_id and kind = p_kind;
  if (p_kind = 'photo' and existing >= 10) or (p_kind = 'video' and existing >= 3) then
    raise exception using errcode = 'P0001', message = 'media_limit_reached';
  end if;

  insert into public.inspection_media (
    inspection_id, question_id, kind, path, mime_type, size_bytes, created_by
  )
  values (
    p_inspection_id,
    p_question_id,
    p_kind,
    p_path,
    stored_type,
    coalesce(stored_size, p_size_bytes),
    (select auth.uid())
  )
  returning id into media_id;

  return media_id;
end;
$$;

create function private.new_consent_draft(p_source_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  draft_id uuid;
begin
  insert into public.consent_versions (version, created_by)
  values (
    coalesce((select max(version) from public.consent_versions), 0.9) + 0.1,
    (select auth.uid())
  )
  returning id into draft_id;

  insert into public.consent_sections (
    consent_version_id, position, title_ro, title_en, text_ro, text_en, check_ro, check_en
  )
  select draft_id, position, title_ro, title_en, text_ro, text_en, check_ro, check_en
  from public.consent_sections
  where consent_version_id = p_source_id;

  return draft_id;
end;
$$;

create function private.new_form_draft(p_source_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  source public.inspection_form_versions;
  draft_id uuid;
begin
  select * into source from public.inspection_form_versions where id = p_source_id;

  insert into public.inspection_form_versions (
    version, points_good, points_acceptable, points_problem, created_by
  )
  values (
    coalesce((select max(version) from public.inspection_form_versions), 0) + 1,
    coalesce(source.points_good, 10),
    coalesce(source.points_acceptable, 6.5),
    coalesce(source.points_problem, 3),
    (select auth.uid())
  )
  returning id into draft_id;

  if source.id is not null then
    perform private.copy_form_items(source.id, draft_id);
  end if;

  return draft_id;
end;
$$;

create or replace function public.create_consent_draft()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  published public.consent_versions;
begin
  perform private.require_admin();
  perform pg_advisory_xact_lock(hashtext('consent_versions'));

  if exists (select 1 from public.consent_versions where status = 'draft') then
    raise exception using errcode = 'P0001', message = 'consent_draft_exists';
  end if;

  select * into published from public.consent_versions where status = 'published';

  return private.new_consent_draft(published.id);
end;
$$;

create or replace function public.restore_consent_version(p_consent_version_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  source public.consent_versions;
begin
  perform private.require_admin();
  perform pg_advisory_xact_lock(hashtext('consent_versions'));

  select * into source from public.consent_versions where id = p_consent_version_id;
  if not found or source.status = 'draft' then
    raise exception using errcode = 'P0001', message = 'version_not_found';
  end if;

  perform set_config('app.form_publish_switch', 'on', true);
  delete from public.consent_versions where status = 'draft';
  perform set_config('app.form_publish_switch', 'off', true);

  return private.new_consent_draft(source.id);
end;
$$;

create or replace function public.create_inspection_form_draft()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  published public.inspection_form_versions;
begin
  perform private.require_admin();
  perform pg_advisory_xact_lock(hashtext('inspection_form_versions'));

  if exists (select 1 from public.inspection_form_versions where status = 'draft') then
    raise exception using errcode = 'P0001', message = 'form_draft_exists';
  end if;

  select * into published from public.inspection_form_versions where status = 'published';

  return private.new_form_draft(published.id);
end;
$$;

create or replace function public.restore_inspection_form_version(p_form_version_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  source public.inspection_form_versions;
begin
  perform private.require_admin();
  perform pg_advisory_xact_lock(hashtext('inspection_form_versions'));

  select * into source from public.inspection_form_versions where id = p_form_version_id;
  if not found or source.status = 'draft' then
    raise exception using errcode = 'P0001', message = 'version_not_found';
  end if;

  perform set_config('app.form_publish_switch', 'on', true);
  delete from public.inspection_form_versions where status = 'draft';
  perform set_config('app.form_publish_switch', 'off', true);

  return private.new_form_draft(source.id);
end;
$$;

create or replace function private.form_version_inspections(p_form_version_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.inspections
  where inspections.form_version_id = p_form_version_id;
$$;

drop policy "Clients read their inspections, inspectors their assigned ones and admins every one"
  on public.inspections;

create policy "Clients read their inspections, inspectors their assigned ones and admins every one"
  on public.inspections for select to authenticated
  using (
    (select auth.uid()) = requested_by
    or (
      (select auth.uid()) = inspector_id
      and coalesce(((select auth.jwt()) -> 'user_roles') ? 'inspector', false)
    )
    or coalesce(((select auth.jwt()) -> 'user_roles') ? 'admin', false)
  );

drop policy "Assigned inspectors and admins read the signed consent" on public.inspection_consents;

create policy "Assigned inspectors and admins read the signed consent"
  on public.inspection_consents for select to authenticated
  using (
    coalesce(((select auth.jwt()) -> 'user_roles') ? 'admin', false)
    or (
      coalesce(((select auth.jwt()) -> 'user_roles') ? 'inspector', false)
      and exists (
        select 1 from public.inspections
        where inspections.id = inspection_consents.inspection_id
          and inspections.inspector_id = (select auth.uid())
      )
    )
  );

drop policy "Assigned inspectors and admins read the answers" on public.inspection_answers;

create policy "Assigned inspectors and admins read the answers"
  on public.inspection_answers for select to authenticated
  using (
    coalesce(((select auth.jwt()) -> 'user_roles') ? 'admin', false)
    or (
      coalesce(((select auth.jwt()) -> 'user_roles') ? 'inspector', false)
      and exists (
        select 1 from public.inspections
        where inspections.id = inspection_answers.inspection_id
          and inspections.inspector_id = (select auth.uid())
      )
    )
  );

drop policy "Assigned inspectors and admins read the media" on public.inspection_media;

create policy "Assigned inspectors and admins read the media"
  on public.inspection_media for select to authenticated
  using (
    coalesce(((select auth.jwt()) -> 'user_roles') ? 'admin', false)
    or (
      coalesce(((select auth.jwt()) -> 'user_roles') ? 'inspector', false)
      and exists (
        select 1 from public.inspections
        where inspections.id = inspection_media.inspection_id
          and inspections.inspector_id = (select auth.uid())
      )
    )
  );

drop policy "Assigned inspectors and admins read inspection files" on storage.objects;

create policy "Assigned inspectors and admins read inspection files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'inspection-media'
    and (
      coalesce(((select auth.jwt()) -> 'user_roles') ? 'admin', false)
      or (
        coalesce(((select auth.jwt()) -> 'user_roles') ? 'inspector', false)
        and exists (
          select 1 from public.inspections
          where inspections.id::text = (storage.foldername(name))[1]
            and inspections.inspector_id = (select auth.uid())
        )
      )
    )
  );

drop policy "Assigned inspectors upload files to their open inspections" on storage.objects;

create policy "Assigned inspectors upload files to their open inspections"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'inspection-media'
    and exists (
      select 1 from public.inspections
      where inspections.id::text = (storage.foldername(name))[1]
        and inspections.inspector_id = (select auth.uid())
        and (
          (
            inspections.status = 'inspector_assigned'
            and (storage.foldername(name))[2] = 'signature'
            and now() >= inspections.starts_at - interval '60 minutes'
            and (now() at time zone 'Europe/Bucharest')::date
              = (inspections.starts_at at time zone 'Europe/Bucharest')::date
          )
          or (inspections.status = 'in_progress' and (storage.foldername(name))[2] = 'question')
        )
    )
  );

revoke execute on function
  private.lock_existing_user(uuid),
  private.replace_user_role(uuid, public.app_role, public.app_role),
  private.release_inspector_visits(uuid, text, uuid),
  private.release_visits_of_deleted_inspector(),
  private.city_slot_counts(uuid, timestamptz[], uuid),
  private.new_consent_draft(uuid),
  private.new_form_draft(uuid)
  from public, anon, authenticated;

revoke execute on function public.admin_unassigned_count() from public, anon;

grant execute on function public.admin_unassigned_count() to authenticated;

create or replace function public.inspection_progress(p_inspection_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target public.inspections;
begin
  select * into target from public.inspections where id = p_inspection_id;
  if target.id is null
    or not (
      (target.inspector_id = (select auth.uid()) and private.has_role('inspector'))
      or private.has_role('admin')
    ) then
    raise exception using errcode = 'P0001', message = 'inspection_not_found';
  end if;

  return jsonb_build_object(
    'answered', coalesce((select sum(answered) from private.inspection_category_scores(p_inspection_id)), 0),
    'total', coalesce((select sum(total) from private.inspection_category_scores(p_inspection_id)), 0),
    'photos', (select count(*) from public.inspection_media where inspection_id = p_inspection_id and kind = 'photo'),
    'videos', (select count(*) from public.inspection_media where inspection_id = p_inspection_id and kind = 'video'),
    'missing_media', coalesce(private.inspection_missing_media(p_inspection_id), 0),
    'score', private.inspection_total_score(p_inspection_id),
    'categories', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'category_id', scores.category_id,
            'answered', scores.answered,
            'total', scores.total,
            'score', round(scores.score, 1)
          )
        )
        from private.inspection_category_scores(p_inspection_id) as scores
      ),
      '[]'::jsonb
    )
  );
end;
$$;
