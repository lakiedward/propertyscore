import type { Enums } from '@/lib/supabase/database.types';

type ReportStatus = Enums<'online_report_status'>;

export const REPORT_STATUS_TONE = {
  pending_payment: 'warning',
  generating: 'info',
  ready: 'success',
  failed: 'error',
} as const satisfies Record<ReportStatus, 'warning' | 'info' | 'success' | 'error'>;
