import { supabase } from '@/lib/supabase/client';
import { toAppError } from '@/lib/supabase/errors';
import type { InspectionEvent, MyInspection } from '../inspection.types';

export async function listMyInspections() {
  const { data, error } = await supabase.rpc('my_inspections');
  if (error) throw toAppError(error);
  const rows: readonly MyInspection[] = data;
  return rows;
}

export async function listInspectionHistory(inspectionId: string) {
  const { data, error } = await supabase.rpc('inspection_history', {
    p_inspection_id: inspectionId,
  });
  if (error) throw toAppError(error);
  const rows: readonly InspectionEvent[] = data;
  return rows;
}

export async function rescheduleInspection({
  inspectionId,
  startsAt,
}: {
  inspectionId: string;
  startsAt: string;
}) {
  const { error } = await supabase.rpc('reschedule_inspection', {
    p_inspection_id: inspectionId,
    p_starts_at: startsAt,
  });
  if (error) throw toAppError(error);
}

export async function cancelInspection(inspectionId: string) {
  const { error } = await supabase.rpc('cancel_inspection', { p_inspection_id: inspectionId });
  if (error) throw toAppError(error);
}
