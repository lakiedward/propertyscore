import { useSuspenseQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
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
import { usePrintMode } from '@/hooks/use-print-mode';
import { oneOf } from '@/lib/utils';
import { CategoryChapter } from './category-chapter';
import { ChapterTabs } from './chapter-tabs';
import { GreenChapter } from './green-chapter';
import { NextChapterButton } from './next-chapter-button';
import { ReportHeader } from './report-header';
import { ReportMap } from './report-map';
import { ReportMethod } from './report-method';
import { ReportPdfButton } from './report-pdf-button';
import { ReportShareDialog } from './report-share-dialog';
import { ReportStatus } from './report-status';
import { SummaryChapter } from './summary-chapter';
import { ZoneScoreCard } from './zone-score-card';

type OnlineReportPageProps = {
  reportId: string;
  shareToken?: string;
  chapter: ChapterId;
  onChapterChange: (chapter: ChapterId) => void;
};

export function OnlineReportPage({
  reportId,
  shareToken,
  chapter,
  onChapterChange,
}: OnlineReportPageProps) {
  const { data: report } = useSuspenseQuery(
    shareToken === undefined
      ? onlineReportQueries.detail(reportId)
      : onlineReportQueries.shared(reportId, shareToken),
  );

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
      isShared={shareToken !== undefined}
      chapter={chapter}
      onChapterChange={onChapterChange}
    />
  );
}

type ReadyReportProps = {
  report: OnlineReport;
  result: ReportResult;
  isShared: boolean;
  chapter: ChapterId;
  onChapterChange: (chapter: ChapterId) => void;
};

function ReadyReport({ report, result, isShared, chapter, onChapterChange }: ReadyReportProps) {
  const tabsRef = useRef<HTMLDivElement>(null);
  const isPrinting = usePrintMode();
  const { categories, zone } = result;
  const green = result.green?.status === 'scored' ? result.green : undefined;
  const [greenRadiusM, setGreenRadiusM] = useState(green?.near_radius_m ?? 500);
  const [selectedParkId, setSelectedParkId] = useState<string | null>(null);
  const isGreenChapter = chapter === 'green' && green !== undefined;
  const selectPark = (parkId: string) => {
    setSelectedParkId((current) => (current === parkId ? null : parkId));
  };
  const following = nextChapter(chapter);
  const totalWeight = CATEGORY_KEYS.reduce(
    (sum, key) => sum + (result.formula.weights[key] ?? 0),
    0,
  );

  const openChapter = (next: ChapterId) => {
    onChapterChange(next);
    tabsRef.current?.scrollIntoView({ block: 'start' });
  };

  const renderChapter = (id: ChapterId) =>
    isScoreChapter(id) ? (
      <CategoryChapter
        chapter={id}
        categories={categories}
        cityName={result.city.name}
        totalWeight={totalWeight}
        details={
          id === 'green' && green ? (
            <GreenChapter
              section={green}
              radiusM={greenRadiusM}
              onRadiusChange={setGreenRadiusM}
              selectedParkId={selectedParkId}
              onSelectPark={selectPark}
            />
          ) : undefined
        }
      />
    ) : (
      <SummaryChapter categories={categories} onOpenChapter={openChapter} />
    );

  return (
    <>
      <ReportHeader
        addressText={report.address_text}
        code={reportCode(report.number, report.created_at)}
        generatedAt={report.generated_at ?? report.created_at}
        period={result.snapshot.period}
        formulaLabel={result.formula.label}
        declared={report}
        isShared={isShared}
        actions={
          <>
            <ReportPdfButton />
            {isShared ? null : <ReportShareDialog reportId={report.id} />}
          </>
        }
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
            {isPrinting
              ? CHAPTER_IDS.map((id) => (
                  <div
                    key={id}
                    className="flex flex-col gap-5 border-border pb-10 text-base not-first:border-t not-first:pt-10"
                  >
                    {renderChapter(id)}
                  </div>
                ))
              : CHAPTER_IDS.map((id) => (
                  <TabsContent key={id} value={id} className="flex flex-col gap-5 text-base">
                    {renderChapter(id)}
                    {following ? (
                      <NextChapterButton chapter={following} onOpen={openChapter} />
                    ) : null}
                  </TabsContent>
                ))}
          </div>
          {report.longitude !== null && report.latitude !== null ? (
            <div className="order-1 lg:sticky lg:top-32 lg:order-2">
              <ReportMap
                position={[report.longitude, report.latitude]}
                green={
                  isGreenChapter
                    ? {
                        areas: green.areas,
                        parks: green.parks,
                        radiusM: greenRadiusM,
                        selectedParkId,
                        onSelectPark: selectPark,
                      }
                    : undefined
                }
              />
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
