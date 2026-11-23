import { FREIDORF_REPORT_RESULT } from '@/test/factories/smart-check-report';
import { parseReportResult } from './report.utils';

function freidorfWith(changes: Record<string, unknown>) {
  return { ...FREIDORF_REPORT_RESULT, ...changes };
}

describe('parseReportResult', () => {
  it('reads every section of the real Freidorf report', () => {
    const result = parseReportResult(FREIDORF_REPORT_RESULT);

    expect(result).not.toBeNull();
    expect(result?.unreadableSections).toEqual([]);
    expect(result?.city).toEqual({ slug: 'timisoara', name: 'Timișoara' });
    expect(result?.zone.score).toBe(46);
    expect(Object.values(result?.sections ?? {}).every((section) => section !== null)).toBe(true);
  });

  it('leaves a section without data empty without marking it unreadable', () => {
    const result = parseReportResult(freidorfWith({ investment: { status: 'no_data' } }));

    expect(result?.sections.investment).toBeNull();
    expect(result?.unreadableSections).toEqual([]);
  });

  it('marks a broken section unreadable and keeps the others', () => {
    const result = parseReportResult(freidorfWith({ air: { status: 'scored', months: 'x' } }));

    expect(result?.sections.air).toBeNull();
    expect(result?.sections.safety).not.toBeNull();
    expect(result?.unreadableSections).toEqual(['air']);
  });

  it('rejects a result without its summary', () => {
    expect(parseReportResult(freidorfWith({ city: null }))).toBeNull();
    expect(parseReportResult('report')).toBeNull();
  });
});
