import { z } from 'zod';
import { AppError } from '@/lib/errors';
import { supabase } from '@/lib/supabase/client';
import { toAppError } from '@/lib/supabase/errors';
import { reportResultSchema } from '../online-report.schemas';

const ONLINE_REPORT_COLUMNS =
  'id, number, status, address_text, latitude, longitude, declared_rooms, declared_area_m2, declared_floor, declared_building_floors, declared_construction_year, overall_score, result, created_at, generated_at' as const;

const reportIdSchema = z.uuid();

export async function getOnlineReport(id: string) {
  if (!reportIdSchema.safeParse(id).success) {
    throw new AppError('not_found', 'Online report id is not a uuid');
  }
  const { data, error } = await supabase
    .from('online_reports')
    .select(ONLINE_REPORT_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw toAppError(error);
  if (!data) throw new AppError('not_found', 'Online report not found');

  const { result, ...report } = data;
  if (report.status !== 'ready') return { ...report, result: null };

  const parsed = reportResultSchema.safeParse(result);
  if (!parsed.success) {
    throw new AppError('unknown', 'Online report result does not match its schema', {
      cause: parsed.error,
    });
  }
  return { ...report, result: parsed.data };
}
