create or replace function private.guard_listing_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status and not (
    (old.status in ('draft', 'rejected') and new.status = 'pending_approval')
    or (old.status = 'pending_approval' and new.status in ('approved', 'rejected', 'blocked'))
    or (old.status = 'approved' and new.status in ('rejected', 'blocked') and old.revision_of is null)
  ) then
    raise exception using errcode = 'P0001', message = 'listing_invalid_transition';
  end if;
  return new;
end;
$$;

create or replace function public.decide_listing(
  p_listing_id uuid,
  p_decision public.listing_decision,
  p_reasons public.listing_decision_reason[],
  p_message text
)
returns public.listing_decisions
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  current_status public.listing_status;
  original_id uuid;
  clean_reasons public.listing_decision_reason[];
  clean_message text := nullif(btrim(p_message), '');
  decision_row public.listing_decisions;
begin
  if caller is null or not coalesce(((select auth.jwt()) -> 'user_roles') ? 'admin', false) then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;

  select status, revision_of into current_status, original_id
  from public.listings
  where id = p_listing_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'listing_not_found';
  end if;

  if current_status <> 'pending_approval' and not (
    current_status = 'approved' and p_decision = 'rejected' and original_id is null
  ) then
    raise exception using errcode = 'P0001', message = 'listing_not_pending';
  end if;

  select coalesce(array_agg(distinct reason order by reason), '{}')
  into clean_reasons
  from unnest(coalesce(p_reasons, '{}')) as reason;

  if p_decision = 'approved' and cardinality(clean_reasons) > 0
    or p_decision = 'rejected' and (
      cardinality(clean_reasons) = 0
      or not clean_reasons <@ array['photos', 'personal_data', 'price_area', 'description', 'contact_details']::public.listing_decision_reason[]
    )
    or p_decision = 'blocked' and (
      cardinality(clean_reasons) = 0
      or not clean_reasons <@ array['duplicate', 'unavailable', 'personal_data', 'rules']::public.listing_decision_reason[]
    ) then
    raise exception using errcode = 'P0001', message = 'decision_reason_invalid';
  end if;

  if p_decision <> 'approved' and clean_message is null then
    raise exception using errcode = 'P0001', message = 'decision_message_required';
  end if;

  if char_length(clean_message) > 2000 then
    raise exception using errcode = 'P0001', message = 'decision_message_too_long';
  end if;

  if original_id is not null and p_decision <> 'rejected' then
    perform 1 from public.listings where id = original_id for update;

    insert into public.listing_decisions (listing_id, decision, reasons, message, decided_by)
    values (original_id, p_decision, clean_reasons, clean_message, caller)
    returning * into decision_row;

    if p_decision = 'approved' then
      update public.listings as original
      set
        transaction = revision.transaction,
        title = revision.title,
        street_label = revision.street_label,
        city = revision.city,
        rooms = revision.rooms,
        area_m2 = revision.area_m2,
        price = revision.price,
        currency = revision.currency,
        latitude = revision.latitude,
        longitude = revision.longitude,
        description = revision.description,
        floor = revision.floor,
        building_floors = revision.building_floors,
        year_built = revision.year_built,
        property_type = revision.property_type,
        bathrooms = revision.bathrooms,
        partitioning = revision.partitioning,
        comfort = revision.comfort,
        building_type = revision.building_type,
        house_type = revision.house_type,
        land_area_m2 = revision.land_area_m2,
        has_basement = revision.has_basement,
        has_semibasement = revision.has_semibasement,
        has_attic = revision.has_attic,
        interior_condition = revision.interior_condition,
        heating = revision.heating,
        cooling = revision.cooling,
        furnishing = revision.furnishing,
        pets = revision.pets,
        is_passive_house = revision.is_passive_house,
        balconies = revision.balconies,
        parking_spaces = revision.parking_spaces,
        utilities = revision.utilities,
        building_services = revision.building_services,
        has_elevator = revision.has_elevator,
        has_shared_yard = revision.has_shared_yard,
        pool = revision.pool,
        yard = revision.yard,
        decided_at = decision_row.created_at
      from public.listings as revision
      where original.id = original_id and revision.id = p_listing_id;

      delete from public.listing_photos where listing_id = original_id;
      update public.listing_photos set listing_id = original_id where listing_id = p_listing_id;
    else
      update public.listings
      set status = 'blocked', decided_at = decision_row.created_at
      where id = original_id;
    end if;

    delete from public.listings where id = p_listing_id;
    return decision_row;
  end if;

  if current_status = 'approved' then
    delete from public.listings where revision_of = p_listing_id;
  end if;

  insert into public.listing_decisions (listing_id, decision, reasons, message, decided_by)
  values (p_listing_id, p_decision, clean_reasons, clean_message, caller)
  returning * into decision_row;

  update public.listings
  set
    status = p_decision::text::public.listing_status,
    decided_at = decision_row.created_at,
    published_at = case when p_decision = 'approved' then decision_row.created_at else published_at end
  where id = p_listing_id;

  return decision_row;
end;
$$;

comment on function public.decide_listing(uuid, public.listing_decision, public.listing_decision_reason[], text) is 'Approves, rejects or blocks a submitted listing or revision; an approved listing can still be rejected later, which takes it off the site and drops its open revision.';
