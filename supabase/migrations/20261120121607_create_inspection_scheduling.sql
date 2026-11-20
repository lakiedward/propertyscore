create type public.inspection_status as enum (
  'scheduled',
  'inspector_assigned',
  'completed',
  'book_ready',
  'cancelled'
);

create type public.inspection_access_mode as enum ('self', 'other');

create type public.inspection_payment_method as enum ('card', 'apple_pay', 'google_pay');

create type public.inspection_payment_status as enum ('unpaid', 'paid', 'refunded');

create type public.inspection_event_kind as enum (
  'booked',
  'rescheduled',
  'assigned',
  'unassigned',
  'cancelled'
);

create type public.inspector_exception_kind as enum ('day_off', 'leave', 'training', 'other');

create table public.inspector_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  city_id uuid not null references public.cities (id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index inspector_profiles_city_id_idx on public.inspector_profiles (city_id);

create trigger inspector_profiles_set_updated_at
  before update on public.inspector_profiles
  for each row execute function private.set_updated_at();

create table public.inspector_weekly_hours (
  id uuid primary key default gen_random_uuid(),
  inspector_id uuid not null references public.inspector_profiles (user_id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 7),
  starts_at time not null check (starts_at >= time '06:00'),
  ends_at time not null check (ends_at <= time '22:00'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inspector_weekly_hours_range_check check (starts_at < ends_at)
);

create index inspector_weekly_hours_inspector_weekday_idx
  on public.inspector_weekly_hours (inspector_id, weekday, starts_at);

create trigger inspector_weekly_hours_set_updated_at
  before update on public.inspector_weekly_hours
  for each row execute function private.set_updated_at();

create table public.inspector_exceptions (
  id uuid primary key default gen_random_uuid(),
  inspector_id uuid not null references public.inspector_profiles (user_id) on delete cascade,
  kind public.inspector_exception_kind not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  note text check (char_length(note) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inspector_exceptions_range_check check (starts_at < ends_at)
);

create index inspector_exceptions_inspector_range_idx
  on public.inspector_exceptions (inspector_id, starts_at, ends_at);

create trigger inspector_exceptions_set_updated_at
  before update on public.inspector_exceptions
  for each row execute function private.set_updated_at();

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  listing_id uuid references public.listings (id) on delete set null,
  address_text text not null check (char_length(btrim(address_text)) between 3 and 200),
  city_id uuid not null references public.cities (id),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  property_type public.listing_property_type not null,
  area_m2 numeric(7, 2) not null check (area_m2 between 10 and 2000),
  year_built smallint check (year_built between 1800 and 2100),
  floor smallint check (floor between -1 and 80),
  building_floors smallint check (building_floors between 0 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint properties_floor_only_for_apartments check (
    property_type = 'apartment' or (floor is null and building_floors is null)
  ),
  constraint properties_floor_within_building check (
    floor is null or building_floors is null or floor <= building_floors
  )
);

create index properties_owner_id_idx on public.properties (owner_id, updated_at desc);
create index properties_listing_id_idx on public.properties (listing_id);
create index properties_city_id_idx on public.properties (city_id);

create trigger properties_set_updated_at
  before update on public.properties
  for each row execute function private.set_updated_at();

create sequence public.inspections_number_seq start with 1001;

create table public.inspections (
  id uuid primary key default gen_random_uuid(),
  number integer not null unique default nextval('public.inspections_number_seq'),
  property_id uuid not null references public.properties (id) on delete restrict,
  requested_by uuid not null references auth.users (id) on delete cascade,
  inspector_id uuid references public.inspector_profiles (user_id) on delete set null,
  status public.inspection_status not null default 'scheduled',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  access_mode public.inspection_access_mode not null,
  access_name text not null check (char_length(btrim(access_name)) between 1 and 120),
  access_phone text not null check (access_phone ~ '^\+[1-9][0-9]{7,14}$'),
  access_tags text[] not null default '{}' check (
    access_tags <@ array['intercom', 'parking', 'pet', 'key_at_doorman']::text[]
  ),
  access_notes text check (char_length(access_notes) <= 500),
  partner_code text check (char_length(partner_code) between 1 and 40),
  payment_method public.inspection_payment_method not null,
  payment_status public.inspection_payment_status not null default 'unpaid',
  price numeric(12, 2) not null default 500,
  currency text not null default 'RON' check (currency in ('RON', 'EUR')),
  assigned_at timestamptz,
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users (id) on delete set null,
  cancel_reason text check (char_length(cancel_reason) between 1 and 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inspections_range_check check (starts_at < ends_at),
  constraint inspections_assignment_check check (
    (status = 'inspector_assigned') = (inspector_id is not null and status <> 'cancelled')
    or status in ('completed', 'book_ready', 'cancelled')
  ),
  constraint inspections_cancelled_check check ((status = 'cancelled') = (cancelled_at is not null))
);

alter sequence public.inspections_number_seq owned by public.inspections.number;

create index inspections_requested_by_idx on public.inspections (requested_by, starts_at desc);
create index inspections_inspector_starts_idx on public.inspections (inspector_id, starts_at);
create index inspections_property_id_idx on public.inspections (property_id);
create index inspections_status_starts_idx on public.inspections (status, starts_at);
create index inspections_cancelled_by_idx on public.inspections (cancelled_by);

create trigger inspections_set_updated_at
  before update on public.inspections
  for each row execute function private.set_updated_at();

create table public.inspection_events (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.inspections (id) on delete cascade,
  kind public.inspection_event_kind not null,
  actor_id uuid references auth.users (id) on delete set null,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index inspection_events_inspection_idx on public.inspection_events (inspection_id, created_at);
create index inspection_events_actor_id_idx on public.inspection_events (actor_id);

alter table public.inspector_profiles enable row level security;
alter table public.inspector_weekly_hours enable row level security;
alter table public.inspector_exceptions enable row level security;
alter table public.properties enable row level security;
alter table public.inspections enable row level security;
alter table public.inspection_events enable row level security;

revoke all on public.inspector_profiles, public.inspector_weekly_hours, public.inspector_exceptions,
  public.properties, public.inspections, public.inspection_events from anon, authenticated;
grant select on public.inspector_profiles, public.inspector_weekly_hours, public.inspector_exceptions,
  public.properties, public.inspections, public.inspection_events to authenticated;
grant insert (inspector_id, kind, starts_at, ends_at, note) on public.inspector_exceptions to authenticated;
grant delete on public.inspector_exceptions to authenticated;

create policy "Inspectors can read their profile and admins can read every inspector"
  on public.inspector_profiles for select to authenticated
  using (
    (select auth.uid()) = user_id
    or coalesce(((select auth.jwt()) -> 'user_roles') ? 'admin', false)
  );

create policy "Inspectors can read their weekly hours and admins can read every inspector's"
  on public.inspector_weekly_hours for select to authenticated
  using (
    (select auth.uid()) = inspector_id
    or coalesce(((select auth.jwt()) -> 'user_roles') ? 'admin', false)
  );

create policy "Inspectors can read their exceptions and admins can read every inspector's"
  on public.inspector_exceptions for select to authenticated
  using (
    (select auth.uid()) = inspector_id
    or coalesce(((select auth.jwt()) -> 'user_roles') ? 'admin', false)
  );

create policy "Inspectors can add their exceptions and admins can add any"
  on public.inspector_exceptions for insert to authenticated
  with check (
    (
      (select auth.uid()) = inspector_id
      and coalesce(((select auth.jwt()) -> 'user_roles') ? 'inspector', false)
    )
    or coalesce(((select auth.jwt()) -> 'user_roles') ? 'admin', false)
  );

create policy "Inspectors can remove their exceptions and admins can remove any"
  on public.inspector_exceptions for delete to authenticated
  using (
    (
      (select auth.uid()) = inspector_id
      and coalesce(((select auth.jwt()) -> 'user_roles') ? 'inspector', false)
    )
    or coalesce(((select auth.jwt()) -> 'user_roles') ? 'admin', false)
  );

create policy "Owners can read their properties and admins can read every property"
  on public.properties for select to authenticated
  using (
    (select auth.uid()) = owner_id
    or coalesce(((select auth.jwt()) -> 'user_roles') ? 'admin', false)
  );

create policy "Clients read their inspections, inspectors their assigned ones and admins every one"
  on public.inspections for select to authenticated
  using (
    (select auth.uid()) = requested_by
    or (select auth.uid()) = inspector_id
    or coalesce(((select auth.jwt()) -> 'user_roles') ? 'admin', false)
  );

create policy "Inspection history is readable by whoever can read the inspection"
  on public.inspection_events for select to authenticated
  using (
    exists (
      select 1
      from public.inspections
      where inspections.id = inspection_events.inspection_id
    )
  );

create function private.inspection_start_times()
returns time[]
language sql
immutable
set search_path = ''
as $$
  select array[
    time '08:00', time '09:30', time '11:00', time '12:30', time '14:00', time '15:30', time '17:00'
  ];
$$;

create function private.inspector_is_free(
  p_inspector_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_exclude_inspection_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1
      from public.inspector_weekly_hours as hours
      where hours.inspector_id = p_inspector_id
        and hours.weekday = extract(isodow from p_starts_at at time zone 'Europe/Bucharest')
        and (p_starts_at at time zone 'Europe/Bucharest')::date
          = (p_ends_at at time zone 'Europe/Bucharest')::date
        and hours.starts_at <= (p_starts_at at time zone 'Europe/Bucharest')::time
        and hours.ends_at >= (p_ends_at at time zone 'Europe/Bucharest')::time
    )
    and not exists (
      select 1
      from public.inspector_exceptions as exception
      where exception.inspector_id = p_inspector_id
        and exception.starts_at < p_ends_at
        and exception.ends_at > p_starts_at
    )
    and not exists (
      select 1
      from public.inspections as booked
      where booked.inspector_id = p_inspector_id
        and booked.status in ('inspector_assigned', 'completed', 'book_ready')
        and booked.id is distinct from p_exclude_inspection_id
        and booked.starts_at < p_ends_at + interval '30 minutes'
        and booked.ends_at > p_starts_at - interval '30 minutes'
    );
$$;

revoke execute on function private.inspector_is_free(uuid, timestamptz, timestamptz, uuid)
  from public, anon, authenticated;

create function private.inspection_slot_counts(
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
  with inspectors as (
    select profiles.user_id
    from public.inspector_profiles as profiles
    where profiles.city_id = p_city_id
      and profiles.is_active
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

revoke execute on function private.inspection_slot_counts(uuid, timestamptz, uuid)
  from public, anon, authenticated;

create function private.is_bookable_start(p_starts_at timestamptz)
returns boolean
language sql
stable
set search_path = ''
as $$
  select
    (p_starts_at at time zone 'Europe/Bucharest')::time = any (private.inspection_start_times())
    and (p_starts_at at time zone 'Europe/Bucharest')::date
      > (now() at time zone 'Europe/Bucharest')::date
    and (p_starts_at at time zone 'Europe/Bucharest')::date
      <= (now() at time zone 'Europe/Bucharest')::date + 90;
$$;

create function public.inspection_cities()
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
    )
  from public.cities
  order by cities.position, cities.name;
$$;

create function public.inspection_slots(p_city_id uuid, p_from date, p_to date)
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
      least(p_to, (now() at time zone 'Europe/Bucharest')::date + 90, p_from + 62),
      interval '1 day'
    ) as day
  ),
  starts as (
    select ((days.day + start_time) at time zone 'Europe/Bucharest') as starts_at
    from days
    cross join unnest(private.inspection_start_times()) as start_time
  )
  select starts.starts_at, counts.working, counts.free
  from starts
  cross join lateral private.inspection_slot_counts(p_city_id, starts.starts_at, null) as counts
  order by starts.starts_at;
$$;

create function public.my_bookable_properties()
returns table (
  property_id uuid,
  listing_id uuid,
  address_text text,
  city_id uuid,
  city_name text,
  latitude double precision,
  longitude double precision,
  property_type public.listing_property_type,
  area_m2 numeric,
  year_built smallint,
  floor smallint,
  building_floors smallint,
  rooms smallint,
  listing_status public.listing_status,
  listing_transaction public.listing_transaction,
  listing_price numeric,
  listing_currency text,
  photo_path text,
  last_inspection_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    properties.id,
    properties.listing_id,
    properties.address_text,
    properties.city_id,
    cities.name,
    properties.latitude,
    properties.longitude,
    properties.property_type,
    properties.area_m2,
    properties.year_built,
    properties.floor,
    properties.building_floors,
    listings.rooms,
    listings.status,
    listings.transaction,
    listings.price,
    listings.currency,
    listings.photo_path,
    (
      select max(done.starts_at)
      from public.inspections as done
      where done.property_id = properties.id
        and done.status = 'book_ready'
    )
  from public.properties
  join public.cities on cities.id = properties.city_id
  left join public.listings on listings.id = properties.listing_id
  where properties.owner_id = (select auth.uid())
  union all
  select
    null,
    listings.id,
    listings.street_label || ', ' || listings.city,
    cities.id,
    cities.name,
    listings.latitude,
    listings.longitude,
    listings.property_type,
    listings.area_m2,
    listings.year_built,
    listings.floor,
    listings.building_floors,
    listings.rooms,
    listings.status,
    listings.transaction,
    listings.price,
    listings.currency,
    listings.photo_path,
    null
  from public.listings
  left join public.cities on lower(cities.name) = lower(listings.city)
  where listings.owner_id = (select auth.uid())
    and listings.revision_of is null
    and listings.status in ('draft', 'pending_approval', 'approved', 'rejected')
    and not exists (
      select 1
      from public.properties
      where properties.listing_id = listings.id
        and properties.owner_id = (select auth.uid())
    );
$$;

create function private.lock_city_schedule(p_city_id uuid)
returns void
language sql
volatile
set search_path = ''
as $$
  select pg_advisory_xact_lock(hashtextextended('inspection_schedule:' || p_city_id::text, 0));
$$;

create function public.book_inspection(
  p_property_id uuid,
  p_listing_id uuid,
  p_address_text text,
  p_city_id uuid,
  p_latitude double precision,
  p_longitude double precision,
  p_property_type public.listing_property_type,
  p_area_m2 numeric,
  p_year_built smallint,
  p_floor smallint,
  p_building_floors smallint,
  p_starts_at timestamptz,
  p_access_mode public.inspection_access_mode,
  p_access_name text,
  p_access_phone text,
  p_access_tags text[],
  p_access_notes text,
  p_payment_method public.inspection_payment_method
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
  opener_name text;
  opener_phone text;
  created public.inspections;
begin
  if caller is null then
    raise exception using errcode = '42501', message = 'forbidden';
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
    where profiles.city_id = p_city_id and profiles.is_active
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
      update public.properties
      set
        address_text = btrim(p_address_text),
        city_id = p_city_id,
        latitude = p_latitude,
        longitude = p_longitude,
        property_type = p_property_type,
        area_m2 = p_area_m2,
        year_built = p_year_built,
        floor = p_floor,
        building_floors = p_building_floors
      where properties.id = property_row_id;
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

create function private.lock_inspection(p_inspection_id uuid)
returns public.inspections
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  found public.inspections;
begin
  select * into found from public.inspections where inspections.id = p_inspection_id for update;
  if found.id is null then
    raise exception using errcode = 'P0001', message = 'inspection_not_found';
  end if;
  return found;
end;
$$;

revoke execute on function private.lock_inspection(uuid) from public, anon, authenticated;

create function public.reschedule_inspection(p_inspection_id uuid, p_starts_at timestamptz)
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

create function public.cancel_inspection(p_inspection_id uuid, p_reason text)
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

create function public.assign_inspector(p_inspection_id uuid, p_inspector_id uuid)
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
  where profiles.user_id = p_inspector_id and profiles.is_active;

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

create function public.unassign_inspector(p_inspection_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.inspections;
begin
  if not private.has_role('admin') then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  target := private.lock_inspection(p_inspection_id);
  if target.status <> 'inspector_assigned' then
    raise exception using errcode = 'P0001', message = 'inspection_locked';
  end if;

  update public.inspections
  set inspector_id = null, status = 'scheduled', assigned_at = null
  where inspections.id = target.id;

  insert into public.inspection_events (inspection_id, kind, actor_id, details)
  values (
    target.id,
    'unassigned',
    (select auth.uid()),
    jsonb_build_object('inspector_id', target.inspector_id)
  );
end;
$$;

create function public.set_inspector_weekly_hours(
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
  from jsonb_to_recordset(p_ranges) as first_range (starts_at time, ends_at time)
  join jsonb_to_recordset(p_ranges) as second_range (starts_at time, ends_at time)
    on first_range.starts_at < second_range.starts_at
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

create function public.my_inspections()
returns table (
  id uuid,
  number integer,
  status public.inspection_status,
  starts_at timestamptz,
  ends_at timestamptz,
  address_text text,
  city_name text,
  property_type public.listing_property_type,
  area_m2 numeric,
  floor smallint,
  building_floors smallint,
  access_mode public.inspection_access_mode,
  access_name text,
  access_phone text,
  access_tags text[],
  access_notes text,
  inspector_name text,
  price numeric,
  currency text,
  payment_status public.inspection_payment_status,
  assigned_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    inspections.id,
    inspections.number,
    inspections.status,
    inspections.starts_at,
    inspections.ends_at,
    properties.address_text,
    cities.name,
    properties.property_type,
    properties.area_m2,
    properties.floor,
    properties.building_floors,
    inspections.access_mode,
    inspections.access_name,
    inspections.access_phone,
    inspections.access_tags,
    inspections.access_notes,
    inspector.full_name,
    inspections.price,
    inspections.currency,
    inspections.payment_status,
    inspections.assigned_at,
    inspections.cancelled_at,
    inspections.created_at
  from public.inspections
  join public.properties on properties.id = inspections.property_id
  join public.cities on cities.id = properties.city_id
  left join public.profiles as inspector on inspector.id = inspections.inspector_id
  where inspections.requested_by = (select auth.uid())
  order by inspections.starts_at desc;
$$;

create function public.inspector_agenda(p_from timestamptz, p_to timestamptz)
returns table (
  id uuid,
  number integer,
  status public.inspection_status,
  starts_at timestamptz,
  ends_at timestamptz,
  address_text text,
  city_name text,
  latitude double precision,
  longitude double precision,
  property_type public.listing_property_type,
  area_m2 numeric,
  floor smallint,
  building_floors smallint,
  year_built smallint,
  access_name text,
  access_phone text,
  access_tags text[],
  access_notes text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    inspections.id,
    inspections.number,
    inspections.status,
    inspections.starts_at,
    inspections.ends_at,
    properties.address_text,
    cities.name,
    properties.latitude,
    properties.longitude,
    properties.property_type,
    properties.area_m2,
    properties.floor,
    properties.building_floors,
    properties.year_built,
    inspections.access_name,
    inspections.access_phone,
    inspections.access_tags,
    inspections.access_notes
  from public.inspections
  join public.properties on properties.id = inspections.property_id
  join public.cities on cities.id = properties.city_id
  where inspections.inspector_id = (select auth.uid())
    and private.has_role('inspector')
    and inspections.status <> 'cancelled'
    and inspections.starts_at < p_to
    and inspections.ends_at > p_from
  order by inspections.starts_at;
$$;

create function public.admin_inspections(
  p_from timestamptz,
  p_to timestamptz,
  p_city_id uuid,
  p_unassigned_only boolean
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
    and (
      (p_unassigned_only and inspections.status = 'scheduled' and inspections.ends_at > now())
      or (
        not p_unassigned_only
        and inspections.status <> 'cancelled'
        and inspections.starts_at < p_to
        and inspections.ends_at > p_from
      )
    )
  order by inspections.starts_at, inspections.number;
end;
$$;

create function public.admin_inspectors(p_city_id uuid)
returns table (
  user_id uuid,
  full_name text,
  phone text,
  city_id uuid,
  city_name text,
  is_active boolean
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
  return query
  select
    profiles.user_id,
    people.full_name,
    people.phone,
    profiles.city_id,
    cities.name,
    profiles.is_active
  from public.inspector_profiles as profiles
  join public.cities on cities.id = profiles.city_id
  left join public.profiles as people on people.id = profiles.user_id
  where (p_city_id is null or profiles.city_id = p_city_id)
    and exists (
      select 1 from public.user_roles
      where user_roles.user_id = profiles.user_id and user_roles.role = 'inspector'
    )
  order by cities.name, people.full_name;
end;
$$;

create function public.inspection_history(p_inspection_id uuid)
returns table (
  kind public.inspection_event_kind,
  actor_name text,
  details jsonb,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select events.kind, actor.full_name, events.details, events.created_at
  from public.inspection_events as events
  join public.inspections on inspections.id = events.inspection_id
  left join public.profiles as actor on actor.id = events.actor_id
  where events.inspection_id = p_inspection_id
    and (
      inspections.requested_by = (select auth.uid())
      or private.has_role('admin')
    )
  order by events.created_at;
$$;

create function public.admin_list_users(
  p_search text,
  p_role public.app_role,
  p_limit integer,
  p_offset integer
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
  created_at timestamptz,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  pattern text := '%' || lower(extensions.unaccent(coalesce(btrim(p_search), ''))) || '%';
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
      cities.name as city_name,
      coalesce(users.banned_until > now(), false) as is_blocked,
      users.created_at
    from auth.users
    left join public.profiles on profiles.id = users.id
    left join public.inspector_profiles as inspector on inspector.user_id = users.id
    left join public.cities on cities.id = inspector.city_id
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
    people.created_at,
    count(*) over ()
  from people
  where (p_role is null or p_role = any (people.roles))
    and (
      coalesce(btrim(p_search), '') = ''
      or lower(extensions.unaccent(coalesce(people.full_name, ''))) like pattern
      or lower(people.email) like pattern
      or coalesce(people.phone, '') like '%' || btrim(p_search) || '%'
    )
  order by people.created_at desc, people.id
  limit least(greatest(coalesce(p_limit, 50), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

create function public.admin_user_role_counts()
returns table (role public.app_role, amount bigint, total bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.has_role('admin') then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  return query
  select roles.role, count(user_roles.id), (select count(*) from auth.users)
  from unnest(enum_range(null::public.app_role)) as roles (role)
  left join public.user_roles on user_roles.role = roles.role
  group by roles.role
  order by roles.role;
end;
$$;

create function public.set_inspector(p_user_id uuid, p_city_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.has_role('admin') then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  if not exists (select 1 from auth.users where users.id = p_user_id) then
    raise exception using errcode = 'P0001', message = 'user_not_found';
  end if;
  if not exists (select 1 from public.cities where cities.id = p_city_id) then
    raise exception using errcode = 'P0001', message = 'city_not_found';
  end if;

  insert into public.user_roles (user_id, role, granted_by)
  values (p_user_id, 'inspector', (select auth.uid()))
  on conflict (user_id, role) do nothing;

  insert into public.inspector_profiles (user_id, city_id, is_active)
  values (p_user_id, p_city_id, true)
  on conflict (user_id) do update set city_id = excluded.city_id, is_active = true;

  update public.inspections
  set inspector_id = null, status = 'scheduled', assigned_at = null
  where inspections.inspector_id = p_user_id
    and inspections.status = 'inspector_assigned'
    and inspections.starts_at > now()
    and exists (
      select 1 from public.properties
      where properties.id = inspections.property_id and properties.city_id <> p_city_id
    );
end;
$$;

create function public.remove_inspector(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.has_role('admin') then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;

  update public.inspections
  set inspector_id = null, status = 'scheduled', assigned_at = null
  where inspections.inspector_id = p_user_id
    and inspections.status = 'inspector_assigned'
    and inspections.starts_at > now();

  update public.inspector_profiles set is_active = false where inspector_profiles.user_id = p_user_id;
  delete from public.user_roles where user_roles.user_id = p_user_id and user_roles.role = 'inspector';
end;
$$;

revoke execute on function
  public.inspection_cities(),
  public.inspection_slots(uuid, date, date),
  public.my_bookable_properties(),
  public.book_inspection(uuid, uuid, text, uuid, double precision, double precision,
    public.listing_property_type, numeric, smallint, smallint, smallint, timestamptz,
    public.inspection_access_mode, text, text, text[], text, public.inspection_payment_method),
  public.reschedule_inspection(uuid, timestamptz),
  public.cancel_inspection(uuid, text),
  public.assign_inspector(uuid, uuid),
  public.unassign_inspector(uuid),
  public.set_inspector_weekly_hours(uuid, smallint, jsonb),
  public.my_inspections(),
  public.inspector_agenda(timestamptz, timestamptz),
  public.admin_inspections(timestamptz, timestamptz, uuid, boolean),
  public.admin_inspectors(uuid),
  public.inspection_history(uuid),
  public.admin_list_users(text, public.app_role, integer, integer),
  public.admin_user_role_counts(),
  public.set_inspector(uuid, uuid),
  public.remove_inspector(uuid)
  from public, anon;

grant execute on function
  public.inspection_cities(),
  public.inspection_slots(uuid, date, date),
  public.my_bookable_properties(),
  public.book_inspection(uuid, uuid, text, uuid, double precision, double precision,
    public.listing_property_type, numeric, smallint, smallint, smallint, timestamptz,
    public.inspection_access_mode, text, text, text[], text, public.inspection_payment_method),
  public.reschedule_inspection(uuid, timestamptz),
  public.cancel_inspection(uuid, text),
  public.assign_inspector(uuid, uuid),
  public.unassign_inspector(uuid),
  public.set_inspector_weekly_hours(uuid, smallint, jsonb),
  public.my_inspections(),
  public.inspector_agenda(timestamptz, timestamptz),
  public.admin_inspections(timestamptz, timestamptz, uuid, boolean),
  public.admin_inspectors(uuid),
  public.inspection_history(uuid),
  public.admin_list_users(text, public.app_role, integer, integer),
  public.admin_user_role_counts(),
  public.set_inspector(uuid, uuid),
  public.remove_inspector(uuid)
  to authenticated;

revoke execute on function private.inspection_start_times(), private.is_bookable_start(timestamptz),
  private.lock_city_schedule(uuid)
  from public, anon, authenticated;
