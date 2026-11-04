drop function private.market_comparables(uuid, timestamptz, private.market_transaction, date, date, double precision, double precision, integer);
drop function private.market_observations(uuid, timestamptz, private.market_transaction, date, date);

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
  floor smallint,
  construction_year smallint,
  price_eur numeric,
  first_seen_on date,
  last_seen_on date
)
language sql
stable
set search_path = ''
as $$
  select latest.id, latest.source, latest.location, latest.area_m2, latest.rooms, latest.floor,
    latest.construction_year, latest.price_eur, latest.first_seen_on, latest.last_seen_on
  from (
    select distinct on (i.source, l.source_listing_id)
      l.id, i.source, l.location, l.area_m2, l.rooms, l.floor, l.construction_year, l.price_eur,
      l.first_seen_on, l.last_seen_on
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
  floor smallint,
  construction_year smallint,
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
    o.floor,
    o.construction_year,
    o.price_eur,
    o.first_seen_on,
    o.last_seen_on
  from private.market_observations(p_city_id, p_cutoff, p_transaction, p_from, p_to) as o
  cross join origin
  where extensions.st_dwithin(o.location, origin.point, p_radius_m)
  order by extensions.st_distance(o.location, origin.point), o.listing_id;
$$;

update public.scoring_versions
set params = jsonb_set(
  jsonb_set(
    params,
    '{investment}',
    params -> 'investment' || '{"detail_filter_min_count": 12, "building_period_bounds": [1990, 2010]}'::jsonb
  ),
  '{seismic}',
  params -> 'seismic' || '{
    "building_periods": [
      {"key": "before_1963", "until_year": 1962, "codes": [], "question_codes": ["seismic_risk_class"]},
      {"key": "p13", "until_year": 1977, "codes": ["P13-63", "P13-70"], "question_codes": ["seismic_risk_class"]},
      {"key": "p100_1978", "until_year": 1991, "codes": ["P100-78", "P100-81", "P100-90"], "question_codes": []},
      {"key": "p100_1992", "until_year": 2006, "codes": ["P100-92"], "question_codes": []},
      {"key": "p100_2006", "until_year": null, "codes": ["P100-1/2006", "P100-1/2013"], "question_codes": []}
    ]
  }'::jsonb
) || jsonb_build_object(
  'questions',
  '{
    "always": ["bedroom_facade_side"],
    "unknown_construction_year": "construction_year",
    "stairs": {"min_floor": 3, "code": "stairs_without_elevator"},
    "ground_floor": "ground_floor_damp_and_security",
    "top_floor": "top_floor_roof_and_insulation"
  }'::jsonb
)
where kind = 'online' and label = 'v1';
