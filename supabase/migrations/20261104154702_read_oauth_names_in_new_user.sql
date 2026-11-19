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
    nullif(
      btrim(left(btrim(coalesce(
        nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
        new.raw_user_meta_data ->> 'name'
      )), 120)),
      ''
    )
  );
  return new;
end;
$$;
