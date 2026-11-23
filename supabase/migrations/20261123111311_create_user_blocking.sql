create table private.user_blocks (
  user_id uuid primary key references auth.users (id) on delete cascade,
  reason text not null check (char_length(reason) between 1 and 300),
  blocked_by uuid references auth.users (id) on delete set null,
  blocked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table private.user_blocks enable row level security;

create index user_blocks_blocked_by_idx on private.user_blocks (blocked_by);

revoke all on table private.user_blocks from public, anon, authenticated;

comment on table private.user_blocks is
  'Accounts an admin blocked, with the reason and who blocked them. Read and written only by block_user and unblock_user.';

create or replace function private.guard_listing_status()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  is_account_switch boolean := coalesce(current_setting('app.account_block_switch', true), '') = 'on';
begin
  if new.status is distinct from old.status and not (
    (old.status in ('draft', 'rejected') and new.status = 'pending_approval')
    or (old.status = 'pending_approval' and new.status in ('approved', 'rejected', 'blocked'))
    or (old.status = 'approved' and new.status in ('rejected', 'blocked') and old.revision_of is null)
    or (is_account_switch and old.status = 'approved' and new.status = 'suspended')
    or (is_account_switch and old.status = 'suspended' and new.status = 'approved')
  ) then
    raise exception using errcode = 'P0001', message = 'listing_invalid_transition';
  end if;
  return new;
end;
$$;

create function public.block_user(p_user_id uuid, p_reason text)
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

  for booking in
    select inspections.id
    from public.inspections
    where inspections.inspector_id = p_user_id
      and inspections.status = 'inspector_assigned'
      and inspections.starts_at > now()
  loop
    update public.inspections
    set status = 'scheduled', inspector_id = null, assigned_at = null
    where id = booking.id;
    insert into public.inspection_events (inspection_id, kind, actor_id, details)
    values (booking.id, 'unassigned', caller, jsonb_build_object('reason', 'inspector_blocked'));
  end loop;

  update public.inspector_profiles set is_active = false where user_id = p_user_id;
end;
$$;

create function public.unblock_user(p_user_id uuid)
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

  update public.inspector_profiles set is_active = true where user_id = p_user_id;
end;
$$;

revoke execute on function public.block_user(uuid, text), public.unblock_user(uuid)
  from public, anon;

grant execute on function public.block_user(uuid, text), public.unblock_user(uuid)
  to authenticated;

drop function public.admin_list_users(text, public.app_role, boolean, integer, integer);

create function public.admin_list_users(
  p_search text,
  p_role public.app_role default null,
  p_blocked boolean default null,
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

revoke execute on function public.admin_list_users(text, public.app_role, boolean, integer, integer) from public, anon;

grant execute on function public.admin_list_users(text, public.app_role, boolean, integer, integer) to authenticated;
