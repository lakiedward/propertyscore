import type { ComponentType } from 'react';
import { REPORT_CHAPTERS, type ReportChapter } from '../../report-chapters';
import { SummaryChapter } from './chapters/summary-chapter';
import { SafetyChapter } from './chapters/safety-chapter';
import { AccessibilityChapter } from './chapters/accessibility-chapter';
import { FifteenMinuteChapter } from './chapters/fifteen-minute-chapter';
import { GreenChapter } from './chapters/green-chapter';
import { NoiseChapter } from './chapters/noise-chapter';
import { AirIndustryChapter } from './chapters/air-industry-chapter';
import { SeismicChapter } from './chapters/seismic-chapter';
import { InvestmentChapter } from './chapters/investment-chapter';
import { ClosingChapter } from './chapters/closing-chapter';
import type { ReportChapterProps } from './report-chapter-props';

const CHAPTER_COMPONENTS: Record<ReportChapter, ComponentType<ReportChapterProps>> = {
  summary: SummaryChapter,
  safety: SafetyChapter,
  accessibility: AccessibilityChapter,
  fifteenMinute: FifteenMinuteChapter,
  green: GreenChapter,
  noise: NoiseChapter,
  airIndustry: AirIndustryChapter,
  seismic: SeismicChapter,
  investment: InvestmentChapter,
  closing: ClosingChapter,
};

export function ReportChapters({ report }: ReportChapterProps) {
  return REPORT_CHAPTERS.map((chapter) => {
    const Chapter = CHAPTER_COMPONENTS[chapter];
    return <Chapter key={chapter} report={report} />;
  });
}
