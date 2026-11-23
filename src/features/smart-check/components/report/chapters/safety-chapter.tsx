import { Trans, useTranslation } from 'react-i18next';
import { ChapterScoreCard } from '@/components/report/chapter-score-card';
import { ChapterSources } from '@/components/report/chapter-sources';
import { ReportChapterHead } from '@/components/report/report-chapter-head';
import { scoreBand } from '@/components/report/score-bands';
import { formatDate, formatList, formatNumber } from '@/i18n/format';
import { scoredCategories, standing } from '../../../report-summary.utils';
import { helpRows } from '../../../safety.utils';
import type { ReportChapterProps } from '../report-chapter-props';
import { SafetyHelpCard } from './safety/safety-help-card';
import { SafetyMapBlock } from './safety/safety-map-block';

const SAFETY_TITLE_ID = 'report-chapter-safety';
const SOURCE_KEYS = ['osm', 'walk_routing'] as const;
const DATE_FORMAT = { day: 'numeric', month: 'short', year: 'numeric' } as const;

export function SafetyChapter({ report }: ReportChapterProps) {
  const { t } = useTranslation('smartCheck');
  const { result } = report;
  const summary = result.categories.safety;
  const scored = scoredCategories(result);
  const item = scored.find((entry) => entry.key === 'safety');
  const safety = result.sections.safety;
  const score = item?.score ?? null;
  const band = score === null ? null : scoreBand(score);
  const cityName = result.city.name;

  const headline = () => {
    if (!item || !summary) return null;
    const position = standing(item);
    if (position.kind === 'flat') {
      return t('report.chapters.safety.score.flat', {
        city: cityName,
        min: Math.round(summary.city_min ?? item.score),
        max: Math.round(summary.city_max ?? item.score),
      });
    }
    if (position.kind === 'best' || position.kind === 'worst') {
      return t(`report.chapters.safety.score.${position.kind}`, { city: cityName });
    }
    if (position.kind === 'none') return t('report.chapters.safety.score.none');
    return (
      <Trans
        t={t}
        i18nKey="report.chapters.safety.score.better"
        values={{ percent: position.percent, city: cityName }}
        components={{ strong: <b className="font-extrabold text-report-safety" /> }}
      />
    );
  };

  const weightTotal = scored.reduce((sum, entry) => sum + entry.weight, 0) || 1;
  const weight = item ? (item.weight / weightTotal) * 100 : null;
  const sources = SOURCE_KEYS.flatMap((key) => {
    const date = result.snapshot.source_dates[key];
    return date
      ? [
          `${t(`report.chapters.safety.sources.${key}`)} · ${
            /^\d{4}-\d{2}-\d{2}$/.test(date) ? formatDate(date, DATE_FORMAT) : date
          }`,
        ]
      : [];
  });

  return (
    <section aria-labelledby={SAFETY_TITLE_ID} className="grid max-w-default min-w-0 gap-4">
      <ReportChapterHead
        hue="safety"
        titleId={SAFETY_TITLE_ID}
        eyebrow={
          score !== null && band !== null
            ? t('report.chapters.safety.eyebrow', {
                score,
                band: t(`report.bands.${band}`),
              })
            : t('report.categories.safety.name')
        }
        badge={t('report.chapters.safety.precision')}
        isEyebrowColored
        title={t('report.chapters.safety.headline')}
        lead={t('report.chapters.safety.lead')}
      />
      {safety ? (
        <SafetyMapBlock report={report} />
      ) : (
        <p className="rounded-icon border border-border bg-card p-5 text-muted-foreground">
          {t('report.chapters.safety.noData')}
        </p>
      )}
      {item && band !== null ? (
        <ChapterScoreCard
          hue="safety"
          score={item.score}
          average={item.average}
          range={
            summary?.city_min != null && summary.city_max != null
              ? { min: summary.city_min, max: summary.city_max }
              : null
          }
          headline={headline()}
          bandLabel={t(`report.bands.${band}`)}
          youLabel={t('report.chapters.safety.score.you', { score: item.score })}
          averageLabel={t('report.chapters.safety.score.average', { average: item.average })}
          rangeLabel={
            summary?.city_min != null && summary.city_max != null && !item.isFlat
              ? t('report.chapters.safety.score.range', {
                  min: Math.round(summary.city_min),
                  max: Math.round(summary.city_max),
                })
              : null
          }
          measures={{
            included: (
              <Trans
                t={t}
                i18nKey="report.chapters.safety.score.included"
                components={{ strong: <b /> }}
              />
            ),
            excluded: (
              <Trans
                t={t}
                i18nKey="report.chapters.safety.score.excluded"
                components={{ strong: <b /> }}
              />
            ),
          }}
        />
      ) : null}
      <SafetyHelpCard rows={helpRows(result)} />
      <ChapterSources title={t('report.chapters.safety.sources.title')}>
        {sources.length > 0 ? (
          <p>
            <Trans
              t={t}
              i18nKey="report.chapters.safety.sources.list"
              values={{ sources: formatList(sources) }}
              components={{ strong: <b /> }}
            />
          </p>
        ) : null}
        {weight !== null && item ? (
          <p>
            <Trans
              t={t}
              i18nKey="report.chapters.safety.sources.weight"
              values={{
                weight: formatNumber(weight, { maximumFractionDigits: 0 }),
                points: formatNumber((item.score * weight) / 100, { maximumFractionDigits: 1 }),
              }}
              components={{ strong: <b /> }}
            />
          </p>
        ) : null}
        <p>{t('report.chapters.safety.sources.same')}</p>
      </ChapterSources>
    </section>
  );
}
