import type { ReportTab } from '../../report-chapter-meta';
import type { ReadyReport } from '../../report.types';

export type ReportChapterProps = {
  report: ReadyReport;
  shareToken?: string;
  onOpenChapter: (tab: ReportTab) => void;
};
