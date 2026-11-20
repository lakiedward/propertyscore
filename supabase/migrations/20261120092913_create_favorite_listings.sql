create table public.favorite_listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint favorite_listings_owner_listing_key unique (owner_id, listing_id)
);

create index favorite_listings_owner_created_idx
  on public.favorite_listings (owner_id, created_at desc, listing_id);
create index favorite_listings_listing_id_idx on public.favorite_listings (listing_id);

create trigger favorite_listings_set_updated_at
  before update on public.favorite_listings
  for each row execute function private.set_updated_at();

create function private.enforce_favorite_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('favorite_listings:' || new.owner_id::text, 0));
  if (
    select count(*)
    from public.favorite_listings
    where favorite_listings.owner_id = new.owner_id
  ) >= 500 then
    raise exception using errcode = 'P0001', message = 'favorite_limit_reached';
  end if;
  return new;
end;
$$;

revoke execute on function private.enforce_favorite_limit() from public, anon, authenticated;

create trigger favorite_listings_enforce_limit
  before insert on public.favorite_listings
  for each row execute function private.enforce_favorite_limit();

alter table public.favorite_listings enable row level security;

revoke all on public.favorite_listings from anon, authenticated;
grant select, delete on public.favorite_listings to authenticated;
grant insert (listing_id) on public.favorite_listings to authenticated;

create policy "Users can read their favourite listings"
  on public.favorite_listings for select to authenticated
  using ((select auth.uid()) = owner_id);

create policy "Users can save approved listings to their favourites"
  on public.favorite_listings for insert to authenticated
  with check (
    (select auth.uid()) = owner_id
    and exists (
      select 1
      from public.listings
      where listings.id = favorite_listings.listing_id
        and listings.status = 'approved'
        and listings.revision_of is null
    )
  );

create policy "Users can remove their favourite listings"
  on public.favorite_listings for delete to authenticated
  using ((select auth.uid()) = owner_id);

create function public.list_my_favorite_listings(p_limit integer, p_offset integer)
returns table (
  listing_id uuid,
  saved_at timestamptz,
  is_available boolean,
  title text,
  photo_path text,
  transaction public.listing_transaction,
  price numeric,
  currency text,
  rooms smallint,
  area_m2 numeric,
  city text,
  total_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    listings.id,
    favorite_listings.created_at,
    listings.status = 'approved',
    listings.title,
    listings.photo_path,
    case when listings.status = 'approved' then listings.transaction end,
    case when listings.status = 'approved' then listings.price end,
    case when listings.status = 'approved' then listings.currency end,
    case when listings.status = 'approved' then listings.rooms end,
    case when listings.status = 'approved' then listings.area_m2 end,
    case when listings.status = 'approved' then listings.city end,
    count(*) over ()
  from public.favorite_listings
  join public.listings on listings.id = favorite_listings.listing_id
  where favorite_listings.owner_id = (select auth.uid())
  order by favorite_listings.created_at desc, favorite_listings.listing_id desc
  limit least(greatest(coalesce(p_limit, 24), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke execute on function public.list_my_favorite_listings(integer, integer) from public, anon;
grant execute on function public.list_my_favorite_listings(integer, integer) to authenticated;
