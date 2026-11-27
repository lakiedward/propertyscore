create table private.score_snapshot_progress (
  id uuid primary key references public.score_snapshots(id) on delete cascade,
  plan_sha256 text not null check (plan_sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);

create table private.score_snapshot_generations (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references private.score_snapshot_progress(id) on delete cascade,
  generation integer not null check (generation > 0),
  replica_id text not null check (length(replica_id) between 1 and 255),
  valhalla_ledger_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (snapshot_id, generation),
  unique (snapshot_id, id)
);

create table private.score_snapshot_steps (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references private.score_snapshot_progress(id) on delete cascade,
  step_key text not null check (step_key ~ '^(source:osm|grid:[0-9a-f-]{36}|score:[a-z_]+)$'),
  position integer not null check (position >= 0),
  started_by uuid,
  started_at timestamptz,
  completed_by uuid,
  completed_at timestamptz,
  result jsonb check (jsonb_typeof(result) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (snapshot_id, position),
  unique (snapshot_id, step_key),
  foreign key (snapshot_id, started_by) references private.score_snapshot_generations(snapshot_id, id)
    deferrable initially deferred,
  foreign key (snapshot_id, completed_by) references private.score_snapshot_generations(snapshot_id, id)
    deferrable initially deferred,
  check ((started_at is null) = (started_by is null)),
  check ((completed_at is null and result is null and completed_by is null)
    or (completed_at is not null and result is not null and started_by is not null and completed_by = started_by))
);

create index score_snapshot_steps_started_by_idx
  on private.score_snapshot_steps(snapshot_id, started_by);
create index score_snapshot_steps_completed_by_idx
  on private.score_snapshot_steps(snapshot_id, completed_by);

create table private.score_snapshot_requests (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null,
  execution_id uuid not null,
  step_key text not null,
  provider text not null check (provider in ('valhalla', 'ads', 'source')),
  operation_key text not null check (operation_key ~ '^[a-zA-Z0-9:_-]{1,160}$'),
  fingerprint text not null check (fingerprint ~ '^[0-9a-f]{64}$'),
  attempt integer not null check (attempt > 0),
  upstream_id text check (length(upstream_id) between 1 and 255),
  state text not null default 'unconfirmed'
    check (state in ('unconfirmed', 'accepted', 'succeeded', 'failed', 'discarded')),
  artifact_sha256 text check (artifact_sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (snapshot_id, step_key, provider, operation_key, attempt),
  unique (snapshot_id, provider, upstream_id),
  foreign key (snapshot_id, step_key) references private.score_snapshot_steps(snapshot_id, step_key)
    on delete cascade,
  foreign key (snapshot_id, execution_id) references private.score_snapshot_generations(snapshot_id, id)
    deferrable initially deferred,
  check (state = 'discarded' or ((state = 'unconfirmed') = (upstream_id is null))),
  check (state <> 'discarded' or provider in ('valhalla', 'source')),
  check ((state = 'succeeded') = (artifact_sha256 is not null))
);

create index score_snapshot_requests_execution_idx
  on private.score_snapshot_requests(snapshot_id, execution_id);

create trigger score_snapshot_generations_set_updated_at
  before update on private.score_snapshot_generations
  for each row execute function private.set_updated_at();
create trigger score_snapshot_steps_set_updated_at
  before update on private.score_snapshot_steps
  for each row execute function private.set_updated_at();
create trigger score_snapshot_requests_set_updated_at
  before update on private.score_snapshot_requests
  for each row execute function private.set_updated_at();

alter table private.score_snapshot_progress enable row level security;
alter table private.score_snapshot_generations enable row level security;
alter table private.score_snapshot_steps enable row level security;
alter table private.score_snapshot_requests enable row level security;

revoke all on private.score_snapshot_progress, private.score_snapshot_generations,
  private.score_snapshot_steps, private.score_snapshot_requests
  from public, anon, authenticated, service_role;

create function snapshot_diagnostics.read_score_snapshot_progress(p_snapshot_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'snapshot_id', s.id,
    'snapshot_status', s.status,
    'routing_pending', s.routing_pending,
    'plan_sha256', p.plan_sha256,
    'generations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', g.id, 'generation', g.generation, 'replica_id', g.replica_id,
        'valhalla_ledger_id', g.valhalla_ledger_id
      ) order by g.generation)
      from private.score_snapshot_generations g where g.snapshot_id = s.id
    ), '[]'::jsonb),
    'steps', coalesce((
      select jsonb_agg(jsonb_build_object(
        'key', t.step_key, 'started_at', t.started_at, 'started_by', t.started_by,
        'completed_at', t.completed_at, 'completed_by', t.completed_by
      ) order by t.position)
      from private.score_snapshot_steps t where t.snapshot_id = s.id
    ), '[]'::jsonb),
    'requests', (
      select jsonb_build_object(
        'unconfirmed', count(*) filter (where r.state = 'unconfirmed'),
        'accepted', count(*) filter (where r.state = 'accepted'),
        'succeeded', count(*) filter (where r.state = 'succeeded'),
        'failed', count(*) filter (where r.state = 'failed'),
        'discarded', count(*) filter (where r.state = 'discarded')
      )
      from private.score_snapshot_requests r where r.snapshot_id = s.id
    )
  )
  from public.score_snapshots s
  left join private.score_snapshot_progress p on p.id = s.id
  where s.id = p_snapshot_id;
$$;

revoke all on function snapshot_diagnostics.read_score_snapshot_progress(uuid)
  from public, anon, authenticated, service_role;
grant execute on function snapshot_diagnostics.read_score_snapshot_progress(uuid)
  to snapshot_status_reader;

create function snapshot_diagnostics.read_score_snapshot_requests(p_snapshot_id uuid, p_after uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', r.id, 'execution_id', r.execution_id, 'step_key', r.step_key, 'provider', r.provider,
    'operation_key', r.operation_key, 'fingerprint', r.fingerprint, 'attempt', r.attempt,
    'upstream_id', r.upstream_id, 'state', r.state, 'artifact_sha256', r.artifact_sha256,
    'created_at', r.created_at
  ) order by r.id), '[]'::jsonb)
  from (
    select * from private.score_snapshot_requests r
    where r.snapshot_id = p_snapshot_id and (p_after is null or r.id > p_after)
    order by r.id limit 100
  ) r;
$$;

revoke all on function snapshot_diagnostics.read_score_snapshot_requests(uuid, uuid)
  from public, anon, authenticated, service_role;
grant execute on function snapshot_diagnostics.read_score_snapshot_requests(uuid, uuid)
  to snapshot_status_reader;