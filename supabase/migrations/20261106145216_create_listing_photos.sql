create table public.listing_photos (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  path text not null unique check (char_length(path) between 1 and 400),
  position smallint not null check (position between 0 and 19),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint listing_photos_path_in_listing_folder check (
    path like owner_id::text || '/' || listing_id::text || '/%'
  )
);

comment on table public.listing_photos is 'Photos of a listing in display order; the lowest position is the cover copied to listings.photo_path.';

create index listing_photos_listing_position_idx on public.listing_photos (listing_id, position, created_at);
create index listing_photos_owner_id_idx on public.listing_photos (owner_id);

alter table public.listing_photos enable row level security;

create trigger listing_photos_set_updated_at
  before update on public.listing_photos
  for each row execute function private.set_updated_at();

revoke all on public.listing_photos from anon, authenticated;
grant select on public.listing_photos to anon, authenticated;
grant insert (listing_id, path, position) on public.listing_photos to authenticated;
grant update (position) on public.listing_photos to authenticated;
grant delete on public.listing_photos to authenticated;

create policy "Visitors can read photos of approved listings"
  on public.listing_photos for select to anon
  using (
    exists (
      select 1 from public.listings
      where listings.id = listing_photos.listing_id and listings.status = 'approved'
    )
  );

create policy "Signed-in users can read photos of approved listings, their own and, as admins, every photo"
  on public.listing_photos for select to authenticated
  using (
    (select auth.uid()) = owner_id
    or coalesce(((select auth.jwt()) -> 'user_roles') ? 'admin', false)
    or exists (
      select 1 from public.listings
      where listings.id = listing_photos.listing_id and listings.status = 'approved'
    )
  );

create policy "Owners can add photos to their editable listings"
  on public.listing_photos for insert to authenticated
  with check (
    (select auth.uid()) = owner_id
    and exists (
      select 1 from public.listings
      where listings.id = listing_photos.listing_id
        and listings.owner_id = (select auth.uid())
        and listings.status in ('draft', 'rejected')
    )
  );

create policy "Owners can reorder photos of their editable listings"
  on public.listing_photos for update to authenticated
  using (
    (select auth.uid()) = owner_id
    and exists (
      select 1 from public.listings
      where listings.id = listing_photos.listing_id
        and listings.owner_id = (select auth.uid())
        and listings.status in ('draft', 'rejected')
    )
  )
  with check (
    (select auth.uid()) = owner_id
    and exists (
      select 1 from public.listings
      where listings.id = listing_photos.listing_id
        and listings.owner_id = (select auth.uid())
        and listings.status in ('draft', 'rejected')
    )
  );

create policy "Owners can remove photos of their editable listings"
  on public.listing_photos for delete to authenticated
  using (
    (select auth.uid()) = owner_id
    and exists (
      select 1 from public.listings
      where listings.id = listing_photos.listing_id
        and listings.owner_id = (select auth.uid())
        and listings.status in ('draft', 'rejected')
    )
  );

create function private.enforce_listing_photo_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from public.listings where id = new.listing_id for update;
  if (select count(*) from public.listing_photos where listing_id = new.listing_id) >= 20 then
    raise exception using errcode = 'P0001', message = 'listing_photo_limit';
  end if;
  return new;
end;
$$;

create trigger listing_photos_enforce_limit
  before insert on public.listing_photos
  for each row execute function private.enforce_listing_photo_limit();

create function private.sync_listing_cover()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_listing uuid := coalesce(new.listing_id, old.listing_id);
begin
  update public.listings
  set photo_path = (
    select photos.path
    from public.listing_photos as photos
    where photos.listing_id = affected_listing
    order by photos.position, photos.created_at, photos.id
    limit 1
  )
  where id = affected_listing;
  return null;
end;
$$;

create trigger listing_photos_sync_cover
  after insert or update or delete on public.listing_photos
  for each row execute function private.sync_listing_cover();

revoke all on function private.enforce_listing_photo_limit() from public, anon, authenticated;
revoke all on function private.sync_listing_cover() from public, anon, authenticated;

create policy "Owners can read the photo files of their listings"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Owners can upload photo files to their editable listings"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.listings
      where listings.id::text = (storage.foldername(name))[2]
        and listings.owner_id = (select auth.uid())
        and listings.status in ('draft', 'rejected')
    )
  );

create policy "Owners can replace photo files of their editable listings"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.listings
      where listings.id::text = (storage.foldername(name))[2]
        and listings.owner_id = (select auth.uid())
        and listings.status in ('draft', 'rejected')
    )
  )
  with check (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.listings
      where listings.id::text = (storage.foldername(name))[2]
        and listings.owner_id = (select auth.uid())
        and listings.status in ('draft', 'rejected')
    )
  );

create policy "Owners can delete photo files of their editable listings"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.listings
      where listings.id::text = (storage.foldername(name))[2]
        and listings.owner_id = (select auth.uid())
        and listings.status in ('draft', 'rejected')
    )
  );
