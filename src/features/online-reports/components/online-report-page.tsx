import { useSuspenseQuery } from '@tanstack/react-query';
import { useRef } from 'react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { onlineReportQueries } from '../api/online-reports.queries';
import {
  CATEGORY_KEYS,
  CHAPTER_IDS,
  chapterScore,
  isScoreChapter,
  nextChapter,
  reportCode,
  scoredCategories,
  type ChapterId,
} from '../online-report.utils';
import type { OnlineReport, ReportResult } from '../online-report.types';
import { oneOf } from '@/lib/utils';
import { CategoryChapter } from './category-chapter';
import { ChapterTabs } from './chapter-tabs';
import { NextChapterButton } from './next-chapter-button';
import { ReportHeader } from './report-header';
import { ReportMap } from './report-map';
import { ReportMethod } from './report-method';
import { ReportStatus } from './report-status';
import { SummaryChapter } from './summary-chapter';
import { ZoneScoreCard } from './zone-score-card';

type OnlineReportPageProps = {
  reportId: string;
  chapter: ChapterId;
  onChapterChange: (chapter: ChapterId) => void;
};

export function OnlineReportPage({ reportId, chapter, onChapterChange }: OnlineReportPageProps) {
  const { data: report } = useSuspenseQuery(onlineReportQueries.detail(reportId));

  if (report.result === null || report.status !== 'ready') {
    return (
      <ReportStatus
        status={report.status === 'ready' ? 'generating' : report.status}
        addressText={report.address_text}
      />
    );
  }

  return (
    <ReadyReport
      report={report}
      result={report.result}
      chapter={chapter}
      onChapterChange={onChapterChange}
    />
  );
}

type ReadyReportProps = {
  report: OnlineReport;
  result: ReportResult;
  chapter: ChapterId;
  onChapterChange: (chapter: ChapterId) => void;
};

function ReadyReport({ report, result, chapter, onChapterChange }: ReadyReportProps) {
  const tabsRef = useRef<HTMLDivElement>(null);
  const { categories, zone } = result;
  const following = nextChapter(chapter);
  const totalWeight = CATEGORY_KEYS.reduce(
    (sum, key) => sum + (result.formula.weights[key] ?? 0),
    0,
  );

  const openChapter = (next: ChapterId) => {
    onChapterChange(next);
    tabsRef.current?.scrollIntoView({ block: 'start' });
  };

  return (
    <>
      <ReportHeader
        addressText={report.address_text}
        code={reportCode(report.number, report.created_at)}
        generatedAt={report.generated_at ?? report.created_at}
        period={result.snapshot.period}
        formulaLabel={result.formula.label}
        declared={report}
        scoreCard={
          <ZoneScoreCard
            score={zone.score}
            percentile={zone.percentile}
            cityName={result.city.name}
            scoredCount={scoredCategories(categories).length}
          />
        }
      />
      <Tabs
        ref={tabsRef}
        value={chapter}
        onValueChange={(value) => {
          const next = oneOf(CHAPTER_IDS, value);
          if (next) onChapterChange(next);
        }}
        className="scroll-mt-28 gap-0"
      >
        <ChapterTabs scoreOf={(id) => chapterScore(id, zone.score, categories)} />
        <div className="mx-auto grid w-full max-w-wide items-start gap-7 px-gutter py-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:py-12">
          <div className="order-2 min-w-0 lg:order-1">
            {CHAPTER_IDS.map((id) => (
              <TabsContent key={id} value={id} className="flex flex-col gap-5 text-base">
                {isScoreChapter(id) ? (
                  <CategoryChapter
                    chapter={id}
                    categories={categories}
                    cityName={result.city.name}
                    totalWeight={totalWeight}
                  />
                ) : (
                  <SummaryChapter categories={categories} onOpenChapter={openChapter} />
                )}
                {following ? <NextChapterButton chapter={following} onOpen={openChapter} /> : null}
              </TabsContent>
            ))}
          </div>
          {report.longitude !== null && report.latitude !== null ? (
            <div className="order-1 lg:sticky lg:top-32 lg:order-2">
              <ReportMap position={[report.longitude, report.latitude]} />
            </div>
          ) : null}
        </div>
      </Tabs>
      <ReportMethod
        sourceDates={result.snapshot.source_dates}
        weights={result.formula.weights}
        formulaLabel={result.formula.label}
        period={result.snapshot.period}
      />
    </>
  );
}
