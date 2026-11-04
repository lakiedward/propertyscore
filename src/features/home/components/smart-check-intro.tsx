import type { LucideIcon } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';
import { Logo } from '@/components/brand/logo';
import { HOME_SECTION } from '@/components/layout/site-navigation';
import { TextLink } from '@/components/navigation/text-link';
import { SERVICE_PRICES } from '@/config/pricing';
import { formatPrice } from '@/i18n/format';
import { cn } from '@/lib/utils';
import {
  CATEGORY_ICON,
  CATEGORY_STYLE,
  HOME_CATEGORIES,
  PRICES_CATEGORY,
  PRICES_HUE,
  PRICES_ICON,
  type HomeCategory,
} from '../home.categories';
import { useBrandNames } from '../hooks/use-brand-names';
import { ProductPriceBox } from './product-price-box';
import { SectionTitle } from './section-title';

type Chip = {
  key: HomeCategory | typeof PRICES_CATEGORY;
  icon: LucideIcon;
  hue: HomeCategory;
};

const CHIPS: readonly Chip[] = [
  ...HOME_CATEGORIES.map((key) => ({ key, icon: CATEGORY_ICON[key], hue: key })),
  { key: PRICES_CATEGORY, icon: PRICES_ICON, hue: PRICES_HUE },
];

type SmartCheckIntroProps = { titleId: string };

export function SmartCheckIntro({ titleId }: SmartCheckIntroProps) {
  const { t } = useTranslation('home');
  const brands = useBrandNames();
  const { amount, currency } = SERVICE_PRICES.smartCheck;
  const price = formatPrice(amount, currency);

  return (
    <div className="bg-card pt-23 pb-13.75">
      <div className="page-wrap grid grid-cols-1 gap-4.25 w520:gap-4.75 w900:grid-cols-2 w900:gap-7.5 w1080:grid-cols-[1.08fr_1fr] w1080:gap-18">
        <div className="flex flex-col items-start gap-7">
          <Logo product="smartcheck" size="lg" className="gap-2" />
          <SectionTitle
            id={titleId}
            size="product"
            className="max-w-155 text-brand"
            accentClassName="text-info"
            lead={t('smartCheck.titleLead')}
            accent={t('smartCheck.titleAccent')}
          />
          <ul aria-label={t('smartCheck.chipsLabel')} className="flex max-w-155 flex-wrap gap-2.5">
            {CHIPS.map((chip) => {
              const Icon = chip.icon;
              return (
                <li
                  key={chip.key}
                  className={cn(
                    'inline-flex h-10 items-center gap-2 rounded-full pr-3.5 pl-2.5 text-small font-bold',
                    CATEGORY_STYLE[chip.hue].tile,
                  )}
                >
                  <Icon aria-hidden className="size-4.5" />
                  <span className="text-info-ink">{t(`categories.${chip.key}.short`)}</span>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="flex flex-col items-start gap-7">
          <p className="text-lg leading-copy text-info-ink-muted w520:text-intro">
            <Trans
              t={t}
              i18nKey="smartCheck.lead"
              components={{ strong: <strong className="font-bold text-info-ink" /> }}
            />
          </p>
          <ProductPriceBox
            product="smartcheck"
            label={t('smartCheck.price.label', { price, ...brands })}
            kind={t('smartCheck.price.kind')}
            amount={amount}
            currency={currency}
            footer={t('smartCheck.price.features')}
            ctaLabel={t('smartCheck.price.cta')}
            ctaHash={HOME_SECTION.pricing}
          />
          <TextLink
            to="/"
            hash={HOME_SECTION.deliverables}
            search={(previous) => ({ ...previous, deliverable: 'zone' as const })}
            className="-mt-1 text-info underline hover:text-info-hover focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          >
            {t('smartCheck.price.example')}
          </TextLink>
        </div>
      </div>
    </div>
  );
}
