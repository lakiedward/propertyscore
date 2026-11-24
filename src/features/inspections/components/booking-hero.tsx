import { CalendarCheckIcon, CheckIcon, ClockIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import inspectorImage from '@/assets/home/inspection-window.webp';
import { Logo } from '@/components/brand/logo';
import { Stepper } from '@/components/navigation/stepper';
import { SERVICE_PRICES } from '@/config/pricing';
import { formatPrice } from '@/i18n/format';

const BOOKING_STEP_KEYS = ['requester', 'home', 'date', 'access', 'payment'] as const;

const INCLUDES = ['checks', 'report', 'photos', 'tour', 'plan', 'listing'] as const;

type BookingHeroProps = {
  step: number;
};

export function BookingHero({ step }: BookingHeroProps) {
  const { t } = useTranslation('inspections');
  const price = formatPrice(SERVICE_PRICES.physical.amount, SERVICE_PRICES.physical.currency);
  const stepper = (
    <Stepper
      label={t('booking.steps.label')}
      steps={BOOKING_STEP_KEYS.map((key) => t(`booking.steps.${key}`))}
      current={step - 1}
    />
  );

  if (step > 1) {
    return (
      <section className="bg-surface-warm">
        <div className="page-wrap py-4 sm:py-6">
          <div className="flex flex-col gap-4 rounded-photo border border-card bg-card px-5 py-4 shadow-card-soft sm:px-6">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Logo product="physical" size="sm" />
              <h1 className="order-3 min-w-0 basis-full text-[20px] leading-tight font-extrabold tracking-[-0.025em] sm:order-2 sm:flex-1 sm:basis-auto sm:text-[24px]">
                {t('booking.hero.title')}
              </h1>
              <span className="order-2 ml-auto flex items-baseline gap-2 sm:order-3">
                <strong className="text-[22px] font-extrabold tracking-[-0.03em] text-brand tabular-nums">
                  {price}
                </strong>
                <span className="text-caption text-muted-foreground max-sm:sr-only">
                  {t('booking.hero.priceNote')}
                </span>
              </span>
            </div>
            {stepper}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-surface-warm">
      <div className="page-wrap flex flex-col gap-4 pt-5 pb-6 sm:pt-8 sm:pb-8">
        <div className="grid overflow-hidden rounded-2xl bg-trust-physical text-trust-physical-foreground shadow-booking-photo w960:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="flex min-w-0 flex-col gap-6 p-6 sm:p-10">
            <Logo product="physical" tone="inverse" size="md" />
            <div className="flex flex-col gap-3">
              <p className="text-eyebrow font-bold text-trust-physical-mark uppercase">
                {t('booking.hero.eyebrow')}
              </p>
              <h1 className="text-[32px] leading-[1.05] font-extrabold tracking-[-0.035em] text-balance sm:text-[44px]">
                {t('booking.hero.title')}
              </h1>
              <p className="max-w-140 text-lead-sm text-on-inverse-muted">
                {t('booking.hero.text')}
              </p>
            </div>
            <ul
              aria-label={t('booking.hero.includesLabel')}
              className="grid max-w-140 gap-x-6 gap-y-2.5 sm:grid-cols-2"
            >
              {INCLUDES.map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-body-sm">
                  <CheckIcon aria-hidden className="size-4.5 shrink-0 text-trust-physical-mark" />
                  {t(`booking.hero.includes.${item}`)}
                </li>
              ))}
            </ul>
            <div className="mt-auto flex flex-wrap items-end gap-x-10 gap-y-4 border-t border-on-inverse/15 pt-6">
              <span className="flex flex-col gap-1 leading-none">
                <strong className="text-[36px] font-extrabold tracking-[-0.035em] tabular-nums">
                  {price}
                </strong>
                <span className="text-caption text-on-inverse-muted">
                  {t('booking.hero.priceNote')}
                </span>
              </span>
              <span className="flex flex-col gap-1.5 text-small font-semibold">
                <span className="inline-flex items-center gap-2">
                  <ClockIcon aria-hidden className="size-4 text-trust-physical-mark" />
                  {t('booking.hero.duration')}
                </span>
                <span className="inline-flex items-center gap-2">
                  <CalendarCheckIcon aria-hidden className="size-4 text-trust-physical-mark" />
                  {t('booking.hero.reschedule')}
                </span>
              </span>
            </div>
          </div>
          <div className="relative hidden w960:block">
            <img
              src={inspectorImage}
              alt={t('booking.hero.imageAlt')}
              className="absolute inset-0 size-full object-cover"
            />
          </div>
        </div>
        <div className="rounded-photo border border-card bg-card px-5 py-5 shadow-card-soft sm:px-8 sm:py-6">
          {stepper}
        </div>
      </div>
    </section>
  );
}
