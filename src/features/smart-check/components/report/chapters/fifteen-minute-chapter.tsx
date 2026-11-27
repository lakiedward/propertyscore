import { Trans, useTranslation } from 'react-i18next';
import { ChapterScoreCard } from '@/components/report/chapter-score-card';
import { ChapterSources } from '@/components/report/chapter-sources';
import { ReportChapterHead } from '@/components/report/report-chapter-head';
import { scoreBand } from '@/components/report/score-bands';
import { formatDate, formatList, formatNumber } from '@/i18n/format';
import { WALK_LIMIT_MIN, formatSourceDate, walkingTimeMethod } from '../../../fifteen-minute.utils';
import { scoredCategories, standing } from '../../../report-summary.utils';
import type { ReportChapterProps } from '../report-chapter-props';
import { FifteenMinuteChoiceCard } from './fifteen-minute/fifteen-minute-choice-card';
import { FifteenMinutePlaces } from './fifteen-minute/fifteen-minute-places';

const TITLE_ID = 'report-chapter-fifteen-minute';
export function FifteenMinuteChapter({ report, shareToken }: ReportChapterProps) {
  const { t } = useTranslation('smartCheck');
  const { result } = report;
  const summary = result.categories.fifteen_minute;
  const section = result.sections.fifteen_minute;
  const method = walkingTimeMethod(section?.distance_method);
  const scored = scoredCategories(result);
  const item = scored.find((entry) => entry.key === 'fifteen_minute');
  const band = item ? scoreBand(item.score) : null;
  const cityName = result.city.name;
  const limit = WALK_LIMIT_MIN;

  const title = !section
    ? t('report.chapters.fifteenMinute.headline.none', { limit })
    : section.covered === section.total
      ? t('report.chapters.fifteenMinute.headline.all', { count: section.total, limit })
      : t('report.chapters.fifteenMinute.headline.some', {
          covered: section.covered,
          total: section.total,
          limit,
        });
  const lead =
    summary?.city_avg == null
      ? undefined
      : [
          t('report.chapters.fifteenMinute.lead.average', {
            average: Math.round(summary.city_avg),
          }),
          summary.percentile === null
            ? null
            : t('report.chapters.fifteenMinute.lead.better', {
                percent: Math.round(summary.percentile),
                city: cityName,
              }),
        ]
          .filter(Boolean)
          .join(' ');

  const headline = () => {
    if (!item || !summary) return null;
    const position = standing(item);
    if (position.kind === 'flat') {
      return t('report.chapters.fifteenMinute.score.flat', {
        city: cityName,
        min: Math.round(summary.city_min ?? item.score),
        max: Math.round(summary.city_max ?? item.score),
      });
    }
    if (position.kind === 'best' || position.kind === 'worst') {
      return t(`report.chapters.fifteenMinute.score.${position.kind}`, { city: cityName });
    }
    if (position.kind === 'none') return t('report.chapters.fifteenMinute.score.none');
    return (
      <Trans
        t={t}
        i18nKey="report.chapters.fifteenMinute.score.better"
        values={{ percent: position.percent, city: cityName }}
        components={{ strong: <b className="font-extrabold text-report-fifteen-minute" /> }}
      />
    );
  };

  const weightTotal = scored.reduce((sum, entry) => sum + entry.weight, 0) || 1;
  const weight = item ? (item.weight / weightTotal) * 100 : null;
  const dates = result.snapshot.source_dates;
  const observedAt = result.sections.education?.legacy_observed_at;
  const upuDates = [dates.cnas, dates.ms_upu].flatMap((date) =>
    date ? [formatSourceDate(date)] : [],
  );
  const sources = [
    ...(dates.osm
      ? [`${t('report.chapters.fifteenMinute.sources.osm')} · ${formatSourceDate(dates.osm)}`]
      : []),
    ...(dates.walk_routing
      ? [
          `${t('report.chapters.fifteenMinute.sources.walk_routing')} · ${formatSourceDate(dates.walk_routing)}`,
        ]
      : []),
    ...(dates.siiir && !observedAt
      ? [`${t('report.chapters.fifteenMinute.sources.siiir')} · ${formatSourceDate(dates.siiir)}`]
      : []),
    ...(upuDates.length > 0
      ? [`${t('report.chapters.fifteenMinute.sources.cnas_upu')} · ${upuDates.join(' / ')}`]
      : []),
  ];

  return (
    <section aria-labelledby={TITLE_ID} className="grid min-w-0 gap-4">
      <ReportChapterHead
        hue="fifteenMinute"
        titleId={TITLE_ID}
        className="[&_h2]:max-w-none"
        eyebrow={
          item && band
            ? t('report.chapters.fifteenMinute.eyebrow', {
                score: item.score,
                band: t(`report.bands.${band}`),
              })
            : t('report.categories.fifteen_minute.name')
        }
        badge={method === null ? undefined : t(`report.chapters.fifteenMinute.precision.${method}`)}
        isEyebrowColored
        title={title}
        lead={lead}
      />
      {section ? (
        <>
          <FifteenMinutePlaces
            key={report.id}
            report={report}
            section={section}
            shareToken={shareToken}
          />
          <FifteenMinuteChoiceCard section={section} />
        </>
      ) : (
        <p className="rounded-icon border border-border bg-card p-5 text-muted-foreground">
          {t('report.chapters.fifteenMinute.noData')}
        </p>
      )}
      {item && band !== null ? (
        <ChapterScoreCard
          hue="fifteenMinute"
          score={item.score}
          average={item.average}
          range={
            summary?.city_min != null && summary.city_max != null
              ? { min: summary.city_min, max: summary.city_max }
              : null
          }
          headline={headline()}
          bandLabel={t(`report.bands.${band}`)}
          youLabel={t('report.chapters.fifteenMinute.score.you', { score: item.score })}
          averageLabel={t('report.chapters.fifteenMinute.score.average', { average: item.average })}
          rangeLabel={
            summary?.city_min != null && summary.city_max != null && !item.isFlat
              ? t('report.chapters.fifteenMinute.score.range', {
                  min: Math.round(summary.city_min),
                  max: Math.round(summary.city_max),
                })
              : null
          }
          measures={{
            included: (
              <Trans
                t={t}
                i18nKey="report.chapters.fifteenMinute.score.included"
                values={{ limit }}
                components={{ strong: <b /> }}
              />
            ),
            excluded: (
              <Trans
                t={t}
                i18nKey="report.chapters.fifteenMinute.score.excluded"
                components={{ strong: <b /> }}
              />
            ),
          }}
        />
      ) : null}
      {observedAt ? (
        <p className="text-[12.5px] leading-[1.45] text-muted-foreground">
          {t('report.chapters.fifteenMinute.sources.educationLegacy', {
            date: formatDate(observedAt, { dateStyle: 'long', timeZone: 'UTC' }),
          })}
        </p>
      ) : null}
      <ChapterSources title={t('report.chapters.fifteenMinute.sources.title')}>
        {sources.length > 0 ? (
          <p>
            <Trans
              t={t}
              i18nKey="report.chapters.fifteenMinute.sources.list"
              values={{ sources: formatList(sources) }}
              components={{ strong: <b /> }}
            />
          </p>
        ) : null}
        {weight !== null && item ? (
          <p>
            <Trans
              t={t}
              i18nKey="report.chapters.fifteenMinute.sources.weight"
              values={{
                weight: formatNumber(weight, { maximumFractionDigits: 0 }),
                points: formatNumber((item.score * weight) / 100, { maximumFractionDigits: 1 }),
              }}
              components={{ strong: <b /> }}
            />
          </p>
        ) : null}
        <p>{t('report.chapters.fifteenMinute.sources.same')}</p>
      </ChapterSources>
    </section>
  );
}
