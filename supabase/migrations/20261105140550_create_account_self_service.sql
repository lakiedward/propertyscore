create function public.account_has_password()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select users.encrypted_password is not null and users.encrypted_password <> ''
      from auth.users
      where users.id = (select auth.uid())
    ),
    false
  );
$$;

comment on function public.account_has_password() is 'Whether the signed-in account has a password (false for accounts created only through Google), so the settings page knows which confirmation to ask for.';

revoke execute on function public.account_has_password() from public, anon;
grant execute on function public.account_has_password() to authenticated;

create function public.delete_own_account(confirmation text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_id uuid := (select auth.uid());
  account_email text;
  account_password text;
begin
  if account_id is null then
    raise exception using errcode = '42501', message = 'not_signed_in';
  end if;

  select users.email, users.encrypted_password
  into account_email, account_password
  from auth.users
  where users.id = account_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'account_not_found';
  end if;

  if account_password is not null and account_password <> '' then
    if confirmation is null
      or extensions.crypt(confirmation, account_password) <> account_password then
      raise exception using errcode = 'P0001', message = 'invalid_password';
    end if;
  elsif confirmation is null
    or lower(btrim(confirmation)) <> lower(coalesce(account_email, '')) then
    raise exception using errcode = 'P0001', message = 'email_mismatch';
  end if;

  if exists (
    select 1
    from public.user_roles
    where user_roles.user_id = account_id
      and user_roles.role = 'admin'
  ) and not exists (
    select 1
    from public.user_roles
    where user_roles.role = 'admin'
      and user_roles.user_id <> account_id
  ) then
    raise exception using errcode = 'P0001', message = 'last_admin';
  end if;

  delete from auth.users as users
  where users.id = account_id;
end;
$$;

comment on function public.delete_own_account(text) is 'Deletes the signed-in account after checking its password (or, for an account without a password, its email address); refuses to delete the last admin. Rows owned by the account go with it through the on delete cascade foreign keys.';

revoke execute on function public.delete_own_account(text) from public, anon;
grant execute on function public.delete_own_account(text) to authenticated;
