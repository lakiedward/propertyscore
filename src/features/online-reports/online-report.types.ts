import type { z } from 'zod';
import type { getOnlineReport } from './api/online-reports.api';
import type { reportResultSchema } from './online-report.schemas';

export type ReportResult = z.infer<typeof reportResultSchema>;

export type OnlineReport = Awaited<ReturnType<typeof getOnlineReport>>;
