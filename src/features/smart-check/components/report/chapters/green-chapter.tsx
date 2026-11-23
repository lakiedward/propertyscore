import { useTranslation } from 'react-i18next';
import { ReportChapterHead } from '@/components/report/report-chapter-head';
import { scoreBand } from '@/components/report/score-bands';
import { formatNumber } from '@/i18n/format';
import { listedParks, parkWalkMinutes, parksSummary } from '../../../green.utils';
import { scoredCategories } from '../../../report-summary.utils';
import type { ReportChapterProps } from '../report-chapter-props';
import { GreenParksBlock } from './green/green-parks-block';
import { ChapterScoreBlock } from './shared/chapter-score-block';

const TITLE_ID = 'report-chapter-green';

export function GreenChapter({ report }: ReportChapterProps) {
  const { t } = useTranslation('smartCheck');
  const { result } = report;
  const section = result.sections.green;
  const item = scoredCategories(result).find((entry) => entry.key === 'green');
  const band = item ? scoreBand(item.score) : null;
  const parks = section ? listedParks(section) : [];
  const { farthest, biggest, totalHa } = parksSummary(parks);
  const share = section?.share[String(section.near_radius_m)];

  const shareText =
    section && share !== undefined
      ? t(
          section.city_avg_share_near === null
            ? 'report.chapters.green.shareNoAverage'
            : 'report.chapters.green.share',
          {
            radius: section.near_radius_m,
            share: formatNumber(share * 100, { maximumFractionDigits: 0 }),
            average: formatNumber((section.city_avg_share_near ?? 0) * 100, {
              maximumFractionDigits: 0,
            }),
          },
        )
      : '';

  const lead = () => {
    if (!biggest || parks.length === 0) return shareText || undefined;
    return `${t('report.chapters.green.lead', {
      total: formatNumber(totalHa, { maximumFractionDigits: 0 }),
      name: biggest.name ?? t('report.chapters.green.parks.unnamedLower'),
      area: formatNumber(biggest.area_ha, { maximumFractionDigits: 1 }),
    })}${shareText ? ` ${shareText}` : ''}`;
  };

  return (
    <section aria-labelledby={TITLE_ID} className="grid max-w-default min-w-0 gap-4">
      <ReportChapterHead
        hue="green"
        titleId={TITLE_ID}
        eyebrow={
          item && band !== null
            ? t('report.chapters.green.eyebrow', {
                score: item.score,
                band: t(`report.bands.${band}`),
              })
            : t('report.categories.green.name')
        }
        badge={t('report.chapters.green.precision')}
        isEyebrowColored
        title={
          farthest
            ? t('report.chapters.green.headline', {
                count: parks.length,
                minutes: parkWalkMinutes(farthest.walk_m),
              })
            : t('report.chapters.green.headlineNone')
        }
        lead={lead()}
      />
      {section && parks.length > 0 ? (
        <GreenParksBlock report={report} parks={parks} />
      ) : (
        <p className="rounded-icon border border-border bg-card p-5 text-muted-foreground">
          {t('report.chapters.green.noData')}
        </p>
      )}
      <ChapterScoreBlock
        report={report}
        chapter="green"
        hue="green"
        sourceLabels={{
          osm: t('report.chapters.green.sources.osm'),
          walk_routing: t('report.chapters.green.sources.walk_routing'),
        }}
      />
    </section>
  );
}
