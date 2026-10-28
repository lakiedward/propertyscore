import type { Currency } from '@/i18n/format';
import type { ListingVerification } from './listing.types';

export function toCurrency(value: string): Currency {
  return value === 'EUR' ? 'EUR' : 'RON';
}

export function toTrustKind(verification: ListingVerification): 'physical' | 'online' | 'none' {
  if (verification === 'smartcheck') {
    return 'online';
  }
  return verification;
}
