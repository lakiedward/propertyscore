import { useTranslation } from 'react-i18next';
import { formatNumber } from '@/i18n/format';
import { cn } from '@/lib/utils';
import {
  isCityWide,
  priceIntervals,
  scalePosition,
  type IntervalScale,
  type PriceInterval,
} from '../../../investment.utils';
import type { ReportResult } from '../../../report.types';
import { InvestmentCard } from './investment-card';

const PRICE_TITLE_ID = 'investment-price-title';

type Investment = NonNullable<ReportResult['sections']['investment']>;
type Sale = NonNullable<Investment['sale']>;

type InvestmentPriceCardProps = {
  investment: Investment;
  sale: Sale;
  cityName: string;
};

function IntervalRow({ item, scale }: { item: PriceInterval; scale: IntervalScale }) {
  const { t } = useTranslation('smartCheck');
  const hasRange = item.low !== null && item.high !== null;
  const left = hasRange && item.low !== null ? scalePosition(item.low, scale) : 0;
  const right = hasRange && item.high !== null ? scalePosition(item.high, scale) : 0;
  return (
    <li className="min-w-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <span className="text-[14px] font-bold">
          {item.name}
          {item.count === null ? null : (
            <small className="ml-2 text-[12px] font-semibold text-muted-foreground">
              {t(
                item.countKind === 'apartments'
                  ? 'report.chapters.investment.apartments'
                  : 'report.chapters.investment.offers',
                {
                  count: item.count,
                  amount: formatNumber(item.count),
                },
              )}
            </small>
          )}
        </span>
        <b className="text-[18px] font-extrabold tracking-[-0.02em] tabular-nums w760:text-[20px]">
          {t('report.chapters.investment.perM2', {
            value: formatNumber(Math.round(item.median)),
          })}
        </b>
      </div>
      <div className="relative mt-2.5 h-3.5 rounded-full bg-muted">
        {hasRange ? (
          <i
            aria-hidden="true"
            style={{ left: `${String(left)}%`, width: `${String(right - left)}%` }}
            className={cn(
              'absolute inset-y-0 rounded-full',
              item.isCity ? 'bg-primary' : 'bg-report-context/55',
            )}
          />
        ) : null}
        <i
          aria-hidden="true"
          style={{ left: `${String(scalePosition(item.median, scale))}%` }}
          className={cn(
            'absolute top-1/2 h-5 w-2 -translate-x-1/2 -translate-y-1/2 rounded-[3px] border-2',
            item.isCity ? 'border-primary bg-cta' : 'border-report-context bg-card',
          )}
        />
      </div>
      {hasRange && item.low !== null && item.high !== null ? (
        <div className="relative mt-1 h-4 text-[11.5px] font-bold text-muted-foreground tabular-nums">
          <em style={{ left: `${String(left)}%` }} className="absolute -translate-x-1/2 not-italic">
            {formatNumber(Math.round(item.low))}
          </em>
          <em
            style={{ left: `${String(right)}%` }}
            className="absolute -translate-x-1/2 not-italic"
          >
            {formatNumber(Math.round(item.high))}
          </em>
        </div>
      ) : null}
    </li>
  );
}

export function InvestmentPriceCard({ investment, sale, cityName }: InvestmentPriceCardProps) {
  const { t } = useTranslation('smartCheck');
  const { intervals, scale } = priceIntervals(investment, sale, {
    primary: isCityWide(sale.precision)
      ? t('report.chapters.investment.price.cityWide', { city: cityName })
      : t('report.chapters.investment.price.radius'),
    nearby: (name) => t('report.chapters.investment.price.nearby', { name }),
  });
  const hasInterval = sale.p25_eur_m2 != null && sale.p75_eur_m2 != null;
  const title = hasInterval
    ? t('report.chapters.investment.price.titleRange', {
        low: formatNumber(Math.round(sale.p25_eur_m2 ?? 0)),
        high: formatNumber(Math.round(sale.p75_eur_m2 ?? 0)),
      })
    : t('report.chapters.investment.price.titleMedian', {
        value: formatNumber(Math.round(sale.median_eur_m2)),
      });

  return (
    <InvestmentCard
      eyebrow={t('report.chapters.investment.price.eyebrow')}
      title={title}
      titleId={PRICE_TITLE_ID}
      className="flex flex-col"
    >
      <ul className="mt-6 grid gap-6">
        {intervals.map((item) => (
          <IntervalRow key={item.key} item={item} scale={scale} />
        ))}
      </ul>
      {sale.typical ? (
        <p className="mt-6 w-fit max-w-full rounded-full bg-surface-highlight px-4 py-2 text-[13.5px] font-bold">
          {t('report.chapters.investment.price.typical', {
            area: formatNumber(sale.typical.area_m2),
            price: formatNumber(sale.typical.price_eur),
          })}
        </p>
      ) : null}
      <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] font-semibold text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <i aria-hidden="true" className="h-2.5 w-4.5 rounded-full bg-primary" />
          {t('report.chapters.investment.price.legendRange')}
        </span>
        <span className="flex items-center gap-1.5">
          <i
            aria-hidden="true"
            className="h-3.5 w-1.5 rounded-[2px] border-2 border-primary bg-cta"
          />
          {t('report.chapters.investment.price.legendMedian')}
        </span>
      </p>
    </InvestmentCard>
  );
}
