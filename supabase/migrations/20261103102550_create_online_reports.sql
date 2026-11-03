create type public.online_report_status as enum ('pending_payment', 'generating', 'ready', 'failed');

create table public.online_reports (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity unique,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  city_id uuid not null references public.cities (id) on delete restrict,
  location extensions.geography(Point, 4326) not null,
  latitude double precision generated always as (extensions.st_y(location::extensions.geometry)) stored,
  longitude double precision generated always as (extensions.st_x(location::extensions.geometry)) stored,
  address_text text not null check (char_length(address_text) between 3 and 300),
  source_listing_url text check (source_listing_url ~ '^https://'),
  declared_rooms smallint check (declared_rooms between 1 and 20),
  declared_area_m2 numeric(7, 2) check (declared_area_m2 > 0),
  declared_floor smallint check (declared_floor between -2 and 60),
  declared_building_floors smallint check (declared_building_floors between 1 and 60),
  declared_has_elevator boolean,
  declared_construction_year smallint check (declared_construction_year between 1800 and 2100),
  status public.online_report_status not null default 'pending_payment',
  scoring_version_id uuid references public.scoring_versions (id) on delete restrict,
  snapshot_id uuid references public.score_snapshots (id) on delete restrict,
  overall_score smallint check (overall_score between 0 and 100),
  category_scores jsonb not null default '{}' check (private.is_category_scores(category_scores)),
  result jsonb not null default '{}' check (jsonb_typeof(result) = 'object'),
  version integer not null default 1 check (version >= 1),
  locale text not null default 'ro' check (locale in ('ro', 'en')),
  pdf_path text check (char_length(pdf_path) between 1 and 400),
  error_code text check (error_code ~ '^[a-z][a-z0-9_]{2,79}$'),
  generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint online_reports_ready_is_frozen check (
    status <> 'ready'
    or (snapshot_id is not null and scoring_version_id is not null and generated_at is not null)
  ),
  constraint online_reports_failed_has_code check ((status = 'failed') = (error_code is not null))
);

comment on table public.online_reports is 'SmartCheck online reports: the address analysed, the declared details and the result frozen from one score snapshot.';
comment on column public.online_reports.result is 'Frozen report payload (zone, categories, per-score sections); never recomputed after generation.';

create index online_reports_owner_id_idx on public.online_reports (owner_id, created_at desc);
create index online_reports_city_id_idx on public.online_reports (city_id);
create index online_reports_scoring_version_id_idx on public.online_reports (scoring_version_id);
create index online_reports_snapshot_id_idx on public.online_reports (snapshot_id);

alter table public.online_reports enable row level security;

create trigger online_reports_set_updated_at
  before update on public.online_reports
  for each row execute function private.set_updated_at();

revoke all on public.online_reports from anon, authenticated;
grant select on public.online_reports to authenticated;

create policy "Owners can read their online reports"
  on public.online_reports for select to authenticated
  using ((select auth.uid()) = owner_id);

create function private.begin_online_report(p_report_id uuid)
returns table (snapshot_id uuid, cell_id uuid, city_slug text, latitude double precision, longitude double precision)
language plpgsql
set search_path = ''
as $$
declare
  v_report public.online_reports%rowtype;
  v_snapshot_id uuid;
  v_cell_id uuid;
  v_city_slug text;
begin
  select r.* into v_report
  from public.online_reports r
  where r.id = p_report_id
  for update;

  if v_report.id is null then
    raise exception using errcode = 'P0001', message = 'report_not_found';
  end if;

  if v_report.status = 'ready' then
    raise exception using errcode = 'P0001', message = 'report_already_ready';
  end if;

  if v_report.status = 'generating' and v_report.updated_at > now() - interval '15 minutes' then
    raise exception using errcode = 'P0001', message = 'report_in_progress';
  end if;

  v_snapshot_id := private.current_score_snapshot_id();
  if v_snapshot_id is null then
    raise exception using errcode = 'P0001', message = 'no_ready_snapshot';
  end if;

  select g.id, c.slug into v_cell_id, v_city_slug
  from public.score_snapshots s
  join public.scoring_versions v on v.id = s.scoring_version_id
  join private.grid_cells g
    on g.size_m = (v.params ->> 'cell_size_m')::integer
    and g.city_id = v_report.city_id
    and extensions.st_intersects(g.geometry, v_report.location)
  join private.cell_scores cs on cs.snapshot_id = s.id and cs.cell_id = g.id
  join public.cities c on c.id = g.city_id
  where s.id = v_snapshot_id
  order by g.cell_key
  limit 1;

  if v_cell_id is null then
    raise exception using errcode = 'P0001', message = 'outside_coverage';
  end if;

  update public.online_reports
  set status = 'generating', error_code = null
  where id = p_report_id;

  return query
  select v_snapshot_id, v_cell_id, v_city_slug, v_report.latitude, v_report.longitude;
