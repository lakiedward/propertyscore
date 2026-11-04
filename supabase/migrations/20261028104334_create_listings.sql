create type public.listing_transaction as enum ('sale', 'rent');
create type public.listing_verification as enum ('physical', 'smartcheck', 'none');
create type public.listing_status as enum ('draft', 'published');

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  status public.listing_status not null default 'draft',
  transaction public.listing_transaction not null,
  title text not null check (char_length(title) between 1 and 120),
  street_label text not null check (char_length(street_label) between 1 and 120),
  city text not null check (char_length(city) between 1 and 80),
  rooms smallint not null check (rooms between 1 and 20),
  area_m2 numeric(7, 2) not null check (area_m2 > 0),
  price numeric(12, 2) not null check (price > 0),
  currency text not null check (currency in ('RON', 'EUR')),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  verification public.listing_verification not null default 'none',
  smartcheck_score smallint check (smartcheck_score between 0 and 100),
  photo_path text check (char_length(photo_path) between 1 and 400),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint listings_score_matches_verification check (
    (verification <> 'none' or smartcheck_score is null)
    and (verification <> 'smartcheck' or smartcheck_score is not null)
  ),
  constraint listings_published_has_date check (status <> 'published' or published_at is not null)
);

comment on table public.listings is 'Homes for sale or rent shown on the public site; price is per month when transaction is rent.';

create index listings_owner_id_idx on public.listings (owner_id);
create index listings_public_feed_idx on public.listings (status, transaction, published_at desc);

alter table public.listings enable row level security;

create trigger listings_set_updated_at
  before update on public.listings
  for each row execute function private.set_updated_at();

revoke all on public.listings from anon, authenticated;
grant select on public.listings to anon, authenticated;

create policy "Visitors can read published listings"
  on public.listings for select to anon
  using (status = 'published');

create policy "Signed-in users can read published listings and their own"
  on public.listings for select to authenticated
  using (status = 'published' or (select auth.uid()) = owner_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-photos',
  'listing-photos',
  true,
  5242880,
  array['image/webp', 'image/jpeg', 'image/png']
);
