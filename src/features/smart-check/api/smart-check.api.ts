import type {
  SharedReportPdfRequest,
  SharedReportPdfResponse,
} from '../../../../supabase/functions/_shared/types';
import { z } from 'zod';
import { AppError, type AppErrorReason } from '@/lib/errors';
import { supabase } from '@/lib/supabase/client';
import type { Tables } from '@/lib/supabase/database.types';
import { toAppError } from '@/lib/supabase/errors';
import { shareTokenSchema } from '../report.schemas';
import type { CheckOrder } from '../smart-check.schemas';
import { parseReportResult } from '../report.utils';

export const MY_REPORTS_PAGE_SIZE = 24;

const REPORT_COLUMNS =
  'id, number, status, address_text, latitude, longitude, declared_rooms, declared_area_m2, declared_floor, declared_building_floors, declared_construction_year, overall_score, result, pdf_path, created_at, generated_at' as const;

const MY_REPORT_COLUMNS =
  'id, number, status, address_text, overall_score, pdf_path, created_at, generated_at' as const;

const reportIdSchema = z.uuid();

const CREATE_REPORT_REASONS = new Map<string, AppErrorReason>([
  ['address_invalid', 'address_invalid'],
  ['location_invalid', 'location_invalid'],
  ['outside_coverage', 'smartcheck_outside_coverage'],
  ['no_ready_snapshot', 'no_ready_snapshot'],
  ['payment_required', 'payment_required'],
]);

type ReportRow = Pick<
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
  | 'pdf_path'
  | 'created_at'
  | 'generated_at'
> & { result: unknown };

function toReport({ result, ...report }: ReportRow) {
  if (report.status !== 'ready') return { ...report, result: null };
  const parsed = parseReportResult(result);
  if (!parsed) {
    throw new AppError('unknown', 'Online report result does not match its schema');
  }
  return { ...report, result: parsed };
}

export async function getReport(id: string) {
  if (!reportIdSchema.safeParse(id).success) {
    throw new AppError('not_found', 'Online report id is not a uuid');
  }
  const { data, error } = await supabase
    .from('online_reports')
    .select(REPORT_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw toAppError(error);
  if (!data) throw new AppError('not_found', 'Online report not found');
  return toReport(data);
}

export async function getSharedReport(id: string, token: string) {
  if (!reportIdSchema.safeParse(id).success || !shareTokenSchema.safeParse(token).success) {
    throw new AppError('not_found', 'Shared report link is malformed');
  }
  const { data, error } = await supabase
    .rpc('resolve_report_share_link', { p_report_id: id, p_token: token })
    .maybeSingle();
  if (error) throw toAppError(error);
  if (!data) throw new AppError('not_found', 'Shared report link is not valid');
  return toReport({ ...data, pdf_path: null });
}

export async function listMyReports(page = 0) {
  const from = page * MY_REPORTS_PAGE_SIZE;
  const { data, error, count } = await supabase
    .from('online_reports')
    .select(MY_REPORT_COLUMNS, { count: 'exact' })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(from, from + MY_REPORTS_PAGE_SIZE - 1);
  if (error) throw toAppError(error);
  return { items: data, total: count ?? data.length };
}

export async function hasUnlimitedSmartCheck(userId: string) {
  const { data, error } = await supabase
    .from('smartcheck_unlimited_accounts')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw toAppError(error);
  return data !== null;
}

export async function createOnlineReport(order: CheckOrder) {
  const { data, error } = await supabase.rpc('create_online_report', {
    p_address_text: order.address,
    p_latitude: order.latitude,
    p_longitude: order.longitude,
    p_locale: order.locale,
    p_declared_rooms: order.rooms,
    p_declared_area_m2: order.area,
    p_declared_floor: order.floor,
    p_declared_building_floors: order.floors,
    p_declared_has_elevator: order.elevator === undefined ? undefined : order.elevator === 'yes',
    p_declared_construction_year: order.year,
  });
  if (error) throw toAppError(error, CREATE_REPORT_REASONS);
  return data;
}

const SHARE_LINK_COLUMNS = 'id, expires_at, created_at' as const;

const sharedReportPdfResponseSchema = z.object({
  url: z.url(),
}) satisfies z.ZodType<SharedReportPdfResponse>;

export async function getActiveShareLink(reportId: string) {
  const { data, error } = await supabase
    .from('report_share_links')
    .select(SHARE_LINK_COLUMNS)
    .eq('online_report_id', reportId)
    .is('revoked_at', null)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw toAppError(error);
  return data;
}

export async function createShareLink({
  reportId,
  expiresInDays,
}: {
  reportId: string;
  expiresInDays: number | null;
}) {
  const { data, error } = await supabase.rpc('create_report_share_link', {
    p_report_id: reportId,
    p_expires_in_days: expiresInDays ?? undefined,
  });
  if (error) throw toAppError(error);
  return data;
}

export async function revokeShareLink(reportId: string) {
  const { error } = await supabase.rpc('revoke_report_share_link', { p_report_id: reportId });
  if (error) throw toAppError(error);
}

export async function getSharedReportPdfUrl(reportId: string, token: string) {
  const body: SharedReportPdfRequest = { reportId, token };
  const response = await supabase.functions.invoke<unknown>('shared-report-pdf', { body });
  const error: unknown = response.error;
  if (error) throw toAppError(error);
  const parsed = sharedReportPdfResponseSchema.safeParse(response.data);
  if (!parsed.success) {
    throw new AppError('unknown', 'Shared report PDF response does not match its schema');
  }
  return parsed.data.url;
}
