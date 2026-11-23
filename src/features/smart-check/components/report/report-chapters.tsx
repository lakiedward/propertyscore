import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { NextChapterCard } from '@/components/report/next-chapter-card';
import { REPORT_TAB_META, nextTab, type ReportTab } from '../../report-chapter-meta';
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

const CHAPTER_COMPONENTS: Record<ReportTab, ComponentType<ReportChapterProps>> = {
  summary: SummaryChapter,
  safety: SafetyChapter,
  accessibility: AccessibilityChapter,
  fifteenMinute: FifteenMinuteChapter,
  green: GreenChapter,
  noise: NoiseChapter,
  airIndustry: AirIndustryChapter,
  seismic: SeismicChapter,
  investment: InvestmentChapter,
};

type ReportChaptersProps = ReportChapterProps & {
  chapter: ReportTab;
  panelId: string;
};

export function ReportChapters({ report, chapter, panelId, onOpenChapter }: ReportChaptersProps) {
  const { t } = useTranslation('smartCheck');
  const Chapter = CHAPTER_COMPONENTS[chapter];
  const next = nextTab(chapter);

  const nextCard = () => {
    if (!next) return null;
    const title = t(`report.frame.tabs.names.${next}`);
    const eyebrow = t('report.frame.next.eyebrow');
    const handleOpen = () => {
      onOpenChapter(next);
    };
    if (chapter !== 'summary') {
      return (
        <NextChapterCard variant="forest" eyebrow={eyebrow} title={title} onOpen={handleOpen} />
      );
    }
    const meta = REPORT_TAB_META[next];
    const category = meta.category === null ? undefined : report.result.categories[meta.category];
    const detail =
      category?.score != null && category.city_avg !== null
        ? t('report.frame.next.score', {
            score: Math.round(category.score),
            average: Math.round(category.city_avg),
          })
        : undefined;
    return (
      <NextChapterCard
        variant="featured"
        icon={meta.icon}
        hue={meta.hue}
        eyebrow={eyebrow}
        title={title}
        detail={detail}
        actionLabel={t('report.frame.next.open')}
        onOpen={handleOpen}
        className="max-w-default"
      />
    );
  };

  return (
    <div className="mx-auto flex max-w-report flex-col gap-16 px-4 pt-9 pb-18">
      <div
        id={panelId}
        role="tabpanel"
        aria-labelledby={`report-tab-${chapter}`}
        tabIndex={-1}
        className="flex flex-col gap-4 focus-visible:outline-none"
      >
        <Chapter report={report} onOpenChapter={onOpenChapter} />
        {nextCard()}
      </div>
      <ClosingChapter report={report} onOpenChapter={onOpenChapter} />
    </div>
  );
}
