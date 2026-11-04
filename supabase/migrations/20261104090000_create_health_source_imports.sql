create function private.replace_cnas_providers(
  p_city_id uuid,
  p_kind private.cnas_provider_kind,
  p_list_date date,
  p_source_ref text,
  p_rows jsonb
)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_count integer;
begin
  if not exists (select 1 from public.cities c where c.id = p_city_id) then
    raise exception using errcode = 'P0001', message = 'city_not_found';
  end if;

  delete from private.cnas_providers p
  where p.city_id = p_city_id and p.kind = p_kind and p.list_date = p_list_date;

  insert into private.cnas_providers (city_id, kind, name, address, list_date, source_ref)
  select p_city_id, p_kind, r.name, nullif(r.address, ''), p_list_date, p_source_ref
  from jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb)) as r (name text, address text);

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

comment on function private.replace_cnas_providers(uuid, private.cnas_provider_kind, date, text, jsonb) is 'Replaces one CAS list (city, provider kind, list date) with the rows read from its file; locations stay null until a snapshot geocodes the addresses.';

create function private.sync_emergency_hospitals(p_city_id uuid, p_valid_from date, p_rows jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_unchanged uuid[];
  v_removed integer;
  v_closed integer;
  v_inserted integer;
begin
  if not exists (select 1 from public.cities c where c.id = p_city_id) then
    raise exception using errcode = 'P0001', message = 'city_not_found';
  end if;

  with incoming as (
    select r.name, r.level::private.emergency_level as level, r.is_pediatric, r.source_ref,
      extensions.st_point(r.lng, r.lat, 4326)::extensions.geography as location
    from jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb)) as r (
      name text, level text, is_pediatric boolean, source_ref text, lng double precision, lat double precision
    )
  ),
  unchanged as (
    update private.emergency_hospitals h
    set source_ref = i.source_ref
    from incoming i
    where h.city_id = p_city_id
      and h.valid_to is null
      and i.name = h.name
      and i.level = h.level
      and i.is_pediatric = h.is_pediatric
      and extensions.st_dwithin(i.location, h.location, 100)
    returning h.id
  )
  select coalesce(array_agg(u.id), '{}')
  into v_unchanged
  from unchanged u;

  delete from private.emergency_hospitals h
  where h.city_id = p_city_id
    and h.valid_to is null
    and h.valid_from >= p_valid_from
    and h.id <> all (v_unchanged);
  get diagnostics v_removed = row_count;

  update private.emergency_hospitals h
  set valid_to = p_valid_from
  where h.city_id = p_city_id
    and h.valid_to is null
    and h.id <> all (v_unchanged);
  get diagnostics v_closed = row_count;

  insert into private.emergency_hospitals (city_id, name, location, level, is_pediatric, source_ref, valid_from)
  select p_city_id, r.name, extensions.st_point(r.lng, r.lat, 4326)::extensions.geography,
    r.level::private.emergency_level, r.is_pediatric, r.source_ref, p_valid_from
  from jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb)) as r (
    name text, level text, is_pediatric boolean, source_ref text, lng double precision, lat double precision
  )
  where not exists (
    select 1
    from private.emergency_hospitals h
    where h.id = any (v_unchanged)
      and h.name = r.name
      and h.level = r.level::private.emergency_level
      and h.is_pediatric = r.is_pediatric
      and extensions.st_dwithin(h.location, extensions.st_point(r.lng, r.lat, 4326)::extensions.geography, 100)
  );
  get diagnostics v_inserted = row_count;

  return jsonb_build_object('kept', cardinality(v_unchanged), 'closed', v_removed + v_closed, 'inserted', v_inserted);
end;
$$;

comment on function private.sync_emergency_hospitals(uuid, date, jsonb) is 'Makes the open UPU/CPU units of a city match an imported list: unchanged units stay open, the others close on p_valid_from (or are removed when they opened that day or later) and new ones open on p_valid_from.';
