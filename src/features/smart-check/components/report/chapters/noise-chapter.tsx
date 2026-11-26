import { useTranslation } from 'react-i18next';
import { ReportChapterHead } from '@/components/report/report-chapter-head';
import { scoreBand } from '@/components/report/score-bands';
import { formatNumber } from '@/i18n/format';
import {
  closestReference,
  decibelBand,
  listedSources,
  noiseReferenceLabel,
} from '../../../noise.utils';
import { scoredCategories } from '../../../report-summary.utils';
import type { ReportChapterProps } from '../report-chapter-props';
import { NoiseMapBlock } from './noise/noise-map-block';
import { ChapterScoreBlock } from './shared/chapter-score-block';

const TITLE_ID = 'report-chapter-noise';

export function NoiseChapter({ report }: ReportChapterProps) {
  const { t } = useTranslation('smartCheck');
  const { result } = report;
  const noise = result.sections.noise;
  const summary = result.categories.noise;
  const item = scoredCategories(result).find((entry) => entry.key === 'noise');
  const band = item ? scoreBand(item.score) : null;
  const lden = noise?.lden ?? null;
  const loudest = noise ? listedSources(noise.sources)[0] : undefined;

  const average =
    item && summary?.city_avg != null
      ? t(
          item.score < summary.city_avg
            ? 'report.chapters.noise.averageBelow'
            : 'report.chapters.noise.averageAbove',
          { score: item.score, average: Math.round(summary.city_avg) },
        )
      : '';

  const lead = () => {
    if (!noise) return undefined;
    const base = loudest
      ? t('report.chapters.noise.leadSource', {
          name:
            loudest.name ??
            t(`report.chapters.noise.kinds.${loudest.kind}`, { defaultValue: loudest.kind }),
          distance: formatNumber(loudest.distance_m),
        })
      : t('report.chapters.noise.leadNone');
    return average ? `${base} ${average}` : base;
  };

  return (
    <section aria-labelledby={TITLE_ID} className="grid min-w-0 gap-4">
      <ReportChapterHead
        hue="noise"
        titleId={TITLE_ID}
        eyebrow={
          item && band !== null
            ? t('report.chapters.noise.eyebrow', {
                score: item.score,
                band: t(`report.bands.${band}`),
              })
            : t('report.categories.noise.name')
        }
        badge={
          noise?.precision === 'street'
            ? t('report.chapters.noise.precisionStreet')
            : t('report.chapters.noise.precision')
        }
        isEyebrowColored
        title={
          lden === null
            ? t('report.chapters.noise.headlineNone')
            : t('report.chapters.noise.headline', {
                band: decibelBand(lden),
                reference: noiseReferenceLabel(t, closestReference(lden)),
              })
        }
        lead={lead()}
      />
      {noise && lden !== null ? (
        <NoiseMapBlock report={report} lden={lden} lnight={noise.lnight} />
      ) : (
        <p className="rounded-icon border border-border bg-card p-5 text-muted-foreground">
          {t('report.chapters.noise.noData')}
        </p>
      )}
      <ChapterScoreBlock
        report={report}
        chapter="noise"
        hue="noise"
        sourceLabels={{ osm: t('report.chapters.noise.sources.osm') }}
      />
    </section>
  );
}
