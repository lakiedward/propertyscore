import type { Database, Enums } from '@/lib/supabase/database.types';

export type AppRole = Enums<'app_role'>;

export const USER_STATE_FILTERS = ['all', 'active', 'blocked'] as const;

export type UserStateFilter = (typeof USER_STATE_FILTERS)[number];

export type UserFilters = {
  search: string;
  role: AppRole | null;
  state: UserStateFilter;
};

type StaffUserRow = Database['public']['Functions']['admin_list_users']['Returns'][number];

type NullableUserColumn = 'full_name' | 'phone' | 'inspector_city_id' | 'inspector_city_name';

export type StaffUser = Omit<StaffUserRow, NullableUserColumn> & {
  [Column in NullableUserColumn]: StaffUserRow[Column] | null;
};
