import { airReportSection } from '../scoring/air/air.report.ts';
import { greenReportSection } from '../scoring/green/green.report.ts';
import { industryReportSection } from '../scoring/industry/industry.report.ts';
import { noiseReportSection } from '../scoring/noise/noise.report.ts';
import type { ReportSection } from './report-section.ts';

export const REPORT_SECTIONS: readonly ReportSection[] = [
  greenReportSection,
  noiseReportSection,
  airReportSection,
  industryReportSection,
];
