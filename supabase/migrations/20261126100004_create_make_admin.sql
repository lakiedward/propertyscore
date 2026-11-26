create function public.make_admin(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
begin
  if caller is null or not private.has_role('admin') then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;

  perform 1 from auth.users where users.id = p_user_id for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'user_not_found';
  end if;
  if exists (select 1 from private.user_blocks where user_blocks.user_id = p_user_id) then
    raise exception using errcode = 'P0001', message = 'user_blocked';
  end if;
  if exists (
    select 1 from public.user_roles
    where user_roles.user_id = p_user_id and user_roles.role = 'inspector'
  ) then
    raise exception using errcode = 'P0001', message = 'admin_inspector_conflict';
  end if;

  insert into public.user_roles (user_id, role, granted_by)
  values (p_user_id, 'admin', caller)
  on conflict (user_id, role) do nothing;

  delete from public.user_roles
  where user_roles.user_id = p_user_id and user_roles.role = 'user';
end;
$$;

revoke execute on function public.make_admin(uuid) from public, anon;

grant execute on function public.make_admin(uuid) to authenticated;
