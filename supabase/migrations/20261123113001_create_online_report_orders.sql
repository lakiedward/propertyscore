alter table public.online_reports
  add column claim_expires_at timestamptz,
  add column generation_attempts smallint not null default 0 check (generation_attempts between 0 and 10);

comment on column public.online_reports.claim_expires_at is 'Lease of the worker that took the report from the queue; another worker may take it only after the lease has passed.';
comment on column public.online_reports.generation_attempts is 'How many times a worker took the report from the queue; the queue gives up after three.';

create index online_reports_queue_idx
  on public.online_reports (created_at, id)
  where status in ('queued', 'generating');

create table public.smartcheck_unlimited_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  granted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.smartcheck_unlimited_accounts is 'Accounts an admin allowed to generate SmartCheck reports without paying; written only through set_smartcheck_unlimited.';

create index smartcheck_unlimited_accounts_granted_by_idx on public.smartcheck_unlimited_accounts (granted_by);

alter table public.smartcheck_unlimited_accounts enable row level security;

create trigger smartcheck_unlimited_accounts_set_updated_at
  before update on public.smartcheck_unlimited_accounts
  for each row execute function private.set_updated_at();

revoke all on public.smartcheck_unlimited_accounts from anon, authenticated;
grant select on public.smartcheck_unlimited_accounts to authenticated;

create policy "Users can read their own SmartCheck unlimited flag"
  on public.smartcheck_unlimited_accounts for select to authenticated
  using ((select auth.uid()) = user_id);

create function public.set_smartcheck_unlimited(p_email text, p_is_unlimited boolean)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  account_id uuid;
begin
  if caller is null or not private.has_role('admin') then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;

  if p_is_unlimited is null then
    raise exception using errcode = 'P0001', message = 'unlimited_flag_missing';
  end if;

  select u.id into account_id
  from auth.users u
  where lower(u.email) = lower(btrim(p_email))
  order by u.created_at
  limit 1;

  if account_id is null then
    raise exception using errcode = 'P0001', message = 'account_not_found';
  end if;

  if p_is_unlimited then
    insert into public.smartcheck_unlimited_accounts (user_id, granted_by)
    values (account_id, caller)
    on conflict (user_id) do nothing;
  else
    delete from public.smartcheck_unlimited_accounts where user_id = account_id;
  end if;

  return account_id;
end;
$$;

revoke execute on function public.set_smartcheck_unlimited(text, boolean) from public, anon;
grant execute on function public.set_smartcheck_unlimited(text, boolean) to authenticated;

create function public.list_smartcheck_unlimited_accounts()
returns table (user_id uuid, email text, full_name text, granted_at timestamptz)
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
  select a.user_id, u.email::text, p.full_name, a.created_at
  from public.smartcheck_unlimited_accounts a
  join auth.users u on u.id = a.user_id
  left join public.profiles p on p.id = a.user_id
  order by a.created_at desc, a.user_id;
end;
$$;

revoke execute on function public.list_smartcheck_unlimited_accounts() from public, anon;
grant execute on function public.list_smartcheck_unlimited_accounts() to authenticated;

create function public.create_online_report(
  p_address_text text,
  p_latitude double precision,
  p_longitude double precision,
  p_locale text default null,
  p_declared_rooms smallint default null,
  p_declared_area_m2 numeric default null,
  p_declared_floor smallint default null,
  p_declared_building_floors smallint default null,
  p_declared_has_elevator boolean default null,
  p_declared_construction_year smallint default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  clean_address text := btrim(p_address_text);
  report_location extensions.geography;
  report_city_id uuid;
  ready_snapshot_id uuid;
  report_locale text;
  report_id uuid;
begin
  if caller is null then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;

  if clean_address is null or char_length(clean_address) not between 3 and 300 then
    raise exception using errcode = 'P0001', message = 'address_invalid';
  end if;

  if p_latitude is null or p_longitude is null
    or p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then
    raise exception using errcode = 'P0001', message = 'location_invalid';
  end if;

  report_location := extensions.st_point(p_longitude, p_latitude, 4326)::extensions.geography;

  select c.id into report_city_id
  from public.cities c
  where c.has_online_coverage and extensions.st_intersects(c.boundary, report_location)
  order by c.position
  limit 1;

  if report_city_id is null then
    raise exception using errcode = 'P0001', message = 'outside_coverage';
  end if;

  ready_snapshot_id := private.current_score_snapshot_id();
  if ready_snapshot_id is null then
    raise exception using errcode = 'P0001', message = 'no_ready_snapshot';
  end if;

  perform 1
  from public.score_snapshots s
  join public.scoring_versions v on v.id = s.scoring_version_id
  join private.grid_cells g
    on g.size_m = (v.params ->> 'cell_size_m')::integer
    and g.city_id = report_city_id
    and extensions.st_intersects(g.geometry, report_location)
  join private.cell_scores cs on cs.snapshot_id = s.id and cs.cell_id = g.id
  where s.id = ready_snapshot_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'outside_coverage';
  end if;

  if not exists (
    select 1 from public.smartcheck_unlimited_accounts a where a.user_id = caller
  ) then
    raise exception using errcode = 'P0001', message = 'payment_required';
  end if;

  select coalesce(p_locale, p.locale, 'ro') into report_locale
  from (select 1) as one
  left join public.profiles p on p.id = caller;

  insert into public.online_reports (
    owner_id, city_id, location, address_text, locale, status,
    declared_rooms, declared_area_m2, declared_floor, declared_building_floors,
    declared_has_elevator, declared_construction_year
  )
  values (
    caller, report_city_id, report_location, clean_address, report_locale, 'queued',
    p_declared_rooms, p_declared_area_m2, p_declared_floor, p_declared_building_floors,
    p_declared_has_elevator, p_declared_construction_year
  )
  returning id into report_id;

  perform pg_notify('online_report_queued', report_id::text);

  return report_id;
end;
$$;

revoke execute on function public.create_online_report(
  text, double precision, double precision, text, smallint, numeric, smallint, smallint, boolean, smallint
) from public, anon;
grant execute on function public.create_online_report(
  text, double precision, double precision, text, smallint, numeric, smallint, smallint, boolean, smallint
) to authenticated;

create function private.claim_next_online_report()
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  candidate_id uuid;
  candidate_attempts smallint;
begin
  loop
    candidate_id := null;

    select r.id, r.generation_attempts into candidate_id, candidate_attempts
    from public.online_reports r
    where r.status in ('queued', 'generating')
      and (
        (r.status = 'queued' and (r.claim_expires_at is null or r.claim_expires_at < now()))
        or (
          r.status = 'generating'
          and r.claim_expires_at < now()
          and r.updated_at < now() - interval '15 minutes'
        )
      )
    order by r.created_at, r.id
    limit 1
    for update skip locked;

    if candidate_id is null then
      return null;
    end if;

    if candidate_attempts >= 3 then
      update public.online_reports
      set status = 'failed', error_code = 'generation_attempts_exhausted', claim_expires_at = null
      where id = candidate_id;
      continue;
    end if;

    update public.online_reports
    set claim_expires_at = now() + interval '15 minutes', generation_attempts = generation_attempts + 1
    where id = candidate_id;

    return candidate_id;
  end loop;
end;
$$;

revoke execute on function private.claim_next_online_report() from public, anon, authenticated;
