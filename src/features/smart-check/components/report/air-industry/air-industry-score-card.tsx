import { Trans, useTranslation } from 'react-i18next';
import { ChapterScoreCard } from '@/components/report/chapter-score-card';
import { REPORT_HUES } from '@/components/report/report-hues';
import { scoreBand } from '@/components/report/score-bands';
import { scoredCategories } from '../../../report-summary.utils';
import type { ReadyReport } from '../../../report.types';

type AirIndustryScoreCardProps = {
  report: ReadyReport;
  category: 'air' | 'industry';
};

export function AirIndustryScoreCard({ report, category }: AirIndustryScoreCardProps) {
  const { t } = useTranslation('smartCheck');
  const { result } = report;
  const summary = result.categories[category];
  const item = scoredCategories(result).find((entry) => entry.key === category);
  if (!item || !summary) return null;

  const hasRange = summary.city_min != null && summary.city_max != null;
  const headline = (
    <Trans
      t={t}
      i18nKey="report.chapters.airIndustry.score.cityAverage"
      values={{ average: item.average }}
      components={{ strong: <b className={`font-extrabold ${REPORT_HUES[category].text}`} /> }}
    />
  );

  return (
    <ChapterScoreCard
      hue={category}
      kicker={t(`report.chapters.airIndustry.score.${category}.kicker`)}
      score={item.score}
      average={item.average}
      range={hasRange ? { min: summary.city_min ?? 0, max: summary.city_max ?? 0 } : null}
      headline={headline}
      bandLabel={t(`report.bands.${scoreBand(item.score)}`)}
      youLabel={t('report.chapters.airIndustry.score.you', { score: item.score })}
      averageLabel={t('report.chapters.airIndustry.score.average', { average: item.average })}
      rangeLabel={
        hasRange && !item.isFlat
          ? t('report.chapters.airIndustry.score.range', {
              min: Math.round(summary.city_min ?? 0),
              max: Math.round(summary.city_max ?? 0),
            })
          : null
      }
      measures={{
        included: (
          <Trans
            t={t}
            i18nKey={`report.chapters.airIndustry.score.${category}.included`}
            components={{ strong: <b /> }}
          />
        ),
        excluded: (
          <Trans
            t={t}
            i18nKey={`report.chapters.airIndustry.score.${category}.excluded`}
            components={{ strong: <b /> }}
          />
        ),
      }}
    />
  );
}
