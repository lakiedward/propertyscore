import { TrendingUpIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatNumber, formatPercent } from '@/i18n/format';
import { cn } from '@/lib/utils';
import { useRadiusLabel } from '../hooks/use-radius-label';
import { biggestGain, componentShares, type ComponentShare } from '../green-section.utils';
import type { ScoredGreenSection } from '../online-report.types';

type GreenBreakdownProps = {
  section: ScoredGreenSection;
};

export function GreenBreakdown({ section }: GreenBreakdownProps) {
  const { t } = useTranslation('onlineReports');
  const shares = componentShares(section.components);
  const gain = biggestGain(shares);

  return (
    <section
      aria-labelledby="green-breakdown-title"
      className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:p-6"
    >
      <div className="flex flex-col gap-1">
        <h3 id="green-breakdown-title" className="text-h4">
          {t('green.breakdown.title')}
        </h3>
        <p className="text-small text-muted-foreground">{t('green.breakdown.lead')}</p>
      </div>
      <ul className="flex flex-col gap-3.5">
        {shares.map((share) => (
          <ComponentRow key={share.key} share={share} section={section} />
        ))}
      </ul>
      {gain ? (
        <p className="flex items-start gap-2.5 rounded-lg bg-category-green-surface p-3.5 text-small">
          <TrendingUpIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-category-green" />
          <GainText gainKey={gain.key} points={gain.points} section={section} />
        </p>
      ) : null}
    </section>
  );
}

function useComponentText(section: ScoredGreenSection) {
  const { t } = useTranslation('onlineReports');
  const radiusLabel = useRadiusLabel();
  const hectares = (value: number) => formatNumber(value, { maximumFractionDigits: 1 });

  const label = (share: ComponentShare) => {
    switch (share.key) {
      case 'c1':
        return t('green.breakdown.component.c1', { radius: radiusLabel(section.near_radius_m) });
      case 'c2':
        return t('green.breakdown.component.c2', { radius: radiusLabel(section.wide_radius_m) });
      case 'c3':
        return t('green.breakdown.component.c3', {
          area: hectares(section.thresholds.small_min_ha),
        });
      case 'c4':
        return t('green.breakdown.component.c4', {
          area: hectares(section.thresholds.large_min_ha),
        });
      case 'c5':
        return t('green.breakdown.component.c5');
    }
  };

  const value = (share: ComponentShare) => {
    if (share.points === null) return t('green.breakdown.noData');
    if (share.key === 'c1' || share.key === 'c2') {
      return share.value === null ? t('green.breakdown.noData') : formatPercent(share.value, 1);
    }
    if (share.value === null) return t('green.breakdown.noneInReach');
    if (share.value === 0) return t('green.breakdown.inside');
    return t('green.breakdown.walk', { distance: formatNumber(Math.round(share.value / 10) * 10) });
  };

  return { label, value };
}

type ComponentRowProps = {
  share: ComponentShare;
  section: ScoredGreenSection;
};

function ComponentRow({ share, section }: ComponentRowProps) {
  const { t } = useTranslation('onlineReports');
  const text = useComponentText(section);
  const hasData = share.points !== null;
  const earned = Math.round(share.earned);
  const available = Math.round(share.available);

  return (
    <li className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-small">
        <span className={cn('font-bold', !hasData && 'text-muted-foreground')}>
          {text.label(share)}
          <span className="font-normal text-muted-foreground"> · {text.value(share)}</span>
        </span>
        <span className="text-muted-foreground tabular-nums">
          {hasData
            ? t('green.breakdown.points', { earned, count: available })
            : t('green.breakdown.excluded')}
        </span>
      </div>
      <div
        aria-hidden
        className={cn(
          'h-2.5 overflow-hidden rounded-full',
          hasData ? 'bg-category-green-surface' : 'border border-dashed border-border',
        )}
      >
        {hasData && share.available > 0 ? (
          <div
            className="h-full rounded-full bg-category-green transition-[width] duration-500 motion-reduce:transition-none"
            style={{ width: `${String((share.earned / share.available) * 100)}%` }}
          />
        ) : null}
      </div>
    </li>
  );
}

type GainTextProps = {
  gainKey: ComponentShare['key'];
  points: number;
  section: ScoredGreenSection;
};

function GainText({ gainKey, points, section }: GainTextProps) {
  const { t } = useTranslation('onlineReports');
  const radiusLabel = useRadiusLabel();
  const hectares = (value: number) => formatNumber(value, { maximumFractionDigits: 1 });
  const { thresholds } = section;

  switch (gainKey) {
    case 'c1':
      return t('green.breakdown.gain.share', {
        count: points,
        radius: radiusLabel(section.near_radius_m),
      });
    case 'c2':
      return t('green.breakdown.gain.share', {
        count: points,
        radius: radiusLabel(section.wide_radius_m),
      });
    case 'c3':
      return t('green.breakdown.gain.park', {
        count: points,
        area: hectares(thresholds.small_min_ha),
        distance: radiusLabel(thresholds.small_full_m),
      });
    case 'c4':
      return t('green.breakdown.gain.park', {
        count: points,
        area: hectares(thresholds.large_min_ha),
        distance: radiusLabel(thresholds.large_full_m),
      });
    case 'c5':
      return t('green.breakdown.gain.trees', { count: points });
  }
}
