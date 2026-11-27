import type { Database, Enums } from '@/lib/supabase/database.types';
import type { NullableColumns } from '@/lib/supabase/nullable-columns';

export type AppRole = Enums<'app_role'>;

export const USER_STATE_FILTERS = ['all', 'active', 'blocked'] as const;

type UserStateFilter = (typeof USER_STATE_FILTERS)[number];

export type UserFilters = {
  search: string;
  role: AppRole | null;
  state: UserStateFilter;
  cityId: string | null;
};

type StaffUserRow = Database['public']['Functions']['admin_list_users']['Returns'][number];

type NullableUserColumn =
  'full_name' | 'phone' | 'inspector_city_id' | 'inspector_city_name' | 'block_reason';

export type StaffUser = NullableColumns<StaffUserRow, NullableUserColumn>;

export type InspectorExceptionKind = Enums<'inspector_exception_kind'>;

export type TimeRange = { startsAt: string; endsAt: string };

export type InspectorExceptionInsert = {
  inspectorId: string;
  kind: InspectorExceptionKind;
  startsAt: string;
  endsAt: string;
  note: string | null;
};

export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;
