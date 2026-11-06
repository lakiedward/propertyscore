alter table public.listings rename constraint listings_published_has_date to listings_approved_has_date;

alter policy "Visitors can read published listings" on public.listings
  rename to "Visitors can read approved listings";

drop policy "Signed-in users can read published listings and their own" on public.listings;

create policy "Signed-in users can read approved listings, their own and, as admins, every submitted listing"
  on public.listings for select to authenticated
  using (
    status = 'approved'
    or (select auth.uid()) = owner_id
    or (
      status <> 'draft'
      and coalesce(((select auth.jwt()) -> 'user_roles') ? 'admin', false)
    )
  );

alter table public.listings
  add column description text check (char_length(btrim(description)) between 1 and 4000),
  add column floor smallint check (floor between -1 and 80),
  add column building_floors smallint check (building_floors between 0 and 80),
  add column year_built smallint check (year_built between 1800 and 2100),
  add column submitted_at timestamptz,
  add column decided_at timestamptz,
  add constraint listings_floor_within_building check (
    floor is null or building_floors is null or floor <= building_floors
  ),
  add constraint listings_pending_has_submission check (
    status <> 'pending_approval' or submitted_at is not null
  ),
  add constraint listings_owner_profile_fkey foreign key (owner_id) references public.profiles (id) on delete cascade;

create index listings_moderation_queue_idx on public.listings (status, submitted_at, id);
create index listings_moderation_decided_idx on public.listings (status, decided_at desc, id);

grant insert (
  transaction,
  title,
  street_label,
  city,
  rooms,
  area_m2,
  price,
  currency,
  latitude,
  longitude,
  description,
  floor,
  building_floors,
  year_built
) on public.listings to authenticated;

grant update (
  transaction,
  title,
  street_label,
  city,
  rooms,
  area_m2,
  price,
  currency,
  latitude,
  longitude,
  description,
  floor,
  building_floors,
  year_built
) on public.listings to authenticated;

grant select (description, floor, building_floors, year_built) on public.listings to anon;

create policy "Owners can create draft listings"
  on public.listings for insert to authenticated
  with check ((select auth.uid()) = owner_id and status = 'draft');

create policy "Owners can edit their draft or rejected listings"
  on public.listings for update to authenticated
  using ((select auth.uid()) = owner_id and status in ('draft', 'rejected'))
  with check ((select auth.uid()) = owner_id and status in ('draft', 'rejected'));

drop policy "Users can read their own profile" on public.profiles;

create policy "Users can read their own profile and admins can read every profile"
  on public.profiles for select to authenticated
  using (
    (select auth.uid()) = id
    or coalesce(((select auth.jwt()) -> 'user_roles') ? 'admin', false)
  );

create function private.guard_listing_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status and not (
    (old.status in ('draft', 'rejected') and new.status = 'pending_approval')
    or (old.status = 'pending_approval' and new.status in ('approved', 'rejected', 'blocked'))
  ) then
    raise exception using errcode = 'P0001', message = 'listing_invalid_transition';
  end if;
  return new;
end;
$$;

create trigger listings_guard_status
  before update of status on public.listings
  for each row execute function private.guard_listing_status();

revoke all on function private.guard_listing_status() from public, anon, authenticated;

create type public.listing_decision as enum ('approved', 'rejected', 'blocked');

create type public.listing_decision_reason as enum (
  'photos',
  'personal_data',
  'price_area',
  'description',
  'contact_details',
  'duplicate',
  'unavailable',
  'rules'
);

create table public.listing_decisions (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  decision public.listing_decision not null,
  reasons public.listing_decision_reason[] not null default '{}',
  message text check (char_length(btrim(message)) between 1 and 2000),
  decided_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint listing_decisions_reasons_match_decision check (
    case decision
      when 'approved' then cardinality(reasons) = 0
      when 'rejected' then cardinality(reasons) >= 1
        and reasons <@ array['photos', 'personal_data', 'price_area', 'description', 'contact_details']::public.listing_decision_reason[]
      when 'blocked' then cardinality(reasons) >= 1
        and reasons <@ array['duplicate', 'unavailable', 'personal_data', 'rules']::public.listing_decision_reason[]
    end
  ),
  constraint listing_decisions_message_required check (decision = 'approved' or message is not null)
);

comment on table public.listing_decisions is 'Append-only history of admin decisions on submitted listings, with the reasons and the message shown to the owner.';

create index listing_decisions_listing_created_idx on public.listing_decisions (listing_id, created_at desc);
create index listing_decisions_decided_by_idx on public.listing_decisions (decided_by);

alter table public.listing_decisions enable row level security;

revoke all on public.listing_decisions from anon, authenticated;
grant select on public.listing_decisions to authenticated;

create policy "Owners can read decisions on their listings and admins can read every decision"
  on public.listing_decisions for select to authenticated
  using (
    coalesce(((select auth.jwt()) -> 'user_roles') ? 'admin', false)
    or exists (
      select 1 from public.listings
      where listings.id = listing_decisions.listing_id
        and listings.owner_id = (select auth.uid())
    )
  );

create function public.submit_listing(p_listing_id uuid)
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

create function public.decide_listing(
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
  clean_reasons public.listing_decision_reason[];
  clean_message text := nullif(btrim(p_message), '');
  decision_row public.listing_decisions;
begin
  if caller is null or not coalesce(((select auth.jwt()) -> 'user_roles') ? 'admin', false) then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;

  select status into current_status
  from public.listings
  where id = p_listing_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'listing_not_found';
  end if;

  if current_status <> 'pending_approval' then
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

create function public.listing_moderation_counts()
returns table (status public.listing_status, total integer)
language plpgsql
stable
set search_path = ''
as $$
begin
  if not coalesce(((select auth.jwt()) -> 'user_roles') ? 'admin', false) then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;

  return query
  select statuses.status, count(listings.id)::integer
  from unnest(array['pending_approval', 'approved', 'rejected', 'blocked']::public.listing_status[]) as statuses (status)
  left join public.listings on listings.status = statuses.status
  group by statuses.status
  order by array_position(array['pending_approval', 'approved', 'rejected', 'blocked']::public.listing_status[], statuses.status);
end;
$$;

revoke execute on function public.submit_listing(uuid) from public, anon;
grant execute on function public.submit_listing(uuid) to authenticated;
revoke execute on function public.decide_listing(uuid, public.listing_decision, public.listing_decision_reason[], text) from public, anon;
grant execute on function public.decide_listing(uuid, public.listing_decision, public.listing_decision_reason[], text) to authenticated;
revoke execute on function public.listing_moderation_counts() from public, anon;
grant execute on function public.listing_moderation_counts() to authenticated;
