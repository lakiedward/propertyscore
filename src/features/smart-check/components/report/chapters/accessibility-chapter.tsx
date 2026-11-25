import { Trans, useTranslation } from 'react-i18next';
import { ChapterSources } from '@/components/report/chapter-sources';
import { ChapterScoreCard } from '@/components/report/chapter-score-card';
import { ReportChapterHead } from '@/components/report/report-chapter-head';
import { scoreBand } from '@/components/report/score-bands';
import { formatDate, formatList, formatNumber } from '@/i18n/format';
import { scoredCategories } from '../../../report-summary.utils';
import { gtfsReferenceDate, nearestStopsSummary } from '../../../accessibility.utils';
import type { ReportChapterProps } from '../report-chapter-props';
import { AccessibilityReachCard } from '../accessibility/accessibility-reach-card';
import { AccessibilityRouteCard } from '../accessibility/accessibility-route-card';

const TITLE_ID = 'report-chapter-accessibility';
const SOURCE_KEYS = ['osm', 'gtfs', 'walk_routing'] as const;
const DATE_FORMAT = { day: 'numeric', month: 'short', year: 'numeric' } as const;

export function AccessibilityChapter({ report }: ReportChapterProps) {
  const { t } = useTranslation('smartCheck');
  const { result } = report;
  const section = result.sections.accessibility;
  const category = result.categories.accessibility;
  if (category?.score == null || !section) {
    return (
      <section aria-labelledby={TITLE_ID}>
        <ReportChapterHead
          hue="accessibility"
          titleId={TITLE_ID}
          eyebrow={t('report.categories.accessibility.name')}
          title={t('report.chapters.accessibility.headlineNoData')}
        />
      </section>
    );
  }

  const score = Math.round(category.score);
  const average = category.city_avg === null ? null : Math.round(category.city_avg);
  const band = scoreBand(score);
  const summary = nearestStopsSummary(section);

  const title =
    summary.stops === 0
      ? t('report.chapters.accessibility.titleNoStops')
      : t('report.chapters.accessibility.title', {
          stops: t('report.chapters.accessibility.stopsPhrase', {
            count: summary.stops,
            minutes: summary.walkMinutes,
          }),
          lines: t('report.chapters.accessibility.linesPhrase', { count: summary.lines }),
        });

  const lead =
    average === null || category.percentile == null
      ? t('report.chapters.accessibility.leadPlain')
      : t('report.chapters.accessibility.lead', {
          average,
          percent: Math.round(category.percentile),
        });

  const referenceDate = gtfsReferenceDate(section);
  const timetableDate = referenceDate
    ? formatDate(referenceDate, { ...DATE_FORMAT, timeZone: 'UTC' })
    : null;
  const sourceNote = timetableDate
    ? t('report.chapters.accessibility.sourceTimetable', { date: timetableDate })
    : t(
        section.data_quality === 'gtfs'
          ? 'report.chapters.accessibility.sourceTimetableUndated'
          : 'report.chapters.accessibility.sourceOsm',
      );

  const scored = scoredCategories(result);
  const item = scored.find((entry) => entry.key === 'accessibility');
  const weightTotal = scored.reduce((sum, entry) => sum + entry.weight, 0) || 1;
  const weight = item ? (item.weight / weightTotal) * 100 : null;
  const sources = SOURCE_KEYS.flatMap((key) => {
    const date = key === 'gtfs' ? timetableDate : result.snapshot.source_dates[key];
    if (!date) return [];
    const formatted =
      key !== 'gtfs' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? formatDate(date, DATE_FORMAT) : date;
    return [`${t(`report.chapters.accessibility.sources.${key}`)} · ${formatted}`];
  });

  return (
    <section aria-labelledby={TITLE_ID} className="grid min-w-0 gap-4">
      <ReportChapterHead
        hue="accessibility"
        titleId={TITLE_ID}
        isEyebrowColored
        eyebrow={t('report.chapters.accessibility.eyebrow', {
          score,
          band: t(`report.bands.${band}`),
        })}
        badge={t('report.chapters.accessibility.badge')}
        title={title}
        lead={lead}
      />
      <AccessibilityRouteCard report={report} section={section} sourceNote={sourceNote} />
      <ChapterScoreCard
        hue="accessibility"
        score={score}
        average={average}
        range={
          category.city_min == null || category.city_max == null
            ? null
            : { min: Math.round(category.city_min), max: Math.round(category.city_max) }
        }
        headline={
          category.percentile == null ? null : (
            <Trans
              t={t}
              i18nKey="report.chapters.accessibility.scoreHeadline"
              values={{ percent: Math.round(category.percentile) }}
              components={{ b: <b className="font-extrabold text-report-accessibility" /> }}
            />
          )
        }
        bandLabel={t(`report.bands.${band}`)}
        youLabel={t('report.chapters.accessibility.scoreYou', { score })}
        averageLabel={
          average === null ? null : t('report.chapters.accessibility.scoreAverage', { average })
        }
        rangeLabel={
          category.city_min == null || category.city_max == null
            ? null
            : t('report.chapters.accessibility.scoreRange', {
                min: Math.round(category.city_min),
                max: Math.round(category.city_max),
              })
        }
        measures={{
          included: (
            <Trans
              t={t}
              i18nKey="report.chapters.accessibility.measuresIncluded"
              components={{ b: <b className="font-bold text-foreground" /> }}
            />
          ),
          excluded: (
            <Trans
              t={t}
              i18nKey="report.chapters.accessibility.measuresExcluded"
              components={{ b: <b className="font-bold text-foreground" /> }}
            />
          ),
        }}
      />
      <AccessibilityReachCard report={report} section={section} />
      <ChapterSources title={t('report.chapters.accessibility.sources.title')}>
        {sources.length > 0 ? (
          <p>
            <Trans
              t={t}
              i18nKey="report.chapters.accessibility.sources.list"
              values={{ sources: formatList(sources) }}
              components={{ strong: <b /> }}
            />
          </p>
        ) : null}
        {weight !== null && item ? (
          <p>
            <Trans
              t={t}
              i18nKey="report.chapters.accessibility.sources.weight"
              values={{
                weight: formatNumber(weight, { maximumFractionDigits: 0 }),
                points: formatNumber((item.score * weight) / 100, { maximumFractionDigits: 1 }),
              }}
              components={{ strong: <b /> }}
            />
          </p>
        ) : null}
        <p>{t('report.chapters.accessibility.sources.same')}</p>
      </ChapterSources>
    </section>
  );
}
