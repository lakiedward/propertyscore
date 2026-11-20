import { supabase } from '@/lib/supabase/client';
import { toAppError } from '@/lib/supabase/errors';
import type {
  AdminInspection,
  AdminInspector,
  InspectorBlock,
  WorkingRange,
} from '../inspection.types';

const WORKING_RANGE_COLUMNS = 'inspector_id, weekday, starts_at, ends_at' as const;

const BLOCK_COLUMNS = 'inspector_id, starts_at, ends_at' as const;

const BLOCKS_LIMIT = 500;

export async function listAdminInspections({
  from,
  to,
  cityId,
}: {
  from: string;
  to: string;
  cityId: string | null;
}) {
  const { data, error } = await supabase.rpc('admin_inspections', {
    p_from: from,
    p_to: to,
    ...(cityId ? { p_city_id: cityId } : {}),
  });
  if (error) throw toAppError(error);
  const rows: readonly AdminInspection[] = data;
  return rows;
}

export async function listUnassignedInspections(cityId: string | null) {
  const now = new Date().toISOString();
  const { data, error } = await supabase.rpc('admin_inspections', {
    p_from: now,
    p_to: now,
    p_unassigned_only: true,
    ...(cityId ? { p_city_id: cityId } : {}),
  });
  if (error) throw toAppError(error);
  const rows: readonly AdminInspection[] = data;
  return rows;
}

export async function listAdminInspectors(cityId: string | null) {
  const { data, error } = await supabase.rpc(
    'admin_inspectors',
    cityId ? { p_city_id: cityId } : {},
  );
  if (error) throw toAppError(error);
  const rows: readonly AdminInspector[] = data;
  return rows;
}

export async function listWorkingRanges(inspectorIds: readonly string[]) {
  if (inspectorIds.length === 0) {
    return [];
  }
  const { data, error } = await supabase
    .from('inspector_weekly_hours')
    .select(WORKING_RANGE_COLUMNS)
    .in('inspector_id', [...inspectorIds])
    .order('starts_at', { ascending: true });
  if (error) throw toAppError(error);
  const rows: readonly WorkingRange[] = data;
  return rows;
}

export async function listInspectorBlocks(
  inspectorIds: readonly string[],
  from: string,
  to: string,
) {
  if (inspectorIds.length === 0) {
    return [];
  }
  const { data, error } = await supabase
    .from('inspector_exceptions')
    .select(BLOCK_COLUMNS)
    .in('inspector_id', [...inspectorIds])
    .lt('starts_at', to)
    .gt('ends_at', from)
    .range(0, BLOCKS_LIMIT - 1);
  if (error) throw toAppError(error);
  const rows: readonly InspectorBlock[] = data;
  return rows;
}

export async function assignInspector({
  inspectionId,
  inspectorId,
}: {
  inspectionId: string;
  inspectorId: string;
}) {
  const { error } = await supabase.rpc('assign_inspector', {
    p_inspection_id: inspectionId,
    p_inspector_id: inspectorId,
  });
  if (error) throw toAppError(error);
}

export async function unassignInspector(inspectionId: string) {
  const { error } = await supabase.rpc('unassign_inspector', { p_inspection_id: inspectionId });
  if (error) throw toAppError(error);
}

export async function cancelInspectionAsAdmin({
  inspectionId,
  reason,
}: {
  inspectionId: string;
  reason: string;
}) {
  const { error } = await supabase.rpc('cancel_inspection', {
    p_inspection_id: inspectionId,
    p_reason: reason,
  });
  if (error) throw toAppError(error);
}
