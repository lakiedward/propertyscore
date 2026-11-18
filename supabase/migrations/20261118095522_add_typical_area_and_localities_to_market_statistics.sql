alter table private.market_area_statistics
  add column median_area_m2 numeric(7, 2) check (median_area_m2 > 0),
  add column is_nearby_locality boolean not null default false,
  add constraint market_area_statistics_locality_is_named check (
    not is_nearby_locality or zone_slug is not null
  );

comment on column private.market_area_statistics.median_area_m2 is 'Median useful area of the listings behind the figure, when the source publishes it.';

comment on column private.market_area_statistics.is_nearby_locality is 'True when the zone is a separate locality next to the city (a commune such as Dumbrăvița next to Timișoara), not one of its neighbourhoods.';

create or replace function private.insert_market_area_statistics(p_import_id uuid, p_rows jsonb)
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
    import_id, city_id, zone_slug, zone_name, is_nearby_locality, transaction, property_type,
    rooms_min, rooms_max, observed_on, listing_count, apartment_count, median_eur, p25_eur,
    p75_eur, median_eur_m2, p25_eur_m2, p75_eur_m2, median_area_m2, source_url
  )
  select distinct on (c.id, r.zone_slug, r.transaction, r.property_type, r.rooms_min, r.rooms_max)
    p_import_id, c.id, r.zone_slug, r.zone_name, coalesce(r.is_nearby_locality, false),
    r.transaction, r.property_type, r.rooms_min, r.rooms_max, r.observed_on, r.listing_count,
    r.apartment_count, r.median_eur, r.p25_eur, r.p75_eur, r.median_eur_m2, r.p25_eur_m2,
    r.p75_eur_m2, r.median_area_m2, r.source_url
  from jsonb_array_elements(p_rows) with ordinality as element (value, position)
  cross join lateral jsonb_to_record(element.value) as r (
    city text,
    zone_slug text,
    zone_name text,
    is_nearby_locality boolean,
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
    median_area_m2 numeric,
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

drop function private.market_area_statistics_at(uuid, timestamptz, date);

create function private.market_area_statistics_at(p_city_id uuid, p_cutoff timestamptz, p_from date)
returns table (
  source text,
  period date,
  zone_slug text,
  zone_name text,
  is_nearby_locality boolean,
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
  median_area_m2 numeric,
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
  select latest.source, latest.period, a.zone_slug, a.zone_name, a.is_nearby_locality,
    a.transaction, a.property_type, a.rooms_min, a.rooms_max, a.observed_on, a.listing_count,
    a.apartment_count, a.median_eur, a.p25_eur, a.p75_eur, a.median_eur_m2, a.p25_eur_m2,
    a.p75_eur_m2, a.median_area_m2, a.source_url
  from latest
  join private.market_area_statistics a on a.import_id = latest.id
  where a.city_id = p_city_id;
$$;

comment on function private.market_area_statistics_at(uuid, timestamptz, date) is 'The statistics of one city, its zones and the localities next to it as a report sees them: for each source, its latest monthly import completed before the cutoff and not older than p_from.';

create function private.market_city_sale_history(p_city_id uuid, p_cutoff timestamptz, p_from date)
returns table (source text, period date, median_eur_m2 numeric, source_url text)
language sql
stable
set search_path = ''
as $$
  select distinct on (i.source, i.period) i.source, i.period, a.median_eur_m2, a.source_url
  from private.market_imports i
  join private.market_area_statistics a on a.import_id = i.id
  where i.completed_at is not null
    and i.completed_at <= p_cutoff
    and i.period >= p_from
    and a.city_id = p_city_id
    and a.zone_slug is null
    and a.rooms_min is null
    and a.transaction = 'sale'
    and a.property_type = 'apartment'
    and a.median_eur_m2 is not null
  order by i.source, i.period, i.completed_at desc, i.id;
$$;

comment on function private.market_city_sale_history(uuid, timestamptz, date) is 'The median asking price per square metre of the apartments for sale in one city, month by month and source by source, from the imports completed before the cutoff and not older than p_from.';
