drop function private.list_cnas_providers(uuid, date);

create function private.list_cnas_providers(p_city_id uuid, p_on date)
returns table (
  id uuid,
  kind private.cnas_provider_kind,
  name text,
  address text,
  list_date date,
  longitude double precision,
  latitude double precision
)
language sql
stable
set search_path = ''
as $$
  with latest as (
    select p.kind, max(p.list_date) as list_date
    from private.cnas_providers p
    where p.city_id = p_city_id and p.list_date <= p_on
    group by p.kind
  )
  select
    p.id,
    p.kind,
    p.name,
    p.address,
    p.list_date,
    extensions.st_x(p.location::extensions.geometry),
    extensions.st_y(p.location::extensions.geometry)
  from private.cnas_providers p
  join latest on latest.kind = p.kind and latest.list_date = p.list_date
  where p.city_id = p_city_id
  order by p.kind, p.name, p.id;
$$;
