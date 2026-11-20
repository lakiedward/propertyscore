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

export function weeklyHoursResponse(
  rows: readonly { id: string; weekday: number; starts_at: string; ends_at: string }[],
) {
  return http.get(supabaseUrl('/rest/v1/inspector_weekly_hours'), () => HttpResponse.json(rows));
}

export const availabilityHandlers = [
  weeklyHoursResponse([]),
  http.get(supabaseUrl('/rest/v1/inspector_exceptions'), () => HttpResponse.json([])),
  http.post(
    supabaseUrl('/rest/v1/inspector_exceptions'),
    () => new HttpResponse(null, { status: 201 }),
  ),
  http.get(supabaseUrl('/rest/v1/inspector_profiles'), () =>
    HttpResponse.json({
      user_id: 'a0000000-0000-4000-8000-000000000001',
      city_id: 'c4000000-0000-4000-8000-000000000001',
      is_active: true,
      city: { name: 'Timișoara' },
    }),
  ),
  http.post(supabaseUrl('/rest/v1/rpc/inspector_free_starts'), () => HttpResponse.json([])),
  http.post(
    supabaseUrl('/rest/v1/rpc/set_inspector_weekly_hours'),
    () => new HttpResponse(null, { status: 204 }),
  ),
];
