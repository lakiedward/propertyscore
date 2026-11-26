import workerExampleReport from '../../../worker/src/report-pdf/fixtures/example-report.json';
import { REPORT_SECTION_SCHEMAS } from './report.schemas';
import { parseReportResult } from './report.utils';

describe('report contract with the worker', () => {
  it('reads every section of the report the worker renders as a PDF', () => {
    const result = parseReportResult(workerExampleReport.result);

    expect(result).not.toBeNull();
    expect(result?.unreadableSections).toEqual([]);
    for (const key of Object.keys(REPORT_SECTION_SCHEMAS)) {
      if (key in workerExampleReport.result) {
        expect(result?.sections[key as keyof typeof REPORT_SECTION_SCHEMAS]).not.toBeNull();
      }
    }
  });
});
