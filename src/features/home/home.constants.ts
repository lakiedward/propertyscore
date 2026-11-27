import type { HomeSectionId } from '@/components/layout/site-navigation';

export const BOOKING_TARGET = 'booking';

export type CtaTarget = HomeSectionId | typeof BOOKING_TARGET;

export function ctaLinkOptions(target: CtaTarget) {
  return target === BOOKING_TARGET
    ? ({ to: '/inspection' } as const)
    : ({ to: '/', hash: target } as const);
}
