import type { Currency } from '@/i18n/format';

type ServicePrice = { amount: number; currency: Currency };

export const SERVICE_PRICES = {
  physical: { amount: 500, currency: 'RON' },
  smartCheck: { amount: 30, currency: 'RON' },
  consultationFrom: { amount: 150, currency: 'RON' },
  partnerCommission: { amount: 100, currency: 'RON' },
} as const satisfies Record<string, ServicePrice>;
