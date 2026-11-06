import { useTranslation } from 'react-i18next';
import { formatNumber, formatPrice, toCurrency } from '@/i18n/format';

type PricedListing = {
  transaction: 'sale' | 'rent';
  price: number;
  currency: string;
  area_m2: number;
};

export function useListingPrice(listing: PricedListing) {
  const { t } = useTranslation();
  const amount = formatPrice(listing.price, toCurrency(listing.currency));
  return {
    price:
      listing.transaction === 'rent'
        ? t('listingSummary.pricePerMonth', { price: amount })
        : amount,
    area: t('listingSummary.area', { value: formatNumber(listing.area_m2) }),
  };
}
