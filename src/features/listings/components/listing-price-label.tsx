import { cva } from 'class-variance-authority';
import { useTranslation } from 'react-i18next';

const priceVariants = cva('font-extrabold tabular-nums', {
  variants: {
    look: {
      card: 'mb-1 text-card-title tracking-figure text-foreground',
      stacked: 'text-price-sm text-foreground',
      popup: 'text-title-2xs-sm tracking-[-0.025em] text-brand',
    },
  },
});

const suffixVariants = cva('ml-1 font-semibold tracking-normal', {
  variants: {
    look: {
      card: 'text-small text-muted-foreground',
      stacked: 'text-small text-muted-foreground',
      popup: 'text-caption',
    },
  },
});

type ListingPriceLabelProps = {
  price: string;
  isRent: boolean;
  look: 'card' | 'stacked' | 'popup';
};

export function ListingPriceLabel({ price, isRent, look }: ListingPriceLabelProps) {
  const { t } = useTranslation('listings');

  return (
    <span className={priceVariants({ look })}>
      {price}
      {isRent ? (
        <small className={suffixVariants({ look })}>{t('explore.perMonthSuffix')}</small>
      ) : null}
    </span>
  );
}
