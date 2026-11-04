import { CheckIcon, PlusIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BrandMark } from '@/components/brand/brand-mark';
import { Logo } from '@/components/brand/logo';
import { HOME_SECTION } from '@/components/layout/site-navigation';
import { PillLink } from '@/components/navigation/pill-link';
import { SplitPrice } from '@/components/property/split-price';
import { SERVICE_PRICES } from '@/config/pricing';
import { formatPrice } from '@/i18n/format';
import { useBrandNames } from '../hooks/use-brand-names';

export function PackageBundle() {
  const { t } = useTranslation('home');
  const brands = useBrandNames();
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
      aria-label={t('deliverables.bundle.label', { price: physicalPrice, ...brands })}
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
          <BundleList items={physicalItems} />
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
          <BundleList items={smartCheckItems} />
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
            className="text-title-lg leading-none font-extrabold tracking-title text-brand"
            currencyClassName="text-label font-extrabold tracking-normal"
          />
        </span>
        <PillLink to="/" hash={HOME_SECTION.pricing} size="sm">
          {t('deliverables.bundle.cta')}
        </PillLink>
      </div>
    </div>
  );
}

type BundleListProps = { items: readonly string[] };

function BundleList({ items }: BundleListProps) {
  return (
    <ul className="mt-2.5 flex flex-col gap-2.5">
      {items.map((item) => (
        <li key={item} className="flex items-center gap-2 text-body leading-[1.35] font-semibold">
          <CheckIcon aria-hidden className="size-4 text-cta" />
          {item}
        </li>
      ))}
    </ul>
  );
}
