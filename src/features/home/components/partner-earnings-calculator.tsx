import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SplitPrice } from '@/components/property/split-price';
import { Slider } from '@/components/ui/slider';
import { SERVICE_PRICES } from '@/config/pricing';
import { formatNumber } from '@/i18n/format';

const MIN_PROPERTIES = 1;
const MAX_PROPERTIES = 20;
const DEFAULT_PROPERTIES = 5;
const MONTHS_PER_YEAR = 12;

export function PartnerEarningsCalculator() {
  const { t } = useTranslation('home');
  const labelId = useId();
  const [count, setCount] = useState(DEFAULT_PROPERTIES);
  const commission = SERVICE_PRICES.partnerCommission;
  const valueText = t('partners.calculator.value', { count });

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-card p-9 text-brand shadow-calculator">
      <p id={labelId} className="text-label font-extrabold">
        {t('partners.calculator.label')}
      </p>
      <p className="flex items-baseline gap-2" aria-hidden="true">
        <span className="text-[56px] leading-none font-extrabold tracking-[-0.04em] tabular-nums">
          {formatNumber(count)}
        </span>
        <span className="text-label font-bold">{t('partners.calculator.unit', { count })}</span>
      </p>
      <div className="flex flex-col gap-2">
        <Slider
          min={MIN_PROPERTIES}
          max={MAX_PROPERTIES}
          step={1}
          value={[count]}
          onValueChange={([next]) => {
            if (next !== undefined) {
              setCount(next);
            }
          }}
          aria-labelledby={labelId}
          thumbLabel={t('partners.calculator.label')}
          thumbValueText={valueText}
        />
        <div
          className="flex justify-between text-meta font-bold text-muted-foreground"
          aria-hidden="true"
        >
          <span>{formatNumber(MIN_PROPERTIES)}</span>
          <span>{formatNumber(MAX_PROPERTIES)}</span>
        </div>
      </div>
      <div className="mt-1.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2" aria-live="polite">
        <div className="flex flex-col gap-1 rounded-[14px] bg-background p-4">
          <span className="text-meta font-bold text-muted-foreground">
            {t('partners.calculator.perMonth')}
          </span>
          <SplitPrice
            amount={count * commission.amount}
            currency={commission.currency}
            className="text-[32px] leading-none font-extrabold tracking-[-0.04em] text-brand"
            currencyClassName="text-label font-extrabold tracking-normal"
          />
        </div>
        <div className="flex flex-col gap-1 rounded-[14px] bg-primary p-4">
          <span className="text-meta font-bold text-on-inverse-faint">
            {t('partners.calculator.perYear')}
          </span>
          <SplitPrice
            amount={count * commission.amount * MONTHS_PER_YEAR}
            currency={commission.currency}
            className="text-[32px] leading-none font-extrabold tracking-[-0.04em] text-cta"
            currencyClassName="text-label font-extrabold tracking-normal text-on-inverse"
          />
        </div>
      </div>
      <p className="max-w-140 text-small text-muted-foreground">{t('partners.calculator.note')}</p>
    </div>
  );
}
