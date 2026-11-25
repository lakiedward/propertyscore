import { useTranslation } from 'react-i18next';
import { formatDate, formatNumber, formatPrice } from '@/i18n/format';
import { cn } from '@/lib/utils';
import { changeForArea, type HistoryChange } from '../../../investment.utils';
import { InvestmentCard } from './investment-card';

const HISTORY_TITLE_ID = 'investment-history-title';

type InvestmentHistoryCardProps = {
  change: HistoryChange;
  area: number;
};

function shortMonth(period: string): string {
  return formatDate(`${period.slice(0, 7)}-01`, { month: 'short', timeZone: 'UTC' })
    .replace('.', '')
    .slice(0, 3);
}

function longMonth(period: string): string {
  return formatDate(`${period.slice(0, 7)}-01`, { month: 'long', timeZone: 'UTC' });
}

export function InvestmentHistoryCard({ change, area }: InvestmentHistoryCardProps) {
  const { t } = useTranslation('smartCheck');
  const direction = change.perM2 > 0 ? 'up' : change.perM2 < 0 ? 'down' : 'flat';
  const sign = direction === 'up' ? '+' : direction === 'down' ? '−' : '';
  const first = longMonth(change.first.period);
  const percent = `${sign}${formatNumber(Math.abs(change.percent), { maximumFractionDigits: 1 })}%`;
  const amount = Math.abs(changeForArea(change, area));

  return (
    <InvestmentCard
      eyebrow={t('report.chapters.investment.history.eyebrow', {
        first: formatDate(change.first.period.slice(0, 7) + '-01', {
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        }),
        last: formatDate(change.last.period.slice(0, 7) + '-01', {
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        }),
      })}
      title={t(`report.chapters.investment.history.title.${direction}`, {
        month: first,
        value: formatNumber(Math.abs(change.perM2)),
      })}
      titleId={HISTORY_TITLE_ID}
    >
      <div className="mt-5 grid items-end gap-5 w760:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] w760:gap-8">
        <div
          role="img"
          aria-label={t('report.chapters.investment.history.chartLabel')}
          className="grid h-48 items-end gap-3 w760:gap-5"
          style={{ gridTemplateColumns: `repeat(${String(change.bars.length)}, minmax(0, 1fr))` }}
        >
          {change.bars.map((bar) => (
            <span key={bar.period} className="flex h-full flex-col items-center justify-end">
              <b
                className={cn(
                  'mb-1.5 text-[12.5px] font-extrabold tabular-nums',
                  bar.isLast ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                {formatNumber(bar.value)}
              </b>
              <i
                style={{ height: `${String(bar.height * 0.78)}%` }}
                className={cn(
                  'block w-full max-w-30 rounded-[8px]',
                  bar.isLast ? 'bg-primary' : 'bg-report-context/55',
                )}
              />
              <em className="mt-1.5 text-[12px] font-semibold text-muted-foreground not-italic">
                {shortMonth(bar.period)}
              </em>
            </span>
          ))}
        </div>
        <div className="rounded-icon bg-surface-highlight px-5 py-4">
          <p className="text-[13.5px] font-bold text-muted-foreground">
            {t('report.chapters.investment.history.forArea', {
              area: formatNumber(area),
              month: first,
            })}
          </p>
          <p className="mt-1 text-[26px] font-extrabold tracking-[-0.02em] tabular-nums">
            {sign} {formatPrice(amount, 'EUR')}
          </p>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            {t('report.chapters.investment.history.span', {
              percent,
              count: change.monthsSpan,
            })}
          </p>
        </div>
      </div>
    </InvestmentCard>
  );
}
