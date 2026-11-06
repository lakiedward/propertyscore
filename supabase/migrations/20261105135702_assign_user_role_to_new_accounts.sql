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

  insert into public.user_roles (user_id, role)
  values (new.id, 'user');

  return new;
end;
$$;

insert into public.user_roles (user_id, role)
select users.id, 'user'
from auth.users as users
where not exists (
  select 1
  from public.user_roles
  where user_roles.user_id = users.id
);

comment on table public.user_roles is 'Application roles per user. Every account gets the user role at sign-up; an admin is made by changing that row to admin (or adding an admin row). Read by the access token hook, written only by the sign-up trigger, admins through RPCs, SQL run with the service role, or seed.';
