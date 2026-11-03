import { accessibilityReportSection } from '../scoring/accessibility/accessibility.report.ts';
import { airReportSection } from '../scoring/air/air.report.ts';
import { educationReportSection } from '../scoring/education/education.report.ts';
import { fifteenMinuteReportSection } from '../scoring/fifteen-minute/fifteen-minute.report.ts';
import { greenReportSection } from '../scoring/green/green.report.ts';
import { healthReportSection } from '../scoring/health/health.report.ts';
import { industryReportSection } from '../scoring/industry/industry.report.ts';
import { noiseReportSection } from '../scoring/noise/noise.report.ts';
import { safetyReportSection } from '../scoring/safety/safety.report.ts';
import type { ReportSection } from './report-section.ts';

export const REPORT_SECTIONS: readonly ReportSection[] = [
  safetyReportSection,
  accessibilityReportSection,
  fifteenMinuteReportSection,
  greenReportSection,
  noiseReportSection,
  airReportSection,
  industryReportSection,
  educationReportSection,
  healthReportSection,
];
