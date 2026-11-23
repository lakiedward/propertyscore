import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { formatNumber } from '@/i18n/format';
import { cn } from '@/lib/utils';
import {
  REACH_MINUTES,
  reachScale,
  reachShares,
  type ReachShare,
} from '../../../accessibility.utils';
import type { ReadyReport } from '../../../report.types';
import type { AccessibilitySection } from '../../../sections/accessibility.types';
import { AccessibilityReachMap } from './accessibility-reach-map';

const DEFAULT_MINUTES: ReachShare['minutes'] = 30;

const KEY_SWATCHES = [
  { band: 'under15', fill: 'bg-report-accessibility' },
  { band: 'from15', fill: 'bg-warning-fill' },
  { band: 'from30', fill: 'bg-category-transport-fill' },
] as const;

type AccessibilityReachCardProps = {
  report: ReadyReport;
  section: AccessibilitySection;
};

export function AccessibilityReachCard({ report, section }: AccessibilityReachCardProps) {
  const { t } = useTranslation('smartCheck');
  const [minutes, setMinutes] = useState<ReachShare['minutes']>(DEFAULT_MINUTES);
  const { reach } = section;
  const shares = reachShares(section);
  const current = shares.find((share) => share.minutes === minutes);
  if (!reach || !current) return null;

  return (
    <section
      aria-labelledby="accessibility-reach-title"
      className="rounded-xl border border-border bg-card p-4 shadow-report-panel w760:px-7 w760:py-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-meta font-extrabold tracking-label text-muted-foreground uppercase">
            {t('report.chapters.accessibility.reach.eyebrow')}
          </p>
          <h3
            id="accessibility-reach-title"
            className="mt-1 text-[18px] font-extrabold tracking-[-0.01em]"
          >
            {t('report.chapters.accessibility.reach.title')}
          </h3>
        </div>
        <div
          role="radiogroup"
          aria-label={t('report.chapters.accessibility.reach.timeLabel')}
          className="inline-flex gap-0.5 rounded-lg bg-report-summary-soft p-0.75 max-[700px]:w-full"
        >
          {REACH_MINUTES.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={option === minutes}
              onClick={() => {
                setMinutes(option);
              }}
              className={cn(
                'rounded-md px-3.5 py-1.5 text-[14px] font-bold text-muted-foreground transition-colors focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none max-[700px]:flex-1',
                option === minutes && 'bg-card text-primary shadow-segment',
              )}
            >
              {t('report.chapters.accessibility.reach.option', { minutes: option })}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4.5 grid items-center gap-7 w960:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <div>
          <p className="flex items-baseline gap-2.5">
            <b className="text-[56px] leading-[0.95] font-extrabold tracking-[-0.04em] text-report-accessibility tabular-nums w760:text-[72px]">
              {formatNumber(current.sharePct)}%
            </b>
            <span className="text-[18px] font-bold text-muted-foreground">
              {t('report.chapters.accessibility.reach.ofCity')}
            </span>
          </p>
          <p className="mt-3.5 text-[16px] leading-[1.35] font-semibold w760:text-[18px]">
            <Trans
              t={t}
              i18nKey="report.chapters.accessibility.reach.sentence"
              values={{
                minutes: current.minutes,
                scale: t(
                  `report.chapters.accessibility.reach.scales.${reachScale(current.sharePct)}`,
                ),
              }}
              components={{ b: <b className="text-report-accessibility" /> }}
            />
          </p>
          <p className="mt-2.5 text-small text-muted-foreground">
            <Trans
              t={t}
              i18nKey="report.chapters.accessibility.reach.neighbourhoods"
              values={{ reached: current.reached, total: reach.neighbourhoods_total }}
              components={{ b: <b className="text-foreground" /> }}
            />
          </p>
          <ul className="mt-5 grid gap-1.5 border-t border-border-subtle pt-4 text-[13px] font-semibold text-muted-foreground">
            {KEY_SWATCHES.map((item) => (
              <li key={item.band} className="flex items-center gap-2">
                <i aria-hidden="true" className={cn('size-3.5 rounded-[4px]', item.fill)} />
                {t(`report.chapters.accessibility.reach.key.${item.band}`)}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative aspect-[1.18] max-h-140 w-full overflow-hidden rounded-[14px] border border-border-subtle bg-report-map-land">
          <AccessibilityReachMap report={report} reach={reach} minutes={minutes} />
        </div>
      </div>
    </section>
  );
}
