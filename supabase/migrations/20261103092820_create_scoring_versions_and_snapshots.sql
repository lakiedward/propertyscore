create type public.scoring_kind as enum ('online', 'inspection');
create type public.snapshot_status as enum ('building', 'ready', 'failed', 'superseded');

create table public.scoring_versions (
  id uuid primary key default gen_random_uuid(),
  kind public.scoring_kind not null,
  label text not null check (char_length(label) between 1 and 20),
  weights jsonb not null default '{}' check (jsonb_typeof(weights) = 'object'),
  params jsonb not null default '{}' check (jsonb_typeof(params) = 'object'),
  is_active boolean not null default false,
  activated_at timestamptz,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scoring_versions_kind_label_key unique (kind, label),
  constraint scoring_versions_active_has_date check (not is_active or activated_at is not null)
);

comment on table public.scoring_versions is 'Formula versions: category weights and per-score parameters; frozen once a snapshot uses them.';

create unique index scoring_versions_one_active_idx on public.scoring_versions (kind) where is_active;
create index scoring_versions_created_by_idx on public.scoring_versions (created_by);

alter table public.scoring_versions enable row level security;

create trigger scoring_versions_set_updated_at
  before update on public.scoring_versions
  for each row execute function private.set_updated_at();

revoke all on public.scoring_versions from anon, authenticated;

create table public.score_snapshots (
  id uuid primary key default gen_random_uuid(),
  scoring_version_id uuid not null references public.scoring_versions (id) on delete restrict,
  period date not null check (period = date_trunc('month', period)::date),
  status public.snapshot_status not null default 'building',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  source_dates jsonb not null default '{}' check (jsonb_typeof(source_dates) = 'object'),
  stats jsonb not null default '{}' check (jsonb_typeof(stats) = 'object'),
  error_code text check (char_length(error_code) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint score_snapshots_finished_when_done check ((status = 'building') = (finished_at is null)),
  constraint score_snapshots_error_when_failed check ((status = 'failed') = (error_code is not null))
);

comment on table public.score_snapshots is 'Monthly builds of the SmartCheck grid; reports read only the single ready snapshot.';

create index score_snapshots_scoring_version_id_idx on public.score_snapshots (scoring_version_id);
create unique index score_snapshots_one_ready_idx on public.score_snapshots ((true)) where status = 'ready';
create unique index score_snapshots_one_building_idx on public.score_snapshots ((true)) where status = 'building';

alter table public.score_snapshots enable row level security;

create trigger score_snapshots_set_updated_at
  before update on public.score_snapshots
  for each row execute function private.set_updated_at();

revoke all on public.score_snapshots from anon, authenticated;

create function private.freeze_used_scoring_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.kind, new.label, new.weights, new.params) is distinct from (old.kind, old.label, old.weights, old.params)
    and exists (select 1 from public.score_snapshots s where s.scoring_version_id = old.id) then
    raise exception using errcode = 'P0001', message = 'scoring_version_in_use';
  end if;
  return new;
end;
$$;

create trigger scoring_versions_freeze_when_used
  before update on public.scoring_versions
  for each row execute function private.freeze_used_scoring_version();

create function private.start_score_snapshot(p_period date)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_version_id uuid;
  v_snapshot_id uuid;
begin
  select v.id into v_version_id
  from public.scoring_versions v
  where v.kind = 'online' and v.is_active;

  if v_version_id is null then
    raise exception using errcode = 'P0001', message = 'no_active_scoring_version';
  end if;

  update public.score_snapshots
  set status = 'failed', finished_at = now(), error_code = 'abandoned'
  where status = 'building' and started_at < now() - interval '12 hours';

  if exists (select 1 from public.score_snapshots s where s.status = 'building') then
    raise exception using errcode = 'P0001', message = 'snapshot_already_building';
  end if;

  insert into public.score_snapshots (scoring_version_id, period)
  values (v_version_id, date_trunc('month', p_period)::date)
  returning id into v_snapshot_id;

  return v_snapshot_id;
end;
$$;

create function private.publish_score_snapshot(p_snapshot_id uuid, p_source_dates jsonb)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_status public.snapshot_status;
begin
  select s.status into v_status
  from public.score_snapshots s
  where s.id = p_snapshot_id
  for update;

  if v_status is null then
    raise exception using errcode = 'P0001', message = 'snapshot_not_found';
  end if;

  if v_status <> 'building' then
    raise exception using errcode = 'P0001', message = 'snapshot_not_building';
  end if;

  update public.score_snapshots
  set status = 'superseded'
  where status = 'ready';

  update public.score_snapshots
  set status = 'ready', finished_at = now(), source_dates = coalesce(p_source_dates, '{}')
  where id = p_snapshot_id;
end;
$$;

create function private.fail_score_snapshot(p_snapshot_id uuid, p_error_code text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  update public.score_snapshots
  set status = 'failed', finished_at = now(), error_code = left(coalesce(nullif(p_error_code, ''), 'unknown'), 80)
  where id = p_snapshot_id and status = 'building';
end;
$$;

create function private.current_score_snapshot_id()
returns uuid
language sql
stable
set search_path = ''
as $$
  select s.id from public.score_snapshots s where s.status = 'ready';
$$;

insert into public.scoring_versions (kind, label, weights, params, is_active, activated_at, created_by)
values (
  'online',
  'v1',
  '{
    "accessibility": 20,
    "fifteen_minute": 18,
    "safety": 15,
    "noise": 12,
    "green": 10,
    "education": 8,
    "health": 7,
    "air": 5,
    "industry": 5
  }',
  '{"cell_size_m": 175}',
  true,
  now(),
  null
);
