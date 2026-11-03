create type public.app_role as enum ('admin');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, role)
);

comment on table public.user_roles is 'Privileged application roles per user; a signed-in user without a row is a regular user. Read by the access token hook, written only by admins through RPCs or seed.';

create index user_roles_granted_by_idx on public.user_roles (granted_by);

alter table public.user_roles enable row level security;

create trigger user_roles_set_updated_at
  before update on public.user_roles
  for each row execute function private.set_updated_at();

revoke all on public.user_roles from anon, authenticated;
grant select on public.user_roles to authenticated;

create policy "Users can read their own roles and admins can read every role"
  on public.user_roles for select to authenticated
  using (
    (select auth.uid()) = user_id
    or coalesce(((select auth.jwt()) -> 'user_roles') ? 'admin', false)
  );

create function private.has_role(required_role public.app_role)
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(((select auth.jwt()) -> 'user_roles') ? required_role::text, false);
$$;
