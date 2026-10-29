import { formatPriceParts, type Currency } from '@/i18n/format';
import { cn } from '@/lib/utils';

type SplitPriceProps = {
  amount: number;
  currency: Currency;
  className?: string;
  currencyClassName?: string;
};

export function SplitPrice({ amount, currency, className, currencyClassName }: SplitPriceProps) {
  const parts = formatPriceParts(amount, currency);
  const currencyPart = <small className={currencyClassName}>{parts.currency}</small>;

  return (
    <span className={cn('whitespace-nowrap tabular-nums', className)}>
      {parts.isCurrencyFirst ? (
        <>
          {currencyPart} {parts.amount}
        </>
      ) : (
        <>
          {parts.amount} {currencyPart}
        </>
      )}
    </span>
  );
}
