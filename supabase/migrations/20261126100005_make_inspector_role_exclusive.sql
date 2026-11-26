create or replace function public.set_inspector(p_user_id uuid, p_city_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.has_role('admin') then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;

  perform 1 from auth.users where users.id = p_user_id for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'user_not_found';
  end if;
  if not exists (select 1 from public.cities where cities.id = p_city_id) then
    raise exception using errcode = 'P0001', message = 'city_not_found';
  end if;
  if exists (
    select 1 from public.user_roles
    where user_roles.user_id = p_user_id and user_roles.role = 'admin'
  ) then
    raise exception using errcode = 'P0001', message = 'admin_inspector_conflict';
  end if;

  insert into public.user_roles (user_id, role, granted_by)
  values (p_user_id, 'inspector', (select auth.uid()))
  on conflict (user_id, role) do nothing;

  delete from public.user_roles
  where user_roles.user_id = p_user_id and user_roles.role = 'user';

  insert into public.inspector_profiles (user_id, city_id, is_active)
  values (p_user_id, p_city_id, true)
  on conflict (user_id) do update set city_id = excluded.city_id, is_active = true;

  update public.inspections
  set inspector_id = null, status = 'scheduled', assigned_at = null
  where inspections.inspector_id = p_user_id
    and inspections.status = 'inspector_assigned'
    and inspections.starts_at > now()
    and exists (
      select 1 from public.properties
      where properties.id = inspections.property_id and properties.city_id <> p_city_id
    );
end;
$$;

create or replace function public.remove_inspector(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.has_role('admin') then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;

  perform 1 from auth.users where users.id = p_user_id for update;

  update public.inspections
  set inspector_id = null, status = 'scheduled', assigned_at = null
  where inspections.inspector_id = p_user_id
    and inspections.status = 'inspector_assigned'
    and inspections.starts_at > now();

  update public.inspector_profiles set is_active = false where inspector_profiles.user_id = p_user_id;

  if exists (
    select 1 from public.user_roles
    where user_roles.user_id = p_user_id and user_roles.role = 'inspector'
  ) then
    delete from public.user_roles
    where user_roles.user_id = p_user_id and user_roles.role = 'inspector';

    insert into public.user_roles (user_id, role, granted_by)
    values (p_user_id, 'user', (select auth.uid()))
    on conflict (user_id, role) do nothing;
  end if;
end;
$$;

delete from public.user_roles
where user_roles.role = 'user'
  and exists (
    select 1 from public.user_roles as inspector_role
    where inspector_role.user_id = user_roles.user_id and inspector_role.role = 'inspector'
  );
