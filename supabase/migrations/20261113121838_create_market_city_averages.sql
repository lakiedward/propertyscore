create type private.market_import_content as enum ('listings', 'city_averages');

alter table private.market_imports
  add column content private.market_import_content not null default 'listings';

comment on column private.market_imports.content is 'What the imported file holds: individual listings (market_listings) or averages a source publishes per city (market_city_averages).';

create table private.market_city_averages (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references private.market_imports (id) on delete cascade,
  city_id uuid not null references public.cities (id) on delete cascade,
  period date not null check (period = date_trunc('month', period)::date),
  transaction private.market_transaction not null,
  property_type private.market_property_type not null,
  rooms_min smallint check (rooms_min between 1 and 20),
  rooms_max smallint check (rooms_max between 1 and 20),
  price_m2 numeric(12, 2) check (price_m2 > 0),
  price_month numeric(12, 2) check (price_month > 0),
  currency text not null check (currency in ('RON', 'EUR')),
  eur_m2 numeric(12, 2) check (eur_m2 > 0),
  eur_month numeric(12, 2) check (eur_month > 0),
  source_url text check (source_url ~ '^https://' and char_length(source_url) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint market_city_averages_rooms_in_order check (
    rooms_max is null or (rooms_min is not null and rooms_max >= rooms_min)
  ),
  constraint market_city_averages_priced check (
    (price_m2 is null) = (eur_m2 is null)
    and (price_month is null) = (eur_month is null)
    and (eur_m2 is not null or eur_month is not null)
  ),
  constraint market_city_averages_sale_per_m2 check (
    transaction = 'rent' or (eur_m2 is not null and eur_month is null)
  ),
  constraint market_city_averages_import_key unique nulls not distinct (
    import_id, city_id, period, transaction, property_type, rooms_min, rooms_max
  )
);

comment on table private.market_city_averages is 'Asking prices and rents a source publishes per city and month (for example a monthly price index), imported by hand from a file; the Investment context falls back to them, marked as city averages, when no listings cover the address. Rooms: both bounds null for every size, rooms_max null for "rooms_min or more".';

create index market_city_averages_city_idx
  on private.market_city_averages (city_id, transaction, period);
create index market_city_averages_import_id_idx on private.market_city_averages (import_id);

alter table private.market_city_averages enable row level security;

create trigger market_city_averages_set_updated_at
  before update on private.market_city_averages
  for each row execute function private.set_updated_at();

revoke all on private.market_city_averages from anon, authenticated;

create function private.insert_market_city_averages(p_import_id uuid, p_rows jsonb)
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
    where i.id = p_import_id and i.completed_at is null and i.content = 'city_averages'
  ) then
    raise exception using errcode = 'P0001', message = 'market_import_not_open';
  end if;

  insert into private.market_city_averages (
    import_id, city_id, period, transaction, property_type, rooms_min, rooms_max,
    price_m2, price_month, currency, eur_m2, eur_month, source_url
  )
  select distinct on (c.id, r.period, r.transaction, r.property_type, r.rooms_min, r.rooms_max)
    p_import_id, c.id, r.period, r.transaction, r.property_type, r.rooms_min, r.rooms_max,
    r.price_m2, r.price_month, r.currency, r.eur_m2, r.eur_month, r.source_url
  from jsonb_array_elements(p_rows) with ordinality as element (value, position)
  cross join lateral jsonb_to_record(element.value) as r (
    city text,
    period date,
    transaction private.market_transaction,
    property_type private.market_property_type,
    rooms_min smallint,
    rooms_max smallint,
    price_m2 numeric,
    price_month numeric,
    currency text,
    eur_m2 numeric,
    eur_month numeric,
    source_url text
  )
  join public.cities c on c.slug = r.city and c.has_online_coverage
  order by c.id, r.period, r.transaction, r.property_type, r.rooms_min, r.rooms_max, element.position
  on conflict on constraint market_city_averages_import_key do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

create function private.market_city_averages_at(p_city_id uuid, p_cutoff timestamptz, p_from date)
returns table (
  source text,
  period date,
  transaction private.market_transaction,
  property_type private.market_property_type,
  rooms_min smallint,
  rooms_max smallint,
  eur_m2 numeric,
  eur_month numeric,
  source_url text
)
language sql
stable
set search_path = ''
as $$
  select distinct on (i.source, a.period, a.transaction, a.property_type, a.rooms_min, a.rooms_max)
    i.source, a.period, a.transaction, a.property_type, a.rooms_min, a.rooms_max,
    a.eur_m2, a.eur_month, a.source_url
  from private.market_city_averages a
  join private.market_imports i on i.id = a.import_id
  where a.city_id = p_city_id
    and i.completed_at is not null
    and i.completed_at <= p_cutoff
    and a.period >= p_from
    and a.period <= p_cutoff::date
  order by i.source, a.period, a.transaction, a.property_type, a.rooms_min, a.rooms_max,
    i.completed_at desc, i.id;
$$;
