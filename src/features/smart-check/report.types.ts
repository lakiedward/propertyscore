import type { z } from 'zod';
import type { getReport } from './api/smart-check.api';
import type {
  REPORT_CATEGORY_KEYS,
  REPORT_SECTION_SCHEMAS,
  reportSummarySchema,
} from './report.schemas';

export type ReportCategoryKey = (typeof REPORT_CATEGORY_KEYS)[number];

export type ReportSectionKey = keyof typeof REPORT_SECTION_SCHEMAS;

export type ReportSections = {
  [Key in ReportSectionKey]: z.infer<(typeof REPORT_SECTION_SCHEMAS)[Key]> | null;
};

export type ReportResult = z.infer<typeof reportSummarySchema> & {
  sections: ReportSections;
  unreadableSections: ReportSectionKey[];
};

export type Report = Awaited<ReturnType<typeof getReport>>;

export type ReadyReport = Report & { status: 'ready'; result: ReportResult };
