import type { JsonObject } from '../../db/sql.ts';
import { sectionParams } from '../../report/cell-category.ts';
import { readDeclaredDetails } from '../../report/declared.ts';
import type { ReportSection } from '../../report/report-section.ts';
import { questionCodes } from './questions.formula.ts';
import { parseQuestionsParams } from './questions.params.ts';

export const questionsReportSection: ReportSection = {
  key: 'questions',
  build: async ({ sql, reportId, params }) => {
    const raw = sectionParams(params, 'questions');
    if (raw === undefined) return null;
    const declared = await readDeclaredDetails(sql, reportId);
    const section: JsonObject = {
      schema_version: 1,
      status: 'context',
      codes: questionCodes(declared, parseQuestionsParams(raw)),
    };
    return section;
  },
};
