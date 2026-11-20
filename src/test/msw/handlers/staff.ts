import { http, HttpResponse } from 'msw';
import type { StaffUser } from '@/features/staff';
import { supabaseUrl } from '../supabase-url';

export function usersResponse(users: readonly StaffUser[]) {
  return http.post(supabaseUrl('/rest/v1/rpc/admin_list_users'), () =>
    HttpResponse.json(users.map((user) => ({ ...user, total_count: users.length }))),
  );
}

export const staffHandlers = [
  usersResponse([]),
  http.post(supabaseUrl('/rest/v1/rpc/admin_user_role_counts'), () =>
    HttpResponse.json([
      { role: 'user', amount: 0, total: 0 },
      { role: 'admin', amount: 0, total: 0 },
      { role: 'inspector', amount: 0, total: 0 },
    ]),
  ),
  http.post(
    supabaseUrl('/rest/v1/rpc/set_inspector'),
    () => new HttpResponse(null, { status: 204 }),
  ),
  http.post(
    supabaseUrl('/rest/v1/rpc/remove_inspector'),
    () => new HttpResponse(null, { status: 204 }),
  ),
];
