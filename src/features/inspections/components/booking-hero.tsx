import { CalendarCheckIcon, CheckIcon, ClockIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import inspectorImage from '@/assets/home/inspection-window.webp';
import { BrandMark } from '@/components/brand/brand-mark';
import { Logo } from '@/components/brand/logo';
import { useSiteHero } from '@/components/layout/site-hero';
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
  useSiteHero(step > 1 ? null : 'physical');
  const price = formatPrice(SERVICE_PRICES.physical.amount, SERVICE_PRICES.physical.currency);
  const stepperList = (
    <Stepper
      label={t('booking.steps.label')}
      steps={BOOKING_STEP_KEYS.map((key) => t(`booking.steps.${key}`))}
      current={step - 1}
    />
  );
  const stepper = (
    <div className="page-wrap pt-5 sm:pt-7">
      <div className="rounded-photo border border-card bg-card px-5 py-4 shadow-card-soft sm:px-8 sm:py-6">
        {stepperList}
      </div>
    </div>
  );

  if (step > 1) {
    return (
      <div className="page-wrap pt-4 sm:pt-6">
        <div className="flex flex-col gap-4 rounded-photo border border-card bg-card px-5 py-4 shadow-card-soft sm:gap-5 sm:px-6 sm:py-5">
          <div className="flex items-center gap-3 border-b border-border-subtle pb-4 sm:gap-4 sm:pb-5">
            <BrandMark product="physical" size={40} className="sm:size-12" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <Logo product="physical" size="xs" hasMark={false} />
              <h1 className="text-[20px] leading-tight font-extrabold tracking-[-0.025em] text-balance sm:text-[24px]">
                {t('booking.hero.title')}
              </h1>
            </div>
            <span className="flex shrink-0 flex-col items-end gap-0.5 text-right">
              <strong className="text-[22px] leading-none font-extrabold tracking-[-0.03em] text-brand tabular-nums sm:text-[26px]">
                {price}
              </strong>
              <span className="text-caption text-muted-foreground max-sm:sr-only">
                {t('booking.hero.priceNote')}
              </span>
            </span>
          </div>
          {stepperList}
        </div>
      </div>
    );
  }

  return (
    <>
      <section aria-labelledby="booking-title" className="bg-trust-physical text-on-inverse">
        <div className="page-wrap grid items-center gap-9 pt-5 pb-10 w560:pt-12 w560:pb-18 w1080:grid-cols-[minmax(0,1fr)_minmax(0,560px)] w1080:gap-14">
          <div className="flex min-w-0 flex-col gap-4">
            <p className="text-caption font-bold tracking-label text-cta uppercase">
              {t('booking.hero.eyebrow')}
            </p>
            <h1
              id="booking-title"
              className="text-[clamp(34px,4vw,52px)] leading-[1.06] font-extrabold tracking-[-0.034em] text-balance"
            >
              {t('booking.hero.title')}
            </h1>
            <p className="max-w-[34em] text-lead-sm text-on-inverse-muted w560:text-lead w560:leading-copy">
              {t('booking.hero.text')}
            </p>
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-small text-on-inverse-muted">
              <span className="inline-flex items-center gap-2">
                <ClockIcon aria-hidden className="size-4 shrink-0 text-cta" />
                {t('booking.hero.duration')}
              </span>
              <span className="inline-flex items-center gap-2">
                <CalendarCheckIcon aria-hidden className="size-4 shrink-0 text-cta" />
                {t('booking.hero.reschedule')}
              </span>
            </p>
            <ul aria-label={t('booking.hero.includesLabel')} className="flex flex-wrap gap-2">
              {INCLUDES.map((item) => (
                <HeroFact key={item} icon={<CheckIcon aria-hidden className="size-4 text-cta" />}>
                  {t(`booking.hero.includes.${item}`)}
                </HeroFact>
              ))}
            </ul>
          </div>
          <div className="relative min-w-0 pt-4 pr-3.5 w560:pt-7.5 w560:pr-7.5">
            <span
              aria-hidden="true"
              className="absolute top-0 right-0 h-[88%] w-[86%] rounded-[28px] bg-cta"
            />
            <div className="relative h-75 overflow-hidden rounded-2xl shadow-booking-photo w560:h-110 w560:rounded-photo">
              <img
                src={inspectorImage}
                alt={t('booking.hero.imageAlt')}
                className="size-full object-cover"
              />
            </div>
            <div className="relative z-3 mx-3 -mt-11.5 flex items-center gap-3 rounded-[18px] bg-card py-3 pr-3.5 pl-3 text-foreground shadow-float w560:absolute w560:top-16.5 w560:-left-2.5 w560:m-0 w560:max-w-82.5 w560:gap-4 w560:py-4 w560:pr-5.5 w560:pl-4 w1080:-left-9">
              <BrandMark product="physical" size={52} />
              <div className="flex flex-col gap-0.75">
                <p className="text-meta font-extrabold tracking-label text-brand uppercase">
                  {t('booking.hero.priceLabel')}
                </p>
                <strong className="text-[24px] leading-[1.1] font-extrabold tracking-[-0.02em] tabular-nums w560:text-[28px]">
                  {price}
                </strong>
                <small className="text-caption leading-[1.4] text-muted-foreground">
                  {t('booking.hero.priceNote')}
                </small>
              </div>
            </div>
          </div>
        </div>
      </section>
      {stepper}
    </>
  );
}

type HeroFactProps = {
  icon: ReactNode;
  children: ReactNode;
};

function HeroFact({ icon, children }: HeroFactProps) {
  return (
    <li className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-on-inverse/12 px-3 text-small font-semibold text-on-inverse">
      {icon}
      {children}
    </li>
  );
}
