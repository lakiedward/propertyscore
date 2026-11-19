create function public.reorder_listing_photos(p_listing_id uuid, p_photo_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  target_status public.listing_status;
begin
  if caller is null then
    raise exception using errcode = '42501', message = 'not_signed_in';
  end if;

  select status into target_status
  from public.listings
  where id = p_listing_id and owner_id = caller
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'listing_not_found';
  end if;

  if target_status not in ('draft', 'rejected') then
    raise exception using errcode = 'P0001', message = 'listing_invalid_transition';
  end if;

  if coalesce(cardinality(p_photo_ids), 0) <> (
      select count(*) from public.listing_photos where listing_id = p_listing_id
    )
    or coalesce(cardinality(p_photo_ids), 0) <> (
      select count(distinct photo_id) from unnest(p_photo_ids) as photo_id
    )
    or exists (
      select 1
      from unnest(p_photo_ids) as photo_id
      where not exists (
        select 1 from public.listing_photos
        where listing_photos.id = photo_id and listing_photos.listing_id = p_listing_id
      )
    ) then
    raise exception using errcode = 'P0001', message = 'listing_photos_changed';
  end if;

  update public.listing_photos as photos
  set position = ordered.ordinal - 1
  from unnest(p_photo_ids) with ordinality as ordered (photo_id, ordinal)
  where photos.id = ordered.photo_id
    and photos.listing_id = p_listing_id
    and photos.position is distinct from ordered.ordinal - 1;
end;
$$;

comment on function public.reorder_listing_photos(uuid, uuid[]) is 'Sets the display order of every photo of an owner''s draft or rejected listing; the first id becomes the cover.';

revoke execute on function public.reorder_listing_photos(uuid, uuid[]) from public, anon;
grant execute on function public.reorder_listing_photos(uuid, uuid[]) to authenticated;
