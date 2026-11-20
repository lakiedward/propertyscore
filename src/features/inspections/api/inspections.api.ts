import { supabase } from '@/lib/supabase/client';
import { toAppError } from '@/lib/supabase/errors';
import type { AgendaInspection, AgendaRange } from '../inspection.types';

export async function listInspectorAgenda({ from, to }: AgendaRange) {
  const { data, error } = await supabase.rpc('inspector_agenda', { p_from: from, p_to: to });
  if (error) throw toAppError(error);
  const rows: readonly AgendaInspection[] = data;
  return rows;
}
