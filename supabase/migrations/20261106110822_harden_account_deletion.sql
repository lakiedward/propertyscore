create table private.account_deletion_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  attempted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table private.account_deletion_attempts is 'Failed confirmations of delete_own_account, used to limit how many passwords or emails one account can try in a window.';

create index account_deletion_attempts_user_id_attempted_at_idx
  on private.account_deletion_attempts (user_id, attempted_at);

alter table private.account_deletion_attempts enable row level security;

create trigger account_deletion_attempts_set_updated_at
  before update on private.account_deletion_attempts
  for each row execute function private.set_updated_at();

revoke all on private.account_deletion_attempts from anon, authenticated;

drop function public.delete_own_account(text);

create function public.delete_own_account(confirmation text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt_window constant interval := interval '15 minutes';
  max_attempts constant integer := 5;
  reauthentication_window_seconds constant integer := 600;
  account_id uuid := (select auth.uid());
  account_email text;
  account_password text;
  last_sign_in bigint;
begin
  if account_id is null then
    raise exception using errcode = '42501', message = 'not_signed_in';
  end if;

  perform pg_advisory_xact_lock(hashtext('public.delete_own_account'));

  select users.email, users.encrypted_password
  into account_email, account_password
  from auth.users
  where users.id = account_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'account_not_found';
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

  delete from private.account_deletion_attempts
  where account_deletion_attempts.user_id = account_id
    and account_deletion_attempts.attempted_at < now() - attempt_window;

  if (
    select count(*)
    from private.account_deletion_attempts
    where account_deletion_attempts.user_id = account_id
  ) >= max_attempts then
    raise exception using errcode = 'P0001', message = 'rate_limited';
  end if;

  if account_password is not null and account_password <> '' then
    if confirmation is null
      or extensions.crypt(confirmation, account_password) <> account_password then
      insert into private.account_deletion_attempts (user_id) values (account_id);
      return 'invalid_password';
    end if;
  else
    if confirmation is null
      or lower(btrim(confirmation)) <> lower(coalesce(account_email, '')) then
      insert into private.account_deletion_attempts (user_id) values (account_id);
      return 'email_mismatch';
    end if;

    select max((entry ->> 'timestamp')::bigint)
    into last_sign_in
    from jsonb_array_elements(coalesce((select auth.jwt()) -> 'amr', '[]'::jsonb)) as entry;

    if last_sign_in is null
      or last_sign_in < extract(epoch from now())::bigint - reauthentication_window_seconds then
      raise exception using errcode = 'P0001', message = 'reauthentication_needed';
    end if;
  end if;

  delete from auth.users as users
  where users.id = account_id;

  return 'deleted';
end;
$$;

comment on function public.delete_own_account(text) is 'Deletes the signed-in account and returns deleted. Refuses the last admin before any credential is checked, allows 5 failed confirmations per 15 minutes (then raises rate_limited), checks the password, or for an account without one its email plus a sign-in from the last 10 minutes (else raises reauthentication_needed). A wrong confirmation is recorded and returned as invalid_password or email_mismatch instead of raised, so the attempt is kept. Rows owned by the account go with it through the on delete cascade foreign keys.';

revoke execute on function public.delete_own_account(text) from public, anon;
grant execute on function public.delete_own_account(text) to authenticated;
