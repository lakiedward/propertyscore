import { viewingQuestions } from '../../../viewing-questions.utils';
import type { ReportChapterProps } from '../report-chapter-props';
import { ClosingMethod } from './closing/closing-method';
import { ClosingNextStep } from './closing/closing-next-step';
import { ClosingQuestions } from './closing/closing-questions';

export function ClosingChapter({ report, onOpenChapter }: ReportChapterProps) {
  const questions = viewingQuestions(report.result.sections.questions?.codes ?? []);

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5.5">
      <ClosingQuestions questions={questions} onOpenChapter={onOpenChapter} />
      <ClosingNextStep report={report} />
      <ClosingMethod report={report} />
    </div>
  );
}
