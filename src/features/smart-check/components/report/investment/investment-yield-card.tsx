import { InfoIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatNumber } from '@/i18n/format';
import { yieldBarWidth } from '../../../investment.utils';
import { ExamplePill } from './example-pill';
import { InvestmentCard } from './investment-card';

const YIELD_TITLE_ID = 'investment-yield-title';

type InvestmentYieldCardProps = {
  cityName: string;
  grossPct: number;
  isExample: boolean;
};

export function InvestmentYieldCard({ cityName, grossPct, isExample }: InvestmentYieldCardProps) {
  const { t } = useTranslation('smartCheck');
  const value = formatNumber(grossPct, { maximumFractionDigits: 1 });
  return (
    <InvestmentCard
      eyebrow={t('report.chapters.investment.yield.eyebrow')}
      title={t('report.chapters.investment.yield.title', { value })}
      titleId={YIELD_TITLE_ID}
    >
      <div className="mt-5 flex items-center gap-3">
        <span className="flex items-center gap-2 text-[14px] font-bold">
          {cityName}
          {isExample ? <ExamplePill /> : null}
        </span>
        <div aria-hidden="true" className="h-3.5 flex-1 rounded-full bg-muted">
          <i
            style={{ width: `${String(yieldBarWidth(grossPct))}%` }}
            className="block h-full rounded-full bg-primary"
          />
        </div>
        <b className="text-[18px] font-extrabold tabular-nums">
          {t('report.chapters.investment.yield.value', { value })}
        </b>
      </div>
      <p className="mt-4 flex gap-2 text-[12.5px] leading-[1.45] text-muted-foreground">
        <InfoIcon aria-hidden="true" className="mt-0.5 size-3.75 shrink-0" />
        <span>{t('report.chapters.investment.yield.note')}</span>
      </p>
    </InvestmentCard>
  );
}
