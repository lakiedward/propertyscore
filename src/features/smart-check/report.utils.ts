import { z } from 'zod';
import { REPORT_SECTION_SCHEMAS, reportSummarySchema } from './report.schemas';
import type { ReportResult, ReportSectionKey, ReportSections } from './report.types';

const resultObjectSchema = z.record(z.string(), z.unknown());

const sectionStatusSchema = z.object({ status: z.string() });

function readSection<Key extends ReportSectionKey>(
  key: Key,
  result: Record<string, unknown>,
  unreadable: ReportSectionKey[],
): ReportSections[Key] {
  const raw = result[key];
  if (raw === undefined || raw === null) return null;
  const status = sectionStatusSchema.safeParse(raw);
  if (status.success && status.data.status === 'no_data') return null;
  const parsed = REPORT_SECTION_SCHEMAS[key].safeParse(raw);
  if (parsed.success) return parsed.data as ReportSections[Key];
  unreadable.push(key);
  return null;
}

export function parseReportResult(result: unknown): ReportResult | null {
  const summary = reportSummarySchema.safeParse(result);
  const raw = resultObjectSchema.safeParse(result);
  if (!summary.success || !raw.success) return null;
  const unreadableSections: ReportSectionKey[] = [];
  const section = <Key extends ReportSectionKey>(key: Key) =>
    readSection(key, raw.data, unreadableSections);
  return {
    ...summary.data,
    sections: {
      safety: section('safety'),
      accessibility: section('accessibility'),
      fifteen_minute: section('fifteen_minute'),
      green: section('green'),
      noise: section('noise'),
      air: section('air'),
      industry: section('industry'),
      education: section('education'),
      health: section('health'),
      seismic: section('seismic'),
      investment: section('investment'),
      questions: section('questions'),
    },
    unreadableSections,
  };
}

export function isReadyReport<T extends { status: string; result: ReportResult | null }>(
  report: T,
): report is T & { status: 'ready'; result: ReportResult } {
  return report.status === 'ready' && report.result !== null;
}
