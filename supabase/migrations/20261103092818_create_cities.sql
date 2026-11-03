create extension if not exists postgis with schema extensions;

create table public.cities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null collate "ro-x-icu" check (char_length(name) between 1 and 80),
  county text not null check (char_length(county) between 1 and 80),
  center extensions.geography(Point, 4326) not null,
  boundary extensions.geography(MultiPolygon, 4326) not null,
  has_online_coverage boolean not null default false,
  has_field_team boolean not null default false,
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.cities is 'Cities PropertyScore serves; boundary is the coverage area the SmartCheck grid is built on.';

create index cities_boundary_idx on public.cities using gist (boundary);
create index cities_position_idx on public.cities (position);

alter table public.cities enable row level security;

create trigger cities_set_updated_at
  before update on public.cities
  for each row execute function private.set_updated_at();

revoke all on public.cities from anon, authenticated;
grant select on public.cities to anon, authenticated;

create policy "Visitors can read cities"
  on public.cities for select to anon
  using (true);

create policy "Signed-in users can read cities"
  on public.cities for select to authenticated
  using (true);

insert into public.cities (slug, name, county, center, boundary, has_online_coverage, position)
select
  seed.slug,
  seed.name,
  seed.county,
  extensions.st_point(seed.longitude, seed.latitude, 4326)::extensions.geography,
  extensions.st_multi(
    extensions.st_buffer(
      extensions.st_point(seed.longitude, seed.latitude, 4326)::extensions.geography,
      seed.coverage_radius_m
    )::extensions.geometry
  )::extensions.geography,
  true,
  seed.position
from (
  values
    ('timisoara', 'Timișoara', 'Timiș', 45.75372, 21.22571, 7000, 1),
    ('bucuresti', 'București', 'București', 44.42677, 26.10254, 13000, 2),
    ('cluj-napoca', 'Cluj-Napoca', 'Cluj', 46.77121, 23.62364, 7000, 3),
    ('iasi', 'Iași', 'Iași', 47.15845, 27.60144, 7000, 4),
    ('constanta', 'Constanța', 'Constanța', 44.15981, 28.63483, 8000, 5),
    ('craiova', 'Craiova', 'Dolj', 44.33018, 23.79488, 6000, 6),
    ('sibiu', 'Sibiu', 'Sibiu', 45.79833, 24.12558, 5000, 7),
    ('oradea', 'Oradea', 'Bihor', 47.04650, 21.91894, 6000, 8),
    ('targu-mures', 'Târgu Mureș', 'Mureș', 46.54245, 24.55747, 5000, 9)
) as seed (slug, name, county, latitude, longitude, coverage_radius_m, position);
