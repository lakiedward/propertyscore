create table private.education_institutions (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities (id) on delete cascade,
  siiir_code text unique check (char_length(siiir_code) between 1 and 40),
  parent_siiir_code text check (char_length(parent_siiir_code) between 1 and 40),
  osm_ref text unique check (osm_ref ~ '^osm:(node|way|relation)/[0-9]+$'),
  name text check (char_length(name) between 1 and 300),
  levels private.education_level[] not null check (cardinality(levels) between 1 and 6),
  ownership text not null default 'unknown' check (ownership in ('public', 'private', 'unknown')),
  teaching_languages text[],
  address_text text check (char_length(address_text) between 1 and 500),
  location extensions.geography(Point, 4326),
  location_precision text check (location_precision in ('osm', 'geocoded', 'manual')),
  match_status text not null check (match_status in ('matched', 'siiir_only', 'osm_only', 'manual', 'excluded')),
  source_date date,
  last_seen_on date not null,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint education_institutions_has_source check (siiir_code is not null or osm_ref is not null),
  constraint education_institutions_precision_with_location check ((location is null) = (location_precision is null)),
  constraint education_institutions_placed_unless_register_only check (
    location is not null or match_status in ('siiir_only', 'excluded')
  ),
  constraint education_institutions_matched_has_both check (
    match_status <> 'matched' or (siiir_code is not null and osm_ref is not null)
  ),
  constraint education_institutions_review_complete check ((reviewed_by is null) or (reviewed_at is not null))
);

comment on table private.education_institutions is 'Register of schools and kindergartens kept between snapshots: the Ministry of Education list (SIIIR) matched to OpenStreetMap positions, with manual review decisions.';

create index education_institutions_city_id_idx on private.education_institutions (city_id, last_seen_on);
create index education_institutions_location_idx on private.education_institutions using gist (location);
create index education_institutions_reviewed_by_idx on private.education_institutions (reviewed_by);

alter table private.education_institutions enable row level security;

revoke all on private.education_institutions from anon, authenticated;

create trigger education_institutions_set_updated_at
  before update on private.education_institutions
  for each row execute function private.set_updated_at();

create function private.upsert_education_institutions(p_city_id uuid, p_seen_on date, p_rows jsonb)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_row record;
  v_existing private.education_institutions%rowtype;
  v_location extensions.geography;
  v_osm_ref text;
  v_precision text;
  v_match_status text;
  v_count integer := 0;
begin
  if not exists (select 1 from public.cities c where c.id = p_city_id) then
    raise exception using errcode = 'P0001', message = 'city_not_found';
  end if;

  for v_row in
    select *
    from jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb)) as r (
      siiir_code text,
      parent_siiir_code text,
      osm_ref text,
      name text,
      levels private.education_level[],
      ownership text,
      teaching_languages text[],
      address_text text,
      lng double precision,
      lat double precision,
      location_precision text,
      match_status text,
      source_date date
    )
  loop
    v_location := case
      when v_row.lng is null or v_row.lat is null then null
      else extensions.st_point(v_row.lng, v_row.lat, 4326)::extensions.geography
    end;

    v_existing := null;
    if v_row.siiir_code is not null then
      select * into v_existing from private.education_institutions i where i.siiir_code = v_row.siiir_code;
    end if;
    if v_existing.id is null and v_row.osm_ref is not null then
      select * into v_existing from private.education_institutions i
      where i.osm_ref = v_row.osm_ref and (i.siiir_code is null or v_row.siiir_code is null);
    end if;

    v_osm_ref := v_row.osm_ref;
    v_match_status := v_row.match_status;
    v_precision := v_row.location_precision;

    if v_osm_ref is not null then
      delete from private.education_institutions i
      where i.osm_ref = v_osm_ref
        and i.id is distinct from v_existing.id
        and i.siiir_code is null
        and i.reviewed_at is null;

      update private.education_institutions i
      set osm_ref = null, location = null, location_precision = null, match_status = 'siiir_only'
      where i.osm_ref = v_osm_ref
        and i.id is distinct from v_existing.id
        and i.siiir_code is not null
        and i.reviewed_at is null;

      if exists (
        select 1 from private.education_institutions i
        where i.osm_ref = v_osm_ref and i.id is distinct from v_existing.id
      ) then
        v_osm_ref := null;
        v_location := null;
        v_precision := null;
        if v_match_status = 'matched' then
          v_match_status := 'siiir_only';
        end if;
      end if;
    end if;

    if v_osm_ref is null and v_row.siiir_code is null then
      continue;
    end if;

    if v_existing.id is null then
      insert into private.education_institutions (
        city_id, siiir_code, parent_siiir_code, osm_ref, name, levels, ownership,
        teaching_languages, address_text, location, location_precision, match_status,
        source_date, last_seen_on
      )
      values (
        p_city_id, v_row.siiir_code, v_row.parent_siiir_code, v_osm_ref, v_row.name,
        v_row.levels, coalesce(v_row.ownership, 'unknown'), v_row.teaching_languages,
        v_row.address_text, v_location, v_precision, v_match_status,
        v_row.source_date, p_seen_on
      );
    elsif v_existing.reviewed_at is not null then
      update private.education_institutions i
      set
        siiir_code = coalesce(i.siiir_code, v_row.siiir_code),
        name = coalesce(v_row.name, i.name),
        parent_siiir_code = coalesce(v_row.parent_siiir_code, i.parent_siiir_code),
        levels = v_row.levels,
        ownership = coalesce(v_row.ownership, i.ownership),
        teaching_languages = coalesce(v_row.teaching_languages, i.teaching_languages),
        address_text = coalesce(v_row.address_text, i.address_text),
        source_date = coalesce(v_row.source_date, i.source_date),
        last_seen_on = p_seen_on
      where i.id = v_existing.id;
    else
      update private.education_institutions i
      set
        city_id = p_city_id,
        siiir_code = coalesce(v_row.siiir_code, i.siiir_code),
        parent_siiir_code = v_row.parent_siiir_code,
        osm_ref = v_osm_ref,
        name = v_row.name,
        levels = v_row.levels,
        ownership = coalesce(v_row.ownership, 'unknown'),
        teaching_languages = v_row.teaching_languages,
        address_text = v_row.address_text,
        location = v_location,
        location_precision = v_precision,
        match_status = v_match_status,
        source_date = v_row.source_date,
        last_seen_on = p_seen_on
      where i.id = v_existing.id;
    end if;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

