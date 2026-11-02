import { Trans, useTranslation } from 'react-i18next';
import { ArrowDownIcon } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { BrandMark } from '@/components/brand/brand-mark';
import { Logo } from '@/components/brand/logo';
import { HOME_SECTION } from '@/components/layout/site-navigation';
import { PillLink } from '@/components/navigation/pill-link';
import { SERVICE_PRICES } from '@/config/pricing';
import { formatNumber, formatPrice } from '@/i18n/format';
import { useBrandNames } from '../hooks/use-brand-names';

const STEPS = ['address', 'pin', 'report'] as const;

export function SmartCheckSteps() {
  const { t } = useTranslation('home');
  const brands = useBrandNames();
  const price = formatPrice(SERVICE_PRICES.smartCheck.amount, SERVICE_PRICES.smartCheck.currency);

  return (
    <div className="page-wrap flex flex-col gap-5 pt-14 pb-16">
      <div className="flex flex-col gap-8 rounded-2xl bg-info px-10 pt-8 pb-9 text-on-inverse">
        <div className="flex flex-wrap items-center justify-between gap-x-7 gap-y-4">
          <div className="flex flex-col gap-3">
            <Logo product="smartcheck" tone="inverse" size="lg" className="gap-2" />
            <h3 className="text-[clamp(18px,1.6vw,22px)] leading-[1.25] font-extrabold tracking-[-0.02em]">
              {t('smartCheck.steps.titleLead')}{' '}
              <span className="text-cta">{t('smartCheck.steps.titleAccent')}</span>
            </h3>
          </div>
          <PillLink to="/" hash={HOME_SECTION.pricing} tone="inverseAccent">
            {t('smartCheck.steps.cta', { price })}
          </PillLink>
        </div>
        <ol className="grid grid-cols-1 gap-4.5 w760:grid-cols-3 w760:gap-6">
          {STEPS.map((key, index) => (
            <li
              key={key}
              className="relative flex flex-col gap-1.5 pl-14 w760:pl-0 [&:not(:last-child)]:before:absolute [&:not(:last-child)]:before:top-11 [&:not(:last-child)]:before:-bottom-4.5 [&:not(:last-child)]:before:left-4.75 [&:not(:last-child)]:before:w-0.5 [&:not(:last-child)]:before:bg-on-inverse/30 w760:[&:not(:last-child)]:before:top-4.75 w760:[&:not(:last-child)]:before:right-[-24px] w760:[&:not(:last-child)]:before:bottom-auto w760:[&:not(:last-child)]:before:left-10 w760:[&:not(:last-child)]:before:h-0.5 w760:[&:not(:last-child)]:before:w-auto"
            >
              <span
                aria-hidden="true"
                className="absolute top-0 left-0 z-1 mb-2.5 grid size-10 place-items-center rounded-full bg-cta text-lead-sm font-extrabold text-info-ink shadow-[0_0_0_6px_var(--info)] w760:relative"
              >
                {formatNumber(index + 1)}
              </span>
              <strong className="mt-2 text-lg font-extrabold w760:mt-0">
                {t(`smartCheck.steps.items.${key}.title`)}
              </strong>
              <p className="max-w-copy text-small text-on-info-muted">
                {t(`smartCheck.steps.items.${key}.text`)}
              </p>
            </li>
          ))}
        </ol>
      </div>
      <Link
        to="/"
        hash={HOME_SECTION.physical}
        className="flex items-center gap-3 rounded-xl bg-card py-3.5 pr-4 pl-4.5 text-label font-normal text-info-ink shadow-tile-sm transition-shadow duration-(--duration-fast) hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
      >
        <BrandMark product="physical" size={28} />
        <span className="flex-1">
          <Trans
            t={t}
            i18nKey="smartCheck.crossSell"
            values={brands}
            components={{ strong: <strong className="font-bold text-brand" /> }}
          />
        </span>
        <span
          aria-hidden="true"
          className="grid size-8.5 shrink-0 place-items-center rounded-full bg-primary text-cta"
        >
          <ArrowDownIcon className="size-4" />
        </span>
      </Link>
    </div>
  );
}
