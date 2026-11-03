import { useTranslation } from 'react-i18next';
import { ScoreValue } from '@/components/trust/score-value';
import { formatPercent } from '@/i18n/format';
import { scoreBand } from '../online-report.utils';

type ZoneScoreCardProps = {
  score: number | null;
  percentile: number | null;
  isCityUniform: boolean;
  cityName: string;
  scoredCount: number;
};

export function ZoneScoreCard({
  score,
  percentile,
  isCityUniform,
  cityName,
  scoredCount,
}: ZoneScoreCardProps) {
  const { t } = useTranslation('onlineReports');

  return (
    <div className="flex flex-wrap items-center gap-5 rounded-2xl bg-card p-5.5 text-foreground">
      {score === null ? null : (
        <ScoreValue
          size="xl"
          value={score}
          hue="online"
          caption={t('zone.outOf')}
          label={t('zone.scoreLabel', { score })}
        />
      )}
      <div className="flex min-w-50 flex-1 flex-col gap-1">
        <span className="text-eyebrow font-extrabold text-info-ink-muted uppercase">
          {t('zone.eyebrow')}
        </span>
        <strong className="text-title-sm leading-tight font-extrabold tracking-[-0.02em]">
          {score === null ? t('zone.noScore') : t(`band.${scoreBand(score)}`)}
        </strong>
        {percentile === null ? null : (
          <span className="text-small text-muted-foreground">
            {isCityUniform
              ? t('zone.uniform', { city: cityName })
              : t('zone.percentile', { percent: formatPercent(percentile / 100), city: cityName })}
          </span>
        )}
        <span className="text-small text-muted-foreground">{t('zone.describesZone')}</span>
        {scoredCount < 9 ? (
          <span className="text-meta font-semibold text-warning">
            {t('zone.partial', { count: scoredCount })}
          </span>
        ) : null}
      </div>
    </div>
  );
}
