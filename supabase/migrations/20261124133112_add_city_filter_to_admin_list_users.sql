drop function public.admin_list_users(text, public.app_role, boolean, integer, integer);

create function public.admin_list_users(
  p_search text,
  p_role public.app_role default null,
  p_blocked boolean default null,
  p_city_id uuid default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  user_id uuid,
  full_name text,
  email text,
  phone text,
  roles public.app_role[],
  inspector_city_id uuid,
  inspector_city_name text,
  is_blocked boolean,
  block_reason text,
  created_at timestamptz,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  pattern text := '%' || lower(extensions.unaccent(coalesce(btrim(p_search), ''))) || '%';
begin
  if not private.has_role('admin') then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  return query
  with people as (
    select
      users.id,
      profiles.full_name,
      users.email::text as email,
      profiles.phone,
      coalesce(
        (
          select array_agg(user_roles.role order by user_roles.role)
          from public.user_roles
          where user_roles.user_id = users.id
        ),
        '{}'
      ) as roles,
      inspector.city_id,
      cities.name as city_name,
      coalesce(users.banned_until > now(), false) as is_blocked,
      blocks.reason as block_reason,
      users.created_at
    from auth.users
    left join public.profiles on profiles.id = users.id
    left join public.inspector_profiles as inspector on inspector.user_id = users.id
    left join public.cities on cities.id = inspector.city_id
    left join private.user_blocks as blocks on blocks.user_id = users.id
  )
  select
    people.id,
    people.full_name,
    people.email,
    people.phone,
    people.roles,
    people.city_id,
    people.city_name,
    people.is_blocked,
    people.block_reason,
    people.created_at,
    count(*) over ()
  from people
  where (p_role is null or p_role = any (people.roles))
    and (p_blocked is null or people.is_blocked = p_blocked)
    and (p_city_id is null or people.city_id = p_city_id)
    and (
      coalesce(btrim(p_search), '') = ''
      or lower(extensions.unaccent(coalesce(people.full_name, ''))) like pattern
      or lower(people.email) like pattern
      or coalesce(people.phone, '') like '%' || btrim(p_search) || '%'
    )
  order by people.created_at desc, people.id
  limit least(greatest(coalesce(p_limit, 50), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

revoke execute on function public.admin_list_users(text, public.app_role, boolean, uuid, integer, integer) from public, anon;

grant execute on function public.admin_list_users(text, public.app_role, boolean, uuid, integer, integer) to authenticated;
