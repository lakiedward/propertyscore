import { ArrowRightIcon, InfoIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDate, formatNumber } from '@/i18n/format';
import type { ReportResult } from '../../../report.types';
import { InvestmentCard } from './investment-card';

type Investment = NonNullable<ReportResult['sections']['investment']>;

type InvestmentSourcesCardProps = {
  investment: Investment;
  cityName: string;
  hasExample: boolean;
};

function monthYear(period: string): string {
  return formatDate(`${period.slice(0, 7)}-01`, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function InvestmentSourcesCard({
  investment,
  cityName,
  hasExample,
}: InvestmentSourcesCardProps) {
  const { t } = useTranslation('smartCheck');
  const reference = investment.reference_date
    ? ` · ${formatDate(investment.reference_date, { day: 'numeric', month: 'short', year: 'numeric' })}`
    : '';

  const sourceName = (source: string): string => {
    if (source === 'apartamente_org') {
      return t('report.chapters.investment.sources.names.apartamente_org');
    }
    if (source === 'apartamente_org_index') {
      return t('report.chapters.investment.sources.names.apartamente_org_index');
    }
    if (source === 'imospot_index')
      return t('report.chapters.investment.sources.names.imospot_index');
    return source;
  };

  const detail = (source: string): string | null => {
    if (source === 'imospot_index') {
      const count = investment.sale?.count;
      return count == null
        ? t('report.chapters.investment.sources.saleCity', { city: cityName })
        : t('report.chapters.investment.sources.saleCityOffers', {
            city: cityName,
            count,
            amount: formatNumber(count),
          });
    }
    if (source === 'apartamente_org' || source === 'apartamente_org_index') {
      const count = investment.rent?.count;
      return count == null
        ? t('report.chapters.investment.sources.rentCity', { city: cityName })
        : t('report.chapters.investment.sources.rentCityOffers', {
            city: cityName,
            count,
            amount: formatNumber(count),
          });
    }
    return null;
  };

  return (
    <InvestmentCard eyebrow={t('report.chapters.investment.sources.eyebrow', { date: reference })}>
      <ul className="mt-3 divide-y divide-border border-t border-border">
        {investment.sources.map((source) => {
          const when = source.observed_on
            ? formatDate(source.observed_on, { day: 'numeric', month: 'short', year: 'numeric' })
            : monthYear(source.period);
          const name = sourceName(source.source);
          const sub = detail(source.source);
          return (
            <li key={`${source.source}-${source.url}`} className="flex items-center gap-3 py-3.5">
              <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full bg-primary" />
              <span className="min-w-0 flex-1">
                <b className="block text-[15px] leading-snug font-extrabold">
                  {name}, {when}
                </b>
                {sub === null ? null : (
                  <small className="text-[13px] text-muted-foreground">{sub}</small>
                )}
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
