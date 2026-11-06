import { useTranslation } from 'react-i18next';
import { toCurrency } from '@/features/listings';
import { formatNumber, formatPrice } from '@/i18n/format';
import type { QueueListing } from '../moderation.types';

type PricedListing = Pick<QueueListing, 'transaction' | 'price' | 'currency' | 'area_m2'>;

export function useListingPrice(listing: PricedListing) {
  const { t } = useTranslation('moderation');
  const amount = formatPrice(listing.price, toCurrency(listing.currency));
  return {
    price: listing.transaction === 'rent' ? t('listing.pricePerMonth', { price: amount }) : amount,
    area: t('listing.area', { value: formatNumber(listing.area_m2) }),
  };
}
