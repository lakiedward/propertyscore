alter table public.profiles
  add column phone text check (
    phone ~ '^\+[1-9][0-9]{7,14}$'
    and (phone !~ '^\+40' or phone ~ '^\+40[0-9]{9}$')
  );

comment on column public.profiles.phone is 'Contact phone in E.164 form (+40722123456), given at email sign-up or in the account settings; not verified by SMS.';

grant update (phone) on public.profiles to authenticated;

create function private.normalize_phone(raw_phone text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  compact text := regexp_replace(coalesce(raw_phone, ''), '[[:space:].()/-]', '', 'g');
begin
  if compact like '00%' then
    compact := '+' || substr(compact, 3);
  elsif compact ~ '^0[1-9][0-9]{8}$' then
    compact := '+40' || substr(compact, 2);
  end if;

  if compact ~ '^\+40' then
    return case when compact ~ '^\+40[0-9]{9}$' then compact end;
  end if;

  return case when compact ~ '^\+[1-9][0-9]{7,14}$' then compact end;
end;
$$;

comment on function private.normalize_phone(text) is 'Turns a typed phone number (spaces, dots, dashes, 0040 or a Romanian national 0… number) into E.164, or null when it is not a valid number.';

create function private.metadata_locale(metadata jsonb)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when metadata ->> 'locale' in ('ro', 'en') then metadata ->> 'locale'
    else 'ro'
  end;
$$;

comment on function private.metadata_locale(jsonb) is 'The ro or en language from sign-up metadata, Romanian when it is missing or unknown.';

create function private.metadata_full_name(metadata jsonb)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(
    btrim(left(btrim(coalesce(
      nullif(btrim(metadata ->> 'full_name'), ''),
      metadata ->> 'name'
    )), 120)),
    ''
  );
$$;

comment on function private.metadata_full_name(jsonb) is 'The trimmed full name from sign-up metadata (full_name, else the OAuth name), at most 120 characters, or null.';

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, locale, full_name, phone)
  values (
    new.id,
    private.metadata_locale(new.raw_user_meta_data),
    private.metadata_full_name(new.raw_user_meta_data),
    private.normalize_phone(new.raw_user_meta_data ->> 'phone')
  );

  insert into public.user_roles (user_id, role)
  values (new.id, 'user');

  return new;
end;
$$;
