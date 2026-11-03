import { z } from 'zod';
import { AppError } from '@/lib/errors';
import { supabase } from '@/lib/supabase/client';
import type { Tables } from '@/lib/supabase/database.types';
import { toAppError } from '@/lib/supabase/errors';
import { reportResultSchema, shareTokenSchema } from '../online-report.schemas';

const ONLINE_REPORT_COLUMNS =
  'id, number, status, address_text, latitude, longitude, declared_rooms, declared_area_m2, declared_floor, declared_building_floors, declared_construction_year, overall_score, result, created_at, generated_at' as const;

const SHARE_LINK_COLUMNS = 'id, expires_at, created_at' as const;

const reportIdSchema = z.uuid();

type OnlineReportRow = Pick<
  Tables<'online_reports'>,
  | 'id'
  | 'number'
  | 'status'
  | 'address_text'
  | 'latitude'
  | 'longitude'
  | 'declared_rooms'
  | 'declared_area_m2'
  | 'declared_floor'
  | 'declared_building_floors'
  | 'declared_construction_year'
  | 'overall_score'
  | 'created_at'
  | 'generated_at'
> & { result: unknown };

function toOnlineReport(row: OnlineReportRow) {
  const { result, ...report } = row;
  if (report.status !== 'ready') return { ...report, result: null };

  const parsed = reportResultSchema.safeParse(result);
  if (!parsed.success) {
    throw new AppError('unknown', 'Online report result does not match its schema', {
      cause: parsed.error,
    });
  }
  return { ...report, result: parsed.data };
}

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
  return toOnlineReport(data);
}

export async function getSharedOnlineReport(id: string, token: string) {
  if (!reportIdSchema.safeParse(id).success || !shareTokenSchema.safeParse(token).success) {
    throw new AppError('not_found', 'Shared report link is malformed');
  }
  const { data, error } = await supabase
    .rpc('resolve_report_share_link', { p_report_id: id, p_token: token })
    .maybeSingle();
  if (error) throw toAppError(error);
  if (!data) throw new AppError('not_found', 'Shared report link is not valid');
  return toOnlineReport(data);
}

export async function getActiveShareLink(reportId: string) {
  const { data, error } = await supabase
    .from('report_share_links')
    .select(SHARE_LINK_COLUMNS)
    .eq('online_report_id', reportId)
    .is('revoked_at', null)
    .maybeSingle();
  if (error) throw toAppError(error);
  if (!data) return null;
  if (data.expires_at !== null && Date.parse(data.expires_at) <= Date.now()) return null;
  return data;
}

export async function createReportShareLink({
  reportId,
  expiresInDays,
}: {
  reportId: string;
  expiresInDays: number | null;
}) {
  const { data, error } = await supabase.rpc(
    'create_report_share_link',
    expiresInDays === null
      ? { p_report_id: reportId }
      : { p_report_id: reportId, p_expires_in_days: expiresInDays },
  );
  if (error) throw toAppError(error);
  return shareTokenSchema.parse(data);
}

export async function revokeReportShareLink(reportId: string) {
  const { error } = await supabase.rpc('revoke_report_share_link', { p_report_id: reportId });
  if (error) throw toAppError(error);
}
