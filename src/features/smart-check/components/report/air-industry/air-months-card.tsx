import { InfoIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDate, formatNumber } from '@/i18n/format';
import { cn } from '@/lib/utils';
import { monthBars } from '../../../air-industry.utils';
import type { ReportResult } from '../../../report.types';

type AirSection = NonNullable<ReportResult['sections']['air']>;

type AirMonthsCardProps = {
  air: AirSection;
};

function shortMonth(month: string): string {
  return formatDate(`${month}-01`, { month: 'short', timeZone: 'UTC' }).replace(/\.$/, '');
}

export function AirMonthsCard({ air }: AirMonthsCardProps) {
  const { t } = useTranslation('smartCheck');
  const { bars, limitHeight } = monthBars(air);
  const over = air.months_over_limit.pm25;
  const title =
    over === null
      ? t('report.chapters.airIndustry.months.titleUnknown')
      : over === 0
        ? t('report.chapters.airIndustry.months.titleNone')
        : t('report.chapters.airIndustry.months.title', { count: over });

  return (
    <section
      aria-labelledby="air-months-title"
      className="min-w-0 rounded-icon border border-border bg-card p-4 shadow-report-card w760:px-6.5 w760:py-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div>
          <p className="text-meta font-extrabold tracking-label text-report-air uppercase">
            {t('report.chapters.airIndustry.months.eyebrow')}
          </p>
          <h3
            id="air-months-title"
            className="mt-1 text-[19px] leading-tight font-extrabold tracking-[-0.02em] w760:text-[21px]"
          >
            {title}
          </h3>
        </div>
        <p className="flex flex-wrap gap-x-3.5 gap-y-1 text-[12.5px] font-semibold text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <i aria-hidden="true" className="size-3 rounded-[3px] bg-report-air" />
            {t('report.chapters.airIndustry.months.legendPm25')}
          </span>
          <span className="flex items-center gap-1.5">
            <i
              aria-hidden="true"
              className="h-0 w-4 border-t-2 border-dashed border-(--ps-coral-600)"
            />
            {t('report.chapters.airIndustry.months.legendLimit')}
          </span>
        </p>
      </div>
      <div
        role="img"
        aria-label={t('report.chapters.airIndustry.months.chartLabel')}
        className="mt-6.5"
      >
        <div className="relative grid h-37.5 grid-cols-12 items-end gap-0.75 border-b border-border w760:h-47.5 w760:gap-1.5">
          {bars.map((bar) => (
            <span
              key={bar.month}
              className="relative flex h-full flex-col items-center justify-end"
            >
              <em className="mb-1 text-[10px] font-extrabold text-foreground not-italic tabular-nums w760:text-[12px]">
                {bar.value === null ? '–' : formatNumber(bar.value, { maximumFractionDigits: 0 })}
              </em>
              <i
                style={{ height: `${String(bar.height)}%` }}
                className={cn(
                  'block w-full rounded-t-[5px]',
                  bar.isOverLimit ? 'bg-report-air' : 'bg-report-air/45',
                )}
              />
            </span>
          ))}
          <b
            style={{ bottom: `${String(limitHeight)}%` }}
            className="absolute inset-x-0 h-0 border-t-2 border-dashed border-(--ps-coral-600)"
          >
            <span className="absolute -top-2 -left-6 text-[11px] font-extrabold text-(--ps-coral-600)">
              {formatNumber(air.limits.pm25)}
            </span>
          </b>
        </div>
        <div className="mt-1.5 grid grid-cols-12 gap-0.75 w760:gap-1.5">
          {bars.map((bar) => (
            <span
              key={bar.month}
              className="text-center text-[10.5px] text-muted-foreground w760:text-[12px]"
            >
              {shortMonth(bar.month)}
            </span>
          ))}
        </div>
      </div>
      {air.pm25_annual === null ? null : (
        <p className="mt-3.5 flex gap-2 text-[12.5px] leading-[1.45] text-muted-foreground">
          <InfoIcon aria-hidden="true" className="mt-0.5 size-3.75 shrink-0" />
          <span>
            {air.city_avg.pm25 === null
              ? t('report.chapters.airIndustry.months.annual', {
                  value: formatNumber(air.pm25_annual, { maximumFractionDigits: 1 }),
                })
              : t('report.chapters.airIndustry.months.annualCity', {
                  value: formatNumber(air.pm25_annual, { maximumFractionDigits: 1 }),
                  average: formatNumber(air.city_avg.pm25, { maximumFractionDigits: 1 }),
                })}
          </span>
        </p>
      )}
    </section>
  );
}
