import { Trans, useTranslation } from 'react-i18next';
import { ReportChapterHead } from '@/components/report/report-chapter-head';
import { scoredCategories, weakestCategory, zonePosition } from '../../../report-summary.utils';
import type { ReportChapterProps } from '../report-chapter-props';
import { AllScoresCard } from '../summary/all-scores-card';
import { SummaryHighlights } from '../summary/summary-highlights';
import { SummaryMapBand } from '../summary/summary-map-band';
import { ZoneFormationCard } from '../summary/zone-formation-card';

const SUMMARY_TITLE_ID = 'report-chapter-summary';

export function SummaryChapter({ report, onOpenChapter }: ReportChapterProps) {
  const { t } = useTranslation('smartCheck');
  const { result } = report;
  const scored = scoredCategories(result);
  const weak = weakestCategory(scored);
  const zoneScore = result.zone.score === null ? null : Math.round(result.zone.score);
  const position = t(`report.chapters.summary.position.${zonePosition(result.zone.percentile)}`, {
    city: result.city.name,
  });

  return (
    <section aria-labelledby={SUMMARY_TITLE_ID} className="grid max-w-default min-w-0 gap-4">
      <ReportChapterHead
        hue="summary"
        titleId={SUMMARY_TITLE_ID}
        eyebrow={t('report.chapters.summary.eyebrow')}
        badge={t('report.chapters.summary.badge', { count: scored.length })}
        title={
          weak ? (
            <Trans
              t={t}
              i18nKey="report.chapters.summary.headlineWeak"
              values={{
                position,
                weak: t(`report.categories.${weak.key}.weakness`),
              }}
              components={{
                mark: <mark className="bg-transparent marker-cta px-[0.04em] text-inherit" />,
              }}
            />
          ) : (
            position
          )
        }
        lead={[
          t('report.chapters.summary.lead', { count: scored.length }),
          zoneScore === null || result.zone.city_avg === null
            ? null
            : t('report.chapters.summary.leadZone', {
                score: zoneScore,
                average: Math.round(result.zone.city_avg),
              }),
          t('report.chapters.summary.leadEnd'),
        ]
          .filter(Boolean)
          .join(' ')}
      />
      <SummaryHighlights
        scored={scored}
        cityName={result.city.name}
        onOpenChapter={onOpenChapter}
      />
      <SummaryMapBand report={report} />
      <AllScoresCard scored={scored} zoneScore={zoneScore} onOpenChapter={onOpenChapter} />
      <ZoneFormationCard result={result} scored={scored} onOpenChapter={onOpenChapter} />
    </section>
  );
}
