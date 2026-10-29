import { Link } from '@tanstack/react-router';
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  CheckIcon,
  DoorOpenIcon,
  LayersIcon,
  RulerIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { HOME_SECTION } from '@/components/layout/site-navigation';
import { SplitPrice } from '@/components/property/split-price';
import { SERVICE_PRICES } from '@/config/pricing';
import { formatDate, formatNumber, formatPrice } from '@/i18n/format';
import livingImage from '@/assets/home/hero-living.webp';

const SAMPLE_VERIFIED_AT = '2026-10-14T10:00:00Z';
const SAMPLE_PRICE = 120000;
const SAMPLE_SCORE = 82;
const SAMPLE_FACTS = [
  { key: 'area', icon: RulerIcon },
  { key: 'rooms', icon: DoorOpenIcon },
  { key: 'floor', icon: LayersIcon },
  { key: 'year', icon: CalendarDaysIcon },
] as const;

export function ListingBenefit() {
  const { t } = useTranslation(['home', 'common']);
  const price = formatPrice(SERVICE_PRICES.physical.amount, SERVICE_PRICES.physical.currency);
  const steps = t('deliverables.listing.steps', { returnObjects: true, price });
  const includes = t('deliverables.listing.includes', { returnObjects: true });

  return (
    <article
      id={HOME_SECTION.listingIncluded}
      aria-labelledby="listing-included-title"
      className="mt-14 grid scroll-mt-header grid-cols-1 items-center gap-12 rounded-2xl bg-primary p-6 text-on-inverse w520:p-12 w960:grid-cols-[0.9fr_1.1fr] w960:gap-18"
    >
      <div className="overflow-hidden rounded-xl bg-card text-brand shadow-sample w960:-rotate-1">
        <div className="relative aspect-[1.56] w-full">
          <img
            src={livingImage}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 size-full object-cover"
          />
          <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-primary py-1.5 pr-3 pl-1.5 text-meta font-bold text-on-inverse">
            <span className="grid size-6 place-items-center rounded-full bg-cta text-brand">
              <CheckIcon aria-hidden className="size-3.5" strokeWidth={3} />
            </span>
            {t('deliverables.listing.cardBadge', {
              date: formatDate(SAMPLE_VERIFIED_AT, {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              }),
            })}
          </span>
          <span
            role="img"
            aria-label={t('smartCheck.report.scoreLabel', { score: SAMPLE_SCORE })}
            className="absolute top-2.5 right-2.5 flex flex-col items-center rounded-lg bg-info px-2.5 py-1.5 text-on-inverse"
          >
            <b aria-hidden="true" className="text-xl leading-none font-extrabold">
              {formatNumber(SAMPLE_SCORE)}
            </b>
            <small
              aria-hidden="true"
              className="mt-1 text-[10px] leading-none font-bold text-on-info-muted"
            >
              {t('common:brand.smartcheck')}
            </small>
          </span>
        </div>
        <div className="flex flex-col gap-1.5 px-5 pt-4.5 pb-5">
          <SplitPrice
            amount={SAMPLE_PRICE}
            currency="EUR"
            className="text-price-box text-foreground"
            currencyClassName="text-price-box"
          />
          <p className="text-xl font-extrabold">{t('deliverables.listing.cardTitle')}</p>
          <p className="text-body text-muted-foreground">{t('deliverables.listing.cardArea')}</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {SAMPLE_FACTS.map((fact) => {
              const Icon = fact.icon;
              return (
                <li
                  key={fact.key}
                  className="inline-flex items-center gap-1.5 rounded-full bg-surface-subtle-warm px-3 py-1.5 text-small font-bold"
                >
                  <Icon aria-hidden className="size-3.5 text-muted-foreground" />
                  {t(`deliverables.listing.cardFacts.${fact.key}`)}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      <div className="flex flex-col gap-5">
        <h3
          id="listing-included-title"
          className="text-[clamp(28px,3vw,44px)] leading-[1.08] font-extrabold tracking-[-0.03em] text-balance text-on-inverse"
        >
          {t('deliverables.listing.titleLead')}{' '}
          <span className="text-cta">{t('deliverables.listing.titleAccent')}</span>
        </h3>
        <p className="max-w-copy text-lead-sm text-on-inverse-soft">
          {t('deliverables.listing.text')}
        </p>
        <ol className="grid grid-cols-1 gap-3 w560:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title} className="flex flex-col gap-1 rounded-lg bg-on-inverse/7 p-3.5">
              <span className="grid size-6 place-items-center rounded-full bg-cta text-meta font-extrabold text-brand">
                {index + 1}
              </span>
              <strong className="mt-1.5 text-label font-extrabold">{step.title}</strong>
              <span className="text-meta text-on-inverse-faint">{step.text}</span>
            </li>
          ))}
        </ol>
        <div>
          <p className="text-small font-extrabold">{t('deliverables.listing.includesTitle')}</p>
          <ul className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2.5 w560:grid-cols-2">
            {includes.map((item) => (
              <li
                key={item}
                className="flex items-center gap-2 text-label font-normal text-on-inverse-bright"
              >
                <CheckIcon aria-hidden className="size-4 shrink-0 text-cta" strokeWidth={3} />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-6 gap-y-3.5">
          <Link
            to="/"
            hash={HOME_SECTION.pricing}
            className="inline-flex min-h-12.5 items-center gap-3 rounded-full bg-cta py-0 pr-2 pl-5 text-label font-extrabold text-brand transition-colors hover:bg-cta-hover focus-visible:ring-3 focus-visible:ring-focus-inverse focus-visible:outline-none"
          >
            {t('deliverables.listing.cta', { price })}
            <span
              aria-hidden="true"
              className="grid size-9 place-items-center rounded-full bg-primary text-cta"
            >
              <ArrowRightIcon className="size-4" />
            </span>
          </Link>
          <Link
            to="/"
            hash={HOME_SECTION.listings}
            className="text-small font-bold text-on-inverse underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-focus-inverse focus-visible:outline-none"
          >
            {t('deliverables.listing.link')}
          </Link>
        </div>
      </div>
    </article>
  );
}