end;
$$;

create function private.summarize_report_zone(p_snapshot_id uuid, p_cell_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with target as (
    select cs.overall, cs.categories, g.city_id, c.slug, c.name
    from private.cell_scores cs
    join private.grid_cells g on g.id = cs.cell_id
    join public.cities c on c.id = g.city_id
    where cs.snapshot_id = p_snapshot_id and cs.cell_id = p_cell_id
  ),
  context as (
    select s.period, s.source_dates, s.stats -> 'cities' -> target.slug as city_stats, v.label, v.weights
    from public.score_snapshots s
    join public.scoring_versions v on v.id = s.scoring_version_id
    cross join target
    where s.id = p_snapshot_id
  ),
  peers as (
    select cs.overall, cs.categories
    from private.cell_scores cs
    join private.grid_cells g on g.id = cs.cell_id
    join target on target.city_id = g.city_id
    where cs.snapshot_id = p_snapshot_id and cs.is_residential is not false
  ),
  category_keys as (
    select key, position
    from unnest(array[
      'safety', 'accessibility', 'fifteen_minute', 'green', 'noise',
      'air', 'industry', 'education', 'health'
    ]) with ordinality as keys (key, position)
  ),
  per_category as (
    select
      category_keys.key,
      jsonb_build_object(
        'score', target.categories -> category_keys.key,
        'percentile', case when jsonb_typeof(target.categories -> category_keys.key) = 'number' then (
          select round(
            100.0 * count(*) filter (where (peers.categories ->> category_keys.key)::numeric < (target.categories ->> category_keys.key)::numeric)
              / nullif(count(*) filter (where jsonb_typeof(peers.categories -> category_keys.key) = 'number'), 0)
          )
          from peers
        ) end,
        'city_avg', context.city_stats -> 'categories' -> category_keys.key -> 'avg',
        'histogram', coalesce(context.city_stats -> 'categories' -> category_keys.key -> 'histogram', '[]'::jsonb),
        'weight', coalesce(context.weights -> category_keys.key, '0'::jsonb)
      ) as summary
    from category_keys
    cross join target
    cross join context
  )
  select jsonb_build_object(
    'schema_version', 1,
    'city', jsonb_build_object('slug', target.slug, 'name', target.name),
    'snapshot', jsonb_build_object('period', to_char(context.period, 'YYYY-MM-DD'), 'source_dates', context.source_dates),
    'formula', jsonb_build_object('label', context.label, 'weights', context.weights),
    'zone', jsonb_build_object(
      'score', target.overall,
      'percentile', case when target.overall is not null then (
        select round(100.0 * count(*) filter (where peers.overall < target.overall) / nullif(count(peers.overall), 0))
        from peers
      ) end,
      'city_avg', context.city_stats -> 'overall' -> 'avg',
      'histogram', coalesce(context.city_stats -> 'overall' -> 'histogram', '[]'::jsonb)
    ),
    'categories', (select jsonb_object_agg(per_category.key, per_category.summary) from per_category)
  )
  from target
  cross join context;
$$;

create function private.complete_online_report(
  p_report_id uuid,
  p_snapshot_id uuid,
  p_cell_id uuid,
  p_sections jsonb
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_summary jsonb;
begin
  if jsonb_typeof(p_sections) is distinct from 'object' then
    raise exception using errcode = 'P0001', message = 'report_sections_invalid';
  end if;

  v_summary := private.summarize_report_zone(p_snapshot_id, p_cell_id);
  if v_summary is null then
    raise exception using errcode = 'P0001', message = 'report_cell_not_scored';
  end if;

  update public.online_reports r
  set
    status = 'ready',
    snapshot_id = p_snapshot_id,
    scoring_version_id = s.scoring_version_id,
    overall_score = (v_summary -> 'zone' ->> 'score')::smallint,
    category_scores = (
      select coalesce(jsonb_object_agg(entry.key, entry.value -> 'score'), '{}'::jsonb)
      from jsonb_each(v_summary -> 'categories') as entry (key, value)
    ),
    result = p_sections || v_summary,
    error_code = null,
    generated_at = now()
  from public.score_snapshots s
  where r.id = p_report_id and s.id = p_snapshot_id and r.status = 'generating';

  if not found then
    raise exception using errcode = 'P0001', message = 'report_not_generating';
  end if;
end;
$$;

create function private.fail_online_report(p_report_id uuid, p_error_code text)
returns void
language sql
set search_path = ''
as $$
  update public.online_reports
  set status = 'failed', error_code = coalesce(nullif(p_error_code, ''), 'unknown')
  where id = p_report_id and status <> 'ready';
$$;
