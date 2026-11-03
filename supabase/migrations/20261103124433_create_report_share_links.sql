create table public.report_share_links (
  id uuid primary key default gen_random_uuid(),
  online_report_id uuid not null references public.online_reports (id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  token_hash bytea not null unique check (octet_length(token_hash) = 32),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint report_share_links_expiry_after_creation check (expires_at is null or expires_at > created_at)
);

comment on table public.report_share_links is 'Links that let anyone holding the token read one ready online report; only the SHA-256 of the token is stored.';

create index report_share_links_online_report_id_idx on public.report_share_links (online_report_id);
create index report_share_links_owner_id_idx on public.report_share_links (owner_id);
create unique index report_share_links_one_active_per_report_idx
  on public.report_share_links (online_report_id)
  where revoked_at is null;

alter table public.report_share_links enable row level security;

create trigger report_share_links_set_updated_at
  before update on public.report_share_links
  for each row execute function private.set_updated_at();

revoke all on public.report_share_links from anon, authenticated;
grant select (id, online_report_id, expires_at, revoked_at, created_at) on public.report_share_links to authenticated;

create policy "Owners can read their report share links"
  on public.report_share_links for select to authenticated
  using ((select auth.uid()) = owner_id);

create function private.owned_ready_report(p_report_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.online_report_status;
begin
  select r.status into v_status
  from public.online_reports r
  where r.id = p_report_id and r.owner_id = (select auth.uid())
  for update;

  if v_status is null then
    raise exception using errcode = 'P0001', message = 'report_not_found';
  end if;
  if v_status <> 'ready' then
    raise exception using errcode = 'P0001', message = 'report_not_ready';
  end if;
  return p_report_id;
end;
$$;

create function public.create_report_share_link(p_report_id uuid, p_expires_in_days integer default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text;
begin
  if p_expires_in_days is not null and p_expires_in_days not between 1 and 365 then
    raise exception using errcode = 'P0001', message = 'share_link_invalid_expiry';
  end if;

  perform private.owned_ready_report(p_report_id);

  update public.report_share_links
  set revoked_at = now()
  where online_report_id = p_report_id and revoked_at is null;

  v_token := encode(extensions.gen_random_bytes(24), 'hex');

  insert into public.report_share_links (online_report_id, owner_id, token_hash, expires_at)
  values (
    p_report_id,
    (select auth.uid()),
    extensions.digest(v_token, 'sha256'),
    case when p_expires_in_days is null then null else now() + make_interval(days => p_expires_in_days) end
  );

  return v_token;
end;
$$;

create function public.revoke_report_share_link(p_report_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.online_reports r
    where r.id = p_report_id and r.owner_id = (select auth.uid())
  ) then
    raise exception using errcode = 'P0001', message = 'report_not_found';
  end if;

  update public.report_share_links
  set revoked_at = now()
  where online_report_id = p_report_id and revoked_at is null;
end;
$$;

create function public.resolve_report_share_link(p_report_id uuid, p_token text)
returns table (
  id uuid,
  number bigint,
  status public.online_report_status,
  address_text text,
  latitude double precision,
  longitude double precision,
  declared_rooms smallint,
  declared_area_m2 numeric,
  declared_floor smallint,
  declared_building_floors smallint,
  declared_construction_year smallint,
  overall_score smallint,
  result jsonb,
  created_at timestamptz,
  generated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    r.id, r.number, r.status, r.address_text, r.latitude, r.longitude,
    r.declared_rooms, r.declared_area_m2, r.declared_floor, r.declared_building_floors,
    r.declared_construction_year, r.overall_score, r.result, r.created_at, r.generated_at
  from public.report_share_links l
  join public.online_reports r on r.id = l.online_report_id
  where p_token ~ '^[0-9a-f]{48}$'
    and l.token_hash = extensions.digest(p_token, 'sha256')
    and l.online_report_id = p_report_id
    and l.revoked_at is null
    and (l.expires_at is null or l.expires_at > now())
    and r.status = 'ready';
$$;

revoke all on function private.owned_ready_report(uuid) from public, anon, authenticated;
revoke all on function public.create_report_share_link(uuid, integer) from public, anon;
revoke all on function public.revoke_report_share_link(uuid) from public, anon;
revoke all on function public.resolve_report_share_link(uuid, text) from public;
grant execute on function public.create_report_share_link(uuid, integer) to authenticated;
grant execute on function public.revoke_report_share_link(uuid) to authenticated;
grant execute on function public.resolve_report_share_link(uuid, text) to anon, authenticated;
