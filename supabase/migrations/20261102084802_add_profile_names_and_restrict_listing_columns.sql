revoke select on public.listings from anon;
grant select (
  id,
  status,
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
  verification,
  smartcheck_score,
  photo_path,
  published_at,
  created_at,
  updated_at
) on public.listings to anon;

drop index public.listings_public_feed_idx;
create index listings_public_feed_idx on public.listings (status, transaction, published_at desc, id desc);

alter table public.profiles
  add column full_name text check (char_length(btrim(full_name)) between 1 and 120);

grant update (full_name) on public.profiles to authenticated;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, locale, full_name)
  values (
    new.id,
    case
      when new.raw_user_meta_data ->> 'locale' in ('ro', 'en') then new.raw_user_meta_data ->> 'locale'
      else 'ro'
    end,
    nullif(btrim(left(btrim(new.raw_user_meta_data ->> 'full_name'), 120)), '')
  );
  return new;
end;
$$;
