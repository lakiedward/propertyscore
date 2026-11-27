alter table public.score_snapshots
  add column uses_worker_lock boolean not null default false;

create function private.start_score_snapshot(p_period date, p_uses_worker_lock boolean)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_namespace constant integer := hashtext('propertyscore.snapshot') & 2147483647;
  v_version_id uuid;
  v_snapshot_id uuid;
begin
  if not pg_try_advisory_xact_lock(v_namespace, 0) then
    raise exception using errcode = 'P0001', message = 'snapshot_already_building';
  end if;

  if exists (
    select 1 from pg_locks
    where locktype = 'advisory'
      and database = (select oid from pg_database where datname = current_database())
      and classid = v_namespace::oid
      and objid = 1
      and objsubid = 2
      and granted
  ) then
    raise exception using errcode = 'P0001', message = 'snapshot_already_building';
  end if;

  select v.id into v_version_id
  from public.scoring_versions v
  where v.kind = 'online' and v.is_active;

  if v_version_id is null then
    raise exception using errcode = 'P0001', message = 'no_active_scoring_version';
  end if;

  update public.score_snapshots
  set status = 'failed', finished_at = now(), error_code = 'abandoned'
  where status = 'building'
    and (uses_worker_lock or started_at < now() - interval '12 hours');

  if exists (select 1 from public.score_snapshots s where s.status = 'building') then
    raise exception using errcode = 'P0001', message = 'snapshot_already_building';
  end if;

  insert into public.score_snapshots (scoring_version_id, period, uses_worker_lock)
  values (v_version_id, date_trunc('month', p_period)::date, p_uses_worker_lock)
  returning id into v_snapshot_id;

  if p_uses_worker_lock then
    perform pg_advisory_lock(v_namespace, 1);
  end if;

  return v_snapshot_id;
end;
$$;

create or replace function private.start_score_snapshot(p_period date)
returns uuid
language sql
set search_path = ''
as $$
  select private.start_score_snapshot(p_period, false);
$$;

revoke execute on function private.start_score_snapshot(date, boolean) from public, anon, authenticated;
