import { Trans, useTranslation } from 'react-i18next';
import { ReportChapterHead } from '@/components/report/report-chapter-head';
import { formatNumber } from '@/i18n/format';
import {
  analysisRadiusKm,
  reportContexts,
  scoredCategories,
  weakestCategory,
  zonePosition,
} from '../../../report-summary.utils';
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
  const hasScores = scored.length > 0;
  const weak = weakestCategory(scored);
  const zoneScore = result.zone.score === null ? null : Math.round(result.zone.score);
  const position = t(`report.chapters.summary.position.${zonePosition(result.zone.percentile)}`, {
    city: result.city.name,
  });

  const contexts = reportContexts(result);
  const contextsKey = contexts.length === 2 ? 'both' : (contexts[0] ?? null);
  const radius = formatNumber(analysisRadiusKm(result), { maximumFractionDigits: 1 });
  const lead = hasScores
    ? [
        contextsKey === null
          ? t('report.chapters.summary.leadNoContext', { count: scored.length, radius })
          : t('report.chapters.summary.lead', {
              count: scored.length,
              radius,
              contexts: t(`report.chapters.summary.contexts.${contextsKey}`),
            }),
        zoneScore === null || result.zone.city_avg === null
          ? null
          : t('report.chapters.summary.leadZone', {
              score: zoneScore,
              average: Math.round(result.zone.city_avg),
            }),
        t('report.chapters.summary.leadEnd'),
      ]
        .filter(Boolean)
        .join(' ')
    : contextsKey === null
      ? undefined
      : t('report.chapters.summary.leadContextOnly', {
          contexts: t(`report.chapters.summary.contexts.${contextsKey}`),
        });

  return (
    <section aria-labelledby={SUMMARY_TITLE_ID} className="grid max-w-default min-w-0 gap-4">
      <ReportChapterHead
        hue="summary"
        titleId={SUMMARY_TITLE_ID}
        titleClassName="max-w-[22ch]"
        eyebrow={t('report.chapters.summary.eyebrow')}
        badge={t('report.chapters.summary.badge', {
          scores: t('report.chapters.summary.badgeScores', { count: scored.length }),
          contexts: t('report.chapters.summary.badgeContexts', { count: contexts.length }),
        })}
        title={
          !hasScores ? (
            t('report.chapters.summary.headlineNoScores')
          ) : weak ? (
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
        lead={lead}
      />
      <SummaryHighlights
        scored={scored}
        cityName={result.city.name}
        onOpenChapter={onOpenChapter}
      />
      {hasScores ? (
        <>
          <SummaryMapBand report={report} />
          <AllScoresCard scored={scored} zoneScore={zoneScore} onOpenChapter={onOpenChapter} />
          <ZoneFormationCard result={result} scored={scored} onOpenChapter={onOpenChapter} />
        </>
      ) : null}
    </section>
  );
}
