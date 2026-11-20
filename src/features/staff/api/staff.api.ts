import { supabase } from '@/lib/supabase/client';
import { toAppError } from '@/lib/supabase/errors';
import type {
  AppRole,
  InspectorExceptionInsert,
  StaffUser,
  TimeRange,
  UserFilters,
} from '../staff.types';

const USERS_PAGE_SIZE = 50;

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

const INSPECTOR_PROFILE_COLUMNS = 'user_id, city_id, is_active, city:cities(name)' as const;

const WEEKLY_HOURS_COLUMNS = 'id, weekday, starts_at, ends_at' as const;

const EXCEPTION_COLUMNS = 'id, kind, starts_at, ends_at, note' as const;

const EXCEPTIONS_LIMIT = 100;

export async function getInspectorProfile(inspectorId: string) {
  const { data, error } = await supabase
    .from('inspector_profiles')
    .select(INSPECTOR_PROFILE_COLUMNS)
    .eq('user_id', inspectorId)
    .single();
  if (error) throw toAppError(error);
  return data;
}

export async function listWeeklyHours(inspectorId: string) {
  const { data, error } = await supabase
    .from('inspector_weekly_hours')
    .select(WEEKLY_HOURS_COLUMNS)
    .eq('inspector_id', inspectorId)
    .order('weekday', { ascending: true })
    .order('starts_at', { ascending: true });
  if (error) throw toAppError(error);
  return data;
}

export async function setWeeklyHours({
  inspectorId,
  weekday,
  ranges,
}: {
  inspectorId: string;
  weekday: number;
  ranges: readonly TimeRange[];
}) {
  const { error } = await supabase.rpc('set_inspector_weekly_hours', {
    p_inspector_id: inspectorId,
    p_weekday: weekday,
    p_ranges: ranges.map((range) => ({ starts_at: range.startsAt, ends_at: range.endsAt })),
  });
  if (error) throw toAppError(error);
}

export async function listExceptions(inspectorId: string, from: string) {
  const { data, error } = await supabase
    .from('inspector_exceptions')
    .select(EXCEPTION_COLUMNS)
    .eq('inspector_id', inspectorId)
    .gt('ends_at', from)
    .order('starts_at', { ascending: true })
    .range(0, EXCEPTIONS_LIMIT - 1);
  if (error) throw toAppError(error);
  return data;
}

export async function addException(exception: InspectorExceptionInsert) {
  const { error } = await supabase.from('inspector_exceptions').insert({
    inspector_id: exception.inspectorId,
    kind: exception.kind,
    starts_at: exception.startsAt,
    ends_at: exception.endsAt,
    note: exception.note,
  });
  if (error) throw toAppError(error);
}

export async function removeException(id: string) {
  const { error } = await supabase.from('inspector_exceptions').delete().eq('id', id);
  if (error) throw toAppError(error);
}

export async function listFreeStarts(inspectorId: string, from: string, to: string) {
  const { data, error } = await supabase.rpc('inspector_free_starts', {
    p_inspector_id: inspectorId,
    p_from: from,
    p_to: to,
  });
  if (error) throw toAppError(error);
  return data.map((row) => row.starts_at);
}
