import { cva, type VariantProps } from 'class-variance-authority';
import { useTranslation } from 'react-i18next';
import { formatPrice, type Currency } from '@/i18n/format';
import { cn } from '@/lib/utils';

const priceVariants = cva('font-extrabold tabular-nums', {
  variants: {
    size: {
      xs: 'text-label',
      sm: 'text-price-sm',
      md: 'text-price',
      lg: 'text-price-lg',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

type PriceProps = VariantProps<typeof priceVariants> & {
  amount: number;
  currency: Currency;
  period?: 'month';
  className?: string;
};

export function Price({ amount, currency, period, size, className }: PriceProps) {
  const { t } = useTranslation('listings');
  const price = formatPrice(amount, currency);

  return (
    <span className={cn(priceVariants({ size }), className)}>
      {period === 'month' ? t('price.perMonth', { price }) : price}
    </span>
  );
}
