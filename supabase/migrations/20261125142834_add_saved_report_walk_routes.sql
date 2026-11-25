create table private.saved_report_walk_routes (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.online_reports (id) on delete cascade,
  place_id text not null,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  polyline6 text check (char_length(polyline6) between 4 and 32768 and polyline6 ~ '^[?-~]+$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (report_id, place_id),
  check (polyline6 is null or completed_at is not null)
);

alter table private.saved_report_walk_routes enable row level security;
revoke all on private.saved_report_walk_routes from public, anon, authenticated;

create index saved_report_walk_routes_pending_idx
  on private.saved_report_walk_routes (requested_at) where completed_at is null;

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

  if not found or (v_route.polyline6 is null and v_route.requested_at <= now() - interval '5 minutes') then
    insert into private.saved_report_walk_routes (report_id, place_id)
    values (p_report_id, v_place_id)
    on conflict (report_id, place_id) do update
      set requested_at = excluded.requested_at, completed_at = null
    where saved_report_walk_routes.polyline6 is null
      and saved_report_walk_routes.requested_at <= now() - interval '5 minutes';
    if found then
      perform pg_notify('saved_report_walk_route_queued', '');
    end if;
  end if;

  select * into v_route from private.saved_report_walk_routes
  where report_id = p_report_id and place_id = v_place_id;

  if v_route.polyline6 is not null then
    return jsonb_build_object('status', 'ready', 'polyline6', v_route.polyline6);
  elsif v_route.completed_at is null and v_route.requested_at > now() - interval '1 minute' then
    return jsonb_build_object('status', 'pending');
  end if;
  return jsonb_build_object('status', 'unavailable');
end;
$$;

revoke all on function public.request_saved_report_walk_route(uuid, text, text) from public;
grant execute on function public.request_saved_report_walk_route(uuid, text, text) to anon, authenticated;