create function private.education_poi_category(p_level private.education_level)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_level
    when 'nursery' then 'education_nursery'
    when 'kindergarten' then 'education_kindergarten'
    when 'primary' then 'education_school'
    when 'lower_secondary' then 'education_school'
    when 'upper_secondary' then 'education_high_school'
    when 'university' then 'education_university'
  end;
$$;

create function private.copy_education_pois(p_snapshot_id uuid, p_city_id uuid, p_seen_on date)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_count integer;
begin
  insert into private.poi_features (snapshot_id, city_id, source_ref, category, name, location, tags)
  select distinct on (i.id, private.education_poi_category(level.value))
    p_snapshot_id,
    i.city_id,
    coalesce('siiir:' || i.siiir_code, i.osm_ref),
    private.education_poi_category(level.value),
    i.name,
    i.location,
    jsonb_build_object(
      'institution_id', i.id,
      'siiir_code', i.siiir_code,
      'entity', coalesce(i.parent_siiir_code, i.siiir_code, i.id::text),
      'levels', to_jsonb(i.levels),
      'ownership', i.ownership,
      'location_precision', i.location_precision
    )
  from private.education_institutions i
  cross join lateral unnest(i.levels) as level (value)
  where i.city_id = p_city_id
    and (i.last_seen_on = p_seen_on or i.reviewed_at is not null)
    and i.location is not null
    and i.match_status <> 'excluded'
  on conflict (snapshot_id, source_ref, category) do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create function private.education_candidates(
  p_snapshot_id uuid,
  p_city_id uuid,
  p_category text,
  p_radius_m double precision,
  p_limit integer
)
returns table (
  cell_id uuid,
  cell_lng double precision,
  cell_lat double precision,
  poi_id uuid,
  poi_lng double precision,
  poi_lat double precision,
  institution_id uuid,
  entity text,
  straight_m double precision
)
language sql
stable
set search_path = ''
as $$
  select
    g.id,
    extensions.st_x(g.center::extensions.geometry),
    extensions.st_y(g.center::extensions.geometry),
    near.id,
    extensions.st_x(near.location::extensions.geometry),
    extensions.st_y(near.location::extensions.geometry),
    (near.tags ->> 'institution_id')::uuid,
    near.tags ->> 'entity',
    near.distance_m
  from private.cell_scores cs
  join private.grid_cells g on g.id = cs.cell_id
  cross join lateral (
    select p.id, p.location, p.tags, extensions.st_distance(p.location, g.center) as distance_m
    from private.poi_features p
    where p.snapshot_id = p_snapshot_id
      and p.city_id = p_city_id
      and p.category = p_category
      and extensions.st_dwithin(p.location, g.center, p_radius_m)
    order by distance_m, p.id
    limit p_limit
  ) as near
  where cs.snapshot_id = p_snapshot_id
    and g.city_id = p_city_id
  order by g.id, near.distance_m, near.id;
$$;

update public.scoring_versions
set params = params || jsonb_build_object(
  'education',
  '{
    "levels": {
      "kindergarten": { "full_min": 8, "zero_min": 20, "weight": 30 },
      "school": { "full_min": 10, "zero_min": 25, "weight": 45 },
      "high_school": { "full_min": 15, "zero_min": 35, "weight": 25 }
    },
    "choice_weight": 0.25,
    "neighbour_weight": 0.4,
    "walk_speed_kmh": 4.5,
    "walk_detour_factor": 1.3,
    "max_candidates": 12,
    "count_bands_min": [5, 10, 15],
    "require_official_register": true,
    "match": { "radius_m": 300, "min_similarity": 0.6, "name_only_similarity": 0.9 }
  }'::jsonb
)
where kind = 'online' and label = 'v1';
