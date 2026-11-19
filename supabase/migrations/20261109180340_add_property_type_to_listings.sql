create type public.listing_property_type as enum ('apartment', 'house');
create type public.listing_partitioning as enum ('detached', 'semi_detached', 'non_detached', 'circular');
create type public.listing_comfort as enum ('first', 'second', 'third', 'luxury');
create type public.listing_building_type as enum ('apartment_block', 'house_villa');
create type public.listing_house_type as enum ('detached', 'duplex', 'triplex', 'terraced', 'other');
create type public.listing_interior_condition as enum ('renovated', 'good', 'needs_renovation');
create type public.listing_heating as enum (
  'building_boiler',
  'own_boiler',
  'convector',
  'infrared_panels',
  'district_heating',
  'heat_pump',
  'solar_panels'
);
create type public.listing_cooling as enum ('air_conditioning', 'fan_heaters', 'fan_coils');
create type public.listing_furnishing as enum ('furnished', 'unfurnished', 'partly_furnished');
create type public.listing_pets as enum ('allowed', 'not_allowed');
create type public.listing_utility as enum ('water', 'sewerage', 'gas', 'electricity', 'cable_tv', 'internet');
create type public.listing_building_service as enum ('administration', 'cleaning', 'security', 'video_surveillance');
create type public.listing_pool as enum ('own', 'shared');
create type public.listing_yard as enum ('yard', 'shared_yard', 'garden');

alter table public.listings
  add column property_type public.listing_property_type not null default 'apartment',
  add column bathrooms smallint check (bathrooms between 1 and 10),
  add column partitioning public.listing_partitioning,
  add column comfort public.listing_comfort,
  add column building_type public.listing_building_type,
  add column house_type public.listing_house_type,
  add column land_area_m2 numeric(9, 2) check (land_area_m2 > 0 and land_area_m2 <= 1000000),
  add column has_basement boolean not null default false,
  add column has_semibasement boolean not null default false,
  add column has_attic boolean not null default false,
  add column interior_condition public.listing_interior_condition,
  add column heating public.listing_heating,
  add column cooling public.listing_cooling,
  add column furnishing public.listing_furnishing,
  add column pets public.listing_pets,
  add column is_passive_house boolean not null default false,
  add column balconies smallint check (balconies between 0 and 20),
  add column parking_spaces smallint check (parking_spaces between 0 and 20),
  add column utilities public.listing_utility[] not null default '{}' check (cardinality(utilities) <= 6),
  add column building_services public.listing_building_service[] not null default '{}' check (cardinality(building_services) <= 4),
  add column has_elevator boolean not null default false,
  add column has_shared_yard boolean not null default false,
  add column pool public.listing_pool,
  add column yard public.listing_yard,
  add constraint listings_apartment_fields check (
    property_type = 'apartment'
    or (
      floor is null
      and partitioning is null
      and comfort is null
      and building_type is null
      and not has_elevator
      and not has_shared_yard
      and heating is distinct from 'building_boiler'
    )
  ),
  add constraint listings_house_fields check (
    property_type = 'house'
    or (
      house_type is null
      and land_area_m2 is null
      and not has_basement
      and not has_semibasement
      and not has_attic
      and not is_passive_house
      and pool is null
      and yard is null
      and heating is distinct from 'solar_panels'
      and utilities <@ array['water', 'sewerage', 'gas']::public.listing_utility[]
    )
  ),
  add constraint listings_pets_only_for_rent check (transaction = 'rent' or pets is null);

comment on column public.listings.property_type is 'Apartment or house; decides which detail columns may be filled.';
comment on column public.listings.building_floors is 'Floors above the ground floor, for apartments the building and for houses the house itself.';
comment on column public.listings.land_area_m2 is 'Land area of a house, in square metres.';
comment on column public.listings.pets is 'Whether pets are accepted; only for rentals.';

grant insert (
  property_type,
  bathrooms,
  partitioning,
  comfort,
  building_type,
  house_type,
  land_area_m2,
  has_basement,
  has_semibasement,
  has_attic,
  interior_condition,
  heating,
  cooling,
  furnishing,
  pets,
  is_passive_house,
  balconies,
  parking_spaces,
  utilities,
  building_services,
  has_elevator,
  has_shared_yard,
  pool,
  yard
) on public.listings to authenticated;

grant update (
  property_type,
  bathrooms,
  partitioning,
  comfort,
  building_type,
  house_type,
  land_area_m2,
  has_basement,
  has_semibasement,
  has_attic,
  interior_condition,
  heating,
  cooling,
  furnishing,
  pets,
  is_passive_house,
  balconies,
  parking_spaces,
  utilities,
  building_services,
  has_elevator,
  has_shared_yard,
  pool,
  yard
) on public.listings to authenticated;

grant select (
  property_type,
  bathrooms,
  partitioning,
  comfort,
  building_type,
  house_type,
  land_area_m2,
  has_basement,
  has_semibasement,
  has_attic,
  interior_condition,
  heating,
  cooling,
  furnishing,
  pets,
  is_passive_house,
  balconies,
  parking_spaces,
  utilities,
  building_services,
  has_elevator,
  has_shared_yard,
  pool,
  yard
) on public.listings to anon;

create or replace function public.submit_listing(p_listing_id uuid)
returns public.listings
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  target public.listings;
begin
  if caller is null then
    raise exception using errcode = '42501', message = 'not_signed_in';
  end if;

  select * into target
  from public.listings
  where id = p_listing_id and owner_id = caller
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'listing_not_found';
  end if;

  if target.status = 'pending_approval' then
    raise exception using errcode = 'P0001', message = 'listing_already_pending';
  end if;

  if target.status = 'blocked' then
    raise exception using errcode = 'P0001', message = 'listing_blocked';
  end if;

  if target.status not in ('draft', 'rejected') then
    raise exception using errcode = 'P0001', message = 'listing_invalid_transition';
  end if;

  if target.description is null
    or (target.property_type = 'apartment' and target.floor is null)
    or (target.property_type = 'house' and (target.house_type is null or target.land_area_m2 is null))
    or (select count(*) from public.listing_photos where listing_id = target.id) < 5 then
    raise exception using errcode = 'P0001', message = 'listing_incomplete';
  end if;

  update public.listings
  set status = 'pending_approval', submitted_at = now()
  where id = target.id
  returning * into target;

  return target;
end;
$$;
