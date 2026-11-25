import type { ReportChapterProps } from '../report-chapter-props';
import { ClosingMethod } from './closing/closing-method';
import { ClosingNextStep } from './closing/closing-next-step';

export function ClosingChapter({ report }: ReportChapterProps) {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5.5">
      <ClosingNextStep report={report} />
      <ClosingMethod report={report} />
    </div>
  );
}
