import { Trans, useTranslation } from 'react-i18next';
import { REPORT_HUES } from '@/components/report/report-hues';
import { scoreBand } from '@/components/report/score-bands';
import { formatNumber } from '@/i18n/format';
import { cn } from '@/lib/utils';
import { CATEGORY_META, type ReportTab } from '../../../report-chapter-meta';
import { formation, zoneStanding, type ScoredCategory } from '../../../report-summary.utils';
import type { ReportResult } from '../../../report.types';
import { ZoneHistogram } from './zone-histogram';

const LABEL_FROM_POINTS = 6;
const HISTOGRAM_HEIGHT = 190;

const onePlace = (value: number) =>
  formatNumber(value, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

type ZoneFormationCardProps = {
  result: ReportResult;
  scored: readonly ScoredCategory[];
  onOpenChapter: (tab: ReportTab) => void;
};

export function ZoneFormationCard({ result, scored, onOpenChapter }: ZoneFormationCardProps) {
  const { t } = useTranslation('smartCheck');
  const { zone } = result;
  if (zone.score === null) return null;
  const score = Math.round(zone.score);
  const average = zone.city_avg === null ? null : Math.round(zone.city_avg);
  const place = zoneStanding(zone.histogram, score);
  const { parts, lost } = formation(scored);
  const difference = average === null ? null : score - average;
  const histogramLabel = t('report.chapters.summary.formation.histLabel', {
    count: place.zones,
    city: result.city.name,
  });

  return (
    <section
      aria-labelledby="summary-formation"
      className="overflow-hidden rounded-icon border border-border bg-card shadow-report-panel"
    >
      <div className="grid w960:grid-cols-[300px_minmax(0,1fr)]">
        <div className="bg-report-hero px-4 py-5 text-on-inverse w760:p-7">
          <p className="text-meta font-extrabold tracking-label text-on-info-faint uppercase">
            {t('report.chapters.summary.formation.eyebrow')}
          </p>
          <p className="mt-2 flex items-baseline gap-1">
            <b className="text-[64px] leading-[0.9] font-extrabold tracking-[-0.05em] text-cta tabular-nums w760:text-[84px]">
              {score}
            </b>
            <span className="text-[20px] font-bold text-on-info-faint">
              {t('report.frame.outOf')}
            </span>
          </p>
          <p className="mt-3 inline-block rounded-full bg-on-inverse/12 px-3 py-1.25 text-caption font-extrabold">
            {t(`report.bands.${scoreBand(score)}`)}
          </p>
          <ul className="mt-5 grid gap-2.5 text-small leading-[1.35] text-on-info-muted [&_b]:text-[17px] [&_b]:text-on-inverse">
            {difference === null ? null : (
              <li>
                <Trans
                  t={t}
                  i18nKey={
                    difference >= 0
                      ? 'report.chapters.summary.formation.aboveAverage'
                      : 'report.chapters.summary.formation.belowAverage'
                  }
                  values={{ points: Math.abs(difference) }}
                  components={{ b: <b /> }}
                />
              </li>
            )}
            <li>
              <Trans
                t={t}
                i18nKey="report.chapters.summary.formation.lowerShare"
                values={{ percent: place.belowPercent }}
                components={{ b: <b /> }}
              />
            </li>
            <li>
              <Trans
                t={t}
                i18nKey="report.chapters.summary.formation.atLeast"
                values={{
                  count: place.atLeast,
                  total: formatNumber(place.zones),
                  from: Math.round(place.ownBin * place.binSize),
                }}
                components={{ b: <b /> }}
              />
            </li>
          </ul>
        </div>
        <div className="px-4 py-5 w760:px-7 w760:py-6">
          <h3
            id="summary-formation"
            className="text-[clamp(19px,1.8vw,23px)] font-extrabold tracking-[-0.02em]"
          >
            {t('report.chapters.summary.formation.histTitle')}
          </h3>
          <p className="mt-1 text-caption text-muted-foreground">
            {t('report.chapters.summary.formation.histHint')}
          </p>
          <ZoneHistogram
            histogram={zone.histogram}
            score={score}
            average={average}
            ownBin={place.ownBin}
            width={640}
            height={HISTOGRAM_HEIGHT}
            label={histogramLabel}
            className="hidden w760:block"
          />
          <ZoneHistogram
            histogram={zone.histogram}
            score={score}
            average={average}
            ownBin={place.ownBin}
            width={340}
            height={Math.round(HISTOGRAM_HEIGHT * 0.8)}
            label={histogramLabel}
            className="w760:hidden"
          />
        </div>
      </div>
      <div className="border-t border-border-subtle px-4 py-5 w760:px-7 w760:pt-5.5 w760:pb-6.5">
        <h3 className="text-[clamp(19px,1.8vw,23px)] font-extrabold tracking-[-0.02em]">
          {t('report.chapters.summary.formation.sumTitle', { score })}
        </h3>
        <div className="mt-4 flex h-8.5 gap-0.5 overflow-hidden rounded-thumb">
          {parts.map((part) => {
            const hue = REPORT_HUES[CATEGORY_META[part.key].hue];
            const label = t('report.chapters.summary.formation.partLabel', {
              name: t(`report.categories.${part.key}.name`),
              points: onePlace(part.points),
            });
            return (
              <span
                key={part.key}
                title={label}
                style={{ flexGrow: part.points }}
                className={cn(
                  'grid min-w-1 basis-0 place-content-center text-meta font-extrabold text-on-inverse',
                  hue.fill,
                )}
              >
                {part.points >= LABEL_FROM_POINTS ? onePlace(part.points) : null}
              </span>
            );
          })}
          {lost > 0 ? (
            <span
              title={t('report.chapters.summary.formation.lostLabel', { points: onePlace(lost) })}
              style={{ flexGrow: lost }}
              className="grid min-w-1 basis-0 place-content-center bg-[repeating-linear-gradient(135deg,var(--color-muted)_0_6px,var(--color-report-hatch)_6px_12px)] text-meta font-extrabold text-muted-foreground"
            >
              −{onePlace(lost)}
            </span>
          ) : null}
        </div>
        <ul className="mt-3.5 flex flex-wrap gap-2">
          {parts.map((part) => {
            const hue = REPORT_HUES[CATEGORY_META[part.key].hue];
            return (
              <li key={part.key}>
                <button
                  type="button"
                  onClick={() => {
                    onOpenChapter(CATEGORY_META[part.key].chapter);
                  }}
                  className="inline-flex min-h-8.5 items-center gap-1.75 rounded-full border border-border bg-card px-3 text-caption font-bold text-foreground hover:border-border-strong focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <i aria-hidden="true" className={cn('size-2.5 rounded-[3px]', hue.fill)} />
                  {t(`report.categories.${part.key}.name`)}
                  <b className={cn('tabular-nums', hue.text)}>{onePlace(part.points)}</b>
                </button>
              </li>
            );
          })}
          {lost > 0 ? (
            <li className="inline-flex min-h-8.5 items-center gap-1.75 rounded-full border border-border bg-card px-3 text-caption font-bold text-foreground">
              <i
                aria-hidden="true"
                className="size-2.5 rounded-[3px] bg-[repeating-linear-gradient(135deg,var(--color-muted)_0_3px,var(--color-report-hatch)_3px_6px)]"
              />
              {t('report.chapters.summary.formation.lost')}
              <b className="text-muted-foreground tabular-nums">{onePlace(lost)}</b>
            </li>
          ) : null}
        </ul>
      </div>
    </section>
  );
}
