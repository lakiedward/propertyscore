alter type private.market_import_content add value 'area_statistics';

comment on column private.market_imports.content is 'What the import holds: individual listings (market_listings), averages a source publishes per city, filled by hand (market_city_averages), or the statistics a source publishes per city and zone, read by the worker (market_area_statistics).';

create table private.market_area_statistics (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references private.market_imports (id) on delete cascade,
  city_id uuid not null references public.cities (id) on delete cascade,
  zone_slug text check (zone_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(zone_slug) <= 80),
  zone_name text check (char_length(zone_name) between 1 and 120),
  transaction private.market_transaction not null,
  property_type private.market_property_type not null,
  rooms_min smallint check (rooms_min between 1 and 20),
  rooms_max smallint check (rooms_max between 1 and 20),
  observed_on date,
  listing_count integer check (listing_count >= 0),
  apartment_count integer check (apartment_count >= 0),
  median_eur numeric(12, 2) check (median_eur > 0),
  p25_eur numeric(12, 2) check (p25_eur > 0),
  p75_eur numeric(12, 2) check (p75_eur > 0),
  median_eur_m2 numeric(12, 2) check (median_eur_m2 > 0),
  p25_eur_m2 numeric(12, 2) check (p25_eur_m2 > 0),
  p75_eur_m2 numeric(12, 2) check (p75_eur_m2 > 0),
  source_url text not null check (source_url ~ '^https://' and char_length(source_url) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint market_area_statistics_zone_named check ((zone_slug is null) = (zone_name is null)),
  constraint market_area_statistics_rooms_in_order check (
    rooms_max is null or (rooms_min is not null and rooms_max >= rooms_min)
  ),
  constraint market_area_statistics_has_figure check (
    median_eur is not null or median_eur_m2 is not null
  ),
  constraint market_area_statistics_intervals_in_order check (
    (p25_eur is null) = (p75_eur is null)
    and (p25_eur_m2 is null) = (p75_eur_m2 is null)
    and (p25_eur is null or p25_eur <= p75_eur)
    and (p25_eur_m2 is null or p25_eur_m2 <= p75_eur_m2)
  ),
  constraint market_area_statistics_import_key unique nulls not distinct (
    import_id, city_id, zone_slug, transaction, property_type, rooms_min, rooms_max
  )
);

comment on table private.market_area_statistics is 'Asking-price statistics a source publishes for a city or one of its zones (medians and the p25–p75 interval, never individual listings), as one monthly import read them, each with the page or file it comes from. Zone: null for the whole city. Rooms: both bounds null for every size, rooms_max null for "rooms_min or more".';

comment on column private.market_area_statistics.observed_on is 'The day the source says the figure describes; null when the source dates it only by month (the period of its import).';

comment on column private.market_area_statistics.median_eur is 'Median asking price of a sale, median asking rent per month of a rent.';

create index market_area_statistics_city_idx
  on private.market_area_statistics (city_id, transaction, zone_slug);
create index market_area_statistics_import_id_idx on private.market_area_statistics (import_id);

alter table private.market_area_statistics enable row level security;

create trigger market_area_statistics_set_updated_at
  before update on private.market_area_statistics
  for each row execute function private.set_updated_at();

revoke all on private.market_area_statistics from anon, authenticated;

create function private.insert_market_area_statistics(p_import_id uuid, p_rows jsonb)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_inserted integer;
begin
  if not exists (
    select 1
    from private.market_imports i
    where i.id = p_import_id and i.completed_at is null and i.content::text = 'area_statistics'
  ) then
    raise exception using errcode = 'P0001', message = 'market_import_not_open';
  end if;

  insert into private.market_area_statistics (
    import_id, city_id, zone_slug, zone_name, transaction, property_type, rooms_min, rooms_max,
    observed_on, listing_count, apartment_count, median_eur, p25_eur, p75_eur,
    median_eur_m2, p25_eur_m2, p75_eur_m2, source_url
  )
  select distinct on (c.id, r.zone_slug, r.transaction, r.property_type, r.rooms_min, r.rooms_max)
    p_import_id, c.id, r.zone_slug, r.zone_name, r.transaction, r.property_type, r.rooms_min,
    r.rooms_max, r.observed_on, r.listing_count, r.apartment_count, r.median_eur, r.p25_eur,
    r.p75_eur, r.median_eur_m2, r.p25_eur_m2, r.p75_eur_m2, r.source_url
  from jsonb_array_elements(p_rows) with ordinality as element (value, position)
  cross join lateral jsonb_to_record(element.value) as r (
    city text,
    zone_slug text,
    zone_name text,
    transaction private.market_transaction,
    property_type private.market_property_type,
    rooms_min smallint,
    rooms_max smallint,
    observed_on date,
    listing_count integer,
    apartment_count integer,
    median_eur numeric,
    p25_eur numeric,
    p75_eur numeric,
    median_eur_m2 numeric,
    p25_eur_m2 numeric,
    p75_eur_m2 numeric,
    source_url text
  )
  join public.cities c on c.slug = r.city and c.has_online_coverage
  order by c.id, r.zone_slug, r.transaction, r.property_type, r.rooms_min, r.rooms_max,
    element.position
  on conflict on constraint market_area_statistics_import_key do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

create function private.market_area_statistics_at(p_city_id uuid, p_cutoff timestamptz, p_from date)
returns table (
  source text,
  period date,
  zone_slug text,
  zone_name text,
  transaction private.market_transaction,
  property_type private.market_property_type,
  rooms_min smallint,
  rooms_max smallint,
  observed_on date,
  listing_count integer,
  apartment_count integer,
  median_eur numeric,
  p25_eur numeric,
  p75_eur numeric,
  median_eur_m2 numeric,
  p25_eur_m2 numeric,
  p75_eur_m2 numeric,
  source_url text
)
language sql
stable
set search_path = ''
as $$
  with latest as (
    select distinct on (i.source) i.id, i.source, i.period
    from private.market_imports i
    where i.completed_at is not null
      and i.completed_at <= p_cutoff
      and i.period >= p_from
      and exists (
        select 1
        from private.market_area_statistics a
        where a.import_id = i.id and a.city_id = p_city_id
      )
    order by i.source, i.period desc, i.completed_at desc, i.id
  )
  select latest.source, latest.period, a.zone_slug, a.zone_name, a.transaction, a.property_type,
    a.rooms_min, a.rooms_max, a.observed_on, a.listing_count, a.apartment_count, a.median_eur,
    a.p25_eur, a.p75_eur, a.median_eur_m2, a.p25_eur_m2, a.p75_eur_m2, a.source_url
  from latest
  join private.market_area_statistics a on a.import_id = latest.id
  where a.city_id = p_city_id;
$$;

comment on function private.market_area_statistics_at(uuid, timestamptz, date) is 'The statistics of one city and its zones as a report sees them: for each source, its latest monthly import completed before the cutoff and not older than p_from.';
