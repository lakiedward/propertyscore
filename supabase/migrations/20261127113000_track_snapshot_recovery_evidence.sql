create table private.score_snapshot_executions (
  snapshot_id uuid primary key references public.score_snapshots(id) on delete cascade,
  replica_id text not null check (length(replica_id) > 0),
  valhalla_url text not null,
  valhalla_ledger_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table private.score_snapshot_cams_attempts (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references private.score_snapshot_executions(snapshot_id) on delete cascade,
  ads_url text not null,
  job_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index score_snapshot_cams_attempts_snapshot_id_idx
  on private.score_snapshot_cams_attempts(snapshot_id);

create trigger score_snapshot_executions_set_updated_at
  before update on private.score_snapshot_executions
  for each row execute function private.set_updated_at();

create trigger score_snapshot_cams_attempts_set_updated_at
  before update on private.score_snapshot_cams_attempts
  for each row execute function private.set_updated_at();

alter table private.score_snapshot_executions enable row level security;
alter table private.score_snapshot_cams_attempts enable row level security;

revoke all on private.score_snapshot_executions, private.score_snapshot_cams_attempts
  from public, anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'snapshot_status_reader') then
    create role snapshot_status_reader nologin;
  elsif exists (
    select 1 from pg_catalog.pg_roles
    where rolname = 'snapshot_status_reader'
      and (rolcanlogin or rolsuper or rolcreaterole or rolcreatedb or rolreplication or rolbypassrls)
  ) then
    raise exception 'snapshot_status_reader must be an unprivileged group';
  end if;
end;
$$;
create schema snapshot_diagnostics;
revoke all on schema snapshot_diagnostics from public, anon, authenticated, service_role;

create function snapshot_diagnostics.read_score_snapshot_runtime(p_snapshot_id uuid)
returns table (
  snapshot_status text,
  routing_pending boolean,
  replica_id text,
  valhalla_url text,
  valhalla_ledger_id uuid
)
language sql
stable
security definer
set search_path = ''
as $$
  select s.status::text, s.routing_pending, e.replica_id, e.valhalla_url, e.valhalla_ledger_id
  from public.score_snapshots s
  left join private.score_snapshot_executions e on e.snapshot_id = s.id
  where s.id = p_snapshot_id;
$$;

create function snapshot_diagnostics.read_score_snapshot_ads_attempts(p_snapshot_id uuid)
returns table (ads_url text, job_id text)
language sql
stable
security definer
set search_path = ''
as $$
  select a.ads_url, a.job_id
  from private.score_snapshot_cams_attempts a
  where a.snapshot_id = p_snapshot_id;
$$;

revoke all on function snapshot_diagnostics.read_score_snapshot_runtime(uuid),
  snapshot_diagnostics.read_score_snapshot_ads_attempts(uuid) from public, anon, authenticated, service_role;
grant usage on schema snapshot_diagnostics to snapshot_status_reader;
grant execute on function snapshot_diagnostics.read_score_snapshot_runtime(uuid),
  snapshot_diagnostics.read_score_snapshot_ads_attempts(uuid) to snapshot_status_reader;
