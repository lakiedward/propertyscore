create table private.saved_report_walk_routes (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.online_reports (id) on delete cascade,
  place_id text not null,
  requested_at timestamptz not null default now(),
  attempt_count smallint not null default 0 check (attempt_count between 0 and 3),
  claim_token uuid,
  claim_expires_at timestamptz,
  completed_at timestamptz,
  polyline6 text check (char_length(polyline6) between 4 and 32768 and polyline6 ~ '^[?-~]+$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (report_id, place_id),
  check ((claim_token is null) = (claim_expires_at is null)),
  check (completed_at is null or claim_token is null),
  check (polyline6 is null or completed_at is not null)
);

alter table private.saved_report_walk_routes enable row level security;
revoke all on private.saved_report_walk_routes from public, anon, authenticated;

create index saved_report_walk_routes_pending_idx
  on private.saved_report_walk_routes (requested_at, id)
  where completed_at is null and attempt_count < 3;

create trigger saved_report_walk_routes_set_updated_at
  before update on private.saved_report_walk_routes
  for each row execute function private.set_updated_at();

create function public.request_saved_report_walk_route(
  p_report_id uuid,
  p_category_key text,
  p_token text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_section jsonb;
  v_place_id text;
  v_route private.saved_report_walk_routes%rowtype;
begin
  if p_token is null then
    select r.result -> 'fifteen_minute' into v_section
    from public.online_reports r
    where r.id = p_report_id and r.status = 'ready' and r.owner_id = (select auth.uid());
  else
    select r.result -> 'fifteen_minute' into v_section
    from public.resolve_report_share_link(p_report_id, p_token) r;
  end if;

  if v_section ->> 'status' is distinct from 'scored'
    or jsonb_typeof(v_section -> 'categories') is distinct from 'array'
    or jsonb_typeof(v_section -> 'places') is distinct from 'array'
  then
    return null;
  end if;

  if not exists (
    select 1 from jsonb_array_elements(v_section -> 'categories') as c(category)
    where c.category ->> 'key' = p_category_key and
      case when jsonb_typeof(c.category -> 't1_min') = 'number'
        then (c.category ->> 't1_min')::numeric <= 15
        else false
      end
  ) then
    return null;
  end if;

  select p.place ->> 'id' into v_place_id
  from jsonb_array_elements(v_section -> 'places') with ordinality as p(place, position)
  where p.place ->> 'category' = p_category_key
    and jsonb_typeof(p.place -> 'minutes') = 'number'
    and jsonb_typeof(p.place -> 'id') = 'string'
  order by (p.place ->> 'minutes')::numeric, p.position
  limit 1;

  if v_place_id is null then
    return null;
  end if;

  if jsonb_typeof(v_section -> 'routes') = 'array' and
    (v_section -> 'routes') @> jsonb_build_array(jsonb_build_object('place_id', v_place_id))
  then
    return null;
  end if;

  select * into v_route from private.saved_report_walk_routes
  where report_id = p_report_id and place_id = v_place_id;

  if not found or (
    v_route.attempt_count < 3 and v_route.polyline6 is null
    and v_route.completed_at <= now() - interval '5 minutes'
  ) then
    insert into private.saved_report_walk_routes (report_id, place_id)
    values (p_report_id, v_place_id)
    on conflict (report_id, place_id) do update
      set requested_at = excluded.requested_at, completed_at = null
    where saved_report_walk_routes.polyline6 is null
      and saved_report_walk_routes.attempt_count < 3
      and saved_report_walk_routes.completed_at <= now() - interval '5 minutes';
    if found then
      perform pg_notify('saved_report_walk_route_queued', '');
    end if;
  end if;

  select * into v_route from private.saved_report_walk_routes
  where report_id = p_report_id and place_id = v_place_id;

  if v_route.polyline6 is not null then
    return jsonb_build_object('status', 'ready', 'polyline6', v_route.polyline6);
  elsif v_route.completed_at is null and v_route.requested_at > now() - interval '5 minutes'
    and (v_route.attempt_count < 3 or v_route.claim_expires_at > now())
  then
    return jsonb_build_object('status', 'pending');
  end if;
  return jsonb_build_object('status', 'unavailable');
end;
$$;

revoke all on function public.request_saved_report_walk_route(uuid, text, text) from public;
grant execute on function public.request_saved_report_walk_route(uuid, text, text) to anon, authenticated;

create function private.claim_next_saved_report_walk_route()
returns table (id uuid, claim_token uuid, origin jsonb, destination jsonb, speed jsonb)
language sql
set search_path = ''
as $$
  with next_route as (
    select q.id
    from private.saved_report_walk_routes q
    join public.online_reports r on r.id = q.report_id
    where q.completed_at is null and q.attempt_count < 3 and r.status = 'ready'
      and (q.claim_expires_at is null or q.claim_expires_at <= now())
    order by q.requested_at, q.id
    limit 1
    for update of q skip locked
  ), claimed as (
    update private.saved_report_walk_routes q
    set claim_token = gen_random_uuid(), claim_expires_at = now() + interval '30 seconds',
      attempt_count = q.attempt_count + 1
    from next_route n
    where q.id = n.id
    returning q.id, q.claim_token, q.report_id, q.place_id
  )
  select q.id, q.claim_token,
    jsonb_build_object('lng', r.longitude, 'lat', r.latitude),
    jsonb_path_query_first(
      r.result, '$.fifteen_minute.places[*] ? (@.id == $place_id)',
      jsonb_build_object('place_id', q.place_id), true
    ),
    r.result #> '{fifteen_minute,walk_speed_kmh}'
  from claimed q
  join public.online_reports r on r.id = q.report_id;
$$;

revoke execute on function private.claim_next_saved_report_walk_route()
  from public, anon, authenticated;

create function private.complete_saved_report_walk_route(
  p_id uuid,
  p_claim_token uuid,
  p_polyline6 text
)
returns boolean
language sql
set search_path = ''
as $$
  with completed as (
    update private.saved_report_walk_routes q
    set completed_at = now(), polyline6 = p_polyline6, claim_token = null, claim_expires_at = null
    where q.id = p_id and q.claim_token = p_claim_token and q.claim_expires_at > now()
      and q.completed_at is null
    returning q.id
  )
  select exists (select 1 from completed);
$$;

revoke execute on function private.complete_saved_report_walk_route(uuid, uuid, text)
  from public, anon, authenticated;