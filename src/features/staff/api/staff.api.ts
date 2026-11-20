import { supabase } from '@/lib/supabase/client';
import { toAppError } from '@/lib/supabase/errors';
import type { AppRole, StaffUser, UserFilters } from '../staff.types';

export const USERS_PAGE_SIZE = 50;

const CITY_COLUMNS = 'id, name' as const;

export async function listUsers({ search, role, state }: UserFilters, page = 0) {
  const { data, error } = await supabase.rpc('admin_list_users', {
    p_search: search,
    ...(role ? { p_role: role } : {}),
    ...(state === 'all' ? {} : { p_blocked: state === 'blocked' }),
    p_limit: USERS_PAGE_SIZE,
    p_offset: page * USERS_PAGE_SIZE,
  });
  if (error) throw toAppError(error);
  const rows: readonly StaffUser[] = data;
  const total = rows[0]?.total_count ?? 0;
  return {
    items: rows,
    total,
    hasMore: (page + 1) * USERS_PAGE_SIZE < total,
  };
}

export async function listRoleCounts() {
  const { data, error } = await supabase.rpc('admin_user_role_counts');
  if (error) throw toAppError(error);
  const counts: Partial<Record<AppRole, number>> = {};
  for (const row of data) {
    counts[row.role] = row.amount;
  }
  return { counts, total: data[0]?.total ?? 0 };
}

export async function listCities() {
  const { data, error } = await supabase
    .from('cities')
    .select(CITY_COLUMNS)
    .order('position', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw toAppError(error);
  return data;
}

export async function setInspector({ userId, cityId }: { userId: string; cityId: string }) {
  const { error } = await supabase.rpc('set_inspector', { p_user_id: userId, p_city_id: cityId });
  if (error) throw toAppError(error);
}

export async function removeInspector(userId: string) {
  const { error } = await supabase.rpc('remove_inspector', { p_user_id: userId });
  if (error) throw toAppError(error);
}
