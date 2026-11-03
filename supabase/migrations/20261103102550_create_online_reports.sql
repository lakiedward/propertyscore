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
