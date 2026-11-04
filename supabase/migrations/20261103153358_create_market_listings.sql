create type private.market_transaction as enum ('sale', 'rent');

create type private.market_property_type as enum ('apartment', 'house');

create table private.market_imports (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source ~ '^[a-z][a-z0-9_]{1,39}$'),
  period date not null check (period = date_trunc('month', period)::date),
  file_sha256 text not null check (file_sha256 ~ '^[0-9a-f]{64}$'),
  eur_ron_rate numeric(8, 4) check (eur_ron_rate > 0),
  accepted_count integer not null default 0 check (accepted_count >= 0),
  rejected jsonb not null default '{}' check (jsonb_typeof(rejected) = 'object'),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint market_imports_source_file_key unique (source, file_sha256)
);

comment on table private.market_imports is 'One row per listings export imported for the Investment context; only completed imports are read, and a report reads the imports completed before its snapshot was ready.';

create index market_imports_completed_at_idx on private.market_imports (completed_at);

alter table private.market_imports enable row level security;

create trigger market_imports_set_updated_at
  before update on private.market_imports
  for each row execute function private.set_updated_at();

revoke all on private.market_imports from anon, authenticated;

create table private.market_listings (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references private.market_imports (id) on delete cascade,
  source_listing_id text not null check (char_length(source_listing_id) between 1 and 200),
  transaction private.market_transaction not null,
  property_type private.market_property_type not null,
  city_id uuid not null references public.cities (id) on delete cascade,
  location extensions.geography(Point, 4326) not null,
  area_m2 numeric(6, 1) not null check (area_m2 > 0),
  rooms smallint check (rooms between 1 and 20),
  price numeric(12, 2) not null check (price > 0),
  currency text not null check (currency in ('RON', 'EUR')),
  price_eur numeric(12, 2) not null check (price_eur > 0),
  first_seen_on date not null,
  last_seen_on date not null,
  construction_year smallint check (construction_year between 1800 and 2100),
  floor smallint check (floor between -2 and 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint market_listings_import_listing_key unique (import_id, source_listing_id),
  constraint market_listings_seen_in_order check (last_seen_on >= first_seen_on)
);

comment on table private.market_listings is 'Sale and rent listings as one import saw them (asking prices, not transactions); append-only per import so a report can be generated again with the same figures.';

create index market_listings_location_idx on private.market_listings using gist (location);
create index market_listings_city_idx on private.market_listings (city_id, transaction, last_seen_on);
create index market_listings_import_id_idx on private.market_listings (import_id);

alter table private.market_listings enable row level security;

create trigger market_listings_set_updated_at
  before update on private.market_listings
  for each row execute function private.set_updated_at();

revoke all on private.market_listings from anon, authenticated;

create function private.insert_market_listings(p_import_id uuid, p_city_buffer_m integer, p_rows jsonb)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_inserted integer;
begin
  if not exists (
    select 1 from private.market_imports i where i.id = p_import_id and i.completed_at is null
  ) then
    raise exception using errcode = 'P0001', message = 'market_import_not_open';
  end if;

  with incoming as (
    select
      r.*,
      extensions.st_point(r.longitude, r.latitude, 4326)::extensions.geography as location
    from jsonb_to_recordset(p_rows) as r (
      source_listing_id text,
      transaction private.market_transaction,
      property_type private.market_property_type,
      longitude double precision,
      latitude double precision,
      area_m2 numeric,
      rooms smallint,
      price numeric,
      currency text,
      price_eur numeric,
      first_seen_on date,
      last_seen_on date,
      construction_year smallint,
      floor smallint
    )
  ),
  placed as (
    select
      incoming.*,
      (
        select c.id
        from public.cities c
        where c.has_online_coverage
          and extensions.st_dwithin(c.boundary, incoming.location, p_city_buffer_m)
        order by extensions.st_distance(c.boundary, incoming.location), c.position
        limit 1
      ) as city_id
    from incoming
  )
  insert into private.market_listings (
    import_id, source_listing_id, transaction, property_type, city_id, location, area_m2, rooms,
    price, currency, price_eur, first_seen_on, last_seen_on, construction_year, floor
  )
  select
    p_import_id, placed.source_listing_id, placed.transaction, placed.property_type, placed.city_id,
    placed.location, placed.area_m2, placed.rooms, placed.price, placed.currency, placed.price_eur,
    placed.first_seen_on, placed.last_seen_on, placed.construction_year, placed.floor
  from placed
  where placed.city_id is not null
  on conflict (import_id, source_listing_id) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

create function private.market_observations(
  p_city_id uuid,
  p_cutoff timestamptz,
  p_transaction private.market_transaction,
  p_from date,
  p_to date
)
returns table (
  listing_id uuid,
  source text,
  location extensions.geography,
  area_m2 numeric,
  rooms smallint,
  price_eur numeric,
  first_seen_on date,
  last_seen_on date
)
language sql
stable
set search_path = ''
as $$
  select latest.id, latest.source, latest.location, latest.area_m2, latest.rooms, latest.price_eur,
    latest.first_seen_on, latest.last_seen_on
  from (
    select distinct on (i.source, l.source_listing_id)
      l.id, i.source, l.location, l.area_m2, l.rooms, l.price_eur, l.first_seen_on, l.last_seen_on
    from private.market_listings l
    join private.market_imports i on i.id = l.import_id
    where l.city_id = p_city_id
      and l.transaction = p_transaction
      and l.property_type = 'apartment'
      and i.completed_at is not null
      and i.completed_at <= p_cutoff
      and l.last_seen_on <= p_to
    order by i.source, l.source_listing_id, i.period desc, i.completed_at desc
  ) as latest
  where latest.last_seen_on >= p_from;
$$;

create function private.market_reference_date(p_city_id uuid, p_cutoff timestamptz)
returns date
language sql
stable
set search_path = ''
as $$
  select max(l.last_seen_on)
  from private.market_listings l
  join private.market_imports i on i.id = l.import_id
  where l.city_id = p_city_id
    and l.property_type = 'apartment'
    and i.completed_at is not null
    and i.completed_at <= p_cutoff;
$$;

create function private.market_comparables(
  p_city_id uuid,
  p_cutoff timestamptz,
  p_transaction private.market_transaction,
  p_from date,
  p_to date,
  p_longitude double precision,
  p_latitude double precision,
  p_radius_m integer
)
returns table (
  listing_id uuid,
  source text,
  longitude double precision,
  latitude double precision,
  distance_m double precision,
  area_m2 numeric,
  rooms smallint,
  price_eur numeric,
  first_seen_on date,
  last_seen_on date
)
language sql
stable
set search_path = ''
as $$
  with origin as (
    select extensions.st_point(p_longitude, p_latitude, 4326)::extensions.geography as point
  )
  select
    o.listing_id,
    o.source,
    extensions.st_x(o.location::extensions.geometry),
    extensions.st_y(o.location::extensions.geometry),
    extensions.st_distance(o.location, origin.point),
    o.area_m2,
    o.rooms,
    o.price_eur,
    o.first_seen_on,
    o.last_seen_on
  from private.market_observations(p_city_id, p_cutoff, p_transaction, p_from, p_to) as o
  cross join origin
  where extensions.st_dwithin(o.location, origin.point, p_radius_m)
  order by extensions.st_distance(o.location, origin.point), o.listing_id;
$$;

create function private.market_city_summary(
  p_city_id uuid,
  p_cutoff timestamptz,
  p_from date,
  p_to date,
  p_gone_before date
)
returns table (
  transaction private.market_transaction,
  listing_count integer,
  p05_eur_m2 double precision,
  p25_eur_m2 double precision,
  p50_eur_m2 double precision,
  p75_eur_m2 double precision,
  p95_eur_m2 double precision,
  p50_eur double precision,
  gone_count integer,
  p50_days_listed double precision
)
language sql
stable
set search_path = ''
as $$
  select
    t.transaction,
    count(o.listing_id)::integer,
    percentile_cont(0.05) within group (order by (o.price_eur / o.area_m2)::double precision),
    percentile_cont(0.25) within group (order by (o.price_eur / o.area_m2)::double precision),
    percentile_cont(0.5) within group (order by (o.price_eur / o.area_m2)::double precision),
    percentile_cont(0.75) within group (order by (o.price_eur / o.area_m2)::double precision),
    percentile_cont(0.95) within group (order by (o.price_eur / o.area_m2)::double precision),
    percentile_cont(0.5) within group (order by o.price_eur::double precision),
    count(o.listing_id) filter (where o.last_seen_on < p_gone_before)::integer,
    percentile_cont(0.5) within group (order by (o.last_seen_on - o.first_seen_on)::double precision)
      filter (where o.last_seen_on < p_gone_before)
  from unnest(enum_range(null::private.market_transaction)) as t (transaction)
  left join lateral private.market_observations(p_city_id, p_cutoff, t.transaction, p_from, p_to) as o
    on true
  group by t.transaction
  order by t.transaction;
$$;

update public.scoring_versions
set params = params || jsonb_build_object(
  'investment',
  '{
    "window_days": 90,
    "radii_m": [800, 1200, 2000],
    "sale_min_count": 20,
    "rent_min_count": 12,
    "city_min_count": 5,
    "rooms_filter_min_count": 12,
    "rent_same_rooms_min_count": 8,
    "change_min_count": 20,
    "outlier_iqr_factor": 1.5,
    "histogram_bin_eur_m2": 200,
    "histogram_max_bins": 10,
    "gone_after_days": 14,
    "days_listed_min_count": 10,
    "city_buffer_m": 2000,
    "duplicate": {"distance_m": 75, "area_ratio": 0.02, "price_ratio": 0.03},
    "plausible": {
      "area_m2": [12, 400],
      "rooms": [1, 10],
      "sale_eur_m2": [300, 8000],
      "rent_eur_m2": [2, 40]
    }
  }'::jsonb
)
where kind = 'online' and label = 'v1';
