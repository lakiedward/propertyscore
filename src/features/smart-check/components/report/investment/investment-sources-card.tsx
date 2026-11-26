import { ArrowRightIcon, InfoIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDate, formatNumber } from '@/i18n/format';
import { investmentSources } from '../../../investment.utils';
import type { ReportResult } from '../../../report.types';
import { InvestmentCard } from './investment-card';
import { marketPeriod, marketSourceName } from './market-source-format';

type Investment = NonNullable<ReportResult['sections']['investment']>;

type InvestmentSourcesCardProps = {
  investment: Investment;
  marketName: string;
  hasExample: boolean;
};

export function InvestmentSourcesCard({
  investment,
  marketName,
  hasExample,
}: InvestmentSourcesCardProps) {
  const { t } = useTranslation('smartCheck');
  const reference = investment.reference_date
    ? ` · ${formatDate(investment.reference_date, { day: 'numeric', month: 'short', year: 'numeric' })}`
    : '';

  return (
    <InvestmentCard eyebrow={t('report.chapters.investment.sources.eyebrow', { date: reference })}>
      <ul className="mt-3 divide-y divide-border border-t border-border">
        {investmentSources(investment).map(({ source, details }) => {
          const period = marketPeriod(source.period);
          const when = source.observed_on
            ? formatDate(source.observed_on, { day: 'numeric', month: 'short', year: 'numeric' })
            : null;
          const name = marketSourceName(t, source.source);
          const descriptions = details.map(({ role, place, count, countKind }) => {
            const label = t(`report.chapters.investment.sources.roles.${role}`, {
              place: place ?? marketName,
            });
            if (count === null) return label;
            const amount = t(
              countKind === 'apartments'
                ? 'report.chapters.investment.apartments'
                : 'report.chapters.investment.offers',
              {
                count,
                amount: formatNumber(count),
              },
            );
            return `${label} · ${amount}`;
          });
          if (!descriptions.length && source.label) descriptions.push(source.label);
          return (
            <li
              key={JSON.stringify([source.source, source.period, source.url])}
              className="flex items-center gap-3 py-3.5"
            >
              <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full bg-primary" />
              <span className="min-w-0 flex-1">
                <b className="block text-[15px] leading-snug font-extrabold">
                  {name}, {period}
                  {when ? ` · ${when}` : null}
                </b>
                {descriptions.map((detail) => (
                  <small key={detail} className="block text-[13px] text-muted-foreground">
                    {detail}
                  </small>
                ))}
              </span>
              {source.url === null ? null : (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-surface-highlight px-3.5 py-2 text-[13.5px] font-extrabold hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
                >
                  {t('report.chapters.investment.sources.open')}
                  <ArrowRightIcon aria-hidden="true" className="size-3.5" />
                </a>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-3.5 flex gap-2 text-[12.5px] leading-[1.45] text-muted-foreground">
        <InfoIcon aria-hidden="true" className="mt-0.5 size-3.75 shrink-0" />
        <span>
          {t('report.chapters.investment.sources.note')}
          {hasExample ? ` ${t('report.chapters.investment.sources.exampleNote')}` : ''}
        </span>
      </p>
    </InvestmentCard>
  );
}
