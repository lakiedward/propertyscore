import { Link } from '@tanstack/react-router';
import { ArrowRightIcon, CheckIcon, PlusIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BrandMark } from '@/components/brand/brand-mark';
import { Logo } from '@/components/brand/logo';
import { SplitPrice } from '@/components/property/split-price';
import { HOME_SECTION } from '@/components/layout/site-navigation';
import { SERVICE_PRICES } from '@/config/pricing';
import { formatPrice } from '@/i18n/format';

export function PackageBundle() {
  const { t } = useTranslation('home');
  const physicalPrice = formatPrice(
    SERVICE_PRICES.physical.amount,
    SERVICE_PRICES.physical.currency,
  );
  const smartCheckPrice = formatPrice(
    SERVICE_PRICES.smartCheck.amount,
    SERVICE_PRICES.smartCheck.currency,
  );
  const physicalItems = t('deliverables.bundle.physicalItems', { returnObjects: true });
  const smartCheckItems = t('deliverables.bundle.smartCheckItems', { returnObjects: true });

  return (
    <div
      role="group"
      aria-label={t('deliverables.bundle.label', { price: physicalPrice })}
      className="flex flex-col rounded-2xl bg-card p-4 shadow-bundle"
    >
      <div className="relative grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2.5 rounded-xl bg-primary p-6.5 text-on-inverse">
          <span className="flex flex-wrap items-center gap-2">
            <BrandMark product="physical" size={34} />
            <Logo product="physical" tone="inverse" size="bundle" hasMark={false} isDecorative />
          </span>
          <span className="text-label font-normal text-on-inverse-muted">
            {t('deliverables.bundle.physicalKind')}
          </span>
          <ul className="mt-2.5 flex flex-col gap-2.5">
            {physicalItems.map((item) => (
              <li
                key={item}
                className="flex items-center gap-2 text-body leading-[1.35] font-semibold"
              >
                <CheckIcon aria-hidden className="size-4 text-cta" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <span
          aria-hidden
          className="absolute top-1/2 left-1/2 z-10 hidden size-9 -translate-1/2 place-items-center rounded-full bg-card text-brand shadow-plus sm:grid"
        >
          <PlusIcon className="size-4" />
        </span>
        <div className="flex flex-col gap-2.5 rounded-xl bg-info p-6.5 text-on-inverse">
          <span className="flex flex-wrap items-center gap-2">
            <BrandMark product="smartcheck" tone="inverse" size={34} />
            <Logo product="smartcheck" tone="inverse" size="bundle" hasMark={false} isDecorative />
          </span>
          <span className="text-label font-normal text-on-info-muted">
            {t('deliverables.bundle.smartCheckKind')}
          </span>
          <ul className="mt-2.5 flex flex-col gap-2.5">
            {smartCheckItems.map((item) => (
              <li
                key={item}
                className="flex items-center gap-2 text-body leading-[1.35] font-semibold"
              >
                <CheckIcon aria-hidden className="size-4 text-cta" />
                {item}
              </li>
            ))}
          </ul>
          <s className="mt-auto pt-2.5 text-small text-on-info-muted">
            {t('deliverables.bundle.separate', { price: smartCheckPrice })}
          </s>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3 pt-5 pr-2.5 pb-2 pl-3.5">
        <span className="flex flex-col gap-0.5">
          <span className="text-caption font-bold text-muted-foreground">
            {t('deliverables.bundle.totalLabel')}
          </span>
          <SplitPrice
            amount={SERVICE_PRICES.physical.amount}
            currency={SERVICE_PRICES.physical.currency}
            className="text-[40px] leading-none font-extrabold tracking-[-0.04em] text-brand"
            currencyClassName="text-label font-extrabold tracking-normal"
          />
        </span>
        <Link
          to="/"
          hash={HOME_SECTION.pricing}
          className="inline-flex min-h-10 items-center gap-2 rounded-full bg-primary py-0 pr-1.5 pl-3.5 text-small font-extrabold text-primary-foreground focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
        >
          {t('deliverables.bundle.cta')}
          <span
            aria-hidden="true"
            className="grid size-7 place-items-center rounded-full bg-cta text-brand"
          >
            <ArrowRightIcon className="size-3.5" />
          </span>
        </Link>
      </div>
    </div>
  );
}
