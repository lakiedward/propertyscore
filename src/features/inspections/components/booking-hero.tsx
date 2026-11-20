import { BookOpenCheckIcon, CalendarCheckIcon, CheckIcon, ClockIcon } from 'lucide-react';
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
      <section className="bg-step-leaf-soft">
        <div className="mx-auto max-w-wide px-4 py-4 sm:px-8 sm:py-6">
          <div className="flex flex-col gap-4 rounded-photo bg-card px-5 py-4 shadow-booking-steps">
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
    <section className="bg-step-leaf-soft">
      <div className="mx-auto grid max-w-wide items-center gap-5 px-4 pt-6 pb-5 w960:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] sm:gap-10 sm:px-8 sm:pt-9 sm:pb-7">
        <div className="flex min-w-0 flex-col gap-3.5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
            <Logo product="physical" size="lg" />
            <span className="inline-flex min-h-8 items-center rounded-full bg-card px-3.5 text-caption font-extrabold text-step-leaf-ink shadow-booking-check">
              {t('booking.hero.eyebrow')}
            </span>
          </div>
          <h1 className="text-[30px] leading-[1.08] font-extrabold tracking-[-0.035em] text-balance sm:text-[40px]">
            {t('booking.hero.title')}
          </h1>
          <p className="max-w-140 text-lead-sm text-muted-foreground">{t('booking.hero.text')}</p>
          <ul
            aria-label={t('booking.hero.includesLabel')}
            className="mt-1 grid max-w-140 gap-x-4.5 gap-y-2 sm:grid-cols-2"
          >
            {INCLUDES.map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-body-sm leading-[1.35]">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-card text-step-leaf-solid shadow-booking-check">
                  <CheckIcon aria-hidden className="size-3.5" />
                </span>
                {t(`booking.hero.includes.${item}`)}
              </li>
            ))}
          </ul>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-5 gap-y-3 self-start rounded-2xl bg-card px-4.5 py-3.5 shadow-booking-price">
            <span className="flex flex-col leading-[1.1]">
              <strong className="text-[30px] font-extrabold tracking-[-0.035em] text-brand tabular-nums">
                {price}
              </strong>
              <span className="text-caption text-muted-foreground">
                {t('booking.hero.priceNote')}
              </span>
            </span>
            <span aria-hidden className="w-px self-stretch bg-border-subtle" />
            <span className="flex flex-col gap-1 text-small font-bold text-step-leaf-ink">
              <span className="inline-flex items-center gap-1.5">
                <ClockIcon aria-hidden className="size-4" />
                {t('booking.hero.duration')}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarCheckIcon aria-hidden className="size-4" />
                {t('booking.hero.reschedule')}
              </span>
            </span>
          </div>
        </div>
        <div className="relative hidden pt-3.5 pr-7.5 pb-7.5 pl-3.5 w960:block">
          <div
            aria-hidden
            className="absolute inset-[28px_0_0_34px] rounded-[28px] bg-category-green-fill"
          />
          <div className="absolute top-7 right-0 z-1 inline-flex items-center gap-2 rounded-full bg-primary px-3.5 py-2.25 text-caption font-extrabold text-primary-foreground shadow-booking-badge">
            <BookOpenCheckIcon aria-hidden className="size-4 text-cta" />
            {t('booking.hero.bookBadge')}
          </div>
          <img
            src={inspectorImage}
            alt={t('booking.hero.imageAlt')}
            className="relative aspect-4/3 w-full rounded-photo object-cover shadow-booking-photo"
          />
          <div className="absolute bottom-0 left-0 flex items-center gap-2.5 rounded-full bg-card py-2.5 pr-3.5 pl-2.5 shadow-booking-chip">
            <span
              aria-hidden
              className="grid size-9.5 place-items-center rounded-full bg-primary text-caption font-extrabold text-primary-foreground"
            >
              {t('booking.hero.inspectorInitials')}
            </span>
            <span className="flex flex-col leading-[1.2]">
              <strong className="text-small">{t('booking.hero.inspectorName')}</strong>
              <span className="text-meta text-muted-foreground">
                {t('booking.hero.inspectorQuote')}
              </span>
            </span>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-wide px-4 pb-6 sm:px-8 sm:pb-8">
        <div className="flex flex-col gap-3 rounded-photo bg-card px-5 py-4 shadow-booking-steps">
          {stepper}
        </div>
      </div>
    </section>
  );
}
