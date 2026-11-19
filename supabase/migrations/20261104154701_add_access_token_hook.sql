create function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  roles jsonb;
begin
  select coalesce(jsonb_agg(user_roles.role order by user_roles.role), '[]'::jsonb)
  into roles
  from public.user_roles
  where user_roles.user_id = (event ->> 'user_id')::uuid;

  return jsonb_set(event, '{claims,user_roles}', roles);
end;
$$;

comment on function public.custom_access_token_hook(jsonb) is 'Supabase Auth custom access token hook: adds the user_roles claim (array of app_role values) to every access token.';

grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;

grant select on public.user_roles to supabase_auth_admin;

create policy "Auth admin can read every role"
  on public.user_roles for select to supabase_auth_admin
  using (true);
