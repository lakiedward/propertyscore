import type { TrustKind } from '@/components/trust/trust.utils';
import type { Currency } from '@/i18n/format';
import type { ListingVerification } from './listing.types';

export function toCurrency(value: string): Currency {
  return value === 'EUR' ? 'EUR' : 'RON';
}

export function toTrustKind(verification: ListingVerification): TrustKind {
  if (verification === 'smartcheck') {
    return 'online';
  }
  return verification;
}